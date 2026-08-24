import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import WebVitalsItem, { createInitialEvaluationResult, buildEvaluationResult } from '../Monitor/WebVitalsItem';
import { webVitalsProd } from './__fixtures__/monitor';
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

// REQ-20260517-093 (I1)(I2)(FR-03) / TSK-20260824-07-a — unmount race 박제.
// pending `getWebVitals` 응답이 unmount 이후 도착해도 외부 발화가 0 hit 임을 고정한다.
// 단정 채널 3종: (a) unmounted setState 경고 0 (console.error 0 hit),
// (b) `log()` → `console.log` 0 hit (DEV 분기에서만 실제로 나가므로 DEV 로 stub),
// (c) `reportError()` 0 hit. 세 spy 는 전역 `vi.restoreAllMocks()` (setupTests.js) 보다
// 먼저, 즉 `it` 본문 안에서 단정한다.
describe('WebVitalsItem unmount safety (REQ-20260517-093 FR-03)', () => {

	it('pending getWebVitals 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let resolveResp;
		const pending = new Promise((resolve) => { resolveResp = resolve; });
		const apiSpy = vi.spyOn(api, 'getWebVitals').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

		expect(apiSpy).toHaveBeenCalledTimes(1);
		await screen.findByText('Loading...');

		unmount();

		// unmount 이전 발화(렌더 경로)는 판정 대상이 아니다 — 이후 채널만 남긴다.
		consoleLogSpy.mockClear();
		consoleErrorSpy.mockClear();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: { Count: 1, Items: [{ evaluation: 'GOOD' }] },
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(consoleLogSpy).not.toHaveBeenCalled();
		expect(reportErrorSpy).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('pending getWebVitals 중 unmount 후 reject → catch 경로도 발화 0 hit', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let rejectResp;
		const pending = new Promise((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getWebVitals').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

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

// REQ-20260825-001 / monitor-derived-state-immutability §동작 (G-2)(G-3)(G-4)
// 파생 state 를 새 객체로 교체하므로 헤더 카운트가 응답을 따라간다.
// 기존 케이스는 `empty result set (totalCount = 0)` 하나뿐이라 0 을 기대하는 경로만
// 있었고, 그래서 영구 `(0)` 결함을 놓쳤다.
describe('WebVitalsItem header count (REQ-20260825-001 G-2)', () => {

	describe('non-empty response', () => {
		useMockServer(() => mock.prodServerOk);

		it('헤더가 평가 항목 수를 표시한다 — 응답 4건 중 "BAD DATA" 1건 제외 → (3)', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

			// 기대값은 Items.length(4) 가 아니라 평가 항목 수(3) 다 — 두 수를 구분하는 픽스처.
			const header = await screen.findByText("Cumulative Layout Shift (3)");
			expect(header).toBeInTheDocument();
		});
	});

	describe('empty response', () => {
		useMockServer(() => mock.prodServerEmpty);

		it('빈 응답이면 헤더 (0) + 라벨 None', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

			const label = await screen.findByText("None");
			expect(label).toBeInTheDocument();

			const header = await screen.findByText("Cumulative Layout Shift (0)");
			expect(header).toBeInTheDocument();
		});
	});
});

describe('buildEvaluationResult 필드 완전성 (REQ-20260825-001 G-3)', () => {

	// 키 목록은 하드코딩하지 않고 초기값 팩토리에서 도출한다 (RULE-06 §열거 고정 금지).
	const NESTED = ['good', 'needImprovement', 'poor'];

	it('조립 결과의 키 집합이 초기값의 키 집합을 전수 포함한다 (중첩 3객체 포함)', () => {

		const initial = createInitialEvaluationResult();
		const built = buildEvaluationResult(webVitalsProd.Items);

		// 공허 통과 금지 — 기대 키 집합이 비면 "포함" 단언은 무조건 통과한다.
		expect(Object.keys(initial).length).toBeGreaterThan(0);
		expect(Object.keys(built)).toEqual(expect.arrayContaining(Object.keys(initial)));

		for(const key of NESTED) {
			expect(Object.keys(initial[key]).length).toBeGreaterThan(0);
			expect(Object.keys(built[key])).toEqual(expect.arrayContaining(Object.keys(initial[key])));
		}
	});

	it('매 호출 새 객체를 반환한다 — 초기값 팩토리도 참조를 공유하지 않는다', () => {

		expect(createInitialEvaluationResult()).not.toBe(createInitialEvaluationResult());
		expect(createInitialEvaluationResult().good).not.toBe(createInitialEvaluationResult().good);

		const a = buildEvaluationResult(webVitalsProd.Items);
		const b = buildEvaluationResult(webVitalsProd.Items);
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});

	it('평가 밖 항목("BAD DATA")은 totalCount 에 세지 않는다', () => {

		const built = buildEvaluationResult(webVitalsProd.Items);

		expect(webVitalsProd.Items.length).toBe(4);
		expect(built.totalCount).toBe(3);
		expect(built.good.count).toBe(1);
		expect(built.needImprovement.count).toBe(1);
		expect(built.poor.count).toBe(1);
	});

	it('falsy 입력이면 초기값과 같은 형태의 빈 집계를 반환한다', () => {

		const built = buildEvaluationResult(undefined);

		expect(built.totalCount).toBe(0);
		expect(built.evaluation).toBe("None");
		expect(Object.keys(built)).toEqual(expect.arrayContaining(Object.keys(createInitialEvaluationResult())));
	});
});

describe('WebVitalsItem re-fetch 폭주 없음 (REQ-20260825-001 G-4)', () => {
	useMockServer(() => mock.prodServerOk);

	it('로드 완료 후에도 getWebVitals 는 1회만 호출된다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		// spyOn 은 기본적으로 원본을 호출한다 — msw 핸들러 경로를 유지한 채 계수만 한다.
		const apiSpy = vi.spyOn(api, 'getWebVitals');

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" description="Cumulative Layout Shift" />);

		await screen.findByText("Cumulative Layout Shift (3)");

		// 새 참조를 set 하므로 자기 참조 deps 가 남아 있으면 여기서 호출 수가 늘어난다.
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });

		expect(apiSpy).toHaveBeenCalledTimes(1);
	});
});
