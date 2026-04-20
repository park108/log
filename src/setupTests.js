// jest-dom adds custom matchers for asserting on DOM nodes.
// e.g. expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
//
// env-spec §5.2 / REQ-20260420-002 / REQ-20260420-005 (TSK-20260420-37)
// ------------------------------------------------------------------------------------
// env (MODE / DEV / PROD) stub 이디엄 규칙 — 런타임 코드가 `isDev()/isProd()`
// (= `import.meta.env.DEV/PROD`) 경유로 분기하므로, 테스트에서는 **반드시**
// `vi.stubEnv('MODE', ...)` + 짝맞춘 `DEV` / `PROD` stub 으로 전환한다.
//   • production 분기:   `vi.stubEnv('MODE','production')`  + `vi.stubEnv('DEV', false)` + `vi.stubEnv('PROD', true)`
//   • development 분기:  `vi.stubEnv('MODE','development')` + `vi.stubEnv('DEV', true)`  + `vi.stubEnv('PROD', false)`
//   • test (기본):        `vi.stubEnv('MODE','test')`        + `vi.stubEnv('DEV', false)` + `vi.stubEnv('PROD', false)`
//     (DEV/PROD/SSR 는 vitest 에서 boolean 인자를 받는다 — 문자열 `'false'` 는 truthy 로
//      평가돼 stub 이 무력화되므로 boolean 리터럴 사용 필수.)
//   • 전역 `afterEach(() => vi.unstubAllEnvs())` 는 본 파일에서 한 번 등록
//     (아래 §전역 afterEach) — 개별 테스트/스위트에서 추가 등록 불필요.
//   • 레거시 `NODE_ENV` 직접 재할당 이디엄은 Vite 정적 치환 경로를 무효화하므로
//     신규 코드에서 사용 금지. 기존 위반은 마이그레이션 대상.
//   • 경고: vitest 는 기본적으로 `import.meta.env.DEV=true` 를 노출한다.
//     `getUrl()` 처럼 `isDev()/isProd()` 를 렌더 경로에 사용하는 컴포넌트를
//     테스트할 때는 baseline href-미설정 동작을 원하면 **명시적으로**
//     `stubMode('test')` 를 걸어 DEV/PROD 모두 false 로 고정해야 한다
//     (대표 예: `src/common/Navigation.test.jsx > render title menu correctly`).
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
//   • 전역 `afterEach` 가 `vi.useRealTimers()` 해제를 담당한다. 추가
//     teardown 불필요 — 파일별 `afterEach(() => vi.useRealTimers())`
//     재등록은 삭제 규약 (REQ-20260421-001 §정책 A).
//     — `vi.useFakeTimers({ shouldAdvanceTime: true })` 만 호출하고 끝나도
//       다음 테스트 시작 시점에 `vi.isFakeTimers() === false` 가 보장된다.
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
// 테스트 간 상태 누수 방지를 위해 전역 afterEach 로 모든 env stub 을 해제하고,
// REQ-20260420-007 (TSK-20260420-38) — fake-timer teardown 을 단일 지점에
// 박제한다. `vi.unstubAllEnvs()` → `vi.useRealTimers()` 순서: env 분기 의존
// 로직이 timer 해제 부작용에 영향받지 않도록 env 를 먼저 해제한다.
//   • vitest `afterEach` 실행 순서는 inner (describe) → outer (setup 파일) = LIFO.
//     전역 teardown 의 사후 상태를 로컬 describe 훅에서 단정하려면 `it` 본문 직렬화 또는 `afterAll` 사용.
afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
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
