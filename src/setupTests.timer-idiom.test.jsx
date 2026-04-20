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

describe('fake-timer idiom (react-19-test-layer-adaptation-spec §FR-01)', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

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
});
