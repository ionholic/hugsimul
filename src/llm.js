import { CHARACTER_CONTEXT, DISPOSITION_GUIDE } from './context.js';

export const DEFAULT_MODEL = 'gemini-2.5-pro';
export const IMAGE_MODEL = 'gemini-2.5-flash-image-preview';

function buildSystemPrompt() {
  return `너는 호그와트 행 여정을 함께 쓰는 공동 작가다. 묘사는 1인칭이고, 장면 전환과 점수 계산은 클라이언트가 담당한다.
저작권 문장을 복사하지 말고 창작 문장만 사용하라. 플레이어는 채팅으로 행동을 묘사하므로, 너는 항상 JSON 코드블록으로만 답한다.
"narration"은 2~5문장으로 현재 장면을 생생하게 전달하며, 직전 맥락을 반영해 개연성 있게 이어가라.
"choices"는 서로 다른 접근법(관찰, 협력, 기지 등)을 제시하여 자유 행동을 유도해야 하며 최소 세 개 이상이다.
각 choice의 hint에는 발더스 게이트식으로 관련 능력이나 태도, 성공 확률(예: "지능 판정 65%")과 리스크를 20자 내외로 요약하라.
choices에는 기숙사 이름이나 노골적인 점수 힌트를 담지 말고, followup은 정말 필요할 때만 제공한다.

${CHARACTER_CONTEXT}

${DISPOSITION_GUIDE}`;
}

function buildUserPrompt(scene, engine) {
  const summary = engine.getSummaryForLLM();
  const recent = engine.state.selectionHistory.slice(-3).map(entry => `${entry.sceneId}/${entry.choiceId}`).join(', ');
  const context = `현재 장면: ${scene.id} - ${scene.description}\n최근 상호작용: ${recent || '없음'}\n상태 요약: ${summary}`;
  return `${context}\n${scene.promptTemplate}\n선택지의 tags에는 필요한 경우 다음 중 복수의 값을 포함할 수 있다: G,R,H,S, REALISTIC, IDEALISTIC, INDIVIDUAL, COOPERATIVE, CHALLENGING, STABLE, SELF_DIRECTED, PASSIVE, SHORT_TERM, LONG_TERM, SPONTANEOUS, DELIBERATE.\nhint에는 (능력/성향 + 성공률%)과 위험을 요약한 짧은 문장을 넣어라.\nJSON 스키마:\n{"narration":"...","choices":[{"id":"a","label":"...","tags":["G"],"hint":"체력 판정 55%"}],"followup":null}\nJSON 코드블록으로만 답하라.`;
}

function buildClassificationSystemPrompt() {
  return `너는 플레이어의 자유로운 응답을 미리 준비된 선택지 중 하나에 가장 잘 맞게 분류하는 분석가다.
JSON 코드블록으로만 답하고, 선택한 id와 짧은 reason을 제공한다.`;
}

function buildClassificationUserPrompt({ scene, engine, choices, playerInput }) {
  const summary = engine.getSummaryForLLM();
  const list = choices.map(choice => `- ${choice.id}: ${choice.label}`).join('\n');
  return `장면: ${scene.id}\n상태 요약: ${summary}\n선택지:\n${list}\n플레이어 입력: ${playerInput}\nJSON 스키마:\n{"choiceId":"a","reason":"간단한 설명"}`;
}

function buildFollowupUserPrompt({ followup, engine, playerInput }) {
  const summary = engine.getSummaryForLLM();
  const list = followup.options.map((option, index) => `- ${index}: ${option}`).join('\n');
  return `정렬 모자 질문: ${followup.question}\n선택지:\n${list}\n상태 요약: ${summary}\n플레이어 입력: ${playerInput}\nJSON 스키마:\n{"optionIndex":0,"reason":"간단한 설명"}`;
}

function buildCharacterSystemPrompt() {
  return `너는 호그와트에 막 입학하는 학생의 배경을 묻는 인터뷰어다.
항상 JSON 코드블록으로만 답하고, 질문 전에는 짧은 장면 묘사를 덧붙인다.

${CHARACTER_CONTEXT}

${DISPOSITION_GUIDE}`;
}

function buildCharacterUserPrompt({ step, character }) {
  const answers = Object.entries(character)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
  return `이미 알려진 정보: ${answers || '없음'}\n질문해야 할 항목: ${step.label}\n2~3문장으로 장면을 묘사한 narration과 직접 묻는 question,
그리고 0~3개의 suggestions를 제공하라.\nJSON 스키마:\n{"narration":"...","question":"...","suggestions":["..."]}`;
}

function buildCharacterSummaryUserPrompt({ character, abilities }) {
  const info = Object.entries(character).map(([key, value]) => `${key}:${value}`).join(', ');
  const abilityLine = Object.entries(abilities).map(([key, value]) => `${key}:${value}`).join(', ');
  return `캐릭터 정보: ${info}\n능력치: ${abilityLine}\n호그와트로 떠나는 장면을 2~3문장으로 요약하고 JSON 코드블록 {"narration":"..."}만 반환하라.`;
}

function buildPortraitSystemPrompt() {
  return `너는 일러스트 아트 디렉터다. 플레이어의 정보를 바탕으로 호그와트 신입생의 초상화를 그릴 수 있도록 간결하고 구체적인 이미지 프롬프트를 만든다.
항상 JSON 코드블록만 반환한다. 작품은 창작 일러스트이며, 원작 인물 이름이나 기숙사 색상은 명시하지 않는다.`;
}

function buildPortraitUserPrompt({ character, abilities }) {
  const parts = [];
  for (const [key, value] of Object.entries(character)) {
    if (value) parts.push(`${key}:${value}`);
  }
  const abilityHighlights = Object.entries(abilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
  const bio = parts.join(', ') || '정보 없음';
  return `캐릭터 프로필: ${bio}\n강조할 능력: ${abilityHighlights || '무작위'}\n11세 마법학교 신입생의 허리 위 초상 일러스트 프롬프트를 한 문장으로 작성하고, 색감이나 분위기 메모를 caption으로 요약하라.
JSON 스키마:\n{"prompt":"...","caption":"..."}`;
}

export async function askGemini({ apiKey, model = DEFAULT_MODEL, sys, user }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${sys}\n\n${user}` }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
    safetySettings: []
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Gemini 오류: ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return text;
}

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (match) return match[1];
  const raw = text.trim();
  if (raw.startsWith('{') && raw.endsWith('}')) {
    return raw;
  }
  throw new Error('JSON 코드블록을 찾지 못함');
}

function validateSceneResponse(data) {
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
  if (typeof data.narration !== 'string') throw new Error('narration 누락');
  if (!Array.isArray(data.choices)) throw new Error('choices 배열 필요');
  if (data.choices.length > 0) {
    for (const choice of data.choices) {
      if (typeof choice.id !== 'string' || typeof choice.label !== 'string') {
        throw new Error('choice 형식 오류');
      }
      if (choice.tags && !Array.isArray(choice.tags)) {
        throw new Error('tags 배열 필요');
      }
    }
  }
  if (data.followup && (typeof data.followup.question !== 'string' || !Array.isArray(data.followup.options))) {
    throw new Error('followup 형식 오류');
  }
  return true;
}

function normalizeChoices(choices) {
  return choices.map(choice => ({
    id: choice.id,
    label: choice.label,
    tags: choice.tags ?? [],
    hint: choice.hint ?? null
  })).slice(0, 4);
}

function validateClassification(data) {
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
  if (typeof data.choiceId !== 'string') throw new Error('choiceId 필요');
  return true;
}

function validateFollowup(data) {
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
  if (typeof data.optionIndex !== 'number') throw new Error('optionIndex 필요');
  return true;
}

function validateCharacterPrompt(data) {
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
  if (typeof data.narration !== 'string') throw new Error('narration 필요');
  if (typeof data.question !== 'string') throw new Error('question 필요');
  if (data.suggestions && !Array.isArray(data.suggestions)) throw new Error('suggestions 배열 필요');
  return true;
}

function validateCharacterSummary(data) {
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
  if (typeof data.narration !== 'string') throw new Error('narration 필요');
  return true;
}

function validatePortraitPrompt(data) {
  if (typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
  if (typeof data.prompt !== 'string' || !data.prompt.trim()) throw new Error('prompt 필요');
  if (data.caption && typeof data.caption !== 'string') throw new Error('caption 형식 오류');
  return true;
}

export class GeminiCache {
  constructor() {
    this.map = new Map();
  }

  makeKey(sceneId, summary, model = DEFAULT_MODEL) {
    return `${model}|${sceneId}|${summary}`;
  }

  get(sceneId, summary, model = DEFAULT_MODEL) {
    return this.map.get(this.makeKey(sceneId, summary, model));
  }

  set(sceneId, summary, data, model = DEFAULT_MODEL) {
    this.map.set(this.makeKey(sceneId, summary, model), data);
  }
}

export async function requestSceneContent({ apiKey, model = DEFAULT_MODEL, scene, engine, cache }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const summary = engine.getSummaryForLLM();
  const cached = cache?.get(scene.id, summary, model);
  if (cached) {
    return { ok: true, data: cached, cached: true };
  }
  const sys = buildSystemPrompt();
  const user = buildUserPrompt(scene, engine);
  try {
    const text = await askGemini({ apiKey, model, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validateSceneResponse(data);
    const normalized = {
      narration: data.narration,
      choices: normalizeChoices(data.choices ?? []),
      followup: data.followup ?? null
    };
    const minChoices = scene.id === 'sorting' ? 0 : 3;
    if ((normalized.choices?.length ?? 0) < minChoices) {
      throw new Error('선택지가 충분하지 않음');
    }
    cache?.set(scene.id, summary, normalized, model);
    return { ok: true, data: normalized };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function interpretPlayerAction({ apiKey, model = DEFAULT_MODEL, scene, engine, choices, playerInput }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const sys = buildClassificationSystemPrompt();
  const user = buildClassificationUserPrompt({ scene, engine, choices, playerInput });
  try {
    const text = await askGemini({ apiKey, model, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validateClassification(data);
    return { ok: true, choiceId: data.choiceId, reason: data.reason ?? '' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function interpretFollowupChoice({ apiKey, model = DEFAULT_MODEL, followup, engine, playerInput }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const sys = buildClassificationSystemPrompt();
  const user = buildFollowupUserPrompt({ followup, engine, playerInput });
  try {
    const text = await askGemini({ apiKey, model, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validateFollowup(data);
    return { ok: true, optionIndex: data.optionIndex, reason: data.reason ?? '' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function requestCharacterPrompt({ apiKey, model = DEFAULT_MODEL, step, character }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const sys = buildCharacterSystemPrompt();
  const user = buildCharacterUserPrompt({ step, character });
  try {
    const text = await askGemini({ apiKey, model, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validateCharacterPrompt(data);
    return { ok: true, data: { narration: data.narration, question: data.question, suggestions: data.suggestions ?? [] } };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function requestCharacterSummary({ apiKey, model = DEFAULT_MODEL, character, abilities }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const sys = buildCharacterSystemPrompt();
  const user = buildCharacterSummaryUserPrompt({ character, abilities });
  try {
    const text = await askGemini({ apiKey, model, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validateCharacterSummary(data);
    return { ok: true, data: { narration: data.narration } };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function requestCharacterPortraitPrompt({ apiKey, model = DEFAULT_MODEL, character, abilities }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const sys = buildPortraitSystemPrompt();
  const user = buildPortraitUserPrompt({ character, abilities });
  try {
    const text = await askGemini({ apiKey, model, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validatePortraitPrompt(data);
    return { ok: true, data: { prompt: data.prompt, caption: data.caption ?? '' } };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function extractImagePayload(parts = []) {
  for (const part of parts) {
    if (part?.inlineData?.data) {
      return { type: 'inline', data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
    }
    if (part?.fileData?.fileUri) {
      return { type: 'file', uri: part.fileData.fileUri, mimeType: part.fileData.mimeType || 'image/png' };
    }
  }
  return null;
}

export async function requestImagePreview({ apiKey, prompt, initImage = null }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  if (!prompt?.trim()) {
    return { ok: false, error: '프롬프트가 필요합니다.' };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt.trim() }];
  if (initImage?.data) {
    parts.push({ inlineData: { data: initImage.data, mimeType: initImage.mimeType || 'image/png' } });
  }
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.4, responseMimeType: 'image/png' },
    safetySettings: []
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`Gemini 이미지 오류: ${res.status}`);
    }
    const data = await res.json();
    const candidate = data.candidates?.[0];
    const payload = extractImagePayload(candidate?.content?.parts || []);
    if (payload?.type === 'inline') {
      return { ok: true, data: { base64: payload.data, mimeType: payload.mimeType } };
    }
    if (payload?.type === 'file') {
      return { ok: true, data: { fileUrl: payload.uri, mimeType: payload.mimeType } };
    }
    const fallbackText = candidate?.content?.parts?.map(part => part.text).filter(Boolean).join(' ').trim();
    if (fallbackText) {
      return { ok: false, error: fallbackText };
    }
    return { ok: false, error: '이미지 데이터를 찾지 못했습니다.' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
