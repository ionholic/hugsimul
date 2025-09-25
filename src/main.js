import { GameEngine } from './engine.js';
import { SCENE_MAP } from './scenes.js';
import {
  GeminiCache,
  requestSceneContent,
  interpretPlayerAction,
  interpretFollowupChoice,
  requestCharacterPrompt,
  requestCharacterSummary,
  requestCharacterPortraitPrompt,
  requestImagePreview,
  DEFAULT_MODEL,
  IMAGE_MODEL
} from './llm.js';
import {
  saveGame,
  loadGame,
  clearSavedGame,
  loadApiKey,
  saveApiKey,
  loadModelId,
  saveModelId,
  loadAutoPortraitEnabled,
  saveAutoPortraitEnabled
} from './storage.js';

const houseNames = {
  G: '그리핀도르',
  R: '래번클로',
  H: '후플푸프',
  S: '슬리데린'
};

const CHARACTER_FIELDS = [
  { id: 'gender', label: '성별', fallbackQuestion: '어떤 모습으로 불리고 싶나요? (예: 여자, 남자, 논바이너리 등)' },
  { id: 'name', label: '이름', fallbackQuestion: '호그와트 생활 동안 사용할 이름은 무엇인가요?' },
  { id: 'nationality', label: '국적', fallbackQuestion: '어느 나라에서 자랐나요?' },
  { id: 'heritage', label: '신분', fallbackQuestion: '당신은 머글 출신인가요, 마법사 가문 출신인가요, 혹은 그 사이 어딘가인가요?' },
  { id: 'family', label: '가족 구성', fallbackQuestion: '당신을 지켜보는 가족은 어떤 사람들이 있나요?' }
];

const ABILITY_LABELS = {
  vitality: '체력',
  mana: '마력',
  intellect: '지능',
  agility: '민첩',
  resilience: '건강',
  charm: '매력'
};

const DISPOSITION_LABELS = {
  realistic: '현실적',
  idealistic: '이상적',
  individual: '개인주의',
  cooperative: '협동적',
  challenging: '도전적',
  stable: '안정적',
  selfDirected: '자기주도적',
  passive: '수동적',
  shortTerm: '단기 성과',
  longTerm: '장기 성과',
  spontaneous: '즉흥적',
  deliberate: '숙고적'
};

const IMAGE_SCENE_PROMPTS = [
  {
    id: 'portrait',
    label: '캐릭터 초상',
    prompt:
      '11살 마법학교 신입생의 허리 위 초상, 따뜻한 스튜디오 조명, 자신감과 긴장이 공존하는 표정, 디지털 일러스트',
    note: '복장·소품·머리색 등 캐릭터 설정을 한두 문장으로 덧붙이면 초상이 선명해집니다.'
  },
  {
    id: 'character',
    label: '캐릭터 준비',
    prompt:
      '11살 한국인 신입생이 조용한 방에서 호그와트 입학을 앞두고 트렁크를 꾸리는 장면, 따뜻한 스탠드 조명, 설렘 가득한 표정, 일러스트',
    note: '소품(책, 가족 사진 등)을 자유롭게 추가하며 인물의 배경을 강조하세요.'
  },
  {
    id: 'letter',
    label: '초대장 발견',
    prompt:
      '오래된 봉인과 호그와트 문장이 찍힌 편지를 책상 위에서 펼쳐 보는 장면, 양초 불빛, 고풍스러운 배경, 따뜻한 컬러 팔레트',
    note: '초대장의 질감이나 손글씨를 강조하면 감정선이 살아납니다.'
  },
  {
    id: 'diagon',
    label: '다이애건 앨리',
    prompt:
      '황혼 무렵의 다이애건 앨리, 마법 상점 간판들이 빛나고 신입생이 지팡이를 고르는 순간, 영화적 원근감, 몽환적 분위기',
    note: '지팡이 가루, 상점 간판 등을 구체화하면 이미지 수정에도 활용하기 좋습니다.'
  },
  {
    id: 'platform',
    label: '9와 3/4 승강장',
    prompt:
      '킹스크로스 역 9와 3/4 승강장에서 붉은 트렁크를 밀며 벽을 통과하려는 장면, 스팀과 햇살, 활기찬 군중, 디테일한 배경',
    note: '캐릭터의 표정과 동작을 명시하면 성공/실패 장면 수정이 쉬워집니다.'
  },
  {
    id: 'express',
    label: '급행 열차 쿠페',
    prompt:
      '호그와트 급행 열차 쿠페 안에서 학생들이 간식을 나누며 대화를 나누는 장면, 따뜻한 조명, 나무 패널 인테리어, 활기찬 표정',
    note: '갈등이나 화합 순간 등 원하는 분위기를 한 문장으로 추가하세요.'
  },
  {
    id: 'lake',
    label: '검은 호수',
    prompt:
      '달빛 가득한 밤, 검은 호수 위 보트를 탄 신입생들이 협력해 노를 젓는 장면, 안개, 고요한 수면, 호그와트 성의 실루엣',
    note: '달빛 색감이나 날씨를 조정해 다양한 버전을 시도해 보세요.'
  },
  {
    id: 'sorting',
    label: '정렬 모자',
    prompt:
      '호그와트 대강당 중앙에서 정렬 모자를 쓴 신입생이 촛불 아래 긴장하는 장면, 웅장한 분위기, 따뜻한 금빛 조명, 학생 관중',
    note: '정렬 모자의 표정이나 속삭임 분위기를 한 문장으로 보완하면 좋습니다.'
  }
];

const engine = new GameEngine();
const cache = new GeminiCache();
let apiKey = '';
let modelId = DEFAULT_MODEL;
let autoPortraitEnabled = loadAutoPortraitEnabled();
let currentSceneContent = null;
let sceneRequestToken = 0;
let currentMode = 'character';
let characterStep = 0;
let pendingFollowup = null;
let uploadedImages = [];
let imageGenerating = false;
let portraitGenerating = false;
const conversationLog = [];
const conversationHistory = [];

const statusBannerEl = document.getElementById('status-banner');
const conversationEl = document.getElementById('conversation');
const hintsEl = document.getElementById('interaction-hints');
const formEl = document.getElementById('interaction-form');
const inputEl = document.getElementById('interaction-input');
const sendBtn = document.getElementById('send-btn');
const statsPanelEl = document.getElementById('stats-panel');
const toggleStatsBtn = document.getElementById('toggle-stats');
const undoBtn = document.getElementById('undo-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const resetBtn = document.getElementById('reset-btn');
const apiKeyBtn = document.getElementById('api-key-btn');
const imageGenerateBtn = document.getElementById('image-generate-btn');
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageUploadInput = document.getElementById('image-upload-input');
const uploadedImagesEl = document.getElementById('uploaded-images');
const clearImagesBtn = document.getElementById('clear-images-btn');
const bioStatsEl = document.getElementById('bio-stats');
const abilityStatsEl = document.getElementById('ability-stats');
const keyMomentsEl = document.getElementById('key-moments');
const dispositionStatsEl = document.getElementById('disposition-stats');

const modalBackdrop = document.getElementById('modal-backdrop');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeySaveBtn = document.getElementById('api-key-save');
const apiKeyClearBtn = document.getElementById('api-key-clear');
const apiKeyCloseBtn = document.getElementById('api-key-close');
const modelSelect = document.getElementById('model-select');
const imageModalBackdrop = document.getElementById('image-modal-backdrop');
const imageModalForm = document.getElementById('image-generator-form');
const imageSceneSelect = document.getElementById('image-scene-select');
const imagePromptInput = document.getElementById('image-prompt');
const imageReferenceInput = document.getElementById('image-reference-input');
const imageGenerateRunBtn = document.getElementById('image-generate-run');
const imageModalCloseBtn = document.getElementById('image-modal-close');
const imageModalStatusEl = document.getElementById('image-modal-status');
const imagePreviewFigure = document.getElementById('image-preview');
const imagePreviewImg = imagePreviewFigure?.querySelector('img') || null;
const imagePreviewCaption = imagePreviewFigure?.querySelector('figcaption') || null;
const autoPortraitToggle = document.getElementById('image-auto-portrait');

function setStatus(message, type = 'info') {
  statusBannerEl.textContent = message || '';
  statusBannerEl.dataset.type = type;
}

function appendMessage(role, text) {
  if (!text) return;
  const entry = { role, text };
  conversationLog.push(entry);
  const wrapper = document.createElement('div');
  wrapper.className = `message message-${role}`;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  wrapper.appendChild(paragraph);
  conversationEl.appendChild(wrapper);
  conversationEl.scrollTop = conversationEl.scrollHeight;
}

function rebuildConversation() {
  conversationEl.innerHTML = '';
  for (const entry of conversationLog) {
    const wrapper = document.createElement('div');
    wrapper.className = `message message-${entry.role}`;
    const paragraph = document.createElement('p');
    paragraph.textContent = entry.text;
    wrapper.appendChild(paragraph);
    conversationEl.appendChild(wrapper);
  }
  conversationEl.scrollTop = conversationEl.scrollHeight;
}

function renderHints(items = []) {
  hintsEl.innerHTML = '';
  if (!items.length) return;
  const title = document.createElement('h3');
  title.textContent = '상호작용 아이디어';
  hintsEl.appendChild(title);
  const list = document.createElement('ul');
  items.slice(0, 4).forEach(item => {
    const li = document.createElement('li');
    let skip = false;
    if (typeof item === 'string') {
      li.textContent = item;
    } else if (item && typeof item === 'object') {
      const label = item.label || item.text || '';
      const hint = item.hint || item.note || '';
      if (label) {
        const strong = document.createElement('strong');
        strong.textContent = label;
        li.appendChild(strong);
      }
      if (hint) {
        const span = document.createElement('span');
        span.className = 'hint-note';
        span.textContent = ` — ${hint}`;
        li.appendChild(span);
      }
      if (!label && !hint) {
        skip = true;
      }
    }
    if (!skip) {
      list.appendChild(li);
    }
  });
  hintsEl.appendChild(list);
}

function findImageScene(sceneId) {
  return IMAGE_SCENE_PROMPTS.find(item => item.id === sceneId) || null;
}

function setImageModalStatus(message = '', type = 'info') {
  if (!imageModalStatusEl) return;
  imageModalStatusEl.textContent = message;
  imageModalStatusEl.dataset.type = type;
}

function resetImagePreview() {
  if (!imagePreviewFigure) return;
  imagePreviewFigure.classList.add('hidden');
  if (imagePreviewImg) {
    imagePreviewImg.removeAttribute('src');
  }
  if (imagePreviewCaption) {
    imagePreviewCaption.textContent = '';
  }
}

function showImagePreview(url, caption) {
  if (!imagePreviewFigure || !imagePreviewImg) return;
  imagePreviewImg.src = url;
  if (imagePreviewCaption) {
    imagePreviewCaption.textContent = caption;
  }
  imagePreviewFigure.classList.remove('hidden');
}

function populateImageSceneOptions() {
  if (!imageSceneSelect) return;
  imageSceneSelect.innerHTML = '';
  IMAGE_SCENE_PROMPTS.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${index + 1}. ${item.label}`;
    imageSceneSelect.appendChild(option);
  });
  const first = IMAGE_SCENE_PROMPTS[0];
  if (first && imagePromptInput) {
    imageSceneSelect.value = first.id;
    imagePromptInput.value = first.prompt;
    setImageModalStatus(first.note || '');
  }
  resetImagePreview();
}

function openImageGenerator() {
  if (!imageModalBackdrop) return;
  if (imageSceneSelect && !imageSceneSelect.options.length) {
    populateImageSceneOptions();
  } else if (imageSceneSelect) {
    const current = findImageScene(imageSceneSelect.value);
    setImageModalStatus(current?.note || '');
  }
  imageModalBackdrop.classList.remove('hidden');
  if (imagePromptInput) {
    imagePromptInput.focus();
  }
}

function closeImageGenerator() {
  if (!imageModalBackdrop) return;
  imageModalBackdrop.classList.add('hidden');
  imageGenerating = false;
  if (imageGenerateRunBtn) {
    imageGenerateRunBtn.disabled = false;
  }
  if (imageReferenceInput) {
    imageReferenceInput.value = '';
  }
}

function handleSceneSelectChange() {
  if (!imageSceneSelect) return;
  const scene = findImageScene(imageSceneSelect.value);
  if (scene && imagePromptInput) {
    imagePromptInput.value = scene.prompt;
    setImageModalStatus(scene.note || '');
    resetImagePreview();
  } else {
    setImageModalStatus('');
  }
}

function base64ToBlob(base64, mimeType = 'image/png') {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType });
}

function readFileAsInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve({ data: base64 || '', mimeType: file.type || 'image/png' });
    };
    reader.onerror = () => reject(new Error('파일을 읽는 중 문제가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

function appendGeneratedImage(sceneId, url, { mimeType = 'image/png', origin = 'Gemini 생성', revokable = true } = {}) {
  const scene = findImageScene(sceneId);
  const stamp = new Date();
  const timeLabel = stamp.toLocaleTimeString('ko-KR', { hour12: false });
  const name = `${scene?.label || '사용자 지정'} ${timeLabel}`;
  uploadedImages.push({ name, url, origin, revokable, mimeType });
  renderUploadedImages();
  showImagePreview(url, `${name} (${origin})`);
}

async function handleImageGeneration(event) {
  event.preventDefault();
  if (imageGenerating) return;
  if (!apiKey) {
    setImageModalStatus('이미지 생성을 위해 Gemini 키를 먼저 입력하세요.', 'warning');
    setStatus('이미지 생성을 사용하려면 Gemini 키가 필요합니다.', 'warning');
    return;
  }
  if (!imagePromptInput) return;
  const prompt = imagePromptInput.value.trim();
  if (!prompt) {
    setImageModalStatus('프롬프트를 입력하거나 장면을 선택하세요.', 'warning');
    return;
  }
  imageGenerating = true;
  if (imageGenerateRunBtn) {
    imageGenerateRunBtn.disabled = true;
  }
  setImageModalStatus(`${IMAGE_MODEL} 모델이 이미지를 준비하고 있습니다...`, 'info');
  resetImagePreview();

  let initImage = null;
  const referenceFile = imageReferenceInput?.files?.[0];
  if (referenceFile) {
    try {
      initImage = await readFileAsInlineData(referenceFile);
    } catch (error) {
      setImageModalStatus(error.message, 'warning');
      imageGenerating = false;
      if (imageGenerateRunBtn) imageGenerateRunBtn.disabled = false;
      return;
    }
  }

  const response = await requestImagePreview({ apiKey, prompt, initImage });
  if (response.ok) {
    const sceneId = imageSceneSelect?.value || 'custom';
    if (response.data.base64) {
      const blob = base64ToBlob(response.data.base64, response.data.mimeType);
      const url = URL.createObjectURL(blob);
      appendGeneratedImage(sceneId, url, { mimeType: response.data.mimeType, origin: 'Gemini 이미지 미리보기', revokable: true });
    } else if (response.data.fileUrl) {
      appendGeneratedImage(sceneId, response.data.fileUrl, { mimeType: response.data.mimeType, origin: 'Gemini 파일 링크', revokable: false });
    }
    setImageModalStatus('이미지를 생성해 갤러리에 추가했습니다.', 'success');
    setStatus('Gemini 이미지 모델이 장면 미리보기를 추가했습니다.', 'success');
  } else {
    setImageModalStatus(`생성 실패: ${response.error}`, 'warning');
    setStatus(`이미지 생성 실패: ${response.error}`, 'warning');
  }

  if (imageReferenceInput) {
    imageReferenceInput.value = '';
  }
  imageGenerating = false;
  if (imageGenerateRunBtn) {
    imageGenerateRunBtn.disabled = false;
  }
}

async function maybeGenerateCharacterPortrait(abilities) {
  if (!apiKey || !autoPortraitEnabled || portraitGenerating || imageGenerating) {
    return;
  }
  const char = engine.state.character;
  if (!char?.name) return;
  portraitGenerating = true;
  setStatus('Gemini가 캐릭터 초상화를 준비하고 있습니다...', 'info');
  let promptData = null;
  if (apiKey) {
    const response = await requestCharacterPortraitPrompt({
      apiKey,
      model: modelId,
      character: char,
      abilities
    });
    if (response.ok) {
      promptData = response.data;
    } else if (response.error) {
      appendMessage('system', `초상화 프롬프트 생성 실패: ${response.error}`);
    }
  }
  const fallbackPrompt = `${char.gender || '신입생'} ${char.name || ''}의 허리 위 초상, 따뜻한 실내 조명, 부드러운 붓질, 디지털 일러스트`.trim();
  const prompt = promptData?.prompt?.trim() || fallbackPrompt;
  const caption = promptData?.caption?.trim() || `${char.name || '신입생'} 초상`;
  try {
    const imageResponse = await requestImagePreview({ apiKey, prompt });
    if (imageResponse.ok) {
      let url = '';
      if (imageResponse.data.base64) {
        const blob = base64ToBlob(imageResponse.data.base64, imageResponse.data.mimeType);
        url = URL.createObjectURL(blob);
        appendGeneratedImage('portrait', url, {
          mimeType: imageResponse.data.mimeType,
          origin: 'Gemini 초상화',
          revokable: true
        });
      } else if (imageResponse.data.fileUrl) {
        url = imageResponse.data.fileUrl;
        appendGeneratedImage('portrait', url, {
          mimeType: imageResponse.data.mimeType,
          origin: 'Gemini 초상화',
          revokable: false
        });
      }
      if (url) {
        appendMessage('system', `${caption} 이미지를 갤러리에 추가했습니다.`);
        setStatus('캐릭터 초상화를 갤러리에 추가했습니다.', 'success');
      } else {
        appendMessage('system', '초상화를 생성했지만 이미지 데이터를 받지 못했습니다.');
        setStatus('초상화를 생성했지만 이미지 데이터를 받지 못했습니다.', 'warning');
      }
    } else {
      const reason = imageResponse.error || '알 수 없는 오류';
      appendMessage('system', `초상화 생성 실패: ${reason}`);
      setStatus(`초상화 생성 실패: ${reason}`, 'warning');
    }
  } catch (error) {
    appendMessage('system', `초상화 생성 실패: ${error.message}`);
    setStatus(`초상화 생성 실패: ${error.message}`, 'warning');
  } finally {
    portraitGenerating = false;
  }
}

function renderBio() {
  bioStatsEl.innerHTML = '';
  const char = engine.state.character;
  if (!char) return;
  const entries = [
    ['이름', char.name || '-'],
    ['성별', char.gender || '-'],
    ['국적', char.nationality || '-'],
    ['신분', char.heritage || '-'],
    ['가족 구성', char.family || '-'],
    ['나이', '11세']
  ];
  for (const [label, value] of entries) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value || '-';
    bioStatsEl.appendChild(dt);
    bioStatsEl.appendChild(dd);
  }
}

function renderAbilities() {
  abilityStatsEl.innerHTML = '';
  const abilities = engine.state.abilities || {};
  for (const [key, label] of Object.entries(ABILITY_LABELS)) {
    const li = document.createElement('li');
    const value = abilities[key] ?? 0;
    li.textContent = `${label}: ${value}`;
    abilityStatsEl.appendChild(li);
  }
}

function renderDispositions() {
  if (!dispositionStatsEl) return;
  dispositionStatsEl.innerHTML = '';
  const dispositions = engine.state.dispositions || {};
  for (const [key, label] of Object.entries(DISPOSITION_LABELS)) {
    const li = document.createElement('li');
    const value = dispositions[key] ?? 0;
    li.textContent = `${label}: ${value.toFixed(1)}`;
    dispositionStatsEl.appendChild(li);

  }
}

function renderKeyMoments() {
  keyMomentsEl.innerHTML = '';
  const source = engine.state.finalResult?.keyMoments ?? engine.state.keyMoments;
  for (const moment of source.slice(-6)) {
    const li = document.createElement('li');
    li.textContent = moment;
    keyMomentsEl.appendChild(li);
  }
}

function updateStatsPanel() {
  renderBio();
  renderAbilities();
  renderDispositions();
  renderKeyMoments();
}

function updateUndoButton() {
  undoBtn.disabled = engine.history.length === 0;
}

function setInteractionEnabled(enabled) {
  if (!inputEl || !sendBtn) return;
  inputEl.disabled = !enabled;
  sendBtn.disabled = !enabled;
}

function rollAbilityScore() {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    total += 1 + Math.floor(Math.random() * 6);
  }
  return total;
}

function generateAbilities() {
  return {
    vitality: rollAbilityScore(),
    mana: rollAbilityScore(),
    intellect: rollAbilityScore(),
    agility: rollAbilityScore(),
    resilience: rollAbilityScore(),
    charm: rollAbilityScore()
  };
}

function resetConversation() {
  conversationLog.length = 0;
  rebuildConversation();
  renderHints();
}

function markSceneSnapshot() {
  conversationHistory.push(conversationLog.slice());
}

function restoreConversationSnapshot() {
  const snapshot = conversationHistory.pop();
  if (snapshot) {
    conversationLog.length = 0;
    snapshot.forEach(entry => conversationLog.push(entry));
    rebuildConversation();
  }
}

function fallbackMatchChoice(input, choices) {
  if (!choices?.length) return null;
  const trimmed = input.trim();
  if (!trimmed) return choices[0];
  const numeric = trimmed.match(/^[0-9]+$/);
  if (numeric) {
    const index = parseInt(numeric[0], 10) - 1;
    if (choices[index]) return choices[index];
  }
  const normalized = trimmed.replace(/\s+/g, '');
  let best = choices[0];
  let bestScore = -1;
  choices.forEach(choice => {
    const labelNorm = choice.label.replace(/\s+/g, '');
    let score = 0;
    for (let i = 0; i < labelNorm.length - 1; i += 1) {
      const slice = labelNorm.slice(i, i + 2);
      if (slice.length < 2) continue;
      if (normalized.includes(slice)) score += 1;
    }
    if (normalized && labelNorm.includes(normalized)) {
      score += 3;
    }
    if (score > bestScore) {
      best = choice;
      bestScore = score;
    }
  });
  return best;
}

function fallbackMatchFollowup(input, options) {
  if (!options?.length) return 0;
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const numeric = trimmed.match(/^[0-9]+$/);
  if (numeric) {
    const index = parseInt(numeric[0], 10) - 1;
    if (options[index]) return index;
  }
  const normalized = trimmed.replace(/\s+/g, '');
  let bestIndex = 0;
  let bestScore = -1;
  options.forEach((option, index) => {
    const labelNorm = option.replace(/\s+/g, '');
    let score = 0;
    for (let i = 0; i < labelNorm.length - 1; i += 1) {
      const slice = labelNorm.slice(i, i + 2);
      if (slice.length < 2) continue;
      if (normalized.includes(slice)) score += 1;
    }
    if (normalized && labelNorm.includes(normalized)) {
      score += 3;
    }
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });
  return bestIndex;
}

async function presentScene(scene, content) {
  currentSceneContent = content;
  currentMode = 'scene';
  appendMessage('narrator', content.narration);
  renderHints(content.choices || []);
  setInteractionEnabled(true);
  inputEl?.focus();

  if (scene.id === 'sorting') {
    const assessment = engine.createSortingAssessment();
    if (!assessment.needsFollowup) {
      const result = engine.finalizeSorting();
      showFinalResult(result, content.narration);
      return;
    }
    engine.prepareFollowup(content.followup || scene.fallback.followup);
    pendingFollowup = engine.pendingFollowup;
    currentMode = 'followup';
    const question = pendingFollowup?.question ?? content.followup?.question ?? scene.fallback.followup.question;
    appendMessage('narrator', question);
    renderHints((pendingFollowup?.options || []));
  }
}

function buildFinalNarration(result, baseNarration) {
  const lines = [];
  if (baseNarration) {
    lines.push(baseNarration.trim());
  }
  lines.push(`정렬 모자는 결국 ${houseNames[result.house]} 이름을 또렷하게 울려 퍼지게 했다.`);
  const keyMoments = result.keyMoments.filter(Boolean);
  if (keyMoments.length) {
    lines.push(`기억에 남은 순간: ${keyMoments.join(', ')}`);
  }
  return lines.join('\n\n');
}

function showFinalResult(result, baseNarration) {
  currentSceneContent = null;
  currentMode = 'finished';
  pendingFollowup = null;
  renderHints();
  const text = buildFinalNarration(result, baseNarration);
  appendMessage('narrator', text);
  setInteractionEnabled(false);
  setStatus('여정이 마무리되었습니다. 저장을 통해 기록을 남길 수 있습니다.', 'success');
}

async function renderScene(forceSceneId = null) {
  if (!engine.isCharacterReady()) {
    return;
  }
  const scene = forceSceneId ? SCENE_MAP[forceSceneId] : engine.getCurrentScene();
  if (!scene) {
    if (engine.state.finalResult) {
      showFinalResult(engine.state.finalResult, '');
    }
    return;
  }

  setInteractionEnabled(false);
  renderHints();
  const token = ++sceneRequestToken;
  let content = null;
  let error = null;

  if (apiKey) {
    const response = await requestSceneContent({ apiKey, model: modelId, scene, engine, cache });
    if (token !== sceneRequestToken) return;
    if (response.ok) {
      content = response.data;
      if (!response.cached) {
        setStatus('Gemini가 장면을 묘사했습니다.', 'success');
      }
    } else {
      error = response.error;
    }
  }

  if (!content) {
    content = scene.fallback;
    if (!apiKey) {
      setStatus('Gemini 키가 없어 준비된 이야기로 진행합니다.', 'info');
    } else if (error) {
      setStatus(`Gemini 응답 실패: ${error}. 준비된 이야기로 대체합니다.`, 'warning');
    }
  } else {
    setStatus('');
  }

  const safeContent = {
    narration: typeof content.narration === 'string' ? content.narration : '',
    choices: Array.isArray(content.choices) ? content.choices : [],
    followup: content.followup ?? null
  };
  await presentScene(scene, safeContent);
}

async function handleSceneInput(input) {
  if (!currentSceneContent || currentMode !== 'scene') {
    setInteractionEnabled(true);
    return;
  }
  const choices = currentSceneContent.choices || [];
  if (!choices.length) {
    setStatus('이 장면에서는 더 이상 선택할 수 없습니다.', 'warning');
    setInteractionEnabled(true);
    return;
  }

  markSceneSnapshot();
  appendMessage('player', input);
  setInteractionEnabled(false);

  let selected = null;
  if (apiKey) {
    const result = await interpretPlayerAction({
      apiKey,
      model: modelId,
      scene: engine.getCurrentScene(),
      engine,
      choices,
      playerInput: input
    });
    if (result.ok) {
      selected = choices.find(choice => choice.id === result.choiceId) || null;
      if (result.reason) {
        setStatus(`Gemini 해석: ${result.reason}`, 'info');
      }
    } else if (result.error) {
      setStatus(`응답 해석 실패: ${result.error}.`, 'warning');
    }
  }

  if (!selected) {
    selected = fallbackMatchChoice(input, choices);
  }

  if (!selected) {
    setStatus('행동을 이해하지 못했습니다. 다시 표현해 주세요.', 'warning');
    setInteractionEnabled(true);
    return;
  }

  markSceneSnapshot();
  const nextSceneId = engine.applyChoice(selected, currentSceneContent.narration, input);
  updateStatsPanel();
  updateUndoButton();
  currentSceneContent = null;
  setInteractionEnabled(true);
  await renderScene(nextSceneId);
}

async function handleFollowupInput(input) {
  if (!pendingFollowup) {
    setInteractionEnabled(true);
    return;
  }
  appendMessage('player', input);
  setInteractionEnabled(false);
  let index = null;
  if (apiKey) {
    const result = await interpretFollowupChoice({
      apiKey,
      model: modelId,
      followup: pendingFollowup,
      engine,
      playerInput: input
    });
    if (result.ok) {
      index = result.optionIndex;
      if (result.reason) {
        setStatus(`Gemini 해석: ${result.reason}`, 'info');
      }
    } else if (result.error) {
      setStatus(`해석 실패: ${result.error}.`, 'warning');
    }
  }
  if (typeof index !== 'number') {
    index = fallbackMatchFollowup(input, pendingFollowup.options);
  }
  const result = engine.applyFollowupSelection(index);
  updateStatsPanel();
  pendingFollowup = null;
  if (result) {
    showFinalResult(result, '');
  } else {
    setInteractionEnabled(true);
  }
}

async function handleInteractionSubmit(event) {
  event.preventDefault();
  const input = inputEl.value.trim();
  if (!input) return;
  inputEl.value = '';
  if (currentMode === 'character') {
    await handleCharacterInput(input);
  } else if (currentMode === 'followup') {
    await handleFollowupInput(input);
  } else if (currentMode === 'scene') {
    await handleSceneInput(input);
  } else {
    appendMessage('player', input);
  }
}

async function handleCharacterInput(answer) {
  const field = CHARACTER_FIELDS[characterStep];
  if (!field) return;
  appendMessage('player', answer);
  engine.setCharacterField(field.id, answer);
  updateStatsPanel();
  characterStep += 1;
  await requestNextCharacterPrompt();
}

async function requestNextCharacterPrompt() {
  currentMode = 'character';
  if (characterStep >= CHARACTER_FIELDS.length) {
    setInteractionEnabled(false);
    finalizeCharacterCreation();
    return;
  }
  setInteractionEnabled(false);
  const field = CHARACTER_FIELDS[characterStep];
  let content = null;
  let error = null;
  try {
    if (apiKey) {
      const response = await requestCharacterPrompt({
        apiKey,
        model: modelId,
        step: field,
        character: engine.state.character,
        abilities: engine.state.abilities
      });
      if (response.ok) {
        content = response.data;
      } else {
        error = response.error;
      }
    }
    if (!content) {
      if (error) {
        setStatus(`캐릭터 질문 생성 실패: ${error}.`, 'warning');
      }
      content = {
        narration: `입학 준비가 시작되었다. ${field.label}에 대해 생각해 보자.`,
        question: field.fallbackQuestion,
        suggestions: []
      };
    } else {
      setStatus('');
    }
    appendMessage('narrator', content.narration);
    appendMessage('narrator', content.question);
    renderHints(content.suggestions || []);
  } catch (err) {
    console.error(err);
    setStatus('캐릭터 질문을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'warning');
    appendMessage('system', '질문을 불러오지 못했습니다. 다시 시도하려면 입력란에 원하는 내용을 적어 주세요.');
  } finally {
    if (currentMode === 'character' && characterStep < CHARACTER_FIELDS.length) {
      setInteractionEnabled(true);
      inputEl?.focus();
    }
  }
}

function finalizeCharacterCreation() {
  const abilities = generateAbilities();
  engine.setAbilities(abilities);
  engine.markCharacterReady();
  const summaryInputs = {
    apiKey,
    model: modelId,
    character: engine.state.character,
    abilities
  };
  (async () => {
    let content = null;
    if (apiKey) {
      const response = await requestCharacterSummary(summaryInputs);
      if (response.ok) {
        content = response.data;
      }
    }
    if (!content) {
      const char = engine.state.character;
      const lines = [
        `${char.name || '이름 모를'} 학생의 호그와트 여정이 막 시작되려 한다.`,
        `몸과 마음의 준비를 끝낸 나는 급행 열차가 기다리는 역으로 향한다.`
      ];
      content = { narration: lines.join('\n') };
    }
    appendMessage('narrator', content.narration);
    const abilityLine = Object.entries(ABILITY_LABELS)
      .map(([key, label]) => `${label} ${abilities[key]}`)
      .join(', ');
    appendMessage('system', `초기 능력치: ${abilityLine}`);
    engine.state.keyMoments.push('자신만의 배경을 정리하고 호그와트로 떠났다.');
    updateStatsPanel();
    maybeGenerateCharacterPortrait(abilities);
    currentMode = 'scene';
    renderHints();
    renderScene();
  })();
}

function initApiKey() {
  apiKey = loadApiKey();
  const storedModel = loadModelId();
  if (storedModel) {
    modelId = storedModel;
  }
  if (!apiKey) {
    setStatus('Gemini 키를 입력하면 맞춤 묘사와 이미지 생성을 이용할 수 있습니다.', 'info');
  }
  updateAutoPortraitToggle();
}

function updateModelSelectState() {
  if (!modelSelect) return;
  const hasKey = apiKeyInput.value.trim().length > 0 || Boolean(apiKey);
  modelSelect.disabled = !hasKey;
}

function updateAutoPortraitToggle() {
  if (!autoPortraitToggle) return;
  const hasKey = Boolean(apiKey);
  autoPortraitToggle.disabled = !hasKey;
  autoPortraitToggle.checked = hasKey && autoPortraitEnabled;
}

function revokeImageUrls() {
  uploadedImages.forEach(item => {
    if (item.revokable) {
      URL.revokeObjectURL(item.url);
    }
  });
}

function renderUploadedImages() {
  if (!uploadedImagesEl) return;
  uploadedImagesEl.innerHTML = '';
  if (!uploadedImages.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-placeholder';
    empty.textContent = '업로드한 이미지가 없습니다.';
    uploadedImagesEl.appendChild(empty);
    if (clearImagesBtn) clearImagesBtn.disabled = true;
    return;
  }
  if (clearImagesBtn) clearImagesBtn.disabled = false;
  uploadedImages.forEach(item => {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = `${item.name} 미리보기`;
    img.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = item.origin ? `${item.name} · ${item.origin}` : item.name;
    figure.appendChild(img);
    figure.appendChild(caption);
    uploadedImagesEl.appendChild(figure);
  });
}

function clearUploadedImages() {
  revokeImageUrls();
  uploadedImages = [];
  renderUploadedImages();
  resetImagePreview();
  setStatus('업로드한 이미지를 모두 삭제했습니다.', 'info');
}

function addUploadedImages(fileList) {
  if (!fileList) return;
  const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  if (!files.length) {
    setStatus('이미지 파일만 업로드할 수 있습니다.', 'warning');
    return;
  }
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    uploadedImages.push({ name: file.name, url, origin: '사용자 업로드', revokable: true, mimeType: file.type });
  });
  renderUploadedImages();
  setStatus(`${files.length}개의 이미지를 추가했습니다.`, 'success');
}

function openModal() {
  modalBackdrop.classList.remove('hidden');
  apiKeyInput.value = apiKey;
  if (modelSelect) {
    const option = Array.from(modelSelect.options).find(opt => opt.value === modelId);
    modelSelect.value = option ? modelId : DEFAULT_MODEL;
    updateModelSelectState();
  }
  apiKeyInput.focus();
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

function restoreFromState() {
  resetConversation();
  conversationHistory.length = 0;
  if (engine.state.character?.name) {
    engine.markCharacterReady();
    const char = engine.state.character;
    appendMessage('narrator', `${char.name}의 여정이 이어지고 있다.`);
  }
  if (engine.state.abilities) {
    const abilityLine = Object.entries(ABILITY_LABELS)
      .map(([key, label]) => `${label} ${engine.state.abilities[key] ?? 0}`)
      .join(', ');
    appendMessage('system', `현재 능력치: ${abilityLine}`);
  }
  for (const entry of engine.state.transcript) {
    appendMessage('narrator', entry.narration);
    if (entry.playerInput) {
      appendMessage('player', entry.playerInput);
    }
  }
  updateStatsPanel();
  currentMode = engine.isFinished() ? 'finished' : (engine.isCharacterReady() ? 'scene' : 'character');
  if (engine.isFinished() && engine.state.finalResult) {
    showFinalResult(engine.state.finalResult, '');
  } else if (!engine.isCharacterReady()) {
    characterStep = 0;
    requestNextCharacterPrompt();
  } else {
    renderScene();
  }
}

function setupEventListeners() {
  toggleStatsBtn.addEventListener('click', () => {
    const hidden = statsPanelEl.classList.toggle('hidden');
    toggleStatsBtn.textContent = hidden ? '캐릭터 시트 보이기' : '캐릭터 시트 숨기기';
  });

  undoBtn.addEventListener('click', () => {
    const sceneId = engine.undo();
    restoreConversationSnapshot();
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
      updateUndoButton();
      restoreFromState();
    } else {
      setStatus('불러올 저장본이 없습니다.', 'warning');
    }
  });

  resetBtn.addEventListener('click', () => {
    engine.reset();
    characterStep = 0;
    currentMode = 'character';
    conversationHistory.length = 0;
    resetConversation();
    clearSavedGame();
    updateStatsPanel();
    updateUndoButton();
    setStatus('새로운 여정이 시작되었습니다.', 'info');
    requestNextCharacterPrompt();
  });

  apiKeyBtn.addEventListener('click', openModal);
  apiKeyCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', event => {
    if (event.target === modalBackdrop) closeModal();
  });

  if (imageGenerateBtn) {
    imageGenerateBtn.addEventListener('click', () => {
      openImageGenerator();
    });
  }
  if (imageModalCloseBtn) {
    imageModalCloseBtn.addEventListener('click', closeImageGenerator);
  }
  if (imageModalBackdrop) {
    imageModalBackdrop.addEventListener('click', event => {
      if (event.target === imageModalBackdrop) {
        closeImageGenerator();
      }
    });
  }
  if (imageSceneSelect) {
    imageSceneSelect.addEventListener('change', handleSceneSelectChange);
  }
  if (imageModalForm) {
    imageModalForm.addEventListener('submit', handleImageGeneration);
  }

  apiKeySaveBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    if (modelSelect && !modelSelect.disabled) {
      modelId = modelSelect.value;
      saveModelId(modelId);
    } else {
      modelId = DEFAULT_MODEL;
      saveModelId('');
    }
    saveApiKey(apiKey);
    updateAutoPortraitToggle();
    closeModal();
    updateModelSelectState();
    setStatus(apiKey ? `Gemini 키와 모델(${modelId})을 저장했습니다.` : 'Gemini 키가 제거되었습니다.', 'success');
    if (currentMode === 'character') {
      requestNextCharacterPrompt();
    } else {
      renderScene();
    }
  });

  apiKeyClearBtn.addEventListener('click', () => {
    apiKeyInput.value = '';
    apiKey = '';
    saveApiKey('');
    if (modelSelect) {
      modelSelect.value = DEFAULT_MODEL;
      modelId = DEFAULT_MODEL;
      saveModelId('');
      updateModelSelectState();
    }
    updateAutoPortraitToggle();
    closeModal();
    setStatus('Gemini 키를 삭제했습니다.', 'info');
  });

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      if (!modelSelect.disabled) {
        modelId = modelSelect.value;
      }
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', updateModelSelectState);
  }

  if (imageUploadBtn && imageUploadInput) {
    imageUploadBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', event => {
      addUploadedImages(event.target.files);
      imageUploadInput.value = '';
    });
  }

  if (clearImagesBtn) {
    clearImagesBtn.addEventListener('click', clearUploadedImages);
  }

  if (autoPortraitToggle) {
    updateAutoPortraitToggle();
    autoPortraitToggle.addEventListener('change', () => {
      if (!apiKey) {
        autoPortraitToggle.checked = false;
        autoPortraitEnabled = false;
        saveAutoPortraitEnabled(false);
        setStatus('Gemini 키를 먼저 입력하세요.', 'warning');
        return;
      }
      autoPortraitEnabled = autoPortraitToggle.checked;
      saveAutoPortraitEnabled(autoPortraitEnabled);
      setStatus(
        autoPortraitEnabled ? '캐릭터 생성 시 초상화를 자동 생성합니다.' : '자동 초상화 생성이 비활성화되었습니다.',
        autoPortraitEnabled ? 'success' : 'info'
      );
    });
  }

  formEl.addEventListener('submit', handleInteractionSubmit);
}

function bootstrap() {
  initApiKey();
  if (modelSelect) {
    const option = Array.from(modelSelect.options).find(opt => opt.value === modelId);
    modelSelect.value = option ? modelId : DEFAULT_MODEL;
    updateModelSelectState();
  }
  setupEventListeners();
  if (imageSceneSelect) {
    populateImageSceneOptions();
  } else {
    resetImagePreview();
  }
  updateStatsPanel();
  updateUndoButton();
  renderUploadedImages();
  resetConversation();
  requestNextCharacterPrompt();
}

window.addEventListener('beforeunload', revokeImageUrls);

bootstrap();
