import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import LogItem from '../Log/LogItem';
import * as common from '../common/common';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();

it('render log item correctly', async () => {

	const contents = "header test contents";
	const markdownText = "## " + contents;

	const item = {
		"logs":[
			{"contents":markdownText,"timestamp":1655737033793}
			,{"contents":"12345","timestamp":1655736946977}
		]
		,"summary":"123456"
		,"sortKey":1655736946977
		,"timestamp":1655736946977
		,"author":"park108@gmail.com"
	}

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogItem 
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</Router>
	);
	
	// Button click tests
	const linkCopyButton = await screen.findByTestId("link-copy-button");
	expect(linkCopyButton).toBeDefined();
	userEvent.click(linkCopyButton);

	const versionsButton = await screen.findByTestId("versions-button");
	expect(versionsButton).toBeDefined();
	userEvent.click(versionsButton);

	const editButton = await screen.findByTestId("edit-button");
	expect(editButton).toBeDefined();
	userEvent.click(editButton);
});

it('render log item and delete correctly', async () => {
		
	// deleteLogItem -> ok
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			status: 200
		}),
	});

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

	const contents = "header test contents";
	const markdownText = "## " + contents;

	const item = {
		"logs":[
			{"contents":markdownText,"timestamp":1655737033793}
			,{"contents":"12345","timestamp":1655736946977}
		]
		,"summary":"123456"
		,"sortKey":1655736946977
		,"timestamp":1655736946977
		,"author":"park108@gmail.com"
	}

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
	// common.hasValue = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'development';

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogItem 
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</Router>
	);
	
	jest.useFakeTimers();
	window.confirm = jest.fn(() => false);

	const deleteButton = screen.getByTestId("delete-button");
	expect(deleteButton).toBeDefined();
	userEvent.click(deleteButton);

	window.confirm = jest.fn(() => true);
	expect(deleteButton).toBeDefined();
	userEvent.click(deleteButton);

	jest.runOnlyPendingTimers();
	
	jest.useRealTimers();
	sessionStorage.clear();
	global.fetch = unmockedFetch;
});

it('render log item and delete failed correctly', async () => {
		
	// deleteLogItem -> failed
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			status: 404
		}),
	});

	const contents = "header test contents";
	const markdownText = "## " + contents;

	const item = {
		"logs":[
			{"contents":markdownText,"timestamp":1655737033793}
			,{"contents":"12345","timestamp":1655736946977}
		]
		,"summary":"123456"
		,"sortKey":1655736946977
		,"timestamp":1655736946977
		,"author":"park108@gmail.com"
	}

	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);

	process.env.NODE_ENV = 'production';

	const history = createMemoryHistory();
	history.push({location: {pathname: "/log"}});

	render(
		<Router location={history.location} navigator={history}>
			<LogItem 
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</Router>
	);
	
	jest.useFakeTimers();
	window.confirm = jest.fn(() => true);	

	const deleteButton = await screen.findByTestId("delete-button");
	expect(deleteButton).toBeDefined();
	userEvent.click(deleteButton);

	jest.runOnlyPendingTimers();
	
	jest.useRealTimers();
	global.fetch = unmockedFetch;
});

it('parse unordered list tag correctly', () => {

	const contents = "list item test contents";
	const markdownText = "- " + contents;

	render(<LogItem 
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}    
	/>);

	const html = screen.getByText(contents).closest('ul');

	const expected = document.createElement("ul");
	const expectedChild = document.createElement("li");
	expectedChild.innerHTML = contents;
	expected.appendChild(expectedChild);

	expect(expected).toStrictEqual(html);
});

it('parse ordered list tag correctly', () => {

	const contents = "list item test contents";
	const markdownText = "1. " + contents;

	render(<LogItem 
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}    
	/>);

	const html = screen.getByText(contents).closest('ol');

	const expected = document.createElement("ol");
	const expectedChild = document.createElement("li");
	expectedChild.innerHTML = " " + contents;
	expected.appendChild(expectedChild);

	expect(expected).toStrictEqual(html);
});

it('parse image tag correctly', () => {

	const url = "https://www.iana.org/_img/2022/iana-logo-header.svg"
	const titleText = "title text";
	const altText = "alternated text";
	const markdownText = "![" + altText + "](" + url + " \"" + titleText + "\")";

	render(<LogItem 
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}
	/>);

	const html = screen.getByRole('img');

	const expected = document.createElement("img");
	expected.setAttribute("src", url);
	expected.setAttribute("alt", altText);
	expected.setAttribute("title", titleText);

	expect(expected).toStrictEqual(html);
});

it('parse anchor tag correctly', () => {

	const url = "https://exmaple.com"
	const titleText = "title text";
	const text = "linked text";
	const markdownText = "[" + text + "](" + url + " \"" + titleText + "\")";

	render(<LogItem 
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}    
	/>);

	const html = screen.getByText(text).closest('a');

	const expected = document.createElement("a");
	expected.setAttribute("href", url);
	expected.setAttribute("rel", "noreferrer");
	expected.setAttribute("target", "_blank");
	expected.setAttribute("title", titleText);
	expected.innerHTML = text;

	expect(expected).toStrictEqual(html);
});