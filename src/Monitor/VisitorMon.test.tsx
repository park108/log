import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import VisitorMon from '../Monitor/VisitorMon';
import * as api from './api';
import * as common from '../common/common';
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

describe('VisitorMon render on prod server (ok)', () => {
	useMockServer(() => mock.prodServerOk);

	it('render visitor monitor on prod server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643673600000));

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const obj = await screen.findByText("Rendering Engine");
		expect(obj).toBeInTheDocument();

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// popup 이관 검증: focus → role="tooltip" + aria-describedby 설정.
		// 기존 mouseOver/mouseMove/mouseOut 는 jsdom pointer 한계로 focus 경로로 갱신.
		const statusBar = await screen.findByTestId("visitor-env-Browser-1");
		expect(statusBar).toBeInTheDocument();

		expect(statusBar!.getAttribute('aria-describedby')).toBeFalsy();

		act(() => { fireEvent.focus(statusBar); });

		const describedBy = statusBar!.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const tooltip = document.getElementById(describedBy!);
		expect(tooltip).not.toBeNull();
		expect(tooltip).toHaveAttribute('role', 'tooltip');
		expect(tooltip).toHaveAttribute('aria-hidden', 'false');
	});
});

describe('VisitorMon render on prod server (failed)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('render visitor monitor failed on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByText("Retry");
		expect(retryButtons[0]).toBeInTheDocument();

		fireEvent.click(retryButtons[0]!);
	});
});

describe('VisitorMon render on prod server (network error)', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render visitor monitor network error on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByText("Retry");
		expect(retryButtons[0]).toBeInTheDocument();

		fireEvent.click(retryButtons[1]!);
	});
});

describe('VisitorMon retry keyboard activation (a11y pattern B)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('retry spans are keyboard focusable with role=button (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtons).toHaveLength(2);

		for (const el of retryButtons) {
			expect(el).toHaveAttribute('tabindex', '0');
			expect(el).toHaveAttribute('role', 'button');
		}
	});

	it('retry span activates on Enter key (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and fires a new fetch.
		// We verify by asserting the Retry buttons disappear (loading state) or are re-rendered.
		fireEvent.keyDown(retryButtons[0]!, { key: 'Enter' });

		// After Enter, the loading branch is rendered at least once → original Retry nodes detach.
		// Re-query to confirm handler ran (new Retry buttons will reappear after the mock still fails).
		const retryButtonsAfter = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtonsAfter).toHaveLength(2);
	});

	it('retry span activates on Space key and prevents default scroll (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });

		const spaceEvent = fireEvent.keyDown(retryButtons[1]!, { key: ' ' });
		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		expect(spaceEvent).toBe(false);

		const retryButtonsAfter = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtonsAfter).toHaveLength(2);
	});

	it('retry span ignores non-activation keys (a11y pattern B negative case)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButtons[0]!, { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryButtonsAfter = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtonsAfter).toHaveLength(2);
	});
});

// REQ-20260517-093 (I3)(FR-03) — unmount race 박제 (TSK-20260518-04).
// pending `getVisitors` fetch + unmount() + 응답 resolve 시 effect 본문의 setter
// (`setIsLoading` · `setIsError` · `setTotalCount` · `setDailyCount` · `setEnvTotalCount` ·
// `setBrowsers` · `setOs` · `setEngines`) 발화 0 hit + REQ-091 cross-validate
// 무필터 `console.error` 0 hit 단정으로 cross-validate 한다 (문구 필터 없음 —
// React 18.2 는 unmounted fiber 의 setState 에 경고를 내지 않으므로 문구로 거른
// 뒤 세는 단정은 코드 상태와 무관하게 항상 0 이다).
// `getVisitors` 를 vi.spyOn 으로 stub — pending Promise / resolve / reject 제어 박제.
describe('VisitorMon unmount safety (REQ-20260517-093 FR-03)', () => {

	it('pending getVisitors 중 unmount → 이후 응답 resolve 가 어떤 setter 도 발화시키지 않는다 (Warning 0 + console.error 0)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		// pending fetch 제어 — 외부에서 resolve 호출 가능한 deferred Response.
		let resolveResp!: (value: Response | PromiseLike<Response>) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });

		const getVisitorsSpy = vi.spyOn(api, 'getVisitors').mockReturnValue(pending);

		// console.error spy — beforeEach 등록분과 동일 채널. 호출 0 hit 박제 대상.
		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(<VisitorMon stackPallet={stackPallet.colors}/>);

		// fetch 트리거 1회 surface — Loading... 렌더 = 1차 setter 도착 전 pending 상태 확정.
		expect(getVisitorsSpy).toHaveBeenCalledTimes(1);
		await screen.findAllByText('Loading...');

		// unmount 후 응답 도착 — cancelled.current = true 박제로 setter 0 hit 유지 기대.
		// 관측 창을 unmount 이후로 한정한다 — 마운트 중 발화까지 세면
		// 단정이 성립하지 않는다 (현재 마운트 중 발화는 0 이지만 창을 명시한다).
		consoleErrorSpy.mockClear();
		unmount();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: {
					totalCount: 42,
					periodData: { Items: [] },
				},
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			// microtask flush
			await Promise.resolve();
			await Promise.resolve();
		});

		// REQ-091 cross-validate — **무필터** console.error 0 hit.
		// 문구 필터는 두지 않는다: React 18.2 는 unmount 된 fiber 의 setState 에
		// 경고를 내지 않으므로(dispatchSetState 가 조용히 bail out) 특정 문구로
		// 거른 뒤 0 을 세는 단정은 코드 상태와 무관하게 항상 통과한다 (민감도 0).
		// 관측 창은 unmount() 직전 mockClear 로 연다.
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('pending getVisitors 중 unmount 후 reject → catch 분기도 setter / console.error 0 hit', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		let rejectResp!: (reason?: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getVisitors').mockReturnValue(pending);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(<VisitorMon stackPallet={stackPallet.colors}/>);
		await screen.findAllByText('Loading...');

		// 관측 창을 unmount 이후로 한정한다 — 마운트 중 발화까지 세면
		// 단정이 성립하지 않는다 (현재 마운트 중 발화는 0 이지만 창을 명시한다).
		consoleErrorSpy.mockClear();
		unmount();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		// **무필터** console.error 0 hit (관측 창 = unmount 이후).
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	// ── G-G 경계 도달 대조 (TSK-20260828-01 / REQ-20260825-013) ────────────────
	// 위 두 케이스는 전부 **무발화** 단정이다. 무발화는 "가드가 막았다" 와 "애초에
	// 그 경로에 도달하지 않았다" 를 구별하지 못한다 — 그래서 중간 가드 1개가 사라져도
	// 뒤 경계의 가드가 대신 막아 초록이 유지된다 (spec post-await-guard-individual-
	// observability §역할 (a)). 아래는 그 창을 여는 **양성** 관측이다: 같은 reject 를
	// unmount **없이** 흘리면 catch 진입 경계를 넘어 log · reportError 가 실제로 발화한다.
	it('unmount 하지 않은 같은 reject 는 catch 경계를 넘어 log · reportError 를 발화한다 (경계 도달 대조)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		let rejectResp!: (reason?: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getVisitors').mockReturnValue(pending);

		// `log()` 는 DEV 에서만 console 에 쓴다 — 콘솔 spy 로는 이 경계가 보이지 않는다.
		// 발화 함수 자체를 관측한다 (FileItem 선례와 동일 이디엄).
		const logSpy = vi.spyOn(common, 'log').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		render(<VisitorMon stackPallet={stackPallet.colors}/>);
		await screen.findAllByText('Loading...');

		// 관측 창을 응답 도착 이후로 한정한다 (마운트 중 발화 제외).
		logSpy.mockClear();
		reportErrorSpy.mockClear();

		const boom = new Error('network down');
		await act(async () => {
			rejectResp(boom);
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(logSpy).toHaveBeenCalledWith('[API GET] FAILED - Visitor information', 'ERROR');
		expect(reportErrorSpy).toHaveBeenCalledTimes(1);
	});
});
