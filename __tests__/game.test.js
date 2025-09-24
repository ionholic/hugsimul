const {
  createInitialState,
  applyEffects,
  determineSorting,
  generateSortingSummary,
  saveGameState,
  loadGameState,
  clearGameState,
  validateScenes,
} = require('../game');

describe('정렬 로직', () => {
  test('용기 특성이 높은 경우 그리핀도르로 기운다', () => {
    const state = createInitialState();
    applyEffects(state, { traits: { G: 5 }, pref: { G: 2 }, rel: { G: 1 }, wand: { affinities: { G: 2 } } });
    const result = determineSorting(state);
    expect(result.best.key).toBe('G');
    expect(result.scores.G).toBeGreaterThan(result.scores.R);
  });

  test('근소한 차이는 tie로 처리되어 추가 질문 조건을 만든다', () => {
    const state = createInitialState();
    applyEffects(state, { traits: { R: 2, H: 2 }, pref: { R: 1 } });
    const result = determineSorting(state);
    expect(Math.abs(result.diff)).toBeLessThanOrEqual(0.6);
  });

  test('정리된 요약문이 주요 기록을 포함한다', () => {
    const state = createInitialState();
    applyEffects(state, {
      traits: { G: 2 },
      flags: { boldDeparture: true, helperFire: true },
      wand: { note: '용감한 결에 반응한다.' },
    });
    const result = determineSorting(state);
    const summary = generateSortingSummary(state, result);
    expect(summary).toContain('모자는 말한다');
    expect(summary).toContain('용감한 결');
  });
});

describe('저장 및 불러오기', () => {
  const mockStorage = () => {
    const store = new Map();
    return {
      setItem: (key, value) => store.set(key, value),
      getItem: (key) => store.get(key) || null,
      removeItem: (key) => store.delete(key),
    };
  };

  test('상태를 저장하고 다시 불러온다', () => {
    const state = createInitialState();
    applyEffects(state, { traits: { S: 3 }, pref: { S: 1 }, flags: { daringPlan: true } });
    const storage = mockStorage();
    const history = [createInitialState()];

    const saved = saveGameState(state, history, storage);
    expect(saved).toBe(true);

    const loaded = loadGameState(storage);
    expect(loaded.state.traits.S).toBe(state.traits.S);
    expect(loaded.history).toHaveLength(1);
  });

  test('저장 데이터 삭제', () => {
    const storage = mockStorage();
    const state = createInitialState();
    saveGameState(state, [], storage);
    clearGameState(storage);
    const loaded = loadGameState(storage);
    expect(loaded).toBeNull();
  });
});

describe('장면 유효성 검사', () => {
  test('모든 장면 연결이 유효하다', () => {
    const errors = validateScenes();
    expect(errors).toHaveLength(0);
  });
});
