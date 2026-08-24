import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import ApiCallItem from './ApiCallItem';
import * as api from './api';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
});
// 기존 module-level `vi.spyOn(errorReporter, 'reportError')` 는 전역
// `vi.restoreAllMocks()` (setupTests.js) 가 추가된 이후 각 테스트 시작 시점에
// 복원되므로 beforeEach 내부로 재등록 일원화한다.

const stackPallet = {
	pallet: "Red to Green",
	colors: [
		{color: "black", backgroundColor: "rgb(243, 129, 129)"},
		{color: "black", backgroundColor: "rgb(248, 178, 134)"},
		{color: "black", backgroundColor: "rgb(252, 227, 138)"},
		{color: "black", backgroundColor: "rgb(243, 241, 173)"},
		{color: "black", backgroundColor: "rgb(234, 255, 208)"},
		{color: "black", backgroundColor: "rgb(190, 240, 210)"},
		{color: "black", backgroundColor: "rgb(149, 225, 211)"},
	]
};

describe('ApiCallItem render on prod server (ok)', () => {
	useMockServer(() => mock.prodServerOk);

	it('render api call monitor on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		const obj = await screen.findByText("02.01 (Tue)");
		expect(obj).toBeInTheDocument();

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// popup 이관 검증: focus 시 role="tooltip" + aria-describedby 설정 + blur 후 100ms 숨김.
		// 기존 mouseOver/mouseMove/mouseOut 는 jsdom pointer event 한계로 불안정 → focus 경로로 갱신.
		const firstPillar = await screen.findByTestId("api-call-item-log-0");
		expect(firstPillar).toBeInTheDocument();

		// 초기: popup 미렌더 (isVisible=false).
		expect(firstPillar.getAttribute('aria-describedby')).toBeFalsy();

		act(() => { fireEvent.focus(firstPillar); });

		const describedBy = firstPillar.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const tooltip = document.getElementById(describedBy);
		expect(tooltip).not.toBeNull();
		expect(tooltip).toHaveAttribute('role', 'tooltip');
		expect(tooltip).toHaveAttribute('aria-hidden', 'false');
	});
});

describe('ApiCallItem render on prod server (no count)', () => {
	useMockServer(() => mock.prodServerHasNoCount);

	it('render api call monitor has zero total count on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		const obj = await screen.findByText("02.01 (Tue)");
		expect(obj).toBeInTheDocument();
	});
});

describe('ApiCallItem render on prod server (no total count)', () => {
	useMockServer(() => mock.prodServerHasNoTotalCount);

	it('render api call monitor but has no total count on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();

		fireEvent.click(retryButton);
	});
});

describe('ApiCallItem render on prod server (failed)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('render api call monitor failed on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();
	});
});

describe('ApiCallItem render on prod server (network error)', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render api call monitor network error on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();
	});
});

describe('ApiCallItem Retry keyboard activation (a11y pattern B)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('retry span is keyboard focusable with role=button', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButton).toHaveAttribute('tabindex', '0');
		expect(retryButton).toHaveAttribute('role', 'button');
	});

	it('retry span activates on Enter key', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and re-fetches.
		// With the mock still failing, the Retry button is re-rendered after the new attempt.
		fireEvent.keyDown(retryButton, { key: 'Enter' });

		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();
	});

	it('retry span activates on Space key and prevents default scroll', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		const spaceEvent = fireEvent.keyDown(retryButton, { key: ' ' });
		expect(spaceEvent).toBe(false);

		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();
	});

	it('retry span ignores non-activation keys (negative case)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButton, { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();
	});
});

// REQ-20260517-093 (I1)(I2)(FR-03) / TSK-20260824-07-a — unmount race 박제.
// pending `getApiCallStats` 응답이 unmount 이후 도착해도 외부 발화가 0 hit 임을 고정한다.
// 단정 채널 3종: (a) unmounted setState 경고 0 (console.error 0 hit),
// (b) `log()` → `console.log` 0 hit (DEV 분기에서만 실제로 나가므로 DEV 로 stub),
// (c) `reportError()` 0 hit. 세 spy 는 전역 `vi.restoreAllMocks()` (setupTests.js) 보다
// 먼저, 즉 `it` 본문 안에서 단정한다.
describe('ApiCallItem unmount safety (REQ-20260517-093 FR-03)', () => {

	it('pending getApiCallStats 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let resolveResp;
		const pending = new Promise((resolve) => { resolveResp = resolve; });
		const apiSpy = vi.spyOn(api, 'getApiCallStats').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		expect(apiSpy).toHaveBeenCalledTimes(1);
		await screen.findByText('Loading...');

		unmount();

		// unmount 이전 발화(렌더 경로)는 판정 대상이 아니다 — 이후 채널만 남긴다.
		consoleLogSpy.mockClear();
		consoleErrorSpy.mockClear();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: {
					ProcessingTime: 12,
					totalCount: 2,
					Items: [{ timestamp: 1643375805000, total: 2, succeed: 2, failed: 0 }],
				},
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(consoleLogSpy).not.toHaveBeenCalled();
		expect(reportErrorSpy).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('pending getApiCallStats 중 unmount 후 reject → catch 경로도 발화 0 hit', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let rejectResp;
		const pending = new Promise((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getApiCallStats').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		await screen.findByText('Loading...');

		unmount();

		consoleLogSpy.mockClear();
		consoleErrorSpy.mockClear();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(consoleLogSpy).not.toHaveBeenCalled();
		expect(reportErrorSpy).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});
});
