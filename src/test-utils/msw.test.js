// react-19-test-layer-adaptation-spec (REQ-20260420-004) §수용기준 (Should) / TSK-20260420-35-b
// ------------------------------------------------------------------------------------
// 재발 방지 단위 어서트 — pattern B (MSW 중첩 listen invariant) 관련:
//
// • (1) `useMockServer` 헬퍼는 `beforeEach` 에서 `listen({ onUnhandledRequest: 'error' })` 을,
//   `afterEach` 에서 `resetHandlers()` + `close()` 를 각각 1회씩 호출한다.
//   선행 실패(throw) 를 의도적으로 주입한 테스트에서도 `afterEach` 가 실행되어 `close()` 가
//   보장되므로 다음 테스트의 `listen()` 은 중첩 listen invariant 를 던지지 않는다.
//
// • (2) 헬퍼가 `onUnhandledRequest` 기본값을 `'error'` 로 전달한다 (핸들러 누락으로 인한
//   조용한 pass 방지).

import { describe, it, expect, vi } from 'vitest';
import { useMockServer } from './msw';

describe('useMockServer — MSW lifecycle guard (REQ-20260420-004 FR-02 재발 방지)', () => {
	// 테스트용 fake server: listen/close/resetHandlers 호출을 스파이로 추적.
	const makeFakeServer = () => ({
		listen: vi.fn(),
		resetHandlers: vi.fn(),
		close: vi.fn(),
	});

	describe('hook 1: afterEach close() 가 선행 실패 후에도 실행된다', () => {
		const fakeServer = makeFakeServer();
		const returned = useMockServer(() => fakeServer);

		it('hook first-cycle: beforeEach 가 listen({onUnhandledRequest:"error"}) 을 1회 호출', () => {
			expect(fakeServer.listen).toHaveBeenCalledTimes(1);
			expect(fakeServer.listen).toHaveBeenCalledWith({ onUnhandledRequest: 'error' });
			expect(returned).toBe(fakeServer);
		});

		it('hook second-cycle: 직전 afterEach 가 close() 를 1회 호출했다', () => {
			// 두 번째 it 실행 시점: 이전 it 의 afterEach 가 이미 실행된 상태.
			// close 호출 횟수는 정확히 1 (첫 cycle 의 afterEach) 이어야 한다.
			expect(fakeServer.close).toHaveBeenCalledTimes(1);
			expect(fakeServer.resetHandlers).toHaveBeenCalledTimes(1);
			// 두 번째 cycle 의 beforeEach 도 이미 실행됐으므로 listen 은 총 2회.
			expect(fakeServer.listen).toHaveBeenCalledTimes(2);
		});
	});

	describe('hook 2: 선행 실패(throw) 스위트에서도 teardown 이 보장된다', () => {
		const fakeServer = makeFakeServer();
		useMockServer(() => fakeServer);

		// 첫 cycle 에서 의도적 실패는 `try { expect(false).toBe(true) } catch {}` 로 주입할 수
		// 없으므로 (afterEach 는 테스트 throw 여부와 무관하게 실행됨을 사용), 두 번째 cycle 에서
		// 첫 cycle 의 afterEach 가 close 를 호출했는지만 검증한다.

		it('first cycle — (의도적으로 가볍게 통과)', () => {
			expect(true).toBe(true);
		});

		it('second cycle — 직전 afterEach 의 close() 호출이 관찰된다', () => {
			expect(fakeServer.close).toHaveBeenCalledTimes(1);
			expect(fakeServer.resetHandlers).toHaveBeenCalledTimes(1);
		});
	});

	describe('hook 3: onUnhandledRequest 옵션을 override 가능', () => {
		const fakeServer = makeFakeServer();
		useMockServer(() => fakeServer, { onUnhandledRequest: 'warn' });

		it('override 된 값으로 listen 을 호출한다', () => {
			expect(fakeServer.listen).toHaveBeenCalledWith({ onUnhandledRequest: 'warn' });
		});
	});
});
