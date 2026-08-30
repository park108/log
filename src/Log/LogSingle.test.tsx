import type React from 'react';
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import * as useLogModule from './hooks/useLog';
import * as logApi from './api';
import LogSingle from '../Log/LogSingle';

// 버튼이 **어디로 가는지**를 재기 위한 보조 표시. 이름만 재는 단언은
// `navigate(-1)` 을 `navigate("/log")` 로 바꿔치기해도 통과한다.
const WhereAmI = (): React.ReactElement =>
	<div data-testid="where">{ useLocation().pathname }</div>;
import { useMockServer } from '../test-utils/msw';
import { ASYNC_ASSERTION_TIMEOUT_MS } from '../test-utils/timing';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode: string) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// LogSingle renders LogItem which depends on `useDeleteLog` (TanStack Query
// mutation hook) since TSK-20260418-MUT-DELETE. A QueryClientProvider is
// mandatory for the component tree to mount; each call instantiates a fresh
// isolated client via the single-source helper to avoid cache leakage between
// tests (REQ-20260519-001 / `createQueryTestWrapper`).
const withQuery = (node: React.ReactNode) => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

const testEntry = {
	pathname: "/log"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

vi.mock('react-router-dom', async () => ({
	...await vi.importActual('react-router-dom'),
	useParams: () => ({ timestamp: '1656034616036' }),
}));

describe('LogSingle render on prod server (ok)', () => {
	useMockServer(() => mock.prodServerOk);

	it('render LogSingle on prod server', async () => {

		stubMode('production');

		// Set session list
		sessionStorage.clear();
		const logFromServer = [
			{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
			,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
			,{"contents":"const makeSummary = (contents: string) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
			,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
			,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
			,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
			,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
			,{"contents":"New!!!!!!","author":"park108@gmail.com","timestamp":1654520368510}
			,{"contents":"New test ","author":"park108@gmail.com","timestamp":1654520347146}
			,{"contents":"Noew Version 10! Can i success? Change once again! ...","author":"park108@gmail.com","timestamp":1654501373940}
		];
		const lastTimestampFromServer = 1654501373940;

		sessionStorage.setItem("logList", JSON.stringify(logFromServer));
		sessionStorage.setItem("logListLastTimestamp", JSON.stringify(lastTimestampFromServer));

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		vi.spyOn(window, 'confirm').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
			return true;
		});

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		// Wait for the useLog-driven fetch to resolve under real timers before
		// switching to fake timers; MSW handlers rely on the real microtask queue.
		const toListButton = await screen.findByText("To list");
		expect(toListButton).toBeInTheDocument();

		vi.useFakeTimers({ shouldAdvanceTime: true });

		fireEvent.click(toListButton);

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		const deleteButton = await screen.findByText("Delete");
		expect(deleteButton).toBeInTheDocument();
		fireEvent.click(deleteButton);

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		await waitFor(
			() => expect(screen.getByText("The log is deleted.")).toBeInTheDocument(),
			{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
		);

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		const afterDeleteTimer = await screen.findByText("Deleted");
		expect(afterDeleteTimer).toBeInTheDocument();
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});

describe('LogSingle render on dev server (ok)', () => {
	useMockServer(() => mock.devServerOk);

	// 이 케이스는 `key: "default"` — 즉 **앱 안에서 이동해 온 것이 아닌** 진입을
	// 만들어 놓고 "To search result" 를 기대했다. 그 상태에서 `navigate(-1)` 은
	// 갈 곳이 없어 아무 일도 하지 않거나(새 탭) 사이트 밖으로 나간다(외부 유입).
	// `?search=true` 가 붙은 주소는 공유되고 북마크되므로 실제로 도달하는 경로다.
	// 두 갈래를 갈라 각각 옳은 버튼을 단언한다.
	it('검색에서 이동해 왔으면 검색 결과로 돌아가는 버튼을 낸다', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(withQuery(
			<MemoryRouter initialEntries={[
				{ pathname: "/search", search: "", hash: "", state: {}, key: "search-page" },
				{ pathname: "/log/1656034616036", search: "search=true", hash: "", state: {}, key: "from-search" },
			]} initialIndex={1}>
				<WhereAmI />
				<LogSingle />
			</MemoryRouter>
		));

		const toSearchResultButton = await screen.findByText("To search result");
		expect(toSearchResultButton).toBeInTheDocument();

		fireEvent.click(toSearchResultButton);

		// **어디로 갔는지까지 본다.** 이름만 재면 `navigate("/log")` 로 바꿔치기해도
		// 통과한다 — 그 구현은 검색 결과의 스크롤 위치와 질의를 잃는다.
		expect(await screen.findByTestId("where")).toHaveTextContent("/search");
	}, ASYNC_ASSERTION_TIMEOUT_MS);

	// 이동해 온 것만으로는 부족하다 — `?search=true` 가 없으면 목록에서 온 것이고,
	// 그때 "검색 결과로" 를 내면 이름이 거짓이 된다. 이 케이스가 없으면 쿼리 조건을
	// 통째로 지워도 게이트가 통과한다 (실측: 주입 5방향 중 이 한 방향이 새어 나갔다).
	it('검색이 아닌 곳에서 이동해 왔으면 목록으로 보낸다', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(withQuery(
			<MemoryRouter initialEntries={[
				{ pathname: "/log", search: "", hash: "", state: {}, key: "log-list" },
				{ pathname: "/log/1656034616036", search: "", hash: "", state: {}, key: "from-list" },
			]} initialIndex={1}>
				<LogSingle />
			</MemoryRouter>
		));

		expect(await screen.findByText("To list")).toBeInTheDocument();
		expect(screen.queryByText("To search result")).toBeNull();
	}, ASYNC_ASSERTION_TIMEOUT_MS);

	it('공유 링크로 직접 들어왔으면 목록으로 보낸다', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(withQuery(
			<MemoryRouter initialEntries={[
				// `key: "default"` — react-router 가 최초 진입 위치에 주는 값이다.
				{ pathname: "/log/1656034616036", search: "search=true", hash: "", state: {}, key: "default" },
			]}>
				<LogSingle />
			</MemoryRouter>
		));

		expect(await screen.findByText("To list")).toBeInTheDocument();
		expect(screen.queryByText("To search result")).toBeNull();
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});

describe('LogSingle get OK delete failed', () => {
	useMockServer(() => mock.devServerGetOkDeleteFailed);

	it('get OK delete failed', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		const testEntry = {
			pathname: "/log/1656034616036"
			, search: ""
			, hash: ""
			, state: {}
			, key: "default"
		};

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		await waitFor(
			() => expect(screen.getByText("Lorem ipsum dolor sit amet,")).toBeInTheDocument(),
			{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
		);

		const contents = await screen.findByText("consectetur adipiscing elit. Duis vel urna mollis arcu suscipit ultricies eu eget dolor. Integer in enim sed lectus cursus aliquam. Ut porttitor augue nec auctor scelerisque. Pellentesque tellus tortor, tempus cursus ipsum et, fringilla efficitur risus. Nunc a sollicitudin nibh. Praesent placerat, libero eget fermentum fermentum, arcu ipsum euismod purus, ac vestibulum libero enim et lorem. Curabitur non urna vel massa suscipit molestie nec vitae ligula. Suspendisse quam augue, convallis sed magna ac, cursus convallis purus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus sit amet feugiat est, id cursus purus. Nullam sollicitudin a enim sed imperdiet.");
		expect(contents).toBeInTheDocument();

		vi.spyOn(window, 'confirm').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
			return true;
		});

		const deleteButton = await screen.findByText("Delete");
		expect(deleteButton).toBeInTheDocument();
		fireEvent.click(deleteButton);
	});
});

describe('LogSingle get OK delete network error', () => {
	useMockServer(() => mock.devServerGetOkDeleteNetworkError);

	it('get OK delete failed', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		const testEntry = {
			pathname: "/log/1656034616036"
			, search: ""
			, hash: ""
			, state: {}
			, key: "default"
		};

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		vi.spyOn(window, 'confirm').mockImplementation((message) => {
			console.log("INPUT MESSAGE on ALERT = " + message);
			return true;
		});

		const deleteButton = await screen.findByText("Delete");
		expect(deleteButton).toBeInTheDocument();
		fireEvent.click(deleteButton);
	});
});

describe('LogSingle 조회 실패 표면 on prod server (failed)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('조회 실패는 "글 없음" 이 아니라 실패로 표시한다', async () => {

		stubMode('production');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		// 실패와 "글 없음" 은 서로 다른 사실이다 — 같은 화면을 쓰면 사용자는
		// 링크가 죽은 것으로 판단하고 재시도하지 않는다.
		const obj = await screen.findByText("Whoops, something went wrong on our end.");
		expect(obj).toBeInTheDocument();
		expect(screen.queryByText("Page Not Found.")).toBeNull();
		expect(screen.getByTestId("log-single-retry-button")).toBeInTheDocument();
	});
});

describe('LogSingle render "Page Not Found" on prod server (no data)', () => {
	useMockServer(() => mock.prodServerHasNoData);

	it('render "Page Not Found" page if it has no log', async () => {

		stubMode('production');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		const obj = await screen.findByText("Page Not Found.");
		expect(obj).toBeInTheDocument();
	});
});

describe('LogSingle 조회 실패 표면 on prod server (network error)', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('네트워크 실패도 실패로 표시한다', async () => {

		stubMode('production');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		const obj = await screen.findByText("Whoops, something went wrong on our end.");
		expect(obj).toBeInTheDocument();
		expect(screen.queryByText("Page Not Found.")).toBeNull();
		expect(screen.getByTestId("log-single-retry-button")).toBeInTheDocument();
	});
});

// REQ-20260418-005 FR-01 (TSK-20260420-suspense-skeleton-logsingle-phase1):
// LogSingle 내부 Suspense fallback 이 빈 <div> 가 아닌 Skeleton(variant=detail) 로 교체됐는지
// 정적 JSX 검증으로 가드. 기존 `<div></div>` fallback 회귀 차단.
// lazy import 를 동적으로 suspend 시키는 대신, 소스 원문에서 교체가 유지되는지를 확인.
it('LogSingle source declares Skeleton variant="detail" as Suspense fallback (no empty <div>)', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const src = fs.readFileSync(path.resolve(__dirname, 'LogSingle.tsx'), 'utf-8');

	// 두 Suspense 블록 모두 Skeleton detail fallback 을 사용해야 한다.
	const skeletonMatches = src.match(/<Suspense fallback=\{<Skeleton variant="detail" \/>\}>/g);
	expect(skeletonMatches).not.toBeNull();
	expect(skeletonMatches!.length).toBe(2);

	// 빈 div fallback 이 더 이상 존재하지 않아야 한다.
	expect(src).not.toMatch(/<Suspense fallback=\{<div><\/div>\}>/);

	// import 도 유지.
	expect(src).toMatch(/import\s+Skeleton\s+from\s+["']\.\.\/common\/Skeleton["'];/);
});

// REQ-20260419-023 FR-05: useLog 훅이 useParams 에서 받은 timestamp 로 호출되는지 직접 검증.
// 기존 useEffect + getLog 직접 호출 경로가 제거됐음을 캐시 키 기반으로 확인.
describe('LogSingle useLog hook integration', () => {
	useMockServer(() => mock.devServerOk);

	it('calls useLog with the timestamp resolved from useParams', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		const useLogSpy = vi.spyOn(useLogModule, 'useLog');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		// 본문이 그려졌다 = useLog 가 성공 경로로 해결됐다.
		await waitFor(
			() => expect(screen.getByText("Test Contents")).toBeInTheDocument(),
			{ timeout: ASYNC_ASSERTION_TIMEOUT_MS }
		);

		// 호출 인자 검증: useParams 가 돌려준 '1656034616036' 가 그대로 전달.
		expect(useLogSpy).toHaveBeenCalled();
		expect(useLogSpy).toHaveBeenCalledWith('1656034616036');

		useLogSpy.mockRestore();
	});
});

// 제목은 `# ` 로 시작하는 첫 줄이다. 그 줄을 잘라내는 계산이 어긋나 있었다 —
// 줄바꿈이 아예 없는 글에서는 `indexOf` 가 -1 을 주는 바람에 제목이 비고 본문이
// 마지막 한 글자가 됐다.
//
// 길이를 한 글자 더 세어 제목 끝에 줄바꿈이 딸려 오던 것도 함께 고쳤지만, 그쪽은
// 화면에 도달한 적이 없다 — `document.title` 게터가 공백을 접어 없앤다 (실측:
// `"제목,\n - park108.net"` 을 넣으면 `"제목, - park108.net"` 이 읽힌다).
// 아래 첫 테스트는 그 구분을 못 한다. 제목 문자열 자체를 박는 회귀 핀이다.
const metaDescription = (): string =>
	(document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content ?? "";

// jsdom 문서에는 `<meta name="description">` 도, 비어 있는 `document.title` 도 없다.
// 앞선 테스트가 남긴 제목을 그대로 두면 `toContain` 이 즉시 통과해 아무것도 재지
// 못한다 — 실제로 그렇게 통과했다.
const resetHead = (): void => {
	document.title = "";
	document.querySelector('meta[name="description"]')?.remove();
	const meta = document.createElement("meta");
	meta.setAttribute("name", "description");
	document.head.appendChild(meta);
};

describe('LogSingle 제목 — 제목 + 본문', () => {
	useMockServer(() => mock.devServerTitled);
	beforeEach(resetHead);

	it('제목 줄을 그대로 탭 이름으로 쓴다', async () => {

		stubMode('development');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		await waitFor(() => expect(document.title).toContain("Lorem ipsum"));
		expect(document.title).toBe("[DEV] Lorem ipsum dolor sit amet, - park108.net");
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});

describe('LogSingle 제목 — 제목만 있고 줄바꿈이 없는 글', () => {
	useMockServer(() => mock.devServerTitleOnly);
	beforeEach(resetHead);

	it('제목을 그대로 쓴다', async () => {

		stubMode('development');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		await waitFor(() => expect(document.title).not.toBe(""));
		expect(document.title).toBe("[DEV] 제목만 있는 글 - park108.net");
	}, ASYNC_ASSERTION_TIMEOUT_MS);

	it('본문이 없으면 meta description 은 사이트 기본 설명이다', async () => {

		stubMode('development');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		await waitFor(() => expect(document.title).not.toBe(""));
		// 이전에는 본문 대신 마지막 한 글자("글")가 설명으로 들어갔다.
		expect(metaDescription()).toContain("personal journal");
		expect(metaDescription()).not.toBe("글");
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});

describe('LogSingle 제목 — `# ` 뒤가 빈 제목', () => {
	useMockServer(() => mock.devServerEmptyTitle);
	beforeEach(resetHead);

	it('날짜 제목으로 떨어진다', async () => {

		stubMode('development');

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		await waitFor(() => expect(document.title).not.toBe(""));
		// 이전에는 "[DEV]  - park108.net" 이라 탭에 이름이 없었다.
		expect(document.title).toContain("log of ");
		expect(document.title).not.toBe("[DEV]  - park108.net");
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});

// meta description 은 100자에서 자른다. `substr` 은 UTF-16 코드 유닛을 세므로
// 경계에 이모지가 걸리면 상위 서로게이트 하나만 남는다 — 크롤러와 링크
// 미리보기에는 대체 문자로 보인다. 자르기 헬퍼 자체의 성질은
// `src/common/truncateByGrapheme.test.ts` 가 재고, 여기서는 **이 화면이 그
// 헬퍼를 실제로 쓰는지**를 못 박는다 (헬퍼만 고치고 호출처를 되돌려도
// 붉어지지 않는 상태였다).
describe('LogSingle meta description — 글자 경계', () => {
	useMockServer(() => mock.devServerOk);
	beforeEach(resetHead);

	const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

	it('100자 경계의 이모지를 반으로 쪼개지 않는다', async () => {

		stubMode('development');

		// 제목 줄 다음의 본문이 정확히 99자 뒤에 이모지를 두게 만든다.
		const body = 'ㄱ'.repeat(99) + '😀' + '뒤에 더 있는 글';
		const useLogSpy = vi.spyOn(useLogModule, 'useLog').mockReturnValue({
			isLoading: false,
			isError: false,
			data: { body: { Count: 1, Items: [{
				timestamp: 1656034616036,
				logs: [{ timestamp: 1656034616036, contents: body }],
			}] } },
			refetch: () => {},
		} as unknown as ReturnType<typeof useLogModule.useLog>);

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		await waitFor(() => expect(metaDescription()).toContain('ㄱ'));

		expect(metaDescription()).not.toMatch(LONE_SURROGATE);
		expect(metaDescription()).toBe('ㄱ'.repeat(99) + '😀' + '...');

		useLogSpy.mockRestore();
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});

// 삭제가 성공하면 **곧바로** 지워진 상태로 전이해야 한다. 예전에는 아래쪽
// 토스터의 `completed`(2초 뒤)에서 전이했고, 그 2초 동안 지워진 글이 Edit ·
// Delete 와 함께 그대로 남아 있었다. 실측: 그 창에서 Delete 를 다시 누르면
// 이미 없는 글에 DELETE 가 한 번 더 나갔고(호출 2회), 그 실패가
// "Deleting log failed." 로 떠 방금 본 "The log is deleted." 를 뒤집는다.
describe('LogSingle 삭제 직후', () => {
	useMockServer(() => mock.devServerOk);
	beforeEach(resetHead);

	const okResponse = () => new Response(JSON.stringify({ statusCode: 200 }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});

	const settle = async (times = 10) => {
		for(let i = 0; i < times; i++) {
			await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
		}
	};

	it('삭제가 성공하면 곧바로 본문과 조작부가 사라진다', async () => {

		stubMode('development');

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
		vi.spyOn(window, 'confirm').mockReturnValue(true);

		const deleteSpy = vi.spyOn(logApi, 'deleteLog').mockResolvedValue(okResponse());

		const useLogSpy = vi.spyOn(useLogModule, 'useLog').mockReturnValue({
			isLoading: false,
			isError: false,
			refetch: () => {},
			data: { body: { Count: 1, Items: [{
				author: 'park108@gmail.com',
				timestamp: 1656034616036,
				temporary: false,
				logs: [{ timestamp: 1656034616036, contents: '# 제목\n\n지워질 본문' }],
			}] } },
		} as unknown as ReturnType<typeof useLogModule.useLog>);

		render(withQuery(
			<MemoryRouter initialEntries={[ testEntry ]}>
				<LogSingle />
			</MemoryRouter>
		));

		const deleteButton = await screen.findByTestId('delete-button');
		expect(screen.getByText('지워질 본문')).toBeInTheDocument();

		await act(async () => { fireEvent.click(deleteButton); });
		await settle();

		// 토스터가 끝나기 훨씬 전이다.
		expect(screen.queryByTestId('delete-button')).toBeNull();
		expect(screen.queryByTestId('edit-button')).toBeNull();
		expect(screen.queryByText('지워질 본문')).toBeNull();
		expect(screen.getByText('Deleted')).toBeInTheDocument();
		expect(deleteSpy).toHaveBeenCalledTimes(1);

		// 곁들여 — 알림도 실제로 떠 있어야 한다. 문구는 다른 테스트가 못 박고
		// 있으므로 여기서는 **보이는지** 만 본다 (`Toaster` 는 숨김 상태에서도
		// 문구를 DOM 에 남기므로 `getByText` 로는 표시 여부를 알 수 없다).
		expect(document.querySelector('[data-position="bottom"]')).toHaveAttribute('data-show', '1');

		useLogSpy.mockRestore();
	}, ASYNC_ASSERTION_TIMEOUT_MS);
});
