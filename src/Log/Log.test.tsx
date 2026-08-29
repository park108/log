import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import Log from '../Log/Log';
import { useMockServer } from '../test-utils/msw';

// env-spec §5.2 / REQ-20260420-002 — 테스트는 `vi.stubEnv('MODE', ...)` 로
// MODE/DEV/PROD 를 짝맞춰 stub. 전역 `afterEach(vi.unstubAllEnvs)` 는
// `src/setupTests.js` 에서 등록됨.
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

const testEntry = {
	pathname: "/"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};

beforeEach(() => {
	sessionStorage.removeItem("logList");
	sessionStorage.removeItem("logListLastTimestamp");
});

test('render log has data in session', async () => {

	vi.spyOn(common, "isLoggedIn").mockReturnValue(false);
	vi.spyOn(common, "isAdmin").mockReturnValue(false);

	sessionStorage.setItem("logList", JSON.stringify([
		{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
		,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
		,{"contents":"const makeSummary = (contents: string) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
		,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
		,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
		,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
		,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200,"temporary": true}
	]));

	sessionStorage.setItem("logListLastTimestamp", "1654520402200");

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);

	const logs = await screen.findAllByRole("listitem");
	expect(logs.length).toBe(7);
});

describe('Log render logged-in on prod server (ok)', () => {
	useMockServer(() => mock.prodServerOk);

	test('render log if it logged in', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<Log />
			</MemoryRouter>
		);

		// Get 7 logs
		const logs = await screen.findAllByRole("listitem");
		expect(logs.length).toBe(7);

		const seeMoreButton = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton).toBeDefined();
		fireEvent.click(seeMoreButton);

		// Get 3 more logs
		const contentsText = await screen.findByText("Noew Version 10! Can i success? Change once again! ...");
		expect(contentsText).toBeInTheDocument();

		const logs2 = await screen.findAllByRole("listitem");
		expect(logs2.length).toBe(10);

		const seeMoreButton2 = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton2).toBeDefined();
		fireEvent.click(seeMoreButton2);

		// Click first log
		// const firstItem = await screen.findByText("123456");
		// fireEvent.click(firstItem);
	});
});

describe('Log render failed when internal server error on prod server', () => {
	useMockServer(() => mock.prodServerFailed);

	test('render failed when internal server error on prod server', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<Log />
			</MemoryRouter>
		);

		const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
		expect(errorMessage).toBeInTheDocument();

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();
		fireEvent.click(retryButton);
	});
});

describe('Log render failed when network error on prod server', () => {
	useMockServer(() => mock.prodServerNetworkError);

	test('render failed when network error on prod server', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<Log />
			</MemoryRouter>
		);

		const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
		expect(errorMessage).toBeInTheDocument();

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();
	});
});

describe('Log render logs and getting next failed', () => {
	useMockServer(() => mock.prodServerFirstOkNextFailed);

	test('render logs and getting next failed', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<Log />
			</MemoryRouter>
		);

		// Get 7 logs
		const logs = await screen.findAllByRole("listitem");
		expect(logs.length).toBe(7);

		const seeMoreButton = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton).toBeDefined();
		fireEvent.click(seeMoreButton);

		const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
		expect(errorMessage).toBeInTheDocument();
	});
});

describe('Log render logs and getting next error', () => {
	useMockServer(() => mock.prodServerFirstOkNextError);

	test('render logs and getting next error', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(
            <MemoryRouter initialEntries={[testEntry]}>
				<Log />
			</MemoryRouter>
		);

		// Get 7 logs
		const logs = await screen.findAllByRole("listitem");
		expect(logs.length).toBe(7);

		const seeMoreButton = await screen.findByTestId("seeMoreButton");
		expect(seeMoreButton).toBeDefined();
		fireEvent.click(seeMoreButton);

		const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
		expect(errorMessage).toBeInTheDocument();
	});
});

// Log 의 중첩 라우트 배선은 지금까지 `/` (LogList) 만 실행됐다. /search ·
// /write · /:timestamp 는 한 번도 렌더된 적이 없어, 경로를 잘못 배선하거나
// 지워도 어떤 테스트도 붉어지지 않았다 — 관리자가 글쓰기에 못 들어가는
// 상태가 조용히 통과한다.
//
// 각 화면의 데이터 요구를 끌어들이지 않도록 lazy 모듈을 표식으로 대체하고
// **경로 → 컴포넌트** 대응만 판정한다.
describe('Log 중첩 라우트 배선', () => {

	const MARKERS = {
		'./LogList': 'route-loglist',
		'../Search/Search': 'route-search',
		'./LogSingle': 'route-logsingle',
		'./Writer': 'route-writer',
	} as const;

	// `vi.resetModules()` 는 `../common/common` 도 새 인스턴스로 만든다 — 바깥에서
	// 건 spy 는 그 인스턴스에 적용되지 않는다. isAdmin 은 doMock 으로 함께 넘긴다.
	// (이걸 놓쳐 /write 케이스가 실패했고, 나머지는 기본값이 우연히 맞아 통과했다.)
	const mountAt = async (pathname: string, admin: boolean) => {
		vi.resetModules();
		for (const [mod, testid] of Object.entries(MARKERS)) {
			vi.doMock(mod, () => ({ default: () => <div data-testid={testid} /> }));
		}
		vi.doMock('../common/common', async () => ({
			...(await vi.importActual<typeof common>('../common/common')),
			isAdmin: () => admin,
		}));
		const { default: FreshLog } = await import('./Log');
		return render(
			<MemoryRouter initialEntries={[{ ...testEntry, pathname }]}>
				<FreshLog />
			</MemoryRouter>,
		);
	};

	afterEach(() => {
		for (const mod of Object.keys(MARKERS)) vi.doUnmock(mod);
		vi.doUnmock('../common/common');
		vi.resetModules();
	});

	// **라우트 표가 두 벌이다** — Log.tsx 는 isAdmin() 분기마다 <Routes> 를 따로
	// 두고 `/` · `/search` · `/:timestamp` 3개가 중복 선언된다. 한 분기만 판정하면
	// 다른 분기의 오배선이 보이지 않는다 (실측: 관리자 쪽 /search 를 LogList 로
	// 바꿔도 비관리자만 보던 판정은 통과했다). 공유 경로는 양쪽 전수로 본다.
	const SHARED = [
		{ path: '/', marker: 'route-loglist' },
		{ path: '/search', marker: 'route-search' },
		{ path: '/1655302060414', marker: 'route-logsingle' },
	] as const;

	for (const { path, marker } of SHARED) {
		for (const admin of [true, false] as const) {
			it(`${path} 가 ${marker} 를 마운트한다 (${admin ? '관리자' : '비관리자'})`, async () => {

				stubMode('development');

				await mountAt(path, admin);

				expect(await screen.findByTestId(marker)).toBeInTheDocument();
			});
		}
	}

	it('/write 가 Writer 를 마운트한다 (관리자 전용)', async () => {

		stubMode('development');

		await mountAt('/write', true);

		expect(await screen.findByTestId('route-writer')).toBeInTheDocument();
	});

	it('비관리자에게는 /write 가 열리지 않는다', async () => {

		stubMode('development');

		await mountAt('/write', false);

		// 대조 — 위 케이스가 "어떤 경로든 Writer" 로 통과하지 않게 한다.
		expect(screen.queryByTestId('route-writer')).toBeNull();
	});
});
