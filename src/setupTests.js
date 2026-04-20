// jest-dom adds custom matchers for asserting on DOM nodes.
// e.g. expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
//
// react-19-test-layer-adaptation-spec (REQ-20260420-004) §FR-01 / TSK-20260420-35-a
// ------------------------------------------------------------------------------------
// fake-timer 이디엄 규칙 (React 19 act 모델 + testing-library polling 호환):
//   • 기본 옵션: `vi.useFakeTimers({ shouldAdvanceTime: true })`.
//     — `findBy*`/`waitFor` 폴링이 real-clock 과 병행 가능.
//   • 명시적 시간 진행은 async API 만 사용:
//       `await vi.advanceTimersByTimeAsync(ms)`
//       `await vi.runAllTimersAsync()`
//       `await vi.runOnlyPendingTimersAsync()`
//     sync API (`vi.advanceTimersByTime` / `vi.runAllTimers` / `vi.runOnlyPendingTimers`)
//     는 사용 금지.
//   • 인자 없는 `vi.useFakeTimers()` / 문자열 인자 `vi.useFakeTimers('modern')` 호출 금지
//     — 반드시 옵션 객체를 명시 (`{ shouldAdvanceTime: true }` 기본).
//   • `vi.useRealTimers()` 해제를 각 스위트의 `afterEach` 또는 `afterAll` 에 반드시 포함.
//   • 의도적 제외: `src/Search/Search.test.jsx` 의
//     `{ shouldAdvanceTime: false }` 는 debounce 타이머 제어가 목적.
//
// react-19-test-layer-adaptation-spec (REQ-20260420-004) §FR-02 / TSK-20260420-35-b
// ------------------------------------------------------------------------------------
// MSW `setupServer()` 수명주기 이디엄 규칙:
//   • `server.listen(...)` 은 `beforeEach` / `beforeAll` 에서만 호출.
//   • `server.close()` 는 `afterEach` / `afterAll` 에서만 호출.
//   • `listen({ onUnhandledRequest: 'error' })` 기본 옵션 — 핸들러 누락으로
//     인한 조용한 pass 를 차단.
//   • 테스트 본문 (`it`/`test` 내부) 의 `.listen()` / `.close()` 직접 호출 금지.
//     — 선행 실패 시 `close()` 미도달로 다음 테스트의 `listen()` 이 중첩 listen
//       invariant 를 던지는 재발 방지 목적.
//   • 공통 헬퍼: `src/test-utils/msw.js` 의 `useMockServer(serverFactory)` 를 사용한다.
//     각 `describe` 가 고유 server 를 사용할 때는 `describe` 내부에서 호출한다.
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
