import { HOUSE_KEYS, SCENE_MAP, SCENE_ORDER, tagsToEffects } from './scenes.js';

const MAX_SCORE = 5;
const FOLLOWUP_THRESHOLD = 0.75;

function clamp(value, min = -MAX_SCORE, max = MAX_SCORE) {
  return Math.max(min, Math.min(max, value));
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export function createInitialState() {
  const zero = () => ({ G: 0, R: 0, H: 0, S: 0 });
  return {
    traits: zero(),
    rel: zero(),
    wand: zero(),
    pref: zero(),
    flags: {},
    selectionHistory: [],
    keyMoments: [],
    transcript: [],
    followupAnswer: null,
    finalResult: null
  };
}

export function calculateScores(state, extra = null) {
  const result = {};
  for (const key of HOUSE_KEYS) {
    const base = 0.6 * state.traits[key] + 0.2 * state.rel[key] + 0.2 * state.wand[key] + 0.2 * state.pref[key];
    const bonus = extra?.[key] ?? 0;
    result[key] = +(base + bonus).toFixed(3);
  }
  return result;
}

function applyEffectsToGroup(group, effects) {
  if (!effects) return;
  for (const [key, value] of Object.entries(effects)) {
    group[key] = clamp((group[key] ?? 0) + value);
  }
}

function mergeEffects(base, extra) {
  const merged = clone(base);
  for (const group of ['traits', 'rel', 'wand', 'pref']) {
    if (extra?.[group]) {
      merged[group] = merged[group] || {};
      for (const [key, value] of Object.entries(extra[group])) {
        merged[group][key] = (merged[group][key] || 0) + value;
      }
    }
  }
  if (extra?.keyMoment) {
    merged.keyMoment = extra.keyMoment;
  }
  if (extra?.flags) {
    merged.flags = { ...(merged.flags || {}), ...extra.flags };
  }
  return merged;
}

function summarizeChoice(choice) {
  return `${choice.label} (${choice.tags?.join(',') ?? ''})`;
}

export class GameEngine {
  constructor() {
    this.state = createInitialState();
    this.sceneIndex = 0;
    this.history = [];
    this.pendingFollowup = null;
  }

  reset() {
    this.state = createInitialState();
    this.sceneIndex = 0;
    this.history = [];
    this.pendingFollowup = null;
    return this.getCurrentSceneId();
  }

  getCurrentSceneId() {
    return SCENE_ORDER[this.sceneIndex] ?? null;
  }

  getCurrentScene() {
    const id = this.getCurrentSceneId();
    return id ? SCENE_MAP[id] : null;
  }

  getStateSnapshot() {
    return {
      state: clone(this.state),
      sceneIndex: this.sceneIndex,
      pendingFollowup: clone(this.pendingFollowup)
    };
  }

  restoreSnapshot(snapshot) {
    this.state = clone(snapshot.state);
    this.sceneIndex = snapshot.sceneIndex;
    this.pendingFollowup = clone(snapshot.pendingFollowup);
  }

  pushHistory() {
    this.history.push(this.getStateSnapshot());
  }

  undo() {
    const snapshot = this.history.pop();
    if (!snapshot) return null;
    this.restoreSnapshot(snapshot);
    return this.getCurrentSceneId();
  }

  applyChoice(choice, narration) {
    const scene = this.getCurrentScene();
    if (!scene) return null;

    this.pushHistory();

    const baseEffects = tagsToEffects(choice.tags);
    const sceneResult = scene.processChoice(clone(this.state), choice.id, choice) || { effects: {}, nextScene: null };
    const combinedEffects = mergeEffects({ traits: baseEffects.traits, rel: baseEffects.rel }, sceneResult.effects || {});

    applyEffectsToGroup(this.state.traits, combinedEffects.traits);
    applyEffectsToGroup(this.state.rel, combinedEffects.rel);
    applyEffectsToGroup(this.state.wand, combinedEffects.wand);
    applyEffectsToGroup(this.state.pref, combinedEffects.pref);

    if (combinedEffects.flags) {
      this.state.flags = { ...this.state.flags, ...combinedEffects.flags };
    }

    if (combinedEffects.keyMoment) {
      this.state.keyMoments.push(combinedEffects.keyMoment);
      if (this.state.keyMoments.length > 5) {
        this.state.keyMoments.shift();
      }
    }

    this.state.selectionHistory.push({ sceneId: scene.id, choiceId: choice.id, label: choice.label, tags: choice.tags });
    if (this.state.selectionHistory.length > 6) {
      this.state.selectionHistory.shift();
    }

    this.state.transcript.push({ sceneId: scene.id, narration, choice: summarizeChoice(choice) });

    this.pendingFollowup = null;
    const nextId = sceneResult.nextScene;
    if (nextId) {
      const idx = SCENE_ORDER.indexOf(nextId);
      this.sceneIndex = idx >= 0 ? idx : this.sceneIndex + 1;
    } else {
      this.sceneIndex += 1;
    }

    return this.getCurrentSceneId();
  }

  createSortingAssessment() {
    const scores = calculateScores(this.state);
    const ranked = HOUSE_KEYS.map(key => ({ key, score: scores[key] })).sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const second = ranked[1];
    const delta = top.score - second.score;
    return { scores, ranked, needsFollowup: delta < FOLLOWUP_THRESHOLD, top, second };
  }

  prepareFollowup(followup) {
    if (!followup) return;
    const { ranked } = this.createSortingAssessment();
    this.pendingFollowup = {
      question: followup.question,
      options: followup.options,
      houses: ranked.slice(0, followup.options.length).map(entry => entry.key)
    };
  }

  applyFollowupSelection(optionIndex) {
    if (!this.pendingFollowup) return null;
    const house = this.pendingFollowup.houses[optionIndex];
    if (house) {
      this.state.pref[house] = clamp(this.state.pref[house] + 0.8);
      this.state.followupAnswer = { house, optionIndex };
    }
    this.pendingFollowup = null;
    return this.finalizeSorting();
  }

  finalizeSorting() {
    const scores = calculateScores(this.state);
    const ranked = HOUSE_KEYS.map(key => ({ key, score: scores[key] })).sort((a, b) => b.score - a.score);
    const winner = ranked[0];
    this.state.finalResult = {
      house: winner.key,
      scores,
      ranked,
      keyMoments: [...this.state.keyMoments.slice(-3)]
    };
    return this.state.finalResult;
  }

  serialize() {
    return JSON.stringify({
      state: this.state,
      sceneIndex: this.sceneIndex,
      pendingFollowup: this.pendingFollowup,
      history: []
    });
  }

  load(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    this.state = data.state ?? createInitialState();
    this.sceneIndex = data.sceneIndex ?? 0;
    this.pendingFollowup = data.pendingFollowup ?? null;
    this.history = [];
  }

  isFinished() {
    return this.sceneIndex >= SCENE_ORDER.length || Boolean(this.state.finalResult);
  }

  getSummaryForLLM() {
    const pieces = [];
    const t = this.state.traits;
    const r = this.state.rel;
    const w = this.state.wand;
    const p = this.state.pref;
    pieces.push(`traits:G${t.G.toFixed(1)},R${t.R.toFixed(1)},H${t.H.toFixed(1)},S${t.S.toFixed(1)}`);
    pieces.push(`rel:G${r.G.toFixed(1)},R${r.R.toFixed(1)},H${r.H.toFixed(1)},S${r.S.toFixed(1)}`);
    pieces.push(`wand:G${w.G.toFixed(1)},R${w.R.toFixed(1)},H${w.H.toFixed(1)},S${w.S.toFixed(1)}`);
    pieces.push(`pref:G${p.G.toFixed(1)},R${p.R.toFixed(1)},H${p.H.toFixed(1)},S${p.S.toFixed(1)}`);
    if (this.state.followupAnswer) {
      pieces.push(`followup:${this.state.followupAnswer.house}`);
    }
    const summary = pieces.join(' | ');
    const history = this.state.selectionHistory.slice(-3).map(entry => `${entry.sceneId}:${entry.choiceId}`).join(', ');
    return `${summary} || history:${history}`.slice(0, 380);
  }
}
