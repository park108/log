// react-19-test-layer-adaptation-spec (REQ-20260420-004) §FR-02 / TSK-20260420-35-b
// ------------------------------------------------------------------------------------
// MSW 공통 수명주기 헬퍼.
//
// 목적: 테스트 본문 (`it`/`test` 내부) 의 `server.listen()` / `server.close()` 직접 호출을
// 전면 제거하고, `beforeEach` / `afterEach` 훅으로 이동시킨다. 선행 실패 시에도 afterEach 가
// 항상 실행되어 `close()` 가 보장되므로 "중첩 listen invariant" 재발을 방지한다.
//
// 기본 옵션: `onUnhandledRequest: 'error'` — 핸들러 누락으로 인한 조용한 pass 방지.
//
// 사용 (단일 server 재사용 스위트):
//   describe('Foo', () => {
//     useMockServer(() => mock.devServerOk);
//     it('...', async () => { ... });
//   });
//
// 사용 (스위트 내 server 가 자주 바뀌는 경우):
//   describe('Bar', () => {
//     describe('ok path', () => {
//       useMockServer(() => mock.prodServerOk);
//       it('...', async () => { ... });
//     });
//     describe('failure path', () => {
//       useMockServer(() => mock.prodServerFailed);
//       it('...', async () => { ... });
//     });
//   });
//
// 금지:
//   • `it`/`test` 본문 내부의 `server.listen()` / `server.close()` 직접 호출.
//   • `listen()` 인자 누락 (항상 `onUnhandledRequest: 'error'` 기본).

import { beforeEach, afterEach } from 'vitest';

/**
 * MSW server 수명주기 훅 바인딩.
 *
 * @param {() => import('msw/node').SetupServerApi} serverFactory
 *   server 인스턴스를 반환하는 factory. 모듈 스코프 singleton 을 그대로 돌려주는 형태 권장.
 * @param {object} [options]
 * @param {import('msw/node').SharedOptions['onUnhandledRequest']} [options.onUnhandledRequest='error']
 *   누락 핸들러에 대한 처리. 기본 `'error'` 로 조용한 pass 를 차단.
 * @returns {import('msw/node').SetupServerApi} server 인스턴스 (테스트 본문에서 `server.use(...)` 등에 사용).
 */
export function useMockServer(serverFactory, options = {}) {
	const { onUnhandledRequest = 'error' } = options;
	const server = serverFactory();

	beforeEach(() => {
		server.listen({ onUnhandledRequest });
	});

	afterEach(() => {
		server.resetHandlers();
		server.close();
	});

	return server;
}
