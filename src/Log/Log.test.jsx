import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import Log from '../Log/Log';
import { useMockServer } from '../test-utils/msw';

// env-spec §5.2 / REQ-20260420-002 — 테스트는 `vi.stubEnv('MODE', ...)` 로
// MODE/DEV/PROD 를 짝맞춰 stub. 전역 `afterEach(vi.unstubAllEnvs)` 는
// `src/setupTests.js` 에서 등록됨.
const stubMode = (mode) => {
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

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(false);
	vi.spyOn(common, "isAdmin").mockResolvedValue(false);

	sessionStorage.setItem("logList", JSON.stringify([
		{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
		,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
		,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
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

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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
