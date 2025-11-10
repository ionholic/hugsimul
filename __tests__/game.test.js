import { describe, it, expect } from 'vitest';

// game.js는 구버전으로 더 이상 사용되지 않습니다.
// 새 버전(src/)은 tests/engine.test.js에서 테스트합니다.

describe.skip('구버전 game.js (더 이상 사용 안 함)', () => {
  it('이 테스트는 건너뜁니다', () => {
    expect(true).toBe(true);
  });
});
