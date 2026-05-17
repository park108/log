// TSK-20260517-19 / REQ-20260517-082 — vitest spy `mock.calls[N]` strict
// narrow 헬퍼 단일 출처. `tsconfig.json` 의 `noUncheckedIndexedAccess: true`
// 환경에서 `spy.mock.calls[N]` 은 `T | undefined` 로 narrow 되어 `!` non-null
// assertion 흡수 패턴이 호출부마다 누적된다. 본 모듈은 그 패턴을 1 헬퍼 API
// (`nthCall` / `firstCall`) 로 수렴한다.

import { expect, type Mock } from 'vitest';

/**
 * `vi.fn()` / `vi.spyOn()` 으로 생성된 spy 의 `mock.calls[index]` 를
 * 안전하게 narrow 하여 반환. `index` 위치 호출 기록이 부재 시 명시적 assertion
 * 실패 (테스트 의도 보전 — non-null assertion 의 사일런트 통과 방지) 로
 * 흡수한다.
 *
 * `noUncheckedIndexedAccess` 환경에서 호출부의 `mock.calls[0]!` /
 * `mock.calls[N]!` non-null assertion 1 hit 을 1 import 로 치환하는 단일
 * 출처.
 */
export const nthCall = <Args extends readonly unknown[]>(
	mockFn: Mock<(...args: Args) => unknown> | { mock: { calls: readonly Args[] } },
	index: number,
): Args => {
	const calls = (mockFn as { mock: { calls: readonly Args[] } }).mock.calls;
	const call = calls[index];
	expect(call, `mock.calls[${index}] is undefined (only ${calls.length} call(s) recorded)`).toBeDefined();
	return call as Args;
};

/**
 * `nthCall(mockFn, 0)` 의 편의 별칭. 호출부에서 가장 빈도 높은 단일 호출
 * 검증 (`expect(spy).toHaveBeenCalledTimes(1)` 직후 인자 narrow) 패턴을
 * 표현 일관성 측면에서 별칭으로 흡수.
 */
export const firstCall = <Args extends readonly unknown[]>(
	mockFn: Mock<(...args: Args) => unknown> | { mock: { calls: readonly Args[] } },
): Args => nthCall(mockFn, 0);
