import type React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Monitor from '../Monitor/Monitor';
import * as common from '../common/common';

// TSK-20260825-16 — `components/monitor` §수용 기준 §페이지 셸 6항의 측정 채널.
//
// 착수 시점 이 파일은 51행 · it 2개 · `expect(` 총 1개였고, `redirect if not admin`
// 케이스는 **단언이 0개**였다 (throw 가 없는 한 실패할 수 없다). 셸 6항 중 4항은
// 토큰조차 없었다 — `setFullscreen` 0 hit · `Suspense` 0 hit · `CHART_PALLETS` 0 hit ·
// `main--main-contents` 0 hit. 즉 §테스트 현황의 `[x] … fullscreen on/off, 4 패널 마운트`
// 는 사실이 아니었다. 본 파일은 **동작을 바꾸지 않고 측정만** 붙인다 — 6항은 현 HEAD
// 에서 전부 참이며 (아래 단언 전수 green), 없던 것은 동작이 아니라 채널이다.
//
// ── 패널 prop 기록기 ────────────────────────────────────────────────────────
// `CHART_PALLETS` 주입은 **렌더 결과로는 잴 수 없다** (실측): 패널은 데이터가 있어야
// 색을 칠하는데 테스트 환경에서 API 응답이 없어 `background-color` 를 가진 요소가
// **0개**다. 그 표면으로 판정하면 데이터가 비는 한 언제나 공허하게 통과한다.
// 그래서 `lazy(() => import('./X'))` 대상 모듈을 **원본을 감싸는 기록기**로 대체해
// prop 을 캡처한다. 원본을 그대로 렌더하므로 heading 문구·마크업은 실제 패널의 것이고
// (문구를 테스트가 지어내지 않는다), 캡처는 prop 축만 관측한다.
//
// `vi.mock` 호출은 import 위로 hoist 되므로 factory 가 참조하는 것은 전부
// `vi.hoisted` 안에 있어야 한다 (평범한 `const` 로 두면 `Cannot access … before
// initialization` — 실측).
const panelProps = vi.hoisted(() => {
	const records: Array<{ name: string; props: Record<string, unknown> }> = [];
	const state = { suspend: false };
	// 영구 pending — 해소되지 않으므로 각 패널은 자기를 감싸는 Suspense 경계에
	// 멈춘 채로 남는다. 경계 수 판정의 입력이다 (아래 §셸 축 4 주석).
	const neverSettles = new Promise(() => {});
	const record = (name: string) => async (importOriginal: () => Promise<unknown>) => {
		const actual = (await importOriginal()) as typeof import('react') & { default: React.ComponentType<Record<string, unknown>> };
		const { createElement } = await import('react');
		const Real = actual.default;
		const Recorder = (props: Record<string, unknown>) => {
			records.push({ name, props });
			if (state.suspend) throw neverSettles;
			return createElement(Real, props);
		};
		Recorder.displayName = `RecordedPanel(${name})`;
		return { ...actual, default: Recorder };
	};
	return { records, state, record };
});

vi.mock('./ContentMon', panelProps.record('ContentMon'));
vi.mock('./ApiCallMon', panelProps.record('ApiCallMon'));
vi.mock('./WebVitalsMon', panelProps.record('WebVitalsMon'));
vi.mock('./VisitorMon', panelProps.record('VisitorMon'));

// 패널 heading 문구 — **순서 식별자로만** 쓴다. 주 판정은 `개수 4 + DOM 순서` 이고
// 문구는 어느 패널인지 이름 붙이는 용도다 (문구가 바뀌면 red 가 되는 것이 옳다).
const PANEL_HEADINGS_IN_ORDER = [
	'Contents in the last 6 months',
	'API Calls in the last 7 days',
	'Web Vitals in the last 24 hours',
	'Visitors in the last 7 days',
];

// `Monitor.jsx` 의 `CHART_PALLETS` 첫 색 — [0] Red to Green / [1] Olive.
// 주입 축의 판정에는 **고정 값이 필요하다**: 두 팔레트를 맞교환해도 "ApiCall ≠ Content"
// 같은 구조 단언은 그대로 참이라 교환을 못 잡는다 (실측 검토).
const RED_TO_GREEN_HEAD = '#F8696B';
const OLIVE_HEAD = '#CAD2C5';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	panelProps.records.length = 0;
	panelProps.state.suspend = false;
});

const testEntry = {
	pathname: "/monitor"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

const asAdmin = (isAdmin: boolean) => {
	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);
	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(isAdmin);
};

const renderMonitor = (contentHeight?: React.CSSProperties) =>
	render(
		<MemoryRouter initialEntries={[testEntry]}>
			<Monitor contentHeight={contentHeight} />
		</MemoryRouter>
	);

it('render monitor if it logged in', async () => {

	asAdmin(true);

	renderMonitor();

	const text = await screen.findByText("Contents in the last 6 months");
	expect(text).toBeInTheDocument();
});

// ── 셸 축 (1) non-admin 리다이렉트 + fullscreen·title 미설정 ────────────────
// 착수 시점 이 케이스는 렌더만 하고 끝났다 (단언 0개).
it('redirect if not admin', async () => {

	asAdmin(false);

	const setFullscreenSpy = vi.spyOn(common, "setFullscreen");
	const setHtmlTitleSpy = vi.spyOn(common, "setHtmlTitle");
	// 발화 관측기 (TSK-20260828-09 / FR-02) — `Monitor.jsx` admin 게이트 effect 는
	// `log("Redirect to /log")` 를 발화한 뒤 navigate 한다. 그 발화를 관측하는 spy 가
	// 없으면 이 파일은 post-unmount 발화 감사에서 단락된다. 좁힘 없는 **양성** 인자 단정.
	const emissionSpy = vi.spyOn(common, "log");

	render(
		<MemoryRouter initialEntries={[testEntry]}>
			<Routes>
				<Route path="/monitor" element={<Monitor />} />
				<Route path="/log" element={<div>log route landing</div>} />
			</Routes>
		</MemoryRouter>
	);

	// 리다이렉트 **도착**을 단언한다 — `navigate` 호출만 세면 라우트가 없어도 통과한다.
	expect(await screen.findByText('log route landing')).toBeInTheDocument();
	expect(emissionSpy).toHaveBeenCalledWith("Redirect to /log");

	// non-admin 은 셸을 세우지 않는다 (early return 이 fullscreen·title 앞에 있다).
	expect(setFullscreenSpy).not.toHaveBeenCalled();
	expect(setHtmlTitleSpy).not.toHaveBeenCalled();
});

// ── 셸 축 (2) admin 진입/이탈 fullscreen 왕복 + title ───────────────────────
it('sets fullscreen on admin mount and clears it on unmount (shell axis 2)', async () => {

	asAdmin(true);

	const setFullscreenSpy = vi.spyOn(common, "setFullscreen");
	const setHtmlTitleSpy = vi.spyOn(common, "setHtmlTitle");

	const { unmount } = renderMonitor();

	await screen.findByText(PANEL_HEADINGS_IN_ORDER[0]!);

	expect(setHtmlTitleSpy).toHaveBeenCalledWith("monitor");
	expect(setFullscreenSpy).toHaveBeenCalledWith(true);
	// 좁힘 결과를 **먼저 길이로** 고정한 뒤 값을 비교한다. `expect(<좁힘>).toEqual([...])`
	// 인라인 형태는 post-unmount 발화 감사(축 1·2)에서 "좁힌 뒤 비어있음이 아님을 증명하지
	// 못하는 단정" 으로 읽힌다 — 길이 단언이 그 증명을 명시적으로 준다.
	const enterValues = setFullscreenSpy.mock.calls.map(([value]) => value);
	expect(enterValues).toHaveLength(1);
	expect(enterValues).toEqual([true]);

	unmount();

	// cleanup 이 fullscreen 을 되돌린다. 진입 true → 이탈 false 의 **순서**까지 고정한다 —
	// 호출 여부만 보면 cleanup 이 사라지고 mount 가 두 번 불린 형태와 구별되지 않는다.
	const roundTripValues = setFullscreenSpy.mock.calls.map(([value]) => value);
	expect(roundTripValues).toHaveLength(2);
	expect(roundTripValues).toEqual([true, false]);
});

// ── 셸 축 (3) 4 패널 DOM 순서 ───────────────────────────────────────────────
it('mounts four panels in declared order (shell axis 3)', async () => {

	asAdmin(true);

	renderMonitor();

	// 대기 조건 == 단언 조건. `findAllBy*` 는 매치 1개에서 resolve 하므로
	// 4 패널이 각자의 Suspense 경계에서 독립적으로 도착하는 이 화면에서는
	// 대기(≥1)와 단언(=4)이 어긋난다. 개수 도달을 술어로 삼아 붙인다.
	await waitFor(() =>
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(PANEL_HEADINGS_IN_ORDER.length),
	);

	// 순서 단언에 쓰는 스냅샷은 대기 이후 동기 조회로 다시 뜬다 —
	// `waitFor` 콜백 내부 배열을 밖으로 새어 나가게 하지 않는다.
	const headings = screen.getAllByRole('heading', { level: 1 });

	// 개수 하한 — 0건이면 "순서 일치" 가 공허하게 참이 된다.
	expect(headings).toHaveLength(PANEL_HEADINGS_IN_ORDER.length);
	expect(headings.map((h) => h.textContent)).toEqual(PANEL_HEADINGS_IN_ORDER);
});

// ── 셸 축 (4) 패널별 독립 Suspense 경계 ────────────────────────────────────
it('renders four independent suspense fallbacks while panels are pending (shell axis 4)', () => {

	asAdmin(true);

	// 패널을 **미해소 상태로 고정**한 뒤 fallback 을 센다. 4 경계가 1 개로 병합되면
	// fallback 도 1 개가 되므로 이 수치가 경계 독립성의 판별력을 갖는다.
	//
	// **`lazy` 의 미해소 상태에 기대지 않는 이유** (선행 관측 결과): 파일의 첫 케이스에서는
	// `lazy()` 가 아직 resolve 되지 않아 동기 렌더가 빈 `<div>` 4개를 내지만, 앞선 케이스가
	// 한 번이라도 패널을 로드하고 나면 모듈 캐시가 데워져 같은 코드가 `ARTICLE` 4개를 낸다
	// (실측 — 이 파일에서 그대로 관측됐다). 그 형태로 두면 판정이 **케이스 실행 순서에
	// 종속**되고, "첫 번째 it 이어야 한다" 는 위치 결합이 생긴다. 그래서 미해소를 패널
	// 자신이 만들게 해 순서 무관하게 만든다.
	panelProps.state.suspend = true;

	const { container } = renderMonitor();

	const main = container.querySelector('main');
	expect(main).not.toBeNull();
	expect(main!.childElementCount).toBe(4);

	const fallbacks = [...main!.children];
	expect(fallbacks.map((node) => node.tagName)).toEqual(['DIV', 'DIV', 'DIV', 'DIV']);
	expect(fallbacks.every((node) => node.innerHTML === '')).toBe(true);
});

// ── 셸 축 (5) CHART_PALLETS 주입 ───────────────────────────────────────────
it('injects chart pallets per panel (shell axis 5)', async () => {

	asAdmin(true);

	renderMonitor();

	await screen.findByText(PANEL_HEADINGS_IN_ORDER[0]!);
	await screen.findByText(PANEL_HEADINGS_IN_ORDER[3]!);

	// 공허 방지 — 기록이 비면 아래 조회가 전부 undefined 가 되고 단언이 무의미해진다.
	expect(panelProps.records.length).toBeGreaterThanOrEqual(4);

	const palletOf = (name: string) => {
		const record = panelProps.records.find((r) => r.name === name);
		expect(record, `패널 ${name} 이 렌더되지 않았다`).toBeDefined();
		return record!.props.stackPallet as Array<{ backgroundColor: string; color: string }>;
	};

	expect(palletOf('ApiCallMon')[0]!.backgroundColor).toBe(RED_TO_GREEN_HEAD);
	expect(palletOf('ContentMon')[0]!.backgroundColor).toBe(OLIVE_HEAD);
	expect(palletOf('VisitorMon')[0]!.backgroundColor).toBe(OLIVE_HEAD);
	// WebVitals 패널은 팔레트를 받지 않는다 — "전 패널에 무언가 넘어간다" 로 느슨해지면
	// 주입 축이 사라진다.
	expect(palletOf('WebVitalsMon')).toBeUndefined();
});

// ── 셸 축 (6) 레이아웃 셸 ──────────────────────────────────────────────────
it('renders the main contents shell with injected height (shell axis 6)', () => {

	asAdmin(true);

	const { container } = renderMonitor({ height: '765px' });

	const main = container.querySelector('main');
	expect(main).not.toBeNull();
	expect(main!.className).toContain('main--main-contents');
	expect(main!.style.height).toBe('765px');
});
