/*
 * 호그와트 초대 여정 - 데이터 주도 인터랙티브 픽션
 *
 * 사용 방법:
 *  - index.html을 브라우저(크롬/사파리/파이어폭스 등)에서 직접 열면 오프라인으로 실행됩니다.
 *  - 저장하기 버튼은 현재 진행과 상태를 로컬스토리지에 기록하며, 불러오기를 누르면 이어서 플레이할 수 있습니다.
 *  - 장면 추가 시 아래 scenes 배열에 새로운 장면 객체를 추가하고, next 속성이 올바른 id를 가리키도록 합니다.
 *  - 새로운 상태 변화 키를 사용할 경우 applyEffects 함수와 상태 패널 렌더링을 함께 확장해 주세요.
 */
(function (globalScope) {
  const STORAGE_KEY = 'hogwarts_journey_state_v1';
  const MAX_TRAIT = 5;
  const MIN_TRAIT = -5;
  const HOUSE_KEYS = ['G', 'R', 'H', 'S'];
  const SCENE_ORDER = ['letter', 'diagon', 'platform', 'express', 'lake', 'sorting'];

  const houseNames = {
    G: '그리핀도르',
    R: '래번클로',
    H: '후플푸프',
    S: '슬리데린',
  };

  const traitNames = {
    G: '용기',
    R: '지성',
    H: '우정/성실',
    S: '야망/기지',
  };

  const scenes = [
    {
      id: 'letter',
      title: '초대장의 파동',
      text:
        '벽난로 위 양초가 흔들리고, 도착한 편지가 내 손가락 끝을 간질인다. 나는 진짜로 선택받은 걸까? 초대장은 낯선 잉크 냄새와 함께 새로운 삶을 약속하고 있다.',
      choices: [
        {
          label: '심장이 두근거리는 대로 짐을 꾸린다. 모험이 날 부르고 있다.',
          effects: {
            traits: { G: 1, H: 1 },
            pref: { G: 1 },
            flags: { boldDeparture: true },
            log: '두근거림을 따라 즉시 준비했다.'
          },
          next: 'diagon',
        },
        {
          label: '펜을 들어 초대장을 샅샅이 분석한다. 숨은 규칙을 놓치고 싶지 않다.',
          effects: {
            traits: { R: 2 },
            pref: { R: 1 },
            flags: { meticulous: true },
            log: '문장마다 규칙을 추적했다.'
          },
          next: 'diagon',
        },
        {
          label: '가족과 차분히 상의해 현실적인 체크리스트를 만든다.',
          effects: {
            traits: { H: 1, R: 1 },
            pref: { H: 1 },
            flags: { familyPlan: true },
            log: '가족과 함께 계획을 세웠다.'
          },
          next: 'diagon',
        },
        {
          label: '초대장에 숨겨진 암호를 해독해 더 많은 단서를 찾는다.',
          effects: {
            traits: { S: 1, R: 1 },
            pref: { S: 1 },
            flags: { secretive: true },
            log: '암호를 추적하며 한 발 더 나아갔다.'
          },
          next: 'diagon',
        },
      ],
    },
    {
      id: 'diagon',
      title: '다이애건 앨리의 결심',
      text:
        '돌바닥 아래 금화가 묵직하고, 상점마다 눈부신 물건이 속삭인다. 예산은 충분하지 않지만 내 여정에 맞는 선택을 해야 한다.',
      choices: [
        {
          label:
            '불사조 깃털이 든 호두나무 지팡이와 중고 교과서, 회색 부엉이를 데리고 떠난다. 감각과 연결을 믿는다.',
          effects: {
            traits: { R: 1, H: 1 },
            rel: { H: 1 },
            pref: { H: 1 },
            wand: {
              wood: '호두나무',
              core: '불사조 깃털',
              flexibility: '유연함',
              length: 31,
              affinities: { G: 1, R: 1, H: 1, S: 0 },
              note: '불사조 깃털이 감각을 일깨운다.'
            },
            inv: { gold: -34, books: '중고 세트', pet: '회색 부엉이', extras: ['예언자 일보 구독권'] },
            flags: { owlFriend: true },
            log: '감각적인 지팡이와 부엉이를 선택했다.'
          },
          next: 'platform',
        },
        {
          label:
            '단풍나무에 유니콘 꼬리털 지팡이, 새 교과서를 꼼꼼히 챙기고 펫 대신 보조 가방을 산다.',
          effects: {
            traits: { R: 1, H: 1 },
            pref: { R: 1, H: 1 },
            wand: {
              wood: '단풍나무',
              core: '유니콘 꼬리털',
              flexibility: '탄력 있음',
              length: 28,
              affinities: { R: 1, H: 1 },
              note: '유니콘의 순수가 집중력을 돕는다.'
            },
            inv: { gold: -30, books: '새 책 완전체', pet: '없음', extras: ['대용량 가방'] },
            flags: { prepared: true },
            log: '실용적인 도구들로 빈틈을 줄였다.'
          },
          next: 'platform',
        },
        {
          label:
            '검은가문 상점의 진한 오크와 용심장 지팡이를 들고, 값싼 중고 책과 비상약을 챙겨 골드를 남겨둔다.',
          effects: {
            traits: { S: 1, G: 1 },
            pref: { S: 1, G: 1 },
            wand: {
              wood: '짙은 오크',
              core: '용심장',
              flexibility: '단단함',
              length: 33,
              affinities: { G: 1, S: 2 },
              note: '용심장이 모험심을 자극한다.'
            },
            inv: { gold: -22, books: '중고 단권', pet: '작은 검은 고양이', extras: ['비상약 병'] },
            flags: { daringWand: true },
            log: '강렬한 지팡이와 여분의 비상약을 챙겼다.'
          },
          next: 'platform',
        },
      ],
    },
    {
      id: 'platform',
      title: '9와 3/4 승강장의 비밀',
      text:
        '벽 사이로 붉은 기관차의 증기가 스며든다. 이 바리케이드를 통과하는 방법은 아무도 직접 알려주지 않는다. 관찰과 결심이 필요하다.',
      choices: [
        {
          label: '붉은 스카프를 두른 쌍둥이가 뛰어드는 순간을 노려 그대로 돌진한다.',
          effects: {
            traits: { G: 2 },
            pref: { G: 1 },
            flags: { dashEntry: true },
            log: '순간을 잡아 전력으로 달려 들어갔다.'
          },
          next: 'express',
        },
        {
          label: '벽에 손을 대고 공기의 흐름을 계산해 타이밍을 맞춘다.',
          effects: {
            traits: { R: 2 },
            pref: { R: 1 },
            flags: { observedEntry: true },
            log: '증기의 리듬을 읽어 조심스레 통과했다.'
          },
          next: 'express',
        },
        {
          label: '길을 잃은 초보 마법사를 붙잡고 함께 손을 맞잡아 뛰어든다.',
          effects: {
            traits: { H: 2 },
            pref: { H: 1 },
            rel: { H: 1 },
            flags: { helpedRookie: true },
            log: '길 잃은 아이를 도와 함께 달렸다.'
          },
          next: 'express',
        },
        {
          label: '사람들 동선을 관찰하며 숨은 입구를 찾다가 빈 순간을 이용한다.',
          effects: {
            traits: { S: 2 },
            pref: { S: 1 },
            rel: { S: 1 },
            flags: { slyEntry: true },
            log: '틈을 노려 조용히 벽을 통과했다.'
          },
          next: 'express',
        },
      ],
    },
    {
      id: 'express',
      title: '호그와트 급행 쿠페',
      text:
        '쿠페 안에는 책 더미를 품은 윤과 호기롭게 초콜릿 개구리를 뽑는 마일로가 말다툼 중이다. 객차가 흔들리며 새로운 우정과 갈등이 시작된다.',
      choices: [
        {
          label: '윤과 마일로 사이에 앉아 둘이 서로의 장점을 말하게 중재한다.',
          effects: {
            traits: { G: 1, H: 1 },
            rel: { G: 1, H: 2 },
            flags: { mediator: true },
            log: '두 친구가 화해하도록 중재했다.'
          },
          next: 'lake',
        },
        {
          label: '윤과 함께 문제집을 풀며 정보 교환을 제안한다.',
          effects: {
            traits: { R: 2 },
            pref: { R: 1 },
            rel: { R: 2 },
            flags: { studyBuddy: true },
            log: '윤과 머리를 맞대고 학습 계획을 세웠다.'
          },
          next: 'lake',
        },
        {
          label: '마일로와 창밖 풍경을 보며 대담한 계획을 꾸민다.',
          effects: {
            traits: { G: 1, S: 1 },
            pref: { G: 1, S: 1 },
            rel: { G: 1, S: 2 },
            flags: { daringPlan: true },
            log: '마일로와 장난스러운 모험을 약속했다.'
          },
          next: 'lake',
        },
        {
          label: '둘의 다툼을 관찰하며 조용히 기록을 남긴다. 언젠가 유리할지 모른다.',
          effects: {
            traits: { R: 1, S: 1 },
            pref: { S: 1 },
            rel: { S: 1 },
            flags: { quietObservation: true },
            log: '거리두기로 상황을 분석했다.'
          },
          next: 'lake',
        },
      ],
    },
    {
      id: 'lake',
      title: '검은 호수의 첫 시험',
      text:
        '밤빛 속 작은 배들이 검은 호수를 가른다. 갑작스런 안개와 미약한 빛, 그리고 저편에서 들려오는 이상한 울음소리가 긴장을 더한다.',
      choices: [
        {
          label: '노를 쥐고 앞장서 배를 안정시킨다. 속도를 늦추더라도 모두를 지킨다.',
          effects: {
            traits: { G: 1, H: 1 },
            rel: { G: 1 },
            flags: { steadyPilot: true },
            log: '앞에서 노를 저어 안정을 찾았다.'
          },
          next: 'sorting',
        },
        {
          label: '안개 간격을 계산해 가장 짧은 항로를 찾는다.',
          effects: {
            traits: { R: 2 },
            pref: { R: 1 },
            flags: { cleverRoute: true },
            log: '호수의 소용돌이를 계산해 경로를 수정했다.'
          },
          next: 'sorting',
        },
        {
          label: '뒤처진 배에 마법의 불씨를 던져 길을 비춰준다.',
          effects: {
            traits: { H: 2 },
            rel: { H: 2 },
            flags: { helperFire: true },
            log: '뒤따르는 친구들을 위해 불빛을 나눴다.'
          },
          next: 'sorting',
        },
        {
          label: '안개 속 울음소리를 향해 방향을 틀어 희미한 형상을 조사한다.',
          effects: {
            traits: { S: 2 },
            rel: { S: 2 },
            flags: { lakeRisk: true },
            log: '위험을 감수하고 정체 모를 소리를 추적했다.'
          },
          next: 'sorting',
        },
        {
          label: '급행에서 중재했던 윤이 노 젓는 법을 알려주겠다고 나선다. 도움을 받아 효율을 높인다.',
          effects: {
            traits: { H: 1, R: 1 },
            rel: { H: 1, R: 1 },
            flags: { allyHelp: true },
            log: '도움을 받아 협력의 리듬을 맞췄다.'
          },
          requires: { flags: { mediator: true } },
          next: 'sorting',
        },
        {
          label: '마일로와 호흡을 맞춰 호수를 질주한다. 스릴이 목표다.',
          effects: {
            traits: { G: 1, S: 1 },
            rel: { G: 1, S: 1 },
            flags: { allyThrill: true },
            log: '모험을 즐기며 배를 몰았다.'
          },
          requires: { flags: { daringPlan: true } },
          next: 'sorting',
        },
      ],
    },
    {
      id: 'sorting',
      title: '대강당, 마법모자의 결정',
      text:
        '수천 개의 별빛이 떠 있는 대강당. 모자가 머리 위에서 속삭이며 내 마음과 기록된 선택들을 탐색한다.',
      sorting: {
        tieQuestion: {
          text: '모자가 망설인다. “네 마음 깊은 곳에 아직 갈림길이 있구나. 지금 무엇을 가장 중시하느냐?”',
          choices: [
            {
              label: '“위험하더라도 앞장서겠어요.”',
              effects: { pref: { G: 2 }, traits: { G: 1 }, log: '마지막 순간, 앞장설 용기를 다짐했다.' },
            },
            {
              label: '“모든 퍼즐을 이해하고 싶어요.”',
              effects: { pref: { R: 2 }, traits: { R: 1 }, log: '지식을 갈망한다고 고백했다.' },
            },
            {
              label: '“친구와 함께 웃을 자리를 원해요.”',
              effects: { pref: { H: 2 }, traits: { H: 1 }, log: '공동체를 선택하겠다고 속삭였다.' },
            },
            {
              label: '“목표를 이룰 힘을 주세요.”',
              effects: { pref: { S: 2 }, traits: { S: 1 }, log: '목표를 위해 힘을 구했다.' },
            },
          ],
        },
      },
      choices: [],
    },
  ];

  function createInitialState() {
    return {
      sceneId: 'letter',
      traits: { G: 0, R: 0, H: 0, S: 0 },
      pref: { G: 0, R: 0, H: 0, S: 0 },
      rel: { G: 0, R: 0, H: 0, S: 0 },
      wand: {
        wood: '미정',
        core: '미정',
        flexibility: '미정',
        length: null,
        affinities: { G: 0, R: 0, H: 0, S: 0 },
        note: '지팡이는 아직 성향을 드러내지 않았다.',
      },
      inv: { gold: 40, books: '없음', pet: '없음', extras: [] },
      flags: {},
      log: [],
      assignment: null,
      _sorting: {
        tieResolved: false,
        summary: null,
      },
    };
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function ensureHouseKeys(obj) {
    HOUSE_KEYS.forEach((key) => {
      if (typeof obj[key] !== 'number') {
        obj[key] = 0;
      }
    });
    return obj;
  }

  function mergeArrayUnique(base = [], addition = []) {
    const set = new Set(base);
    addition.forEach((item) => {
      if (item != null) {
        set.add(item);
      }
    });
    return Array.from(set);
  }

  function pushLog(state, entry) {
    if (!entry) return;
    if (!Array.isArray(state.log)) {
      state.log = [];
    }
    state.log.push(entry);
  }

  function applyEffects(state, effects = {}) {
    if (!effects) return state;

    if (effects.traits) {
      state.traits = ensureHouseKeys({ ...state.traits });
      HOUSE_KEYS.forEach((key) => {
        const value = effects.traits[key];
        if (typeof value === 'number') {
          state.traits[key] = clampValue(state.traits[key] + value, MIN_TRAIT, MAX_TRAIT);
        }
      });
    }

    if (effects.pref) {
      state.pref = ensureHouseKeys({ ...state.pref });
      HOUSE_KEYS.forEach((key) => {
        const value = effects.pref[key];
        if (typeof value === 'number') {
          state.pref[key] = clampValue(state.pref[key] + value, MIN_TRAIT, MAX_TRAIT);
        }
      });
    }

    if (effects.rel) {
      state.rel = ensureHouseKeys({ ...state.rel });
      HOUSE_KEYS.forEach((key) => {
        const value = effects.rel[key];
        if (typeof value === 'number') {
          state.rel[key] = clampValue(state.rel[key] + value, MIN_TRAIT, MAX_TRAIT);
        }
      });
    }

    if (effects.inv) {
      state.inv = { ...state.inv };
      Object.entries(effects.inv).forEach(([key, value]) => {
        if (key === 'extras' && Array.isArray(value)) {
          state.inv.extras = mergeArrayUnique(state.inv.extras, value);
        } else if (typeof value === 'number' && typeof state.inv[key] === 'number') {
          state.inv[key] += value;
        } else {
          state.inv[key] = value;
        }
      });
    }

    if (effects.wand) {
      const current = state.wand || {};
      const affinities = ensureHouseKeys({ ...(current.affinities || {}) });
      const newAffinities = ensureHouseKeys({ ...(effects.wand.affinities || {}) });
      state.wand = {
        wood: effects.wand.wood || current.wood || '미정',
        core: effects.wand.core || current.core || '미정',
        flexibility: effects.wand.flexibility || current.flexibility || '미정',
        length: effects.wand.length != null ? effects.wand.length : current.length,
        note: effects.wand.note || current.note || '',
        affinities: HOUSE_KEYS.reduce((acc, key) => {
          acc[key] = clampValue((affinities[key] || 0) + (newAffinities[key] || 0), MIN_TRAIT, MAX_TRAIT);
          return acc;
        }, {}),
      };
    }

    if (effects.flags) {
      state.flags = { ...state.flags, ...effects.flags };
    }

    if (effects.log) {
      pushLog(state, effects.log);
    }

    return state;
  }

  function isChoiceAvailable(choice, state) {
    if (!choice.requires) return true;
    const { flags } = choice.requires;
    if (flags) {
      return Object.entries(flags).every(([key, expected]) => state.flags && state.flags[key] === expected);
    }
    return true;
  }

  function findScene(id) {
    return scenes.find((scene) => scene.id === id);
  }

  function computeScores(state) {
    const wandAff = ensureHouseKeys({ ...(state.wand?.affinities || {}) });
    const scores = {};
    HOUSE_KEYS.forEach((key) => {
      const base = (state.traits[key] || 0) * 0.6 + (state.rel[key] || 0) * 0.2 + (wandAff[key] || 0) * 0.2;
      scores[key] = base + (state.pref[key] || 0) * 0.2;
    });
    return scores;
  }

  function rankScores(scores) {
    return Object.entries(scores)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  function determineSorting(state) {
    const scores = computeScores(state);
    const ranked = rankScores(scores);
    const best = ranked[0];
    const second = ranked[1];
    const diff = best.value - second.value;
    return { scores, ranked, best, second, diff };
  }

  function generateSortingSummary(state, sortingResult) {
    const { best } = sortingResult;
    const contributions = [];

    // 주요 선택 기록 기반 문장 구성
    if (state.flags.boldDeparture) {
      contributions.push('초대장을 받자마자 움직인 용기');
    }
    if (state.flags.meticulous) {
      contributions.push('세부를 놓치지 않는 분석력');
    }
    if (state.flags.familyPlan) {
      contributions.push('사람들과 보조를 맞춘 차분함');
    }
    if (state.flags.secretive) {
      contributions.push('감춰둔 호기심과 기지');
    }
    if (state.flags.mediator) {
      contributions.push('급행에서 갈등을 풀어낸 협동심');
    }
    if (state.flags.daringPlan) {
      contributions.push('마일로와 꿈꾼 대담한 계획');
    }
    if (state.flags.studyBuddy) {
      contributions.push('윤과 공유한 학구열');
    }
    if (state.flags.helperFire) {
      contributions.push('검은 호수에서 나눈 불빛');
    }
    if (state.flags.lakeRisk) {
      contributions.push('안개 속 위험을 향한 발걸음');
    }

    const wandNote = state.wand?.note ? `지팡이는 ${state.wand.note}` : null;

    const pieces = contributions.slice(0, 3);
    if (wandNote) {
      pieces.push(wandNote);
    }

    const summaryText = pieces.length
      ? `${houseNames[best.key]}에 어울린다고 모자는 말한다. ${pieces.join(' · ')}`
      : `${houseNames[best.key]}에 어울린다고 모자는 조용히 속삭인다.`;

    return summaryText;
  }

  function saveGameState(state, history, storage) {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!targetStorage) return false;
    try {
      const payload = JSON.stringify({ state, history });
      targetStorage.setItem(STORAGE_KEY, payload);
      return true;
    } catch (error) {
      console.error('저장 실패', error);
      return false;
    }
  }

  function loadGameState(storage) {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!targetStorage) return null;
    try {
      const raw = targetStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (error) {
      console.error('불러오기 실패', error);
      return null;
    }
  }

  function clearGameState(storage) {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!targetStorage) return;
    targetStorage.removeItem(STORAGE_KEY);
  }

  function validateScenes() {
    const ids = new Set(scenes.map((scene) => scene.id));
    const errors = [];
    scenes.forEach((scene) => {
      if (Array.isArray(scene.choices)) {
        scene.choices.forEach((choice) => {
          if (choice.next && !ids.has(choice.next)) {
            errors.push(`장면 ${scene.id}의 선택지가 존재하지 않는 다음 장면 ${choice.next}를 가리킵니다.`);
          }
        });
      }
    });
    return errors;
  }

  // UI 렌더링 ---------------------------------------------------------------
  let currentState = createInitialState();
  let historyStack = [];

  function updateProgress(sceneId) {
    const index = SCENE_ORDER.indexOf(sceneId);
    const total = SCENE_ORDER.length;
    const progressElement = document.getElementById('scene-progress');
    if (progressElement) {
      if (index >= 0) {
        progressElement.textContent = `${index + 1} / ${total}`;
      } else {
        progressElement.textContent = `${total} / ${total}`;
      }
    }
  }

  function renderStats() {
    const traitsContainer = document.getElementById('traits');
    const prefContainer = document.getElementById('pref');
    const relContainer = document.getElementById('relationships');
    const wandContainer = document.getElementById('wand');
    const invContainer = document.getElementById('inventory');

    if (traitsContainer) {
      traitsContainer.innerHTML = '';
      HOUSE_KEYS.forEach((key) => {
        const value = currentState.traits[key] || 0;
        const wrapper = document.createElement('div');
        const label = document.createElement('div');
        label.className = 'stat-label';
        label.textContent = `${traitNames[key]}: ${value}`;
        const bar = document.createElement('div');
        bar.className = 'stat-bar';
        const span = document.createElement('span');
        const ratio = (value + MAX_TRAIT) / (MAX_TRAIT - MIN_TRAIT);
        span.style.setProperty('--ratio', ratio.toFixed(2));
        bar.appendChild(span);
        wrapper.appendChild(label);
        wrapper.appendChild(bar);
        traitsContainer.appendChild(wrapper);
      });
    }

    if (prefContainer) {
      prefContainer.innerHTML = '';
      HOUSE_KEYS.forEach((key) => {
        const value = currentState.pref[key] || 0;
        const wrapper = document.createElement('div');
        const label = document.createElement('div');
        label.className = 'stat-label';
        label.textContent = `${houseNames[key]} 선호: ${value}`;
        const bar = document.createElement('div');
        bar.className = 'stat-bar';
        const span = document.createElement('span');
        const ratio = (value + MAX_TRAIT) / (MAX_TRAIT - MIN_TRAIT);
        span.style.setProperty('--ratio', ratio.toFixed(2));
        bar.appendChild(span);
        wrapper.appendChild(label);
        wrapper.appendChild(bar);
        prefContainer.appendChild(wrapper);
      });
    }

    if (relContainer) {
      relContainer.innerHTML = HOUSE_KEYS.map((key) => {
        const value = currentState.rel[key] || 0;
        return `<div>${houseNames[key]} 계열 인연: ${value}</div>`;
      }).join('');
    }

    if (wandContainer) {
      const wand = currentState.wand || {};
      const lengthText = wand.length ? `${wand.length} cm` : '미정';
      wandContainer.innerHTML = `
        <div>나무: ${wand.wood || '미정'}</div>
        <div>심: ${wand.core || '미정'}</div>
        <div>유연성: ${wand.flexibility || '미정'}</div>
        <div>길이: ${lengthText}</div>
        <div>성향: ${HOUSE_KEYS.map((key) => `${houseNames[key]} ${wand.affinities?.[key] || 0}`).join(', ')}</div>
        <div>${wand.note || ''}</div>
      `;
    }

    if (invContainer) {
      const extras = currentState.inv.extras?.length
        ? currentState.inv.extras.join(', ')
        : '없음';
      invContainer.innerHTML = `
        <div>골드: ${currentState.inv.gold}</div>
        <div>교과서: ${currentState.inv.books}</div>
        <div>동물: ${currentState.inv.pet}</div>
        <div>기타: ${extras}</div>
      `;
    }
  }

  function focusFirstChoice() {
    const firstButton = document.querySelector('.choice-button');
    if (firstButton) {
      firstButton.focus();
    }
  }

  function handleSortingScene(scene) {
    const sceneTitle = document.getElementById('scene-title');
    const sceneText = document.getElementById('scene-text');
    const choicesContainer = document.getElementById('choices');
    if (!sceneTitle || !sceneText || !choicesContainer) return;

    const sortingResult = determineSorting(currentState);
    const tieThreshold = 1.2;
    const isTie = sortingResult.diff <= tieThreshold && !currentState._sorting.tieResolved;

    if (isTie) {
      sceneTitle.textContent = scene.title;
      sceneText.textContent = `${scene.text} 모자는 상위 두 기숙사(${houseNames[sortingResult.best.key]} vs ${houseNames[sortingResult.second.key]}) 사이에서 고심한다.`;
      choicesContainer.innerHTML = '';
      scene.sorting.tieQuestion.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice-button';
        button.textContent = choice.label;
        button.setAttribute('data-choice-index', index);
        button.addEventListener('click', () => {
          historyStack.push(cloneState(currentState));
          applyEffects(currentState, choice.effects);
          currentState._sorting.tieResolved = true;
          renderScene(scene.id);
        });
        choicesContainer.appendChild(button);
      });
      focusFirstChoice();
      return;
    }

    const summary = generateSortingSummary(currentState, sortingResult);
    currentState.assignment = sortingResult.best.key;
    currentState._sorting.summary = summary;
    currentState._sorting.tieResolved = true;

    sceneTitle.textContent = `${scene.title} — 배정 완료`;
    const scoreLines = sortingResult.ranked
      .map((item) => `${houseNames[item.key]}: ${item.value.toFixed(2)}`)
      .join(' / ');
    sceneText.innerHTML = `${summary}<br><br><strong>점수</strong>: ${scoreLines}`;
    choicesContainer.innerHTML = '';
    const epilogue = document.createElement('div');
    epilogue.className = 'story-text';
    const logLines = currentState.log.slice(-5).map((entry) => `• ${entry}`);
    epilogue.innerHTML = `<p>최근 선택</p><p>${logLines.join('<br>')}</p>`;
    choicesContainer.appendChild(epilogue);
  }

  function renderScene(sceneId) {
    const scene = findScene(sceneId);
    if (!scene) return;

    currentState.sceneId = sceneId;
    updateProgress(sceneId);

    const sceneTitle = document.getElementById('scene-title');
    const sceneText = document.getElementById('scene-text');
    const choicesContainer = document.getElementById('choices');

    if (!sceneTitle || !sceneText || !choicesContainer) return;

    if (sceneId === 'sorting') {
      handleSortingScene(scene);
      renderStats();
      return;
    }

    sceneTitle.textContent = scene.title;
    sceneText.textContent = scene.text;
    choicesContainer.innerHTML = '';

    const availableChoices = scene.choices.filter((choice) => isChoiceAvailable(choice, currentState));
    availableChoices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.textContent = choice.label;
      button.setAttribute('data-choice-index', index);
      button.addEventListener('click', () => {
        historyStack.push(cloneState(currentState));
        applyEffects(currentState, choice.effects);
        if (choice.next) {
          renderScene(choice.next);
        }
      });
      choicesContainer.appendChild(button);
    });

    focusFirstChoice();
    renderStats();
  }

  function undoLastAction() {
    if (historyStack.length === 0) {
      return;
    }
    const previous = historyStack.pop();
    if (previous) {
      currentState = previous;
      renderScene(currentState.sceneId);
    }
  }

  function restartGame() {
    currentState = createInitialState();
    historyStack = [];
    renderScene(currentState.sceneId);
  }

  function saveCurrentGame() {
    const saved = saveGameState(cloneState(currentState), historyStack.map(cloneState));
    if (saved && typeof window !== 'undefined') {
      window.alert('현재 진행을 저장했습니다.');
    }
  }

  function loadSavedGame() {
    const loaded = loadGameState();
    if (loaded && loaded.state) {
      currentState = loaded.state;
      historyStack = Array.isArray(loaded.history) ? loaded.history : [];
      renderScene(currentState.sceneId);
      if (typeof window !== 'undefined') {
        window.alert('저장된 진행을 불러왔습니다.');
      }
    } else if (typeof window !== 'undefined') {
      window.alert('저장된 진행이 없습니다.');
    }
  }

  function bindUI() {
    const undoButton = document.getElementById('undo');
    const restartButton = document.getElementById('restart');
    const saveButton = document.getElementById('save');
    const loadButton = document.getElementById('load');
    const toggleButton = document.querySelector('.panel-toggle');
    const statusPanel = document.getElementById('status-panel');

    if (undoButton) undoButton.addEventListener('click', undoLastAction);
    if (restartButton) restartButton.addEventListener('click', restartGame);
    if (saveButton) saveButton.addEventListener('click', saveCurrentGame);
    if (loadButton) loadButton.addEventListener('click', loadSavedGame);

    if (toggleButton && statusPanel) {
      toggleButton.addEventListener('click', () => {
        const open = statusPanel.classList.toggle('open');
        toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const focused = document.activeElement;
        if (focused && focused.classList.contains('choice-button')) {
          focused.click();
        }
      }
    });
  }

  if (typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      bindUI();
      const saved = loadGameState();
      if (saved && saved.state) {
        currentState = saved.state;
        historyStack = Array.isArray(saved.history) ? saved.history : [];
      }
      renderScene(currentState.sceneId);
    });
  }

  const api = {
    scenes,
    createInitialState,
    cloneState,
    applyEffects,
    computeScores,
    determineSorting,
    generateSortingSummary,
    saveGameState,
    loadGameState,
    clearGameState,
    validateScenes,
    constants: {
      STORAGE_KEY,
      MAX_TRAIT,
      MIN_TRAIT,
      HOUSE_KEYS,
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.HogGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
