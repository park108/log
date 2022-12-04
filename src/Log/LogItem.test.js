import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import LogItem from './LogItem';
import * as common from '../common/common';

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
	document.execCommand = jest.fn();

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
			<LogItem 
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</MemoryRouter>
	);
	
	// Button click tests
	jest.useFakeTimers();

	const linkCopyButton = await screen.findByTestId("link-copy-button");
	expect(linkCopyButton).toBeInTheDocument();
	fireEvent.click(linkCopyButton);

	jest.runOnlyPendingTimers();

	const versionsButton = await screen.findByTestId("versions-button");
	expect(versionsButton).toBeDefined();

	fireEvent.mouseOver(versionsButton);
	fireEvent.mouseOver(versionsButton); // Already class changed
	fireEvent.mouseMove(versionsButton);
	fireEvent.mouseOut(versionsButton);
	fireEvent.mouseOut(versionsButton); // Already class changed

	const editButton = await screen.findByTestId("edit-button");
	expect(editButton).toBeDefined();
	fireEvent.click(editButton);

	// Mouse over/out event
	const linkUrl = await screen.findByText("https://www.park108.net/log/1655736946977");
	expect(linkUrl).toBeInTheDocument();

	fireEvent.mouseOver(linkUrl);
	fireEvent.mouseOver(linkUrl); // Already class changed
	fireEvent.mouseMove(linkUrl);
	fireEvent.mouseOut(linkUrl);
	fireEvent.mouseOut(linkUrl); // Already class changed
	
	jest.useRealTimers();
});

it('render log item and delete failed correctly', async () => {

	mock.devServerFailed.listen();
	process.env.NODE_ENV = 'development';

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

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogItem 
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</MemoryRouter>
	);
	
	jest.useFakeTimers();
	window.confirm = jest.fn(() => false);

	const deleteButton = screen.getByTestId("delete-button");
	expect(deleteButton).toBeDefined();
	fireEvent.click(deleteButton);

	window.confirm = jest.fn(() => true);
	expect(deleteButton).toBeDefined();
	fireEvent.click(deleteButton);

	jest.runOnlyPendingTimers();

	const afterDelete = await screen.findByText("Delete");
	
	jest.useRealTimers();

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

it('render log item and delete network error', async () => {

	mock.devServerNetworkError.listen();
	process.env.NODE_ENV = 'development';

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

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogItem 
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</MemoryRouter>
	);
	
	jest.useFakeTimers();
	window.confirm = jest.fn(() => true);

	const deleteButton = screen.getByTestId("delete-button");
	expect(deleteButton).toBeDefined();
	fireEvent.click(deleteButton);

	jest.runOnlyPendingTimers();

	const afterDelete = await screen.findByText("Delete");
	
	jest.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
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