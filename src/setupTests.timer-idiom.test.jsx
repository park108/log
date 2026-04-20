// REQ-20260420-004 FR-01 (TSK-20260420-35-a) — 재발 방지 어서트.
//
// 목적: React 19 호환 fake-timer 이디엄 (`{ shouldAdvanceTime: true }` +
//   `await vi.advanceTimersByTimeAsync`) 조합이 React 18 환경의 testing-library
//   `findBy*` 폴링과 정상 동작하는지 단위로 확인한다.
//
// 본 어서트가 녹색이면 — fake-timer 가 real-clock advance 를 허용하므로 `findByText`
// 의 내부 폴링 타이머도 기본 동작하고, 컴포넌트 내부 `setTimeout` 은 명시 advance
// 로만 진행된다는 이디엄이 유지됨이 입증된다.
//
// 본 어서트가 깨지면 — 인자 없는 vi.useFakeTimers (no-arg) 호출 또는 sync timer API 사용
// 으로 회귀. 위반 파일을 TSK-35-a 가이드에 따라 정정한다.
import { render, screen, act } from '@testing-library/react';
import { useEffect, useState } from 'react';

function DelayedLabel({ delayMs = 50, label = 'ready' }) {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const id = setTimeout(() => setShown(true), delayMs);
		return () => clearTimeout(id);
	}, [delayMs]);
	return shown ? <span>{label}</span> : <span>loading</span>;
}

// REQ-20260421-001 FR-03 — `[A]→[B]` 순서 의존 제거.
// 이전 구조는 두 `it` (`[A]` enable / `[B]` next-test teardown 검증) 분리 +
// 파일 내 실행 순서 의존이었다. `vitest --sequence.shuffle` 에서 false positive
// 위험을 없애기 위해, 같은 `it` 본문에서 enable → 해제 → 복귀 확인 을
// 직렬화한다 (spec §공개 인터페이스 옵션 1). 옵션 2 (describe 내부 `afterEach`
// 훅에서 `isFakeTimers === false` 단정) 는 실측 결과 vitest afterEach 실행
// 순서가 inner → outer (LIFO) 여서 로컬 훅이 전역 teardown 보다 먼저 돌아
// 실패 — 옵션 1 로 확정.
//
// 전역 `afterEach` (setupTests.js `vi.useRealTimers()`) 는 본 `it` 내부 단언이
// 통과한 뒤 중복 무해 호출로 동작한다.
describe('fake-timer idiom (react-19-test-layer-adaptation-spec §FR-01)', () => {
	it('`{ shouldAdvanceTime: true }` + `advanceTimersByTimeAsync` resolves findBy* polling', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(<DelayedLabel delayMs={50} label="ready" />);

		// 초기 렌더: "loading" 이어야 한다.
		expect(screen.getByText('loading')).toBeInTheDocument();

		// 명시적 시간 진행 후 상태 전환이 일어난다.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60);
		});

		// findBy* 는 real-clock 폴링에 의존 — `shouldAdvanceTime: true` 덕분에 즉시 해소.
		const ready = await screen.findByText('ready');
		expect(ready).toBeInTheDocument();
	});

	it('fake-timer enable 후 수동 teardown 하면 isFakeTimers === false 로 복귀한다 (REQ-20260421-001 FR-03)', () => {
		// 같은 `it` 내부에서 enable → useRealTimers → 복귀 확인 까지 직렬화.
		// `it` 실행 순서 (shuffle 포함) 와 무관하게 안전.
		vi.useFakeTimers({ shouldAdvanceTime: true });
		expect(vi.isFakeTimers()).toBe(true);

		vi.useRealTimers();
		expect(vi.isFakeTimers()).toBe(false);
	});
});
