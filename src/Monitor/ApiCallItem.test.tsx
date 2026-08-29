import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import ApiCallItem from './ApiCallItem';
import * as api from './api';
import * as common from '../common/common';
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
		const tooltip = document.getElementById(describedBy!);
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

	it('retry 는 네이티브 button 이다 — 키보드 활성이 플랫폼 보장이다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// span[role=button] + activateOnKey 를 손으로 조립하던 것을 네이티브 button 으로
		// 바꿨다. 손조립은 키 핸들러를 빠뜨리면 조용히 키보드 접근을 잃지만, 네이티브
		// button 은 Enter·Space 활성이 브라우저 보장이다.
		expect(retryButton.tagName).toBe('BUTTON');

		// 손조립 잔재가 남으면 안 된다 — role·tabIndex 를 다시 붙이면 중복 선언이고,
		// onKeyDown 까지 남으면 Enter 에서 핸들러와 네이티브 click 이 이중 발화한다.
		expect(retryButton).not.toHaveAttribute('role');
		expect(retryButton).not.toHaveAttribute('tabindex');

		// form 안에 놓였을 때 암묵 제출을 일으키지 않는다.
		expect(retryButton).toHaveAttribute('type', 'button');
	});

	it('retry 가 tabindex 없이 초점을 받는다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// 네이티브 button 은 tabindex 없이도 초점 대상이다. 이 단언이 깨지면
		// 키보드 사용자가 이 조작부에 도달하지 못한다.
		retryButton.focus();
		expect(document.activeElement).toBe(retryButton);
	});

	it('retry 클릭이 재시도를 일으킨다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		fireEvent.click(retryButton);

		// mock 이 계속 실패하므로 재시도 후 오류 표면이 다시 선다.
		expect(await screen.findByRole('button', { name: /Retry/ })).toBeInTheDocument();
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

		let resolveResp!: (value: Response | PromiseLike<Response>) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
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

		let rejectResp!: (reason?: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
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

	// ── G-G 경계 도달 대조 (TSK-20260828-01 / REQ-20260825-013) ────────────────
	// 위 두 케이스는 전부 **무발화** 단정이다. 무발화는 "가드가 막았다" 와 "애초에
	// 그 경로에 도달하지 않았다" 를 구별하지 못한다 — 중간 가드 1개가 사라져도 뒤
	// 경계의 가드가 대신 막아 초록이 유지된다 (spec post-await-guard-individual-
	// observability §역할 (a)). 아래는 그 창을 여는 **양성** 관측이다: 같은 reject 를
	// unmount **없이** 흘리면 catch 진입 경계를 넘어 log · reportError 가 실제로 발화한다.
	it('unmount 하지 않은 같은 reject 는 catch 경계를 넘어 log · reportError 를 발화한다 (경계 도달 대조)', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let rejectResp!: (reason?: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getApiCallStats').mockReturnValue(pending);

		// `log()` 는 DEV 에서만 console 에 쓴다 — 발화 함수 자체를 관측한다.
		const logSpy = vi.spyOn(common, 'log').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

		await screen.findByText('Loading...');

		// 관측 창을 응답 도착 이후로 한정한다 (마운트 중 발화 제외).
		logSpy.mockClear();
		reportErrorSpy.mockClear();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(logSpy).toHaveBeenCalledWith('[API GET] FAILED - API call stats: log', 'ERROR');
		expect(reportErrorSpy).toHaveBeenCalledTimes(1);
	});
});
