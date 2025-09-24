import { GameEngine } from './engine.js';
import { SCENE_MAP } from './scenes.js';
import { GeminiCache, requestSceneContent } from './llm.js';
import { saveGame, loadGame, clearSavedGame, loadApiKey, saveApiKey } from './storage.js';

const houseNames = {
  G: '그리핀도르',
  R: '래번클로',
  H: '후플푸프',
  S: '슬리데린'
};

const engine = new GameEngine();
const cache = new GeminiCache();
let apiKey = '';
let currentChoices = [];
let currentSceneContent = null;
let sceneRequestToken = 0;

const narrationEl = document.getElementById('narration');
const choicesEl = document.getElementById('choices');
const followupEl = document.getElementById('followup');
const statusBannerEl = document.getElementById('status-banner');
const statsPanelEl = document.getElementById('stats-panel');
const toggleStatsBtn = document.getElementById('toggle-stats');
const undoBtn = document.getElementById('undo-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const resetBtn = document.getElementById('reset-btn');
const apiKeyBtn = document.getElementById('api-key-btn');

const traitListEl = document.getElementById('trait-stats');
const relListEl = document.getElementById('rel-stats');
const wandListEl = document.getElementById('wand-stats');
const prefListEl = document.getElementById('pref-stats');
const keyMomentsEl = document.getElementById('key-moments');

const modalBackdrop = document.getElementById('modal-backdrop');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeySaveBtn = document.getElementById('api-key-save');
const apiKeyClearBtn = document.getElementById('api-key-clear');
const apiKeyCloseBtn = document.getElementById('api-key-close');

const choiceTemplate = document.getElementById('choice-template');

function setStatus(message, type = 'info') {
  statusBannerEl.textContent = message || '';
  statusBannerEl.dataset.type = type;
}

function updateStatsPanel() {
  const state = engine.state;
  renderStatList(traitListEl, state.traits);
  renderStatList(relListEl, state.rel);
  renderStatList(wandListEl, state.wand);
  renderStatList(prefListEl, state.pref);
  renderKeyMoments();
}

function renderStatList(el, group) {
  el.innerHTML = '';
  for (const [key, value] of Object.entries(group)) {
    const li = document.createElement('li');
    li.textContent = `${houseNames[key]}: ${value.toFixed(1)}`;
    el.appendChild(li);
  }
}

function renderKeyMoments() {
  keyMomentsEl.innerHTML = '';
  const source = engine.state.finalResult?.keyMoments ?? engine.state.keyMoments;
  for (const moment of source.slice(-5)) {
    const li = document.createElement('li');
    li.textContent = moment;
    keyMomentsEl.appendChild(li);
  }
}

function clearChoices() {
  choicesEl.innerHTML = '';
  currentChoices = [];
}

function focusChoice(index) {
  currentChoices.forEach((choice, idx) => {
    if (!choice) return;
    if (idx === index) {
      choice.classList.add('selected');
      choice.setAttribute('aria-selected', 'true');
      choice.focus();
    } else {
      choice.classList.remove('selected');
      choice.setAttribute('aria-selected', 'false');
    }
  });
}

function handleChoiceSelection(choiceData) {
  if (!choiceData) return;
  const nextSceneId = engine.applyChoice(choiceData, currentSceneContent?.narration ?? '');
  updateStatsPanel();
  updateUndoButton();
  renderScene(nextSceneId);
}

function updateUndoButton() {
  undoBtn.disabled = engine.history.length === 0;
}

function renderFollowupUI(followup) {
  followupEl.innerHTML = '';
  if (!followup) {
    followupEl.classList.add('hidden');
    return;
  }
  followupEl.classList.remove('hidden');
  const title = document.createElement('h3');
  title.textContent = followup.question;
  followupEl.appendChild(title);
  followup.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.textContent = option;
    btn.addEventListener('click', () => {
      const result = engine.applyFollowupSelection(index);
      updateStatsPanel();
      updateUndoButton();
      if (result) {
        showFinalResult(result, currentSceneContent?.narration ?? '');
      }
    });
    followupEl.appendChild(btn);
  });
}

function buildFinalNarration(result, baseNarration) {
  const lines = [];
  if (baseNarration) {
    lines.push(baseNarration.trim());
  }
  lines.push(`${houseNames[result.house]} 기숙사에 배정되었다!`);
  const keyMoments = result.keyMoments.filter(Boolean);
  if (keyMoments.length) {
    lines.push(`결정적 순간: ${keyMoments.join(' / ')}`);
  }
  lines.push('최종 점수:');
  for (const entry of result.ranked) {
    lines.push(`- ${houseNames[entry.key]}: ${entry.score.toFixed(2)}`);
  }
  return lines.join('\n\n');
}

function showFinalResult(result, baseNarration) {
  currentSceneContent = null;
  clearChoices();
  renderFollowupUI(null);
  narrationEl.textContent = buildFinalNarration(result, baseNarration);
}

async function renderScene(forceSceneId = null) {
  updateStatsPanel();
  const scene = forceSceneId ? SCENE_MAP[forceSceneId] : engine.getCurrentScene();
  if (!scene) {
    if (engine.state.finalResult) {
      showFinalResult(engine.state.finalResult, '');
    }
    return;
  }

  const token = ++sceneRequestToken;
  const usingSorting = scene.id === 'sorting';
  narrationEl.textContent = '...';
  clearChoices();
  renderFollowupUI(null);

  let content = null;
  let error = null;

  if (apiKey) {
    const response = await requestSceneContent({ apiKey, scene, engine, cache });
    if (token !== sceneRequestToken) return;
    if (response.ok) {
      content = response.data;
      if (!response.cached) {
        setStatus('Gemini 응답을 불러왔습니다.', 'success');
      }
    } else {
      error = response.error;
    }
  }

  if (!content) {
    content = scene.fallback;
    if (!apiKey) {
      setStatus('Gemini 키가 없어 폴백 텍스트로 진행합니다.', 'info');
    } else if (error) {
      setStatus(`Gemini 응답 실패: ${error}. 폴백을 사용합니다.`, 'warning');
    }
  } else {
    setStatus('');
  }

  currentSceneContent = content;
  narrationEl.textContent = content.narration;

  if (usingSorting) {
    const assessment = engine.createSortingAssessment();
    if (!assessment.needsFollowup) {
      const result = engine.finalizeSorting();
      showFinalResult(result, content.narration);
      return;
    }
    engine.prepareFollowup(content.followup || scene.fallback.followup);
    renderFollowupUI(engine.pendingFollowup);
    return;
  }

  content.choices.forEach((choiceData, index) => {
    const clone = choiceTemplate.content.firstElementChild.cloneNode(true);
    clone.textContent = choiceData.label;
    if (choiceData.hint) {
      const hint = document.createElement('small');
      hint.textContent = choiceData.hint;
      clone.appendChild(hint);
    }
    clone.dataset.tags = (choiceData.tags || []).join(',');
    clone.addEventListener('click', () => handleChoiceSelection(choiceData));
    clone.addEventListener('focus', () => focusChoice(index));
    choicesEl.appendChild(clone);
    currentChoices.push(clone);
  });

  if (currentChoices.length) {
    focusChoice(0);
  }
}

function handleKeyNavigation(event) {
  if (event.target instanceof HTMLInputElement) return;
  if (!currentChoices.length) return;
  const currentIndex = currentChoices.findIndex(btn => btn.classList.contains('selected'));
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextIndex = (currentIndex + 1) % currentChoices.length;
    focusChoice(nextIndex);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const nextIndex = (currentIndex - 1 + currentChoices.length) % currentChoices.length;
    focusChoice(nextIndex);
  } else if (event.key === 'Enter') {
    const index = currentIndex >= 0 ? currentIndex : 0;
    currentChoices[index]?.click();
  }
}

function openModal() {
  modalBackdrop.classList.remove('hidden');
  apiKeyInput.value = apiKey;
  apiKeyInput.focus();
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

function initApiKey() {
  apiKey = loadApiKey();
  if (!apiKey) {
    setStatus('Gemini 키를 설정하면 묘사가 더욱 풍부해집니다.', 'info');
  }
}

function setupEventListeners() {
  toggleStatsBtn.addEventListener('click', () => {
    const hidden = statsPanelEl.classList.toggle('hidden');
    toggleStatsBtn.textContent = hidden ? '능력치 보이기' : '능력치 숨기기';
  });

  undoBtn.addEventListener('click', () => {
    const sceneId = engine.undo();
    updateStatsPanel();
    updateUndoButton();
    renderScene(sceneId);
  });

  saveBtn.addEventListener('click', () => {
    const ok = saveGame(engine);
    setStatus(ok ? '진행 상황을 저장했습니다.' : '저장에 실패했습니다.', ok ? 'success' : 'warning');
  });

  loadBtn.addEventListener('click', () => {
    const ok = loadGame(engine);
    if (ok) {
      setStatus('저장된 진행을 불러왔습니다.', 'success');
      updateStatsPanel();
      updateUndoButton();
      renderScene();
    } else {
      setStatus('불러올 저장본이 없습니다.', 'warning');
    }
  });

  resetBtn.addEventListener('click', () => {
    engine.reset();
    clearSavedGame();
    updateStatsPanel();
    updateUndoButton();
    renderScene();
    setStatus('새로운 여정이 시작되었습니다.', 'info');
  });

  apiKeyBtn.addEventListener('click', openModal);
  apiKeyCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', event => {
    if (event.target === modalBackdrop) closeModal();
  });

  apiKeySaveBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    saveApiKey(apiKey);
    closeModal();
    setStatus(apiKey ? 'Gemini 키가 저장되었습니다.' : 'Gemini 키가 제거되었습니다.', 'success');
    renderScene();
  });

  apiKeyClearBtn.addEventListener('click', () => {
    apiKeyInput.value = '';
    apiKey = '';
    saveApiKey('');
    closeModal();
    setStatus('Gemini 키를 삭제했습니다.', 'info');
    renderScene();
  });

  document.addEventListener('keydown', handleKeyNavigation);
}

function bootstrap() {
  initApiKey();
  setupEventListeners();
  updateStatsPanel();
  updateUndoButton();
  renderScene();
}

bootstrap();
