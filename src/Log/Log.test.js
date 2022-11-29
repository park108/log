import { fireEvent, render, screen,act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import Log from '../Log/Log';

console.log = jest.fn();
console.error = jest.fn();

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

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

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

test('render log if it logged in', async () => {

	mock.prodServerOk.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

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

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

test('render failed when internal server error on prod server', async () => {

	mock.prodServerFailed.listen();

	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

test('render failed when network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

	render(
        <MemoryRouter initialEntries={[testEntry]}>
			<Log />
		</MemoryRouter>
	);

	const errorMessage = await screen.findByText("Whoops, something went wrong on our end.");
	expect(errorMessage).toBeInTheDocument();

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});

test('render logs and getting next failed', async () => {

	mock.prodServerFirstOkNextFailed.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

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

	mock.prodServerFirstOkNextFailed.resetHandlers();
	mock.prodServerFirstOkNextFailed.close();
});

test('render logs and getting next error', async () => {

	mock.prodServerFirstOkNextError.listen();
	
	process.env.NODE_ENV = 'production';

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

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

	mock.prodServerFirstOkNextError.resetHandlers();
	mock.prodServerFirstOkNextError.close();
});