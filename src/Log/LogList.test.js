import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom';
import LogList from '../Log/LogList';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

const server = setupServer(
	rest.get('https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/prod', async (req, res, ctx) => {

		return res(
			ctx.json({
				body:{
					Items:[
						{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
						,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
						,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
						,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
						,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
						,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
						,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
						,{"contents":"New!!!!!!","author":"park108@gmail.com","timestamp":1654520368510,"temporary":true}
						,{"contents":"New test ","author":"park108@gmail.com","timestamp":1654520347146}
						,{"contents":"Noew Version 10! Can i success? Change once again! ...","author":"park108@gmail.com","timestamp":1654501373940}
					],
					"Count":10,
					"ScannedCount":10,
					"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654501373940}
				}
			})
		);
	}),
	rest.get('https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/test', async (req, res, ctx) => {

		console.log("[MOCK API][DEV] GET LOG LIST");

		return res(
			ctx.json({
				body:{
					Items:[
						{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
						,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
						,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
						,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
						,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
						,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
						,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
						,{"contents":"New!!!!!!","author":"park108@gmail.com","timestamp":1654520368510,"temporary":true}
						,{"contents":"New test ","author":"park108@gmail.com","timestamp":1654520347146}
						,{"contents":"Noew Version 10! Can i success? Change once again! ...","author":"park108@gmail.com","timestamp":1654501373940}
					],
					"Count":10,
					"ScannedCount":10,
					"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654501373940}
				}
			})
		);
	}),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('render logs and get next logs correctly', async () => {

	process.env.NODE_ENV = 'production';

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogList />
		</MemoryRouter>
	);

	const contents = await screen.findByText("Test Now");
	expect(contents).toBeInTheDocument();
	
	const seeMoreButton = screen.getByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();

	fireEvent.click(seeMoreButton);
	
	screen.debug();
	
	// fetchMore -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	const seeMoreButton2 = screen.getByTestId("seeMoreButton");
	fireEvent.click(seeMoreButton2);
	
	// fetchMore -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	fireEvent.click(seeMoreButton2);

	global.fetch = unmockedFetch;
});

it('render logs and has no next', async () => {
		
	// fetchFirst -> ok
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
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
				],
				"Count":10,
				"ScannedCount":10,
			}
		}),
	});

	process.env.NODE_ENV = 'development';
	sessionStorage.clear();

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogList />
		</MemoryRouter>
	);

	const list = await screen.findByRole("list");
	expect(list).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render logs failed', async () => {
	
	// fetchFirst -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	sessionStorage.clear();

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogList />
		</MemoryRouter>
	);

	global.fetch = unmockedFetch;
});

it('render if API is down', async () => {

	// fetchFirst -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	sessionStorage.clear();

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogList />
		</MemoryRouter>
	);

	global.fetch = unmockedFetch;
});

it('render logs from session and get next logs correctly', async () => {

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

	process.env.NODE_ENV = 'development';

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogList />
		</MemoryRouter>
	);
	
	const seeMoreButton = screen.getByTestId("seeMoreButton");
	expect(seeMoreButton).toBeDefined();

	// fetchMore -> ok and has no next
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
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
				],
				"Count":10,
				"ScannedCount":10,
			}
		}),
	});

	fireEvent.click(seeMoreButton);

	global.fetch = unmockedFetch;
});