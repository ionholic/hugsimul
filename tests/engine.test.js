import { describe, it, expect } from 'vitest';
import { GameEngine, calculateScores, createInitialState } from '../src/engine.js';
import { SCENE_MAP, SCENE_ORDER } from '../src/scenes.js';
import { saveGame, loadGame } from '../src/storage.js';

function createMockStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: key => store.delete(key)
  };
}

describe('calculateScores', () => {
  it('weights each component according to 규칙', () => {
    const state = createInitialState();
    state.traits.G = 2;
    state.rel.G = 1;
    state.wand.G = 0.5;
    state.pref.G = 1.5;
    const scores = calculateScores(state);
    const expected = 0.6 * 2 + 0.2 * 1 + 0.2 * 0.5 + 0.2 * 1.5;
    expect(scores.G).toBeCloseTo(expected);
  });
});

describe('storage helpers', () => {
  it('persists and restores engine state', () => {
    const engine = new GameEngine();
    const storage = createMockStorage();
    // 진행을 한 단계 진행
    const firstScene = SCENE_MAP[SCENE_ORDER[0]];
    const choice = firstScene.fallback.choices[0];
    engine.applyChoice(choice, firstScene.fallback.narration);
    const saved = saveGame(engine, storage);
    expect(saved).toBe(true);

    const other = new GameEngine();
    const loaded = loadGame(other, storage);
    expect(loaded).toBe(true);
    expect(other.state.traits.G).toBeCloseTo(engine.state.traits.G);
    expect(other.sceneIndex).toBe(engine.sceneIndex);
  });
});

describe('sorting distribution', () => {
  it('produces varied 기숙사 배정', () => {
    const counts = { G: 0, R: 0, H: 0, S: 0 };
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const engine = new GameEngine();
      let scene = engine.getCurrentScene();
      while (scene && scene.id !== 'sorting') {
        const fallback = scene.fallback.choices;
        const choice = fallback[Math.floor(Math.random() * fallback.length)];
        engine.applyChoice(choice, scene.fallback.narration);
        scene = engine.getCurrentScene();
      }
      const sortingScene = SCENE_MAP['sorting'];
      const assessment = engine.createSortingAssessment();
      if (assessment.needsFollowup) {
        engine.prepareFollowup(sortingScene.fallback.followup);
        const pick = Math.floor(Math.random() * engine.pendingFollowup.options.length);
        engine.applyFollowupSelection(pick);
      } else {
        engine.finalizeSorting();
      }
      counts[engine.state.finalResult.house] += 1;
    }
    const ratios = Object.values(counts).map(value => value / runs);
    for (const ratio of ratios) {
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThan(0.4);
    }
  });
});
