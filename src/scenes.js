const TAG_TO_TRAIT = {
  G: 'G',
  R: 'R',
  H: 'H',
  S: 'S'
};

const TAG_TO_DISPOSITION = {
  REALISTIC: 'realistic',
  IDEALISTIC: 'idealistic',
  INDIVIDUAL: 'individual',
  COOPERATIVE: 'cooperative',
  CHALLENGING: 'challenging',
  STABLE: 'stable',
  SELF_DIRECTED: 'selfDirected',
  PASSIVE: 'passive',
  SHORT_TERM: 'shortTerm',
  LONG_TERM: 'longTerm',
  SPONTANEOUS: 'spontaneous',
  DELIBERATE: 'deliberate'
};

export const HOUSE_KEYS = ['G', 'R', 'H', 'S'];
export const DISPOSITION_KEYS = Array.from(new Set(Object.values(TAG_TO_DISPOSITION)));

export const SCENES = [
  {
    id: 'letter',
    description: '초대장을 받고 취향과 기대를 확인하는 도입부',
    promptTemplate: `장면: letter. 나는 편지를 받고 짐을 꾸릴 준비를 한다. 플레이어의 기숙사 선호 경향을 가늠할 질문을 제안해라.`,
    fallback: {
      narration: '울퉁불퉁한 봉투를 펼치자 온몸이 뜨거워졌다. 나는 새 삶이 시작될 예감 속에서 곧바로 마음을 다잡았다. 어쩌면 이번 여정은 나의 어느 면을 가장 밝게 비출지 스스로에게 묻고 싶어졌다.',
      choices: [
        {
          id: 'letter-bold',
          label: '새로운 위험이 있더라도 한 번쯤은 뛰어들겠다고 마음먹는다.',
          tags: ['G', 'CHALLENGING', 'SPONTANEOUS', 'SELF_DIRECTED', 'SHORT_TERM', 'INDIVIDUAL'],
          hint: '체력 판정 60% · 실패 시 체력 소모'
        },
        {
          id: 'letter-mind',
          label: '수업 계획부터 교과서를 꿰뚫어보며 차분히 준비한다.',
          tags: ['R', 'DELIBERATE', 'LONG_TERM', 'STABLE', 'REALISTIC'],
          hint: '지능 판정 70% · 준비에 시간 소요'
        },
        {
          id: 'letter-kind',
          label: '가족과 친구들에게 자주 편지를 쓰겠다고 다짐한다.',
          tags: ['H', 'COOPERATIVE', 'IDEALISTIC', 'LONG_TERM', 'STABLE'],
          hint: '매력 판정 75% · 정서적 약속'
        },
        {
          id: 'letter-clever',
          label: '학교 규칙과 빈틈을 미리 연구해 둘 요량이다.',
          tags: ['S', 'INDIVIDUAL', 'REALISTIC', 'SELF_DIRECTED', 'LONG_TERM'],
          hint: '지능 판정 65% · 실패 시 규칙 오해'
        }
      ],
      followup: null
    },
    processChoice(state, choiceId) {
      const effects = { pref: {}, traits: {}, keyMoment: '' };
      if (choiceId === 'letter-bold') {
        effects.pref.G = 2;
        effects.traits.G = 1;
        effects.keyMoment = '초대장을 받자 용기를 우선시했다.';
      } else if (choiceId === 'letter-mind') {
        effects.pref.R = 2;
        effects.traits.R = 1;
        effects.keyMoment = '입학 전부터 공부 계획을 세웠다.';
      } else if (choiceId === 'letter-kind') {
        effects.pref.H = 2;
        effects.traits.H = 1;
        effects.keyMoment = '주변과의 유대를 약속했다.';
      } else {
        effects.pref.S = 2;
        effects.traits.S = 1;
        effects.keyMoment = '규칙의 빈틈을 살피며 기지를 다졌다.';
      }
      return { effects, nextScene: 'diagon' };
    }
  },
  {
    id: 'diagon',
    description: '다이애건 앨리에서 지팡이와 장비를 고르는 장면',
    promptTemplate: `장면: diagon. 나는 다이애건 앨리에서 지팡이를 고르고 여행 자금을 배분한다. 선택마다 성향을 암시하고 지팡이 궁합을 조정하도록 묘사하라.`,
    fallback: {
      narration: '돌바닥 골목은 마법책 냄새와 구두굽 소리로 가득했다. 상점마다 나를 붙잡는 유혹이 넘쳤고, 특히 지팡이 가게에서는 손끝이 저릿해질 만큼 강한 마력이 감돌았다. 나는 예산을 어떻게 써야 할지 심호흡을 하며 고민했다.',
      choices: [
        {
          id: 'diagon-dragon',
          label: '흑단에 드래곤 심줄이 박힌 지팡이를 선택하고 다른 장비는 중고로 구한다.',
          tags: ['G', 'S', 'CHALLENGING', 'SPONTANEOUS', 'SELF_DIRECTED', 'SHORT_TERM'],
          hint: '마력 판정 55% · 예산 압박'
        },
        {
          id: 'diagon-willow',
          label: '버드나무 재질의 유연한 지팡이와 필기구 세트를 구입한다.',
          tags: ['R', 'DELIBERATE', 'LONG_TERM', 'STABLE', 'IDEALISTIC'],
          hint: '지능 판정 70% · 꼼꼼한 장보기'
        },
        {
          id: 'diagon-badger',
          label: '집요정이 추천한 튼튼한 지팡이와 공동 기숙사 생활용품을 챙긴다.',
          tags: ['H', 'COOPERATIVE', 'IDEALISTIC', 'LONG_TERM', 'STABLE'],
          hint: '매력 판정 65% · 동행 신뢰도 상승'
        },
        {
          id: 'diagon-fox',
          label: '은밀한 지팡이와 보호 부적을 사고 남은 돈은 비상금으로 숨긴다.',
          tags: ['S', 'INDIVIDUAL', 'REALISTIC', 'SELF_DIRECTED', 'LONG_TERM', 'DELIBERATE'],
          hint: '기지 판정 60% · 적발 시 경고'
        }
      ],
      followup: null
    },
    processChoice(state, choiceId) {
      const effects = { wand: {}, traits: {}, rel: {}, keyMoment: '' };
      switch (choiceId) {
        case 'diagon-dragon':
          effects.wand.G = 1.5;
          effects.wand.S = 0.5;
          effects.traits.G = 0.5;
          effects.keyMoment = '강력한 지팡이를 택하며 모험을 감수했다.';
          break;
        case 'diagon-willow':
          effects.wand.R = 1.6;
          effects.traits.R = 0.5;
          effects.keyMoment = '안정적인 학업 준비를 우선했다.';
          break;
        case 'diagon-badger':
          effects.wand.H = 1.6;
          effects.rel.H = 0.5;
          effects.keyMoment = '공동체를 염두에 둔 장비를 챙겼다.';
          break;
        case 'diagon-fox':
        default:
          effects.wand.S = 1.6;
          effects.traits.S = 0.5;
          effects.keyMoment = '위기 대비를 위해 비상금을 숨겼다.';
          break;
      }
      return { effects, nextScene: 'platform' };
    }
  },
  {
    id: 'platform',
    description: '9와 3/4 승강장 진입 퍼즐',
    promptTemplate: `장면: platform. 기차역에서 벽을 통과해야 한다. 관찰력, 협력, 기지를 드러내는 선택지를 제시하라.`,
    fallback: {
      narration: '킹스크로스 역의 아홉과 열 사이 기둥 앞에서 마음이 잠시 멈췄다. 주변에는 붉은 수레와 긴 머플러를 두른 이들이 분주히 오가고 있었다. 나는 숨을 고르고 뛰어들 타이밍을 고민했다.',
      choices: [
        {
          id: 'platform-scout',
          label: '몰래 주변 가족을 살피며 통과하는 각도를 연구한다.',
          tags: ['R', 'S', 'REALISTIC', 'DELIBERATE', 'LONG_TERM', 'STABLE'],
          hint: '지능 판정 68% · 실패 시 시간 지연'
        },
        {
          id: 'platform-dash',
          label: '수레를 단단히 잡고 전력으로 달려 벽을 뚫는다.',
          tags: ['G', 'CHALLENGING', 'SPONTANEOUS', 'SELF_DIRECTED', 'SHORT_TERM'],
          hint: '체력 판정 62% · 실패 시 멍투성이'
        },
        {
          id: 'platform-buddy',
          label: '길 잃은 신입생과 손을 잡고 함께 달린다.',
          tags: ['H', 'G', 'COOPERATIVE', 'IDEALISTIC', 'SELF_DIRECTED', 'LONG_TERM'],
          hint: '매력 판정 66% · 함께 넘어진다'
        },
        {
          id: 'platform-delegate',
          label: '짐꾼에게 기차표를 보여 주고 은근히 도움을 청한다.',
          tags: ['S', 'INDIVIDUAL', 'REALISTIC', 'PASSIVE', 'SHORT_TERM'],
          hint: '기지 판정 55% · 들키면 창피'
        }
      ],
      followup: null
    },
    processChoice(state, choiceId) {
      const effects = { traits: {}, rel: {}, keyMoment: '' };
      if (choiceId === 'platform-scout') {
        effects.traits.R = 1;
        effects.traits.S = 0.5;
        effects.keyMoment = '승강장 벽을 분석해 안전하게 통과했다.';
      } else if (choiceId === 'platform-dash') {
        effects.traits.G = 1.2;
        effects.keyMoment = '고민보다 돌진을 택했다.';
      } else if (choiceId === 'platform-buddy') {
        effects.traits.H = 1;
        effects.rel.H = 0.6;
        effects.traits.G = 0.4;
        effects.keyMoment = '다른 신입생과 함께 달려 연대감을 쌓았다.';
      } else {
        effects.traits.S = 1;
        effects.rel.S = 0.4;
        effects.keyMoment = '은밀하게 도움을 구해 벽을 통과했다.';
      }
      return { effects, nextScene: 'express' };
    }
  },
  {
    id: 'express',
    description: '급행 열차 쿠페에서의 갈등 조정',
    promptTemplate: `장면: express. 열차 쿠페에서 학생들 사이의 갈등이나 사건에 대응한다. 관계와 성향에 영향을 주는 선택지를 만들어라.`,
    fallback: {
      narration: '급행 열차는 증기와 웃음, 가끔 튀어나오는 부엉이 울음소리로 가득했다. 같은 쿠페에 탄 학생 둘이 사탕 봉지를 두고 언성을 높였다. 분위기가 더 험악해지기 전에 내가 움직여야 했다.',
      choices: [
        {
          id: 'express-mediator',
          label: '차분히 사정을 묻고 사탕을 나누게 중재한다.',
          tags: ['H', 'R', 'COOPERATIVE', 'IDEALISTIC', 'DELIBERATE', 'LONG_TERM'],
          hint: '매력 판정 70% · 설득 실패 시 역효과'
        },
        {
          id: 'express-challenge',
          label: '큰소리로 그만두라고 외치며 분위기를 제압한다.',
          tags: ['G', 'CHALLENGING', 'SPONTANEOUS', 'SELF_DIRECTED', 'SHORT_TERM'],
          hint: '체력 판정 60% · 험악한 반발 가능'
        },
        {
          id: 'express-ignore',
          label: '소란이 잠잠해질 때까지 창밖 풍경에 집중한다.',
          tags: ['R', 'PASSIVE', 'REALISTIC', 'STABLE', 'DELIBERATE'],
          hint: '지능 판정 55% · 정보 놓칠 위험'
        },
        {
          id: 'express-leverage',
          label: '사건을 빌미로 정보를 얻어 두 사람과 거래를 제안한다.',
          tags: ['S', 'INDIVIDUAL', 'REALISTIC', 'SELF_DIRECTED', 'LONG_TERM'],
          hint: '기지 판정 62% · 실패 시 평판 하락'
        }
      ],
      followup: null
    },
    processChoice(state, choiceId) {
      const effects = { traits: {}, rel: {}, keyMoment: '' };
      switch (choiceId) {
        case 'express-mediator':
          effects.rel.H = 1.2;
          effects.traits.H = 0.8;
          effects.traits.R = 0.4;
          effects.keyMoment = '쿠페의 다툼을 조정해 우애를 다졌다.';
          break;
        case 'express-challenge':
          effects.traits.G = 1.2;
          effects.rel.G = 0.6;
          effects.keyMoment = '큰소리로 갈등을 잠재웠다.';
          break;
        case 'express-ignore':
          effects.traits.R = 0.8;
          effects.rel.R = 0.4;
          effects.keyMoment = '상황을 관찰하며 조용히 분석했다.';
          break;
        case 'express-leverage':
        default:
          effects.traits.S = 1.1;
          effects.rel.S = 0.7;
          effects.keyMoment = '정보를 얻어 거래를 성사시켰다.';
          break;
      }
      return { effects, nextScene: 'lake' };
    }
  },
  {
    id: 'lake',
    description: '검은 호수를 건너며 협동 혹은 개인 플레이를 선택',
    promptTemplate: `장면: lake. 검은 호수를 건너는 배에서 작은 위기를 맞는다. 협동, 인내, 기지를 드러내도록 묘사하라.`,
    fallback: {
      narration: '달빛이 검은 호수 위로 길게 드리워졌다. 배가 흔들리며 물결이 튀자 몇몇은 비명을 질렀고, 노가 물살에 잠깐 빠져버렸다. 누군가는 침착하게 나서야 했다.',
      choices: [
        {
          id: 'lake-row',
          label: '물속으로 팔을 뻗어 노를 끌어올리고 동행에게 다시 잡게 한다.',
          tags: ['H', 'G', 'COOPERATIVE', 'CHALLENGING', 'SPONTANEOUS', 'SHORT_TERM'],
          hint: '체력 판정 65% · 추위에 떨 수 있음'
        },
        {
          id: 'lake-light',
          label: '조용히 빛나는 주문으로 진로를 밝힌다.',
          tags: ['R', 'IDEALISTIC', 'DELIBERATE', 'STABLE', 'SELF_DIRECTED'],
          hint: '마력 판정 60% · 주문 실패 시 암흑'
        },
        {
          id: 'lake-brace',
          label: '몸을 낮춰 배의 균형을 맞추며 모두에게 자세를 지도한다.',
          tags: ['H', 'COOPERATIVE', 'STABLE', 'DELIBERATE', 'LONG_TERM'],
          hint: '체력 판정 58% · 인내심 요구'
        },
        {
          id: 'lake-solo',
          label: '혼자 잽싸게 노를 건져 허리춤에 숨긴 뒤 상황을 주시한다.',
          tags: ['S', 'INDIVIDUAL', 'SELF_DIRECTED', 'REALISTIC', 'SHORT_TERM'],
          hint: '기지 판정 57% · 발각 시 신뢰 하락'
        }
      ],
      followup: null
    },
    processChoice(state, choiceId) {
      const effects = { traits: {}, rel: {}, keyMoment: '' };
      if (choiceId === 'lake-row') {
        effects.traits.G = 0.6;
        effects.traits.H = 1.1;
        effects.rel.H = 1;
        effects.keyMoment = '배를 함께 안정시키며 신뢰를 얻었다.';
      } else if (choiceId === 'lake-light') {
        effects.traits.R = 1.1;
        effects.keyMoment = '주문으로 진로를 비춰 모두를 안심시켰다.';
      } else if (choiceId === 'lake-brace') {
        effects.traits.H = 1.3;
        effects.rel.H = 0.8;
        effects.keyMoment = '꾸준히 지시하며 배를 진정시켰다.';
      } else {
        effects.traits.S = 1.3;
        effects.rel.S = 0.6;
        effects.keyMoment = '노를 챙기고 상황을 내게 유리하게 관찰했다.';
      }
      return { effects, nextScene: 'sorting' };
    }
  },
  {
    id: 'sorting',
    description: '정렬 모자와의 대화, 근소한 차이면 추가 질문',
    promptTemplate: `장면: sorting. 모자가 속삭이며 지금까지의 선택을 근거로 기숙사 후보 두 곳을 언급한다. JSON 형식에 따라 followup이 필요하면 제공하라.`,
    fallback: {
      narration: '모자의 안감이 이마를 감싸자 낮고 길게 늘어진 속삭임이 들려왔다. 지금까지의 행보가 천천히 펼쳐지며 두 가지 길이 겹쳤다.',
      choices: [],
      followup: {
        question: '용감한 모험과 꾸준한 책임 중에서 어느 쪽이 더 마음을 움직이나?',
        options: ['용감한 모험', '꾸준한 책임']
      }
    },
    processChoice() {
      return { effects: {}, nextScene: null };
    }
  }
];

export const SCENE_MAP = Object.fromEntries(SCENES.map(scene => [scene.id, scene]));
export const SCENE_ORDER = SCENES.map(scene => scene.id);

export function tagsToEffects(tags = []) {
  const effects = { traits: {}, rel: {}, dispositions: {} };
  for (const tag of tags) {
    const traitKey = TAG_TO_TRAIT[tag];
    if (traitKey) {
      effects.traits[traitKey] = (effects.traits[traitKey] || 0) + 0.8;
      if (!effects.rel[traitKey]) effects.rel[traitKey] = 0.2;
      else effects.rel[traitKey] += 0.2;
    }
    const dispositionKey = TAG_TO_DISPOSITION[tag];
    if (dispositionKey) {
      effects.dispositions[dispositionKey] = (effects.dispositions[dispositionKey] || 0) + 0.6;
    }
  }
  return effects;
}
