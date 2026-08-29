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
import { afterEach, beforeEach, expect, vi } from 'vitest'

// network-egress-isolation-spec (REQ-20260825-004) §수용 기준 (N-1)(N-2) / TSK-20260825-14
// ------------------------------------------------------------------------------------
// 전역 fail-closed 네트워크 격리.
//
// 종전 격리는 **파일 단위 opt-in** 이었다 — `useMockServer` 를 호출한 파일 안에서만
// `onUnhandledRequest: 'error'` 가 서고, 호출하지 않은 파일에서는 렌더가 유발한 요청이
// 그대로 프로세스 밖으로 나갔다 (착수 시점 실측: `render(` 보유 33 파일 중 19 파일이
// 인터셉터 미보유). 유출은 실 DNS 조회로 이어져 `EAI_AGAIN` 까지의 **가변 지연**이
// 5000 ms 렌더 예산을 잠식했고, 실패/성공이 runner 의 DNS 응답 시간에 종속됐다.
// 그래서 결함은 "느린 실패" 이지 "차단" 이 아니었고, 증상은 CI 샤드 간헐 red 였다.
//
// 아래 장치는 **차단이 지연이 아니라 거부**가 되게 한다 (N-2). 미인터셉트 요청은
// DNS 조회 이전에 동기적으로 rejected promise 를 받는다 — 소요 시간이 0 에 수렴하므로
// 결과가 resolver 응답 시간에 종속되지 않는다.
//
// **fail-open 금지** (§역할 (R-3)). 경고만 내고 통과시키는 형태는 기존 테스트를 하나도
// 깨뜨리지 않으면서 도입할 수 있어 이 축에서 가장 실현 가능성이 높은 오답이고, 그것은
// 격리가 아니라 격리의 외관이다. 판정 채널 `src/__tests__/network-egress-isolation.test.ts`
// 이 **실제 요청 1건을 내고 거부를 단정**해 이 형태를 잡는다 (토큰 존재 판정은 주석
// 한 줄로 충족되므로 쓰지 않는다).
//
// **파일별 `useMockServer` 와 공존한다.** MSW 인터셉터는 `listen()` 시점의
// `globalThis.fetch` 를 보관했다가 `close()` 에서 되돌린다. 본 장치는 setup 파일
// 평가 시점(= 모든 `beforeEach` 보다 앞)에 설치되므로, 파일이 자체 서버를 세우면
// 그 핸들러가 우선하고 (`listen()` 이 본 래퍼를 덮는다), 세우지 않거나 서버를 닫은
// 뒤에는 본 장치가 다시 선다. 어느 시점에도 "아무 장치 없음" 구간이 없다.
// 차단 마커 — 판정 채널과 실패 메시지가 **같은 상수**를 본다. 문자열 리터럴을
// 양쪽에 따로 적으면 한쪽만 바뀐 채로 게이트가 초록을 유지한다.
export const __egressBlockedMarker = 'egress-blocked'

export class TestEgressBlockedError extends Error {
	url: string
	method: string

	constructor(url: string, method: string) {
		super(
			`[${__egressBlockedMarker}] ${method} ${url}\n` +
				'테스트 프로세스 밖으로 나가는 요청은 차단된다 (network-egress-isolation §N-1).\n' +
				'이 요청을 의도했다면 해당 테스트 파일에 인터셉터를 설치하라 — ' +
				"`useMockServer(() => setupServer(...))` (src/test-utils/msw.ts).\n" +
				'차단 완화·예산 상향·skip 은 회복 수단이 아니다 (§역할 (R-3)).',
		)
		this.name = 'TestEgressBlockedError'
		this.url = url
		this.method = method
	}
}

function egressRequestUrl(input: unknown): string {
	if (typeof input === 'string') return input
	if (input instanceof URL) return input.href
	if (input && typeof input === 'object' && 'url' in input) return String((input as { url: unknown }).url)
	return String(input)
}

function egressRequestMethod(input: unknown, init?: unknown): string {
	if (init && typeof init === 'object' && 'method' in init && init.method) return String(init.method).toUpperCase()
	if (input && typeof input === 'object' && 'method' in input) return String((input as { method: unknown }).method).toUpperCase()
	return 'GET'
}

// 거부는 **동기적으로 만들어진** rejected promise 다. 여기서 await/타이머/네트워크
// 스택을 한 번이라도 타면 차단이 다시 "느린 실패" 가 되고, 그것이 애초의 결함이다.
globalThis.fetch = function blockUninterceptedEgress(input, init) {
	return Promise.reject(new TestEgressBlockedError(egressRequestUrl(input), egressRequestMethod(input, init)))
}

// console-error-runtime-zero-spec (REQ-20260517-091) §동작 (I1)(I2)(I3)(I4) / TSK-20260517-24
// ------------------------------------------------------------------------------------
// React runtime warning fail-fast 채널 — 전역 console.error spy 가 다음 카테고리
// 패턴 호출을 감지하면 afterEach 가 assertion 발화하여 test 가 fail 한다:
//   1. prop-types violation:   "Failed prop type"
//   2. missing list key:        "Each child in a list should have a unique \"key\" prop"
//   3. cross-component render:  "Cannot update a component .* while rendering a different component"
//   4. hook order change:       "React has detected a change in the order of Hooks"
//
// 본 spy 는 `console.error` 의 wrapper chain 최외곽에 등록되어, 파일별
// `vi.spyOn(console, 'error').mockImplementation(() => {})` 와 호환된다 — vitest 의
// `vi.spyOn` 다중 호출은 wrapper 를 쌓되 각 spy 객체가 독립 mock instance / 호출
// 이력을 보유한다. 따라서 파일 단위 silence (REQ-091 §스코프 규칙 G2 — legacy 보존)
// 는 출력 차단에만 작용하고, 본 글로벌 spy 의 호출 이력은 그대로 capture 된다.
// `restoreAllMocks` 가 매 테스트 종료 시 wrapper 를 해체하지만, 본 setup 의
// `beforeEach` 가 매 테스트 시작 시점에 spy 를 재등록하므로 wrapper chain 안정.
const RUNTIME_WARNING_PATTERN = /Failed prop type|Each child in a list should have a unique "key" prop|Cannot update a component .* while rendering a different component|React has detected a change in the order of Hooks/;
let __consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;
beforeEach(() => {
	__consoleErrorSpy = vi.spyOn(console, 'error');
});
afterEach(() => {
	if (__consoleErrorSpy) {
		expect(__consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringMatching(RUNTIME_WARNING_PATTERN));
	}
});

// env-spec §5.2 — 도메인 테스트는 vi.stubEnv 로 NODE_ENV 를 조작한다.
// 테스트 간 상태 누수 방지를 위해 전역 afterEach 로 모든 env stub 을 해제하고,
// REQ-20260420-007 (TSK-20260420-38) — fake-timer teardown 을 단일 지점에
// 박제한다. `vi.unstubAllEnvs()` → `vi.useRealTimers()` 순서: env 분기 의존
// 로직이 timer 해제 부작용에 영향받지 않도록 env 를 먼저 해제한다.
//   • vitest `afterEach` 실행 순서는 inner (describe) → outer (setup 파일) = LIFO.
//     전역 teardown 의 사후 상태를 로컬 describe 훅에서 단정하려면 `it` 본문 직렬화 또는 `afterAll` 사용.
// REQ-20260421-036 FR-05 — console spy 비파괴 이디엄 전역 복원.
// 파일별 `vi.spyOn(console, '<method>')` 가 teardown 에서 원본 참조로 복원되도록 보장.
// 본 1행은 `vi.spyOn` 계열만 복원하며, 기존에 module-level 로 덮인 직접 재할당
// (`console.X = vi.fn()`) 은 복원하지 못하므로 본 task 에서 모든 직접 재할당을 제거한다.
afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
	vi.restoreAllMocks();
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
