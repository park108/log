import { render, screen, fireEvent, act } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import * as common from "../common/common";
import Search from '../Search/Search';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

it('Did not open mobile yet', () => {
	common.isMobile = jest.fn().mockResolvedValueOnce(true);

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});
	render(
		<Router location={history.location} navigator={history}>
			<Search />
		</Router>
	);

	expect(screen.queryByPlaceholderText("Search log...")).toBe(null);
});

describe('test key up events', () => {

	let inputElement = null;

	beforeEach(async () => {
		process.env.NODE_ENV = 'development';

		const history = createMemoryHistory();
		history.push({location: {pathname: "/log"}});
		render(
			<Router location={history.location} navigator={history}>
				<Search />
			</Router>
		);

		inputElement = screen.getByPlaceholderText("Search log...");
	});

	it('firing keyUp event', async () => {

		fireEvent.keyUp(inputElement, { keyCode: 97 });
		fireEvent.keyUp(inputElement, { keyCode: 98 });
		fireEvent.keyUp(inputElement, { keyCode: 99 });
	});

	it('firing search when the search string is null', async () => {

		jest.useFakeTimers();

		inputElement.value = "";
		fireEvent.keyUp(inputElement, { keyCode: 13 });
	
		act(() => {
			jest.runOnlyPendingTimers();
		});
		jest.useRealTimers();
	});
});

describe('test APIs', () => {

	let inputElement = null;

	beforeEach(async () => {

		const history = createMemoryHistory();
		history.push({location: {pathname: "/log"}});
		render(
			<Router location={history.location} navigator={history}>
				<Search />
			</Router>
		);
		
		inputElement = screen.getByPlaceholderText("Search log...");
	});

	it('fetch succeed', async () => {

		process.env.NODE_ENV = 'development';
		
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
					"TotalCount":10,
				}
			}),
		});

		inputElement.value = "test string";
		fireEvent.keyUp(inputElement, { keyCode: 13 });

		global.fetch = unmockedFetch;
	});


	it('fetch failed', async () => {
		process.env.NODE_ENV = 'production';
		
		// fetchFirst -> return error
		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				errorType: "404"
			}),
		});

		inputElement.value = "test string";
		fireEvent.keyUp(inputElement, { keyCode: 13 });

		global.fetch = unmockedFetch;
	});

	it('API is down', async () => {
		process.env.NODE_ENV = '';

		// fetchFirst -> Server error
		global.fetch = () => Promise.reject(errorMessage);

		inputElement.value = "test string";
		fireEvent.keyUp(inputElement, { keyCode: 13 });

		global.fetch = unmockedFetch;
	});
});