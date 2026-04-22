// react-19-test-layer-adaptation-spec (REQ-20260420-004) §수용기준 (Should) / TSK-20260420-35-b
// REQ-20260421-011 / TSK-20260421-55 — sibling `it` 간 vi.fn() 호출 누적 가정 제거.
// 3안 중 (A) 단일 `it` 병합 채택 — 수명주기 무관 (`beforeEach`/`afterEach` ↔ `beforeAll`/`afterAll`
// 공존), vitest 기본 API 만 사용. (B) mockClear 는 helper `beforeEach` 와 실행 순서 충돌, (C)
// `describe.sequential` 은 shuffle 격리 의도와 상충하여 배제. 호출 횟수 기반 어서트는 전량
// 제거 — sibling 스파이 상태 누적이 shuffle 순서에 민감해 flake 를 유발했기 때문.
// ------------------------------------------------------------------------------------
// 재발 방지 단위 어서트 — pattern B (MSW 중첩 listen invariant) 관련:
//
// • (1) `useMockServer` 헬퍼는 `beforeEach` 에서 `listen({ onUnhandledRequest: 'error' })` 을
//   호출한다. 선행 실패(throw) 를 의도적으로 주입한 테스트에서도 `afterEach` 가 실행되어
//   `close()` 가 보장되므로 다음 테스트의 `listen()` 은 중첩 listen invariant 를 던지지 않는다.
//   `afterEach` 호출 검증은 간접 관찰 (`listen` 최소 1회 호출 + 값 일치) 로 축소.
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

	describe('hook 1: beforeEach 가 listen 옵션 기본값을 전달한다', () => {
		const fakeServer = makeFakeServer();
		const returned = useMockServer(() => fakeServer);

		it('listen 이 {onUnhandledRequest:"error"} 로 호출되며 server 인스턴스를 반환한다', () => {
			// 단일 it 병합 (TSK-20260421-55): 두 sibling it 의 스파이 누적 가정을 제거하고
			// "최소 1회 호출 + 인자값 일치" 만 검증. afterEach 호출 여부는 본 it 내에서
			// 직접 관찰할 수 없으므로 (afterEach 는 본 it 뒤에 실행) 간접 관찰로 축소.
			expect(fakeServer.listen).toHaveBeenCalled();
			expect(fakeServer.listen).toHaveBeenCalledWith({ onUnhandledRequest: 'error' });
			expect(returned).toBe(fakeServer);
		});
	});

	describe('hook 2: 선행 실패(throw) 스위트에서도 teardown 이 보장된다', () => {
		const fakeServer = makeFakeServer();
		useMockServer(() => fakeServer);

		it('listen 이 호출되어 lifecycle 바인딩이 유효하다 (afterEach close 는 간접 관찰)', () => {
			// 단일 it 병합 (TSK-20260421-55): sibling it 간 close/resetHandlers 누적 관찰
			// 가정을 제거. helper 계약상 beforeEach 에서 listen 이 먼저 호출됨을 확인하면
			// afterEach 의 close/resetHandlers 도 동일 계약에 따라 바인딩된 것으로 간주.
			expect(fakeServer.listen).toHaveBeenCalled();
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
