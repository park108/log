import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as api from './api';
import LogList from './LogList';
import { logListFirst7, logListFirst7WithTemporary, logListNext3 } from './__fixtures__/logs';

// TSK-20260824-07-c — 저장소에 `LogList` 를 **직접 렌더하는** 테스트가 0건이었다
// (`useHoverPopup.test.tsx` / `hooks/useLogList.test.js` 2건은 컴포넌트를 렌더하지 않는다).
// 라우팅 경로는 `Log.jsx` → `lazy(() => import('./LogList'))` 이며 `./api` 의
// `getLogs` / `getNextLogs` 를 직접 호출하는 raw fetch 다 (React Query 훅 미소비).
// 본 스위트는 응답을 `vi.spyOn(api, ...)` 로 직접 제어해 msw 없이 결정론을 얻는다.

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
// DEV=true 가 필수다 — `log()` 는 `isDev()` 분기 안에서만 `console.log` 로 나가므로
// PROD stub 이면 unmount race 케이스의 콘솔 단정이 공허해진다.
const stubMode = (mode: string) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// `LogList` 는 `sessionStorage` 의 `logList` / `logListLastTimestamp` 를 읽고(첫 fetch 우회)
// 쓴다(목록 수신 시). 케이스 간 누수를 막기 위해 매 테스트 시작 시 명시적으로 비운다.
beforeEach(() => {
	sessionStorage.removeItem("logList");
	sessionStorage.removeItem("logListLastTimestamp");
});

const jsonResponse = (payload: unknown) => new Response(JSON.stringify(payload), {
	status: 200,
	headers: { 'Content-Type': 'application/json' },
});

const renderLogList = () => render(
	<MemoryRouter initialEntries={[{ pathname: "/log", search: "", hash: "", state: {}, key: "default" }]}>
		<LogList />
	</MemoryRouter>
);

const flushAfterResponse = async () => {
	await act(async () => {
		await new Promise(resolve => setTimeout(resolve, 0));
	});
};

test('첫 응답의 로그 목록과 See more 버튼을 렌더한다', async () => {

	stubMode('development');

	const getLogsSpy = vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

	renderLogList();

	const items = await screen.findAllByRole("listitem");
	expect(items.length).toBe(7);
	expect(await screen.findByTestId("seeMoreButton")).toBeInTheDocument();
	expect(getLogsSpy).toHaveBeenCalledTimes(1);
});

test('세션에 목록만 있고 lastTimestamp 가 없으면 fetch 없이 렌더하고 See more 를 숨긴다', async () => {

	stubMode('development');

	sessionStorage.setItem("logList", JSON.stringify(logListFirst7.Items));

	const getLogsSpy = vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

	renderLogList();

	const items = await screen.findAllByRole("listitem");
	expect(items.length).toBe(7);
	expect(screen.queryByTestId("seeMoreButton")).toBeNull();
	expect(getLogsSpy).not.toHaveBeenCalled();
});

test('LastEvaluatedKey 가 없는 첫 응답은 See more 를 렌더하지 않는다', async () => {

	stubMode('development');

	vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({
		body: { Items: logListNext3.Items, Count: 3, ScannedCount: 3 },
	}));

	renderLogList();

	const items = await screen.findAllByRole("listitem");
	expect(items.length).toBe(3);
	expect(screen.queryByTestId("seeMoreButton")).toBeNull();
});

test('See more 응답에 LastEvaluatedKey 가 없으면 마운트 중 이어붙이고 See more 를 감춘다', async () => {

	stubMode('development');

	vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));
	vi.spyOn(api, 'getNextLogs').mockResolvedValue(jsonResponse({
		body: { Items: logListNext3.Items, Count: 3, ScannedCount: 3 },
	}));

	renderLogList();

	fireEvent.click(await screen.findByTestId("seeMoreButton"));

	// 마운트 중 적용을 명시적으로 기다린다. 응답 분기를 RTL auto-cleanup unmount 이후
	// 실행으로 덮으면 그것이 곧 본 spec 이 금지하는 post-unmount 발화다.
	await waitFor(() => expect(screen.getAllByRole("listitem").length).toBe(10));
	await waitFor(() => expect(screen.queryByTestId("seeMoreButton")).toBeNull());
});

// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-c —
// async effect unmount race 박제. pending `getLogs` / `getNextLogs` 를 `vi.spyOn` 으로
// 외부 resolve/reject 가능한 deferred 로 바꾼 뒤 `unmount()` → 응답 도착 왕복을 만든다.
// 단정 3종: (a) state 전이 0 (목록 DOM 부재), (b) `console.log` 0 hit, (c) `console.error` 0 hit.
// spy 는 unmount 직후 `mockClear()` 로 기준점을 잡아 unmount **이전** 발화와 분리한다.
// `LogList.jsx` 는 `log(` 11 hit / `reportError` 0 이므로 setter 만 막는 부분 가드는
// (I2) 를 충족하지 못한다 — 콘솔 단정이 그 판정 지점이다.
describe('LogList unmount-safety (REQ-20260517-093 (I1)(I2))', () => {

	beforeEach(() => {
		stubMode('development');
	});

	it('pending getLogs 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		let resolveResp!: (value: Response | PromiseLike<Response>) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
		const getLogsSpy = vi.spyOn(api, 'getLogs').mockReturnValue(pending);

		const { unmount } = renderLogList();

		await waitFor(() => expect(getLogsSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolveResp(jsonResponse({ body: logListFirst7 }));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByRole("listitem")).toBeNull();
	});

	it('pending getLogs 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		let rejectResp!: (reason?: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		const getLogsSpy = vi.spyOn(api, 'getLogs').mockReturnValue(pending);

		const { unmount } = renderLogList();

		await waitFor(() => expect(getLogsSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectResp(new Error('network down'));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByText("Whoops, something went wrong on our end.")).toBeNull();
	});

	it('pending getNextLogs 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		let resolveNext!: (value: Response | PromiseLike<Response>) => void;
		const pendingNext = new Promise<Response>((resolve) => { resolveNext = resolve; });
		const getNextLogsSpy = vi.spyOn(api, 'getNextLogs').mockReturnValue(pendingNext);

		const { unmount } = renderLogList();

		fireEvent.click(await screen.findByTestId("seeMoreButton"));

		await waitFor(() => expect(getNextLogsSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolveNext(jsonResponse({ body: logListNext3 }));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByRole("listitem")).toBeNull();
	});

	it('pending getNextLogs 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		let rejectNext!: (reason?: unknown) => void;
		const pendingNext = new Promise<Response>((_, reject) => { rejectNext = reject; });
		const getNextLogsSpy = vi.spyOn(api, 'getNextLogs').mockReturnValue(pendingNext);

		const { unmount } = renderLogList();

		fireEvent.click(await screen.findByTestId("seeMoreButton"));

		await waitFor(() => expect(getNextLogsSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectNext(new Error('network down'));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByText("Whoops, something went wrong on our end.")).toBeNull();
	});
});

// 브라우저 저장소는 없을 수 있다. 사이트 데이터를 차단하면 접근 자체가
// SecurityError 를 던지고, 용량이 차면 setItem 이 QuotaExceededError 를 던진다.
// 감싸이지 않은 그 예외가 async fetch 를 중간에 끊어 setIsLoading(false) 에
// 닿지 못했고, 홈 화면이 "Loading logs..." 에서 영원히 멈췄다
// (실측: 저장소 차단 시 목록 0건 · 정상일 때 7건).
describe('LogList 저장소가 막혀 있을 때', () => {

	const blockStorage = () => {
		const denied = () => { throw new DOMException('Access denied.', 'SecurityError'); };
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied);
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
		});
	};

	it('목록을 서버에서 받아 그린다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));
		blockStorage();

		renderLogList();

		// 이전에는 0건인 채 "Loading logs..." 에서 멈췄다.
		await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));

		// 그리고 **계속** 있어야 한다. 캐시 쓰기는 목록이 그려진 뒤 effect 에서
		// 일어나므로, 그때 예외가 나면 경계 없는 트리가 통째로 무너진다 —
		// 실측: 쓰기 보호를 빼면 여기서 항목이 0 이 된다. 단언을 그 시점 앞에
		// 두면 이 결함을 놓친다 (실제로 놓쳤다).
		await flushAfterResponse();
		expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
	});

	// 대조 — 저장소가 정상이면 캐시에 남겨야 한다. 없으면 "캐시를 아예 쓰지
	// 않는" 구현도 통과한다.
	it('저장소가 정상이면 캐시에 남긴다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		renderLogList();

		await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));
		await waitFor(() => expect(sessionStorage.getItem('logList')).not.toBeNull());
	});
});

// 임시 저장 표식은 글리프 하나다. 낭독기는 "writing hand" 로 읽고 임시 저장이라는
// 뜻은 어디에도 없었다. 보이는 쪽에도 단서가 없어 title 을 함께 둔다.
describe('LogList 임시 저장 표식', () => {

	it('이름을 갖는다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7WithTemporary }));

		renderLogList();

		const marker = await screen.findByRole('img', { name: 'Temporary save' });
		expect(marker).toBeInTheDocument();
		expect(marker.getAttribute('title')).toBe('Temporary save');
	});

	// 대조 — 임시 저장이 아닌 글에는 표식이 없어야 한다. 없으면 "언제나 표식"
	// 구현도 통과한다.
	it('임시 저장이 아니면 표식이 없다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		renderLogList();

		await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));
		expect(screen.queryByRole('img', { name: 'Temporary save' })).toBeNull();
	});
});

// 마지막 페이지에 닿으면 커서도 함께 지워야 한다.
//
// 이전에는 커서가 있을 때만 저장하고 없어질 때는 두었다. 그래서 저장소에 옛
// 값이 남아 다음 방문에서 복원됐고, 눌러도 더 나올 것이 없는 "See more" 가
// 되살아났다 (실측: 끝까지 넘긴 뒤 사라짐 → 재방문 시 다시 나타남).
describe('LogList 마지막 페이지 뒤 커서', () => {

	it('끝까지 넘기면 커서를 지운다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));
		// 마지막 페이지 — LastEvaluatedKey 없음
		vi.spyOn(api, 'getNextLogs').mockResolvedValue(jsonResponse({ body: { Items: logListNext3.Items } }));

		const { container } = renderLogList();
		await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));
		expect(sessionStorage.getItem('logListLastTimestamp')).not.toBeNull();

		fireEvent.click(await screen.findByTestId('seeMoreButton'));
		await flushAfterResponse();

		expect(container.querySelector('[data-testid="seeMoreButton"]')).toBeNull();
		// 이전에는 여기 옛 커서가 남아 다음 방문에서 죽은 버튼을 되살렸다.
		expect(sessionStorage.getItem('logListLastTimestamp')).toBeNull();
	});

	it('다시 열어도 죽은 See more 가 없다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));
		vi.spyOn(api, 'getNextLogs').mockResolvedValue(jsonResponse({ body: { Items: logListNext3.Items } }));

		const first = renderLogList();
		await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));
		fireEvent.click(await screen.findByTestId('seeMoreButton'));
		await flushAfterResponse();
		first.unmount();

		const second = renderLogList();
		await flushAfterResponse();
		expect(second.container.querySelector('[data-testid="seeMoreButton"]')).toBeNull();
	});

	// 대조 — 캐시에서 복원할 때 커서를 지우면 안 된다. 마운트 직후의 undefined 는
	// "더 없음" 이 아니라 "아직 모름" 이다.
	it('캐시에 커서가 있으면 복원해 이어보기를 남긴다', async () => {

		stubMode('development');
		// 이전 방문에서 남긴 상태를 흉내 낸다 — 목록과 커서가 함께 있다.
		sessionStorage.setItem('logList', JSON.stringify(logListFirst7.Items));
		sessionStorage.setItem('logListLastTimestamp', '1654520402200');

		const getLogsSpy = vi.spyOn(api, 'getLogs');

		const { container } = renderLogList();
		await flushAfterResponse();

		// 캐시를 썼으므로 재조회하지 않는다.
		expect(getLogsSpy).not.toHaveBeenCalled();
		// 커서가 살아 있어야 이어보기가 뜬다.
		expect(sessionStorage.getItem('logListLastTimestamp')).not.toBeNull();
		expect(container.querySelector('[data-testid="seeMoreButton"]')).not.toBeNull();
	});

	// 대조 — 더 가져올 페이지가 남아 있으면 커서를 지우면 안 된다. 지우면
	// 재방문 시 이어보기가 사라진다.
	it('더 남아 있으면 커서를 지키다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		const { container } = renderLogList();
		await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));

		expect(sessionStorage.getItem('logListLastTimestamp')).not.toBeNull();
		expect(container.querySelector('[data-testid="seeMoreButton"]')).not.toBeNull();
	});
});
