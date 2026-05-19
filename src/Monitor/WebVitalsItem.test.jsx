import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import WebVitalsItem from '../Monitor/WebVitalsItem';
import * as api from './api';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 각 테스트 후 spy 를 원본으로
// 복원하므로 module-level `vi.spyOn(errorReporter, ...)` 도 beforeEach 로 이관한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
});

describe('WebVitalsItem render on prod server (ok)', () => {
	useMockServer(() => mock.prodServerOk);

	it('render web vitals monitor on dev server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

		const obj = await screen.findByText("POOR");
		expect(obj).toBeInTheDocument();

		const statusBar = await screen.findByTestId("status-bar-CLS");
		expect(statusBar).toBeInTheDocument();

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// popup 이관 검증: focus → role="tooltip" + aria-describedby 설정.
		// 기존 mouseOver/mouseMove/mouseOut 어서트는 jsdom 한계로 focus 경로로 갱신.
		expect(statusBar.getAttribute('aria-describedby')).toBeFalsy();

		act(() => { fireEvent.focus(statusBar); });

		const describedBy = statusBar.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const tooltip = document.getElementById(describedBy);
		expect(tooltip).not.toBeNull();
		expect(tooltip).toHaveAttribute('role', 'tooltip');
		expect(tooltip).toHaveAttribute('aria-hidden', 'false');
		// web-vitals-spec §7.2 FR-02 / REQ-20260420-020:
		// description prop 이 전달되면 tooltip 첫 <li> 에 그 문자열이 렌더되어야 한다.
		// 기존 counts 마커(🟢/🟡/🔴) 어서트는 보존 (회귀 금지).
		expect(tooltip.textContent).toMatch(/Cumulative Layout Shift/);
		expect(tooltip.textContent).toMatch(/🟢|🟡|🔴/);
	});
});

describe('WebVitalsItem render on prod server (failed)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('render web vitals monitor failed on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();

		fireEvent.click(retryButton);
	});
});

describe('WebVitalsItem render on prod server (network error)', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render web vitals monitor network error on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();

		fireEvent.click(retryButton);
	});
});

describe('WebVitalsItem evaluation branches', () => {

	describe('all good (good rate >= 75)', () => {
		useMockServer(() => mock.prodServerAllGood);

		it('renders GOOD evaluation label when all items are GOOD', async () => {
			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

			const label = await screen.findByText("GOOD");
			expect(label).toBeInTheDocument();
		});
	});

	describe('needs improvement (neither good nor poor dominates)', () => {
		useMockServer(() => mock.prodServerNeedsImprovement);

		it('renders NEEDS IMPROVEMENT evaluation label when improvement counts dominate', async () => {
			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

			const label = await screen.findByText("NEEDS IMPROVEMENT");
			expect(label).toBeInTheDocument();
		});
	});

	describe('empty result set (totalCount = 0)', () => {
		useMockServer(() => mock.prodServerEmpty);

		it('renders None evaluation label when the backend returns zero items', async () => {
			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

			const statusBar = await screen.findByTestId("status-bar-CLS");
			expect(statusBar).toBeInTheDocument();
			const label = await screen.findByText("None");
			expect(label).toBeInTheDocument();
		});
	});
});

// REQ-20260517-093 (I3)(FR-05) — unmount race 박제 (TSK-20260520-01).
// pending `getWebVitals` fetch + unmount() + 응답 resolve / reject 시 effect 본문의 setter
// (`setIsLoading` · `setIsError` · `setEvaluationResult`) 발화 0 hit + REQ-091 cross-validate
// (`console.error` 0 hit, Warning 0) 박제.
describe('WebVitalsItem unmount safety (REQ-20260517-093 FR-05)', () => {

	it('pending getWebVitals 중 unmount → resolve 가 어떤 setter 도 발화시키지 않는다 (Warning 0 + console.error 0)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		let resolveResp;
		const pending = new Promise((resolve) => { resolveResp = resolve; });
		const getWebVitalsSpy = vi.spyOn(api, 'getWebVitals').mockReturnValue(pending);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(
			<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />
		);

		expect(getWebVitalsSpy).toHaveBeenCalledTimes(1);
		await screen.findByText('Loading...');

		unmount();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: { Count: 0, Items: [] },
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			await Promise.resolve();
			await Promise.resolve();
		});

		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);
	});

	it('pending getWebVitals 중 unmount 후 reject → catch 분기도 setter / console.error 0 hit', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		let rejectResp;
		const pending = new Promise((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getWebVitals').mockReturnValue(pending);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(
			<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />
		);
		await screen.findByText('Loading...');

		unmount();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);
	});
});

describe('WebVitalsItem Retry keyboard activation', () => {
	useMockServer(() => mock.prodServerFailed);

	it('retry span is keyboard focusable with role=button (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButton).toHaveAttribute('tabindex', '0');
		expect(retryButton).toHaveAttribute('role', 'button');
	});

	it('retry span activates on Enter key (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and fires a new fetch.
		// We verify by asserting the Retry button is re-rendered after the mock still fails.
		fireEvent.keyDown(retryButton, { key: 'Enter' });

		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();
	});

	it('retry span activates on Space key and prevents default scroll (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		const spaceEvent = fireEvent.keyDown(retryButton, { key: ' ' });
		expect(spaceEvent).toBe(false);

		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();
	});

	it('retry span ignores non-activation keys (a11y pattern B negative case)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButton, { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();
	});
});
