// 음성 대조 — 재정의한 프로퍼티 2개가 **전부** 훅 등록으로 복원된다. 기대 rc=0.
// 표기 변형: 스페이스 2칸 들여쓰기(실코드는 탭), 옵션 객체를 같은 줄 / 다음 줄로 섞음.
import { afterEach, describe, expect, it } from 'vitest';

const originalLanguage = Object.getOwnPropertyDescriptor(window.navigator, 'language');
const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');

afterEach(() => {
  Object.defineProperty(window.navigator, 'language', originalLanguage);
  Object.defineProperty(navigator, 'platform', originalPlatform);
});

describe('clean fixture', () => {
  it('redefines language', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'ko-KR', configurable: true });
    expect(navigator.language).toBe('ko-KR');
  });

  it('redefines platform', () => {
    Object.defineProperty(navigator, 'platform',
      { value: 'FixturePlatform', configurable: true });
    expect(navigator.platform).toBe('FixturePlatform');
  });
});
