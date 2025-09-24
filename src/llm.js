const DEFAULT_MODEL = 'gemini-1.5-pro';

function buildSystemPrompt() {
  return `너는 인터랙티브 픽션 묘사를 담당하는 공동 작가다. 게임은 1인칭 시점이며 장면 진행과 점수 계산은 클라이언트가 담당한다. 저작권 문장을 복사하지 말고 창작 문장만 사용하라. 각 장면에서 JSON 코드블록만 반환해야 하며, narration은 2~5문장, choices는 최대 4개다.`;
}

function buildUserPrompt(scene, engine) {
  const summary = engine.getSummaryForLLM();
  const recent = engine.state.selectionHistory.slice(-3).map(entry => `${entry.sceneId}/${entry.choiceId}`).join(', ');
  const context = `현재 장면: ${scene.id} - ${scene.description}\n최근 선택: ${recent || '없음'}\n상태 요약: ${summary}`;
  return `${context}\n${scene.promptTemplate}\nJSON 스키마:\n{"narration":"...","choices":[{"id":"a","label":"...","tags":["G"],"hint":"..."}],"followup":null}\nJSON 코드블록으로만 답하라.`;
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

function validateResponse(data) {
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

export class GeminiCache {
  constructor() {
    this.map = new Map();
  }

  makeKey(sceneId, summary) {
    return `${sceneId}|${summary}`;
  }

  get(sceneId, summary) {
    return this.map.get(this.makeKey(sceneId, summary));
  }

  set(sceneId, summary, data) {
    this.map.set(this.makeKey(sceneId, summary), data);
  }
}

export async function requestSceneContent({ apiKey, scene, engine, cache }) {
  if (!apiKey) {
    return { ok: false, error: 'API 키 없음' };
  }
  const summary = engine.getSummaryForLLM();
  const cached = cache?.get(scene.id, summary);
  if (cached) {
    return { ok: true, data: cached, cached: true };
  }
  const sys = buildSystemPrompt();
  const user = buildUserPrompt(scene, engine);
  try {
    const text = await askGemini({ apiKey, sys, user });
    const json = extractJsonBlock(text);
    const data = JSON.parse(json);
    validateResponse(data);
    const normalized = {
      narration: data.narration,
      choices: normalizeChoices(data.choices ?? []),
      followup: data.followup ?? null
    };
    cache?.set(scene.id, summary, normalized);
    return { ok: true, data: normalized };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
