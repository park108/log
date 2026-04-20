// jest-dom adds custom matchers for asserting on DOM nodes.
// e.g. expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// env-spec §5.2 — 도메인 테스트는 vi.stubEnv 로 NODE_ENV 를 조작한다.
// 테스트 간 상태 누수 방지를 위해 전역 afterEach 로 모든 env stub 을 해제한다.
afterEach(() => {
	vi.unstubAllEnvs();
});
