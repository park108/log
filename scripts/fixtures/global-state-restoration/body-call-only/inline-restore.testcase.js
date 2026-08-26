// 방향 2 (§동작 5 / NFR-02) — 복원 호출이 `it` 본문 직렬 호출로만 존재한다. 훅 등록은 없다.
// 케이스가 단언 실패로 던지면 그 줄에 닿지 않아 원복이 실행되지 않고 뒤 케이스로 누출된다.
// 본문 호출을 등록으로 오인하면 게이트가 정확히 이 결함을 통과시킨다. 기대 rc=1.
import { describe, expect, it } from 'vitest';

describe('body-call-only fixture', () => {
  it('redefines maxTouchPoints and restores it inline', () => {
    const originalMaxTouchPoints =
      Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints');

    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    expect(navigator.maxTouchPoints).toBe(5);

    Object.defineProperty(navigator, 'maxTouchPoints', originalMaxTouchPoints);
  });
});
