// 방향 1 (§동작 4) — 재정의 프로퍼티 2개 중 `vendor` 만 복원 등록이 있고 `doNotTrack` 은 없다.
// 파일 단위 판정이면 afterEach 1건의 존재만으로 통과한다 — 프로퍼티 단위여야 잡힌다. 기대 rc=1.
import { afterEach, describe, expect, it } from 'vitest';

const originalVendor = Object.getOwnPropertyDescriptor(navigator, 'vendor');

afterEach(() => {
  Object.defineProperty(navigator, 'vendor', originalVendor);
});

describe('missing-prop fixture', () => {
  it('redefines vendor', () => {
    Object.defineProperty(navigator, 'vendor', { value: 'FixtureVendor', configurable: true });
    expect(navigator.vendor).toBe('FixtureVendor');
  });

  it('redefines doNotTrack without any restore registration', () => {
    Object.defineProperty(window, 'doNotTrack',
      { value: '1', configurable: true });
    expect(window.doNotTrack).toBe('1');
  });
});
