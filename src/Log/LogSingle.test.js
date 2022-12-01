import { fireEvent, render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';
import LogSingle from '../Log/LogSingle';

console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

const testEntry = {
	pathname: "/log"
	, search: ""
	, hash: ""
	, state: {}
	, key: "default"
};
	
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
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
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	jest.spyOn(window, 'confirm').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
		return true;
	});

	jest.useFakeTimers();

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const toListButton = await screen.findByText("To list");
	expect(toListButton).toBeInTheDocument();
	fireEvent.click(toListButton);

	act(() => {
		jest.runOnlyPendingTimers();
	});

	const deleteButton = await screen.findByText("Delete");
	expect(deleteButton).toBeInTheDocument();
	fireEvent.click(deleteButton);

	act(() => {
		jest.runOnlyPendingTimers();
	});

	const afterDelete = await screen.findByText("The log is deleted.");
	expect(afterDelete).toBeInTheDocument();

	act(() => {
		jest.runOnlyPendingTimers();
	});

	const afterDeleteTimer = await screen.findByText("Deleted");
	expect(afterDeleteTimer).toBeInTheDocument();

	jest.useRealTimers();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

it('render LogSingle on dev server', async () => {

	mock.devServerOk.listen();
	process.env.NODE_ENV = 'development';
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	const testEntry = {
		pathname: "/log/1656034616036?search=true"
		, search: "search=true"
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const toSearchResultButton = await screen.findByText("To search result");
	expect(toSearchResultButton).toBeInTheDocument();
	fireEvent.click(toSearchResultButton);

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

it('render "Page Not Found" page if it cannot fetch', async () => {

	mock.prodServerFailed.listen();
	process.env.NODE_ENV = 'production';

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render "Page Not Found" page if it has no log', async () => {

	mock.prodServerHasNoData.listen();
	process.env.NODE_ENV = 'production';

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerHasNoData.resetHandlers();
	mock.prodServerHasNoData.close();
});

it('render "Page Not Found" page if API is down', async () => {

	mock.prodServerNetworkError.listen();
	process.env.NODE_ENV = 'production';

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogSingle />
		</MemoryRouter>
	);

	const obj = await screen.findByText("Page Not Found.");
	expect(obj).toBeInTheDocument();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});