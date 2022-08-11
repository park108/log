import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import Log from '../Log/Log';
import * as common from '../common/common';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();

it('render log if it logged in', async () => {
		
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
				"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654501373940}
			}
		}),
	});

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});
	sessionStorage.clear();

	render(
		<Router location={history.location} navigator={history}>
			<Log />
		</Router>
	);

	const div = await screen.findByRole("application");
	expect(div).toBeInTheDocument();

	const item = await screen.findByText("2022-06-20");
	expect(item).toBeInTheDocument();
	
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body: {
				Count: 1,
				Items: [
					{
						author: "park108@gmail.com",
						timestamp: 1656034616036,
						logs: [
							{
								contents: "Test Contents",
								timestamp: 1656034616036,
							}
						]
					},
				]
			}
		}),
	});

	console.log(item.parentNode);
	userEvent.click(item.parentNode);

	// const textInput = await screen.findByTestId("writer-text-area");
	// const typedValue = "Posting test";
	// userEvent.type(textInput, typedValue);

	// const submitButton = await screen.findByTestId("submit-button");
	// expect(submitButton).toBeDefined();
	// userEvent.click(submitButton);

	global.fetch = unmockedFetch;
});

describe("get api url", () => {

	it('get trimmed string', () => {

		const testString = "test string";
		// expect(testString).toBe("test string");
	});
});