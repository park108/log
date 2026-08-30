import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
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

// 0건 배열에서 공허하게 참이 되지 않도록 기대 개수를 상수로 못 박는다.
const RETRY_BUTTON_COUNT = 2;

describe('VisitorMon retry keyboard activation (a11y pattern B)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('retry 는 네이티브 button 이다 — 키보드 활성이 플랫폼 보장이다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		// VisitorMon 은 Retry 를 2개 낸다. `findAllBy*` 는 1개만 있어도 즉시 반환하므로
		// 개수 도달 자체를 대기 술어로 삼는다 (blue multi-element-count-assertion-arrival-wait).
		await waitFor(() =>
			expect(screen.getAllByRole('button', { name: /Retry/ })).toHaveLength(RETRY_BUTTON_COUNT),
		);
		const retryButtons = screen.getAllByRole('button', { name: /Retry/ });

		// span[role=button] + activateOnKey 를 손으로 조립하던 것을 네이티브 button 으로
		// 바꿨다. 손조립은 키 핸들러를 빠뜨리면 조용히 키보드 접근을 잃지만, 네이티브
		// button 은 Enter·Space 활성이 브라우저 보장이다.
		retryButtons.forEach((el) => expect(el.tagName).toBe('BUTTON'));

		// 손조립 잔재가 남으면 안 된다 — role·tabIndex 를 다시 붙이면 중복 선언이고,
		// onKeyDown 까지 남으면 Enter 에서 핸들러와 네이티브 click 이 이중 발화한다.
		retryButtons.forEach((el) => {
			expect(el).not.toHaveAttribute('role');
			expect(el).not.toHaveAttribute('tabindex');
		});

		// form 안에 놓였을 때 암묵 제출을 일으키지 않는다.
		retryButtons.forEach((el) => expect(el).toHaveAttribute('type', 'button'));
	});

	it('retry 가 tabindex 없이 초점을 받는다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		// VisitorMon 은 Retry 를 2개 낸다. `findAllBy*` 는 1개만 있어도 즉시 반환하므로
		// 개수 도달 자체를 대기 술어로 삼는다 (blue multi-element-count-assertion-arrival-wait).
		await waitFor(() =>
			expect(screen.getAllByRole('button', { name: /Retry/ })).toHaveLength(RETRY_BUTTON_COUNT),
		);
		const retryButtons = screen.getAllByRole('button', { name: /Retry/ });

		// 네이티브 button 은 tabindex 없이도 초점 대상이다. 이 단언이 깨지면
		// 키보드 사용자가 이 조작부에 도달하지 못한다.
		retryButtons[0]!.focus();
		expect(document.activeElement).toBe(retryButtons[0]);
	});

	it('retry 클릭이 재시도를 일으킨다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		// VisitorMon 은 Retry 를 2개 낸다. `findAllBy*` 는 1개만 있어도 즉시 반환하므로
		// 개수 도달 자체를 대기 술어로 삼는다 (blue multi-element-count-assertion-arrival-wait).
		await waitFor(() =>
			expect(screen.getAllByRole('button', { name: /Retry/ })).toHaveLength(RETRY_BUTTON_COUNT),
		);
		const retryButtons = screen.getAllByRole('button', { name: /Retry/ });
		fireEvent.click(retryButtons[0]!);

		// mock 이 계속 실패하므로 재시도 후 오류 표면이 다시 선다.
		await waitFor(() =>
			expect(screen.getAllByRole('button', { name: /Retry/ })).toHaveLength(RETRY_BUTTON_COUNT),
		);
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

// 막대 라벨의 숫자는 백분율이다. 단위가 없으면 옆 제목의 "N cases" 와 섞여
// 건수로 읽힌다 — 바로 아래 팝업은 같은 값을 "85(62%)" 로 붙여 쓴다.
describe('VisitorMon 막대 라벨 단위', () => {
	useMockServer(() => mock.prodServerOk);

	const API = import.meta.env.VITE_MONITOR_API_BASE;

	const renderWith = async (browsers: string[]) => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		const base = new Date(2026, 7, 25).getTime();
		const Items = browsers.map((browser, i) => ({
			timestamp: base + i * 3600000,
			browser,
			operatingSystem: 'Windows',
			renderingEngine: 'Blink',
		}));

		mock.prodServerOk.use(http.get(API + '/prod/useragent', async () => HttpResponse.json({
			statusCode: 200,
			body: { totalCount: Items.length, periodData: { Items } },
		})));

		const view = render(<VisitorMon stackPallet={stackPallet.colors} />);
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
		return view;
	};

	it('막대 라벨이 백분율임을 표시한다', async () => {

		// Chrome 3 / Safari 1 → 75% / 25%
		const { container } = await renderWith(['Chrome', 'Chrome', 'Chrome', 'Safari']);

		const labels = Array.from(container.querySelectorAll('.div--monitor-stackvalue'))
			.map((n) => (n.textContent ?? '').trim());

		expect(labels.length, '막대 라벨이 없다 — 판정이 공허하다').toBeGreaterThan(0);
		// 이전에는 "Chrome, 75" 였다 — 75건으로 읽힌다.
		expect(labels).toContain('Chrome, 75%');
		expect(labels).toContain('Safari, 25%');
	});

	// 대조 — 팝업은 건수와 백분율을 함께 적는다. 라벨과 뜻이 어긋나면 안 된다.
	it('팝업은 건수와 백분율을 함께 적는다', async () => {

		const { container } = await renderWith(['Chrome', 'Chrome', 'Chrome', 'Safari']);

		const bar = container.querySelector('[data-testid^="visitor-env-Browser"]');
		expect(bar).not.toBeNull();
		fireEvent.focus(bar!);

		await waitFor(() => expect(container.querySelector('[role="tooltip"]')).not.toBeNull());
		const detail = (container.querySelector('[role="tooltip"]')?.textContent ?? '').replace(/\s+/g, ' ');
		expect(detail).toMatch(/\d+\(\d+%\)/);
	});
});

// 방문자 항목의 브라우저·OS·엔진은 선택적 필드다 — 옛 기록이나 서버 변경으로
// 빠질 수 있다. 그대로 담으면 차트에 "undefined" 라는 항목이 생긴다.
describe('VisitorMon 필드가 빠진 기록', () => {
	useMockServer(() => mock.prodServerOk);

	const API = import.meta.env.VITE_MONITOR_API_BASE;

	const labelsFor = async (Items: unknown[]): Promise<string[]> => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		mock.prodServerOk.use(http.get(API + '/prod/useragent', async () => HttpResponse.json({
			statusCode: 200,
			body: { totalCount: Items.length, periodData: { Items } },
		})));

		const { container } = render(<VisitorMon stackPallet={stackPallet.colors} />);
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
		return Array.from(container.querySelectorAll('.div--monitor-stackvalue'))
			.map((n) => (n.textContent ?? '').trim());
	};

	it('빠진 필드를 undefined 로 적지 않는다', async () => {

		const base = new Date(2026, 7, 25).getTime();
		const labels = await labelsFor([
			{ timestamp: base, browser: 'Chrome', operatingSystem: 'Windows', renderingEngine: 'Blink' },
			{ timestamp: base + 1000 },                       // 세 필드 모두 없음
			{ timestamp: base + 2000, browser: 'Safari' },    // OS·엔진 없음
		]);

		expect(labels.length, '막대가 없다 — 판정이 공허하다').toBeGreaterThan(0);
		expect(labels.join(' ')).not.toContain('undefined');
		expect(labels.join(' ')).toContain('Others');
	});

	// 대조 — 필드가 다 있으면 그 값을 그대로 쓴다.
	it('필드가 있으면 그 값을 쓴다', async () => {

		const base = new Date(2026, 7, 25).getTime();
		const labels = await labelsFor([
			{ timestamp: base, browser: 'Chrome', operatingSystem: 'Windows', renderingEngine: 'Blink' },
		]);

		expect(labels.join(' ')).toContain('Chrome');
		expect(labels.join(' ')).not.toContain('Others');
	});
});
