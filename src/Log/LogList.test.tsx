import { Profiler } from 'react';
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

// "See more" 는 `isGetNextData` 플래그로 효과를 깨우는데, 그 플래그는 요청을
// 띄운 **직후** false 로 내려간다 (완료를 기다리지 않는다). 그래서 응답이 오기
// 전에 다시 누르면 같은 커서로 요청이 또 나갔다 — 실측: 세 번 누르면 호출 3회
// (인자 전부 같은 커서), 목록에 같은 페이지가 세 번 붙어 항목이 8개가 되고
// React key 도 중복됐다.
describe('LogList 다음 페이지 재진입', () => {

	const seeMore = () => screen.queryByTestId('seeMoreButton') as HTMLButtonElement | null;

	it('응답 전에 여러 번 눌러도 요청은 한 번이고 페이지가 겹치지 않는다', async () => {

		stubMode('development');

		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		const releases: ((value: Response) => void)[] = [];
		const cursors: (string | number)[] = [];
		const getNextSpy = vi.spyOn(api, 'getNextLogs').mockImplementation((timestamp: string | number) => {
			cursors.push(timestamp);
			return new Promise<Response>(resolve => { releases.push(resolve); });
		});

		renderLogList();
		await flushAfterResponse();

		const before = document.querySelectorAll('[role="listitem"]').length;
		expect(before).toBeGreaterThan(0);

		// 같은 태스크 안에서 연달아 눌린 경우 — 이 사이에는 리렌더가 없으므로
		// `disabled` 가 아직 걸리지 않는다 (더블클릭·프로그램적 클릭 경로).
		await act(async () => {
			const button = seeMore() as HTMLElement;
			fireEvent.click(button);
			fireEvent.click(button);
			fireEvent.click(button);
		});

		// 리렌더 뒤에는 버튼이 눌리지 않는다.
		expect(seeMore()).toBeDisabled();

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });

		expect(getNextSpy).toHaveBeenCalledTimes(1);
		expect(cursors).toEqual([logListFirst7.LastEvaluatedKey.timestamp]);

		await act(async () => {
			for(const release of releases) release(jsonResponse({ body: logListNext3 }));
			await new Promise(resolve => setTimeout(resolve, 0));
		});

		const after = document.querySelectorAll('[role="listitem"]').length;
		expect(after).toBe(before + logListNext3.Items.length);

		// key 중복이 없다 = timestamp 가 유일하다.
		const dates = Array.from(document.querySelectorAll('[role="listitem"]')).map(el => el.textContent);
		expect(new Set(dates).size).toBe(dates.length);
	});

	// 재진입 가드는 요청이 끝나면 **반드시 풀려야** 한다. 풀지 않으면 첫
	// "See more" 뒤로 다음 페이지를 영영 가져올 수 없다.
	it('한 페이지를 가져온 뒤 다음 페이지를 다시 가져올 수 있다', async () => {

		stubMode('development');

		vi.spyOn(api, 'getLogs').mockResolvedValue(jsonResponse({ body: logListFirst7 }));

		const cursors: (string | number)[] = [];
		vi.spyOn(api, 'getNextLogs').mockImplementation((timestamp: string | number) => {
			cursors.push(timestamp);
			return Promise.resolve(jsonResponse({ body: {
				Items: [{ timestamp: 1000 - cursors.length, contents: 'p' + cursors.length, temporary: false }],
				LastEvaluatedKey: { author: "park108@gmail.com", timestamp: 1000 - cursors.length },
			} }));
		});

		renderLogList();
		await flushAfterResponse();

		const before = document.querySelectorAll('[role="listitem"]').length;

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });
		await flushAfterResponse();
		expect(document.querySelectorAll('[role="listitem"]').length).toBe(before + 1);

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });
		await flushAfterResponse();
		expect(document.querySelectorAll('[role="listitem"]').length).toBe(before + 2);

		expect(cursors).toHaveLength(2);
		expect(cursors[0]).not.toBe(cursors[1]);
	});
});

// 전체 화면 오류는 **보여줄 것이 없을 때만** 맞다. `isError` 하나로 갈라 두면
// "더보기" 가 한 번 실패했을 때 이미 읽고 있던 목록이 통째로 사라진다 (실측:
// 항목 2 → 0). 게다가 그 화면의 Retry 는 캐시를 비우고 첫 페이지부터 다시
// 받으므로 읽던 자리도 잃는다.
describe('LogList 다음 페이지 실패', () => {

	const seeMore = () => screen.queryByTestId('seeMoreButton') as HTMLButtonElement | null;
	const retryNext = () => screen.queryByTestId('seeMoreRetryButton') as HTMLButtonElement | null;
	const items = () => document.querySelectorAll('[role="listitem"]').length;

	it('다음 페이지가 실패해도 읽던 목록이 남고 그 자리에서 다시 시도한다', async () => {

		stubMode('development');

		vi.spyOn(api, 'getLogs').mockImplementation(async () => jsonResponse({ body: logListFirst7 }));

		const getNextSpy = vi.spyOn(api, 'getNextLogs')
			.mockRejectedValueOnce(new Error('network down'))
			.mockImplementation(async () => jsonResponse({ body: logListNext3 }));

		renderLogList();
		await flushAfterResponse();

		const before = items();
		expect(before).toBeGreaterThan(0);

		await act(async () => { fireEvent.click(seeMore() as HTMLElement); });
		await flushAfterResponse();

		// 목록은 그대로다.
		expect(items()).toBe(before);
		// 실패를 알리기는 한다 — 문구 자체는 이 게이트가 겨누는 것이 아니므로
		// 역할로만 확인한다 (문구를 박으면 정상적인 문구 수정이 깨진다).
		expect(document.querySelector('[role="alert"]')).not.toBeNull();
		// 첫 페이지부터 다시 받는 전체 오류 화면이 아니다.
		expect(screen.queryByText('Whoops, something went wrong on our end.')).toBeNull();

		// 그 자리에서 다시 시도하면 이어진다.
		await act(async () => { fireEvent.click(retryNext() as HTMLElement); });
		await flushAfterResponse();

		expect(items()).toBe(before + logListNext3.Items.length);
		expect(getNextSpy).toHaveBeenCalledTimes(2);
	});

	// 반대 방향 — 보여줄 것이 없으면 전체 화면 오류가 맞다.
	it('첫 페이지가 실패하면 전체 화면 오류를 보여준다', async () => {

		stubMode('development');

		vi.spyOn(api, 'getLogs').mockRejectedValue(new Error('network down'));

		renderLogList();
		await flushAfterResponse();

		expect(screen.getByText('Whoops, something went wrong on our end.')).toBeInTheDocument();
		expect(items()).toBe(0);
	});
});

// 목록이 비었다는 것과 무언가 잘못됐다는 것은 사용자가 구별할 수 있어야 한다.
// 안내가 없으면 빈 화면 하나로 두 상태가 겹쳐 보인다. 검색 화면은 같은 이유로
// "No search results." 를, 댓글은 "Add a comment" 를 이미 내고 있었다.
describe('LogList 빈 목록', () => {

	const empty = () => screen.queryByTestId('logListEmpty');

	it('글이 하나도 없으면 그렇다고 알린다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockImplementation(async () =>
			jsonResponse({ body: { Items: [] } }));

		renderLogList();
		await flushAfterResponse();

		expect(empty()).toBeInTheDocument();
		expect(document.querySelectorAll('[role="listitem"]').length).toBe(0);
	});

	// 반대 방향 — 글이 있으면 나오지 않는다.
	it('글이 있으면 그 안내를 내지 않는다', async () => {

		stubMode('development');
		vi.spyOn(api, 'getLogs').mockImplementation(async () =>
			jsonResponse({ body: logListFirst7 }));

		renderLogList();
		await flushAfterResponse();

		expect(document.querySelectorAll('[role="listitem"]').length).toBeGreaterThan(0);
		expect(empty()).toBeNull();
	});

	// 불러오는 중에는 "없다" 고 말하지 않는다 — 아직 모르는 것이다.
	//
	// **커밋마다 본다.** 구 버전은 `render` 뒤 10ms 를 기다리고 한 번만 단언해
	// 창을 통째로 놓쳤다. 문제의 구간은 마운트 직후 두 커밋이고 그 안에서 이미
	// 끝난다 — 10ms 뒤에는 아무것도 남아 있지 않다. 이름은 이 명제를 겨누면서
	// 실제로는 아무것도 재지 않던 테스트였다 (파이프라인 discovery 가 지적).
	const commitTrace = (): { seen: boolean[]; onRender: () => void } => {
		const seen: boolean[] = [];
		return { seen, onRender: () => { seen.push(Boolean(empty())); } };
	};

	it('조회에 착수하기 전에는 없다고 말하지 않는다', async () => {

		stubMode('development');
		let release: ((value: Response) => void) | null = null;
		vi.spyOn(api, 'getLogs').mockImplementation(() =>
			new Promise<Response>(resolve => { release = resolve; }));

		const trace = commitTrace();
		render(
			<Profiler id="loglist" onRender={trace.onRender}>
				<MemoryRouter initialEntries={[{ pathname: "/log", search: "", hash: "", state: {}, key: "default" }]}>
					<LogList />
				</MemoryRouter>
			</Profiler>
		);
		await flushAfterResponse();

		// 어느 커밋에서도 뜨지 않아야 한다.
		expect(trace.seen.length, '커밋이 한 번도 없었다 — 판정이 공허하다').toBeGreaterThan(0);
		expect(trace.seen).not.toContain(true);

		await act(async () => {
			(release as unknown as (value: Response) => void)(jsonResponse({ body: { Items: [] } }));
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		expect(empty()).toBeInTheDocument();
	});

	// 네트워크를 한 번도 타지 않는 재방문 경로. 캐시된 글이 그려지기 전 두 커밋
	// 동안 "없다" 가 보였다 — 지연 원인이 서버가 아니라 렌더 순서였다.
	it('세션 캐시에서 복원할 때도 없다고 말하지 않는다', async () => {

		stubMode('development');
		sessionStorage.setItem('logList', JSON.stringify(
			Array.from({ length: 7 }, (_, index) => ({
				timestamp: 100 - index, contents: 'c' + index, temporary: false,
			}))));

		const getLogsSpy = vi.spyOn(api, 'getLogs').mockImplementation(async () =>
			jsonResponse({ body: { Items: [] } }));

		const trace = commitTrace();
		render(
			<Profiler id="loglist-cache" onRender={trace.onRender}>
				<MemoryRouter initialEntries={[{ pathname: "/log", search: "", hash: "", state: {}, key: "default" }]}>
					<LogList />
				</MemoryRouter>
			</Profiler>
		);
		await flushAfterResponse();

		expect(getLogsSpy, '캐시 경로인데 네트워크를 탔다 — 다른 것을 재고 있다').not.toHaveBeenCalled();
		expect(trace.seen.length).toBeGreaterThan(0);
		expect(trace.seen).not.toContain(true);
		expect(document.querySelectorAll('[role="listitem"]').length).toBe(7);
	});
});
