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
import type { SharedOptions } from 'msw';

/**
 * 본 헬퍼가 요구하는 server 의 최소 계약. MSW 의 `SetupServerApi` 와 호환되며,
 * 테스트에서 주입되는 fake server (listen/resetHandlers/close 스파이) 도 충족한다.
 */
export interface MockServerLike {
	// eslint-disable-next-line no-unused-vars
	listen(options?: Partial<SharedOptions>): unknown;
	resetHandlers(): unknown;
	close(): unknown;
}

export interface UseMockServerOptions {
	onUnhandledRequest?: SharedOptions['onUnhandledRequest'];
}

/**
 * MSW server 수명주기 훅 바인딩.
 */
export function useMockServer<S extends MockServerLike>(
	serverFactory: () => S,
	options: UseMockServerOptions = {},
): S {
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
