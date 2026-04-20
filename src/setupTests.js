// jest-dom adds custom matchers for asserting on DOM nodes.
// e.g. expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

// env-spec §5.2 — 도메인 테스트는 vi.stubEnv 로 NODE_ENV 를 조작한다.
// 테스트 간 상태 누수 방지를 위해 전역 afterEach 로 모든 env stub 을 해제한다.
afterEach(() => {
	vi.unstubAllEnvs();
});

// clipboard-spec §3.3.2 (REQ-20260418-034) — 옵션 B 전역 sweep.
// `copyToClipboard` 는 `navigator.clipboard.writeText` 로 마이그레이션 완료 (REQ-022 / commit 4765eaf).
// 테스트가 개별적으로 stub 을 선언하던 잔재(`document.execCommand = vi.fn()` 등)를 제거하고
// 모든 테스트가 성공 경로 기본 stub 을 공유하도록 한다.
// 거부 분기 / `clipboard: undefined` 는 파일 or 테스트 본문에서 `Object.assign(navigator, ...)`
// 로 overwrite 해 후속 실행이 우선권을 갖는다 (nested beforeEach / test body order).
beforeEach(() => {
	Object.assign(navigator, {
		clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
	});
});
