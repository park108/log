import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import WebVitalsItem, { createInitialEvaluationResult, buildEvaluationResult } from '../Monitor/WebVitalsItem';
import { webVitalsProd } from './__fixtures__/monitor';
import * as api from './api';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';
import { readFileSync } from 'node:fs';
import path from 'node:path';

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

		render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

		const obj = await screen.findByText("POOR");
		expect(obj).toBeInTheDocument();

		const statusBar = await screen.findByTestId("status-bar-CLS");
		expect(statusBar).toBeInTheDocument();

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// popup 이관 검증: focus → role="tooltip" + aria-describedby 설정.
		// 기존 mouseOver/mouseMove/mouseOut 어서트는 jsdom 한계로 focus 경로로 갱신.
		expect(statusBar!.getAttribute('aria-describedby')).toBeFalsy();

		act(() => { fireEvent.focus(statusBar); });

		const describedBy = statusBar!.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const tooltip = document.getElementById(describedBy!);
		expect(tooltip).not.toBeNull();
		expect(tooltip).toHaveAttribute('role', 'tooltip');
		expect(tooltip).toHaveAttribute('aria-hidden', 'false');
		// web-vitals-spec §7.2 FR-02 / REQ-20260420-020:
		// description prop 이 전달되면 tooltip 첫 <li> 에 그 문자열이 렌더되어야 한다.
		// 기존 counts 마커(🟢/🟡/🔴) 어서트는 보존 (회귀 금지).
		expect(tooltip!.textContent).toMatch(/Cumulative Layout Shift/);
		expect(tooltip!.textContent).toMatch(/🟢|🟡|🔴/);
	});
});

describe('WebVitalsItem render on prod server (failed)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('render web vitals monitor failed on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem name="CLS" />);

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

		render(<WebVitalsItem name="CLS" />);

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

			render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			const label = await screen.findByText("GOOD");
			expect(label).toBeInTheDocument();
		});
	});

	describe('needs improvement (neither good nor poor dominates)', () => {
		useMockServer(() => mock.prodServerNeedsImprovement);

		it('renders NEEDS IMPROVEMENT evaluation label when improvement counts dominate', async () => {
			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			const label = await screen.findByText("NEEDS IMPROVEMENT");
			expect(label).toBeInTheDocument();
		});
	});

	describe('empty result set (totalCount = 0)', () => {
		useMockServer(() => mock.prodServerEmpty);

		it('renders None evaluation label when the backend returns zero items', async () => {
			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

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

		render(<WebVitalsItem name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButton).toHaveAttribute('tabindex', '0');
		expect(retryButton).toHaveAttribute('role', 'button');
	});

	it('retry span activates on Enter key (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<WebVitalsItem name="CLS" />);

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

		render(<WebVitalsItem name="CLS" />);

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

		render(<WebVitalsItem name="CLS" />);

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

		let resolveResp!: (value: Response | PromiseLike<Response>) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
		const apiSpy = vi.spyOn(api, 'getWebVitals').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

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

		let rejectResp!: (reason?: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getWebVitals').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

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

// REQ-20260825-001 / monitor §동작 (G-2)(G-3)(G-4)
// 파생 state 를 새 객체로 교체하므로 헤더 카운트가 응답을 따라간다.
// 기존 케이스는 `empty result set (totalCount = 0)` 하나뿐이라 0 을 기대하는 경로만
// 있었고, 그래서 영구 `(0)` 결함을 놓쳤다.
describe('WebVitalsItem header count (REQ-20260825-001 G-2)', () => {

	describe('non-empty response', () => {
		useMockServer(() => mock.prodServerOk);

		it('헤더가 평가 항목 수를 표시한다 — 응답 4건 중 "BAD DATA" 1건 제외 → (3)', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

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

			render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

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

		for(const key of NESTED as Array<'good' | 'needImprovement' | 'poor'>) {
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

		render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

		await screen.findByText("Cumulative Layout Shift (3)");

		// 새 참조를 set 하므로 자기 참조 deps 가 남아 있으면 여기서 호출 수가 늘어난다.
		await act(async () => { await Promise.resolve(); await Promise.resolve(); });

		expect(apiSpy).toHaveBeenCalledTimes(1);
	});
});

describe('WebVitalsItem 막대 폭 유효성 (REQ-20260825-006 G-1·G-4·G-6)', () => {

	// 폭 유효성 판정 기준.
	//
	// **`NaN` 문자열 검색만으로는 아무것도 잡히지 않는다** — `width: "NaN%"` 는 무효
	// CSS 라 jsdom 도 브라우저도 그 선언을 통째로 **버린다**. 실측(2026-08-25):
	//   render(<span style={{ width: "NaN%" }} />)
	//     → style.width === ""  ·  getAttribute('style') === null  ·  cssText === ""
	// 즉 "width 문자열에 NaN 이 없다" 는 가드 유무와 무관하게 **항상 참**인 민감도 0
	// 단정이다. 그래서 판정을 "유효한 백분율 표기인가" 로 뒤집는다 — 무효값이 버려져
	// 빈 문자열이 된 상태도 이 패턴에서 탈락한다.
	const VALID_WIDTH = /^\d+(\.\d+)?%$/;
	const NAN_FREE = (w: unknown) => !String(w).includes('NaN');

	// **역할별 서로소 네임스페이스** — 평가 헤더는 `span--monitor-evaluation-<슬롯>` 을,
	// 상태 막대는 `span--monitor-<슬롯>` 을 쓴다. 두 집합이 겹치지 않으므로 **단독 슬롯
	// 선택자**가 막대를 결정적으로 집는다.
	//
	// 종전에는 두 역할이 슬롯을 공유했고, 문서 순서상 앞선 헤더가 먼저 잡혔다. 헤더에는
	// 인라인 style 이 없어 폭이 `""` 로 읽혔고, 0 경계(헤더 = `-none`)에서는 충돌하지 않아
	// **비-0 경로에서만** 어긋났다. 그래서 소비자가 막대 클래스와 슬롯 클래스를 **연접**한
	// 복합 선택자로 우회했었다 — 이 상수는 그 우회를 걷어낸 결과다. (N-6) 이 그 연접 표기를
	// 정적으로 세므로 여기서도 표기 자체를 쓰지 않는다. 마크업이 공유로 되돌아가면
	// (T-5) 가 붉어진다.
	const BAR_SLOTS = ['span--monitor-good', 'span--monitor-warn', 'span--monitor-poor'];
	const BAR_SELECTOR = (slot: string) => `.${slot}`;

	describe('0 경계 — totalCount = 0', () => {
		useMockServer(() => mock.prodServerEmpty);

		it('(T-1) 세 막대의 폭이 "0%" 다 — 0/0 이 NaN% 로 새지 않는다', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			await screen.findByText("None");

			for(const cls of BAR_SLOTS) {
				const bar = container.querySelector<HTMLElement>(BAR_SELECTOR(cls));
				expect(bar, `막대 노드 ${BAR_SELECTOR(cls)} 가 없다 — 선택자가 렌더 구조와 어긋났다`).not.toBeNull();
				expect(bar!.style.width, `.${cls} 막대의 폭이 "0%" 가 아니다`).toBe('0%');
			}
		});

		it('(T-2) 막대 전 노드의 폭이 유효한 백분율이다 (열거 순회 + 노드 수 하한)', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			await screen.findByText("None");

			// 클래스 선택자 열거 — 목록 하드코딩이 아니라 렌더 결과에서 도출한다.
			const bars = [...container.querySelectorAll<HTMLElement>('.span--monitor-bar')];

			// 공허 통과 차단 — 대상 집합이 비면 "무효 0건" 은 무조건 참이다.
			expect(bars.length, '막대 노드가 3 미만이다 — 순회 대상이 비어 판정이 공허해졌다').toBeGreaterThanOrEqual(3);

			const invalid = bars
				.map((b, i) => ({ i, w: b.style.width, cls: b.getAttribute('class') }))
				.filter(({ w }) => !VALID_WIDTH.test(w) || !NAN_FREE(w));

			expect(
				invalid,
				`유효하지 않은 막대 폭:\n${invalid.map((v) => `  [${v.i}] ${v.cls} → ${JSON.stringify(v.w)}`).join('\n')}\n` +
					'무효 CSS 는 렌더러가 버려 빈 문자열이 된다 — 화면에 안 보인다고 유효한 값이 아니다.',
			).toHaveLength(0);
		});

		// (T-6) 0 경계 — 출처 spec §동작 (N-2). 0 집계에서 헤더 슬롯은 `-none` 이라 막대
		// 슬롯과 원래 충돌하지 않았다. 이 케이스는 그 **대조군**이며, 역할 분리가 0 경계의
		// 결정성을 깨뜨리지 않았음을 고정한다. (T-5) 와 쌍으로 두어야 "0 에서만 통과하던"
		// 종전 비대칭이 반대 방향(0 에서만 실패)으로 재발하는 것을 구별할 수 있다.
		it('(T-6) 0 집계에서도 단독 슬롯 선택자가 막대를 집는다 — 인라인 style 보유로 식별', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			await screen.findByText("None");

			for(const cls of BAR_SLOTS) {
				const el = container.querySelector<HTMLElement>(`.${cls}`);
				expect(el, `단독 선택자 .${cls} 가 아무 요소도 집지 못했다`).not.toBeNull();
				// 막대만이 인라인 style 을 갖는다 — 평가 헤더를 집으면 style 속성이 없다.
				expect(
					el!.getAttribute('style'),
					`단독 선택자 .${cls} 가 인라인 style 없는 요소를 집었다 — 평가 헤더와 슬롯이 다시 겹쳤다`,
				).not.toBeNull();
				expect(el!.getAttribute('class'), `.${cls} 로 집힌 요소가 막대가 아니다`).toContain('span--monitor-bar');
				expect(el!.style.width, `.${cls} 로 집힌 막대의 폭이 "0%" 가 아니다`).toBe('0%');
			}
		});
	});

	describe('비-0 경로 — totalCount = 3', () => {
		useMockServer(() => mock.prodServerOk);

		it('(T-3) 세 막대의 폭이 리터럴 "33.333333333333336%" 다 — 반올림 도입 금지', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			await screen.findByText("POOR");

			// 기준값은 현행 산술의 출력 그대로다. toFixed/반올림을 도입하면 여기서 깨진다 —
			// 그것은 계약 충족이 아니라 회귀다.
			for(const cls of BAR_SLOTS) {
				const bar = container.querySelector<HTMLElement>(BAR_SELECTOR(cls));
				expect(bar, `막대 노드 ${BAR_SELECTOR(cls)} 가 없다`).not.toBeNull();
				expect(bar!.style.width, `.${cls} 막대의 폭 산술이 바뀌었다`).toBe('33.333333333333336%');
			}
		});

		// (T-5) 비-0 경로 — 출처 spec §참고 (Dir-1). 헤더 평가가 `POOR` 이므로 슬롯을
		// 공유하던 시절 `.span--monitor-poor` 는 헤더를 집었다. 역할 분리 후 단독 선택자가
		// 막대를 집는다는 것이 이 계약의 사용자 관측 표면이다.
		it('(T-5) 비-0 집계에서 단독 슬롯 선택자가 막대를 집는다 — 인라인 style 보유로 식별', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			const { container } = render(<WebVitalsItem name="CLS" description="Cumulative Layout Shift" />);

			await screen.findByText("POOR");

			for(const cls of BAR_SLOTS) {
				const el = container.querySelector<HTMLElement>(`.${cls}`);
				expect(el, `단독 선택자 .${cls} 가 아무 요소도 집지 못했다`).not.toBeNull();
				// 헤더에는 인라인 style 이 없다. 오선택은 예외가 아니라 `""` 로 조용히 관측되므로
				// style 속성의 **존재**를 직접 단언한다.
				expect(
					el!.getAttribute('style'),
					`단독 선택자 .${cls} 가 인라인 style 없는 요소(= 평가 헤더)를 집었다 — 역할 네임스페이스가 다시 겹쳤다`,
				).not.toBeNull();
				expect(el!.getAttribute('class'), `.${cls} 로 집힌 요소가 막대가 아니다`).toContain('span--monitor-bar');
				expect(el!.style.width, `.${cls} 로 집힌 막대의 폭이 유효한 백분율이 아니다`).toMatch(VALID_WIDTH);
			}
		});
	});

	describe('비율 텍스트 보존', () => {

		it('(T-4) 0 집계에서 rate 가 "" 로 보존된다 — 빈 막대에 0 을 표시하지 않는다', () => {

			const built = buildEvaluationResult(undefined);

			expect(built.totalCount).toBe(0);
			// `""` 를 `"0"` 으로 바꾸면 사용자 관측 텍스트가 바뀌고, 평가 분기가 문자열
			// rate 의 강제변환에 기대므로 evaluation 까지 흔들린다.
			expect(built.good.rate).toBe('');
			expect(built.needImprovement.rate).toBe('');
			expect(built.poor.rate).toBe('');
			expect(built.evaluation).toBe('None');
		});
	});
});

// 역할 분리(TSK-20260825-34)가 **시각을 바꾸지 않았음**을 정적으로 고정한다.
// (N-8) 은 슬롯 규칙에 색 **리터럴**이 들어오는 방향만 잡는다. 변수는 유지한 채 **다른**
// 변수를 참조하는 방향 — `.span--monitor-evaluation-poor { color: var(--success-text-color) }`
// — 은 (N-8)·(N-5)·(N-6)·렌더 테스트를 전부 통과하면서 화면 색만 바꾼다. 그 방향을 겨눈다.
// jsdom 은 계산된 스타일을 완전히 해석하지 않으므로 판정은 **선언 집합** 수준이다.
describe('Monitor 슬롯 시각 불변 (REQ-20260825-009 Dir-4)', () => {

	const CSS_PATH = path.resolve(__dirname, 'Monitor.css');
	const EVAL_PREFIX = 'span--monitor-evaluation-';

	// 주석을 먼저 걷어낸다 — 주석 본문의 `.span--monitor-…` 표기가 규칙으로 오계수된다.
	const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

	// 규칙 파싱. 본문 패턴을 `[^{}]*` 로 둬 **블록 경계를 넘지 않게** 한다 —
	// `[\s\S]*?` 는 경계를 존중하지 않아 인접 규칙까지 한 덩어리로 삼킨다.
	const parseRules = (css: string) => {
		const rules = new Map<string, string[]>();
		const RULE = /^\.([A-Za-z0-9_-]+)\s*\{([^{}]*)\}/gm;
		let m;
		while((m = RULE.exec(css)) !== null) {
			const decls = m[2]!
				.split(';')
				.map((d) => d.trim().replace(/\s+/g, ' '))
				.filter((d) => d.length > 0)
				.sort();
			rules.set(m[1]!, decls);
		}
		return rules;
	};

	it('(T-7) 평가 전용 슬롯 규칙의 선언 집합이 대응 막대 슬롯 규칙과 동일하다', () => {

		const rules = parseRules(stripComments(readFileSync(CSS_PATH, 'utf-8')));

		// 규칙명 하드코딩 금지 (`RULE-06 §열거 고정 금지`) — 쌍을 파일에서 도출한다.
		const pairs = [...rules.keys()]
			.filter((k) => k.startsWith(EVAL_PREFIX) && k.length > EVAL_PREFIX.length)
			.map((k) => ({ evalName: k, roleName: `span--monitor-${k.slice(EVAL_PREFIX.length)}` }));

		// 공허 통과 차단 — 도출이 비면 "불일치 0건" 은 무조건 참이다. 하한은 good/warn/poor 3.
		expect(
			pairs.length,
			`평가 전용 슬롯 규칙 도출이 ${pairs.length} 건이다 — 3 미만이면 판정이 공허하다`,
		).toBeGreaterThanOrEqual(3);

		const mismatches = pairs
			.map(({ evalName, roleName }) => ({
				evalName,
				roleName,
				a: rules.get(evalName),
				b: rules.get(roleName),
			}))
			.filter(({ a, b }) => b === undefined || JSON.stringify(a) !== JSON.stringify(b));

		expect(
			mismatches,
			'평가 슬롯과 막대 슬롯의 선언 집합이 어긋났다 — 역할 분리가 시각 회귀를 들여왔다:\n' +
				mismatches
					.map((v) => `  .${v.evalName} → ${JSON.stringify(v.a)}\n  .${v.roleName} → ${JSON.stringify(v.b)}`)
					.join('\n'),
		).toHaveLength(0);
	});
});
