import { fireEvent, render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mock from './api.mock';
import * as common from '../common/common';
import * as useLogModule from './hooks/useLog';
import LogSingle from '../Log/LogSingle';

console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();

// LogSingle renders LogItem which depends on `useDeleteLog` (TanStack Query
// mutation hook) since TSK-20260418-MUT-DELETE. A QueryClientProvider is
// mandatory for the component tree to mount; each test gets an isolated
// client to avoid cache leakage between tests.
const makeQueryClient = () => new QueryClient({
	defaultOptions: {
		queries: { retry: false, staleTime: 0, gcTime: 0 },
		mutations: { retry: false },
	},
});

const withQuery = (node) => (
	<QueryClientProvider client={makeQueryClient()}>
		{node}
	</QueryClientProvider>
);

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

it('render LogSingle on prod server', async () => {

	mock.prodServerOk.listen();
	process.env.NODE_ENV = 'production';

	// Set session list
	sessionStorage.clear();
	const logFromServer = [
		{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
		,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
		,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
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
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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

	vi.useFakeTimers();

	fireEvent.click(toListButton);

	act(() => {
		vi.runOnlyPendingTimers();
	});

	const deleteButton = await screen.findByText("Delete");
	expect(deleteButton).toBeInTheDocument();
	fireEvent.click(deleteButton);

	act(() => {
		vi.runOnlyPendingTimers();
	});

	const afterDelete = await screen.findByText("The log is deleted.");
	expect(afterDelete).toBeInTheDocument();

	act(() => {
		vi.runOnlyPendingTimers();
	});

	const afterDeleteTimer = await screen.findByText("Deleted");
	expect(afterDeleteTimer).toBeInTheDocument();

	vi.useRealTimers();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

it('render LogSingle on dev server', async () => {

	mock.devServerOk.listen();
	process.env.NODE_ENV = 'development';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

	const testEntry = {
		pathname: "/log/1656034616036?search=true"
		, search: "search=true"
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	));

	const toSearchResultButton = await screen.findByText("To search result");
	expect(toSearchResultButton).toBeInTheDocument();
	fireEvent.click(toSearchResultButton);

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

it('get OK delete failed', async () => {

	mock.devServerGetOkDeleteFailed.listen();
	process.env.NODE_ENV = 'development';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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

	const title = await screen.findByText("Lorem ipsum dolor sit amet,");
	expect(title).toBeInTheDocument();

	const contents = await screen.findByText("consectetur adipiscing elit. Duis vel urna mollis arcu suscipit ultricies eu eget dolor. Integer in enim sed lectus cursus aliquam. Ut porttitor augue nec auctor scelerisque. Pellentesque tellus tortor, tempus cursus ipsum et, fringilla efficitur risus. Nunc a sollicitudin nibh. Praesent placerat, libero eget fermentum fermentum, arcu ipsum euismod purus, ac vestibulum libero enim et lorem. Curabitur non urna vel massa suscipit molestie nec vitae ligula. Suspendisse quam augue, convallis sed magna ac, cursus convallis purus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus sit amet feugiat est, id cursus purus. Nullam sollicitudin a enim sed imperdiet.");
	expect(contents).toBeInTheDocument();

	vi.spyOn(window, 'confirm').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
		return true;
	});

	const deleteButton = await screen.findByText("Delete");
	expect(deleteButton).toBeInTheDocument();
	fireEvent.click(deleteButton);

	vi.useRealTimers();

	mock.devServerGetOkDeleteFailed.resetHandlers();
	mock.devServerGetOkDeleteFailed.close();
});

it('get OK delete failed', async () => {

	mock.devServerGetOkDeleteNetworkError.listen();
	process.env.NODE_ENV = 'development';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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

	vi.useRealTimers();

	mock.devServerGetOkDeleteNetworkError.resetHandlers();
	mock.devServerGetOkDeleteNetworkError.close();
});

it('render "Page Not Found" page if it cannot fetch', async () => {

	mock.prodServerFailed.listen();
	process.env.NODE_ENV = 'production';

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	));

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render "Page Not Found" page if it has no log', async () => {

	mock.prodServerHasNoData.listen();
	process.env.NODE_ENV = 'production';

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	));

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerHasNoData.resetHandlers();
	mock.prodServerHasNoData.close();
});

it('render "Page Not Found" page if API is down', async () => {

	mock.prodServerNetworkError.listen();
	process.env.NODE_ENV = 'production';

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	));

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});

// REQ-20260418-005 FR-01 (TSK-20260420-suspense-skeleton-logsingle-phase1):
// LogSingle 내부 Suspense fallback 이 빈 <div> 가 아닌 Skeleton(variant=detail) 로 교체됐는지
// 정적 JSX 검증으로 가드. 기존 `<div></div>` fallback 회귀 차단.
// lazy import 를 동적으로 suspend 시키는 대신, 소스 원문에서 교체가 유지되는지를 확인.
it('LogSingle source declares Skeleton variant="detail" as Suspense fallback (no empty <div>)', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const src = fs.readFileSync(path.resolve(__dirname, 'LogSingle.jsx'), 'utf-8');

	// 두 Suspense 블록 모두 Skeleton detail fallback 을 사용해야 한다.
	const skeletonMatches = src.match(/<Suspense fallback=\{<Skeleton variant="detail" \/>\}>/g);
	expect(skeletonMatches).not.toBeNull();
	expect(skeletonMatches.length).toBe(2);

	// 빈 div fallback 이 더 이상 존재하지 않아야 한다.
	expect(src).not.toMatch(/<Suspense fallback=\{<div><\/div>\}>/);

	// import 도 유지.
	expect(src).toMatch(/import\s+Skeleton\s+from\s+["']\.\.\/common\/Skeleton["'];/);
});

// REQ-20260419-023 FR-05: useLog 훅이 useParams 에서 받은 timestamp 로 호출되는지 직접 검증.
// 기존 useEffect + getLog 직접 호출 경로가 제거됐음을 캐시 키 기반으로 확인.
it('calls useLog with the timestamp resolved from useParams', async () => {

	mock.devServerOk.listen();
	process.env.NODE_ENV = 'development';

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

	const useLogSpy = vi.spyOn(useLogModule, 'useLog');

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	));

	// 본문이 그려졌다 = useLog 가 성공 경로로 해결됐다.
	const contents = await screen.findByText("Test Contents");
	expect(contents).toBeInTheDocument();

	// 호출 인자 검증: useParams 가 돌려준 '1656034616036' 가 그대로 전달.
	expect(useLogSpy).toHaveBeenCalled();
	expect(useLogSpy).toHaveBeenCalledWith('1656034616036');

	useLogSpy.mockRestore();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});