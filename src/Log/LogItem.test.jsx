import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mock from './api.mock';
import LogItem from './LogItem';
import * as common from '../common/common';

console.log = vi.fn();
console.error = vi.fn();

// LogItem depends on `useDeleteLog` (TanStack Query mutation hook) since
// TSK-20260418-MUT-DELETE. A QueryClientProvider is mandatory for the
// component to mount; each test gets an isolated client to avoid cache
// leakage (per `src/test-utils/queryWrapper.jsx` guidance).
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

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	document.execCommand = vi.fn();

	process.env.NODE_ENV = 'production';

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogItem
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</MemoryRouter>
	));

	// Button click tests
	vi.useFakeTimers();

	const linkCopyButton = await screen.findByTestId("link-copy-button");
	expect(linkCopyButton).toBeInTheDocument();
	fireEvent.click(linkCopyButton);

	vi.runOnlyPendingTimers();

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
	
	vi.useRealTimers();
});

describe("LogItem sanitizes rendered markdown HTML", () => {
	beforeEach(() => {
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(false);
		document.execCommand = vi.fn();
	});

	const baseItem = (contents) => ({
		logs: [{ contents, timestamp: 1655736946977 }],
		summary: "s",
		sortKey: 1655736946977,
		timestamp: 1655736946977,
		author: "park108@gmail.com",
	});

	const renderAt = (contents) => render(withQuery(
		<MemoryRouter initialEntries={[{ pathname: "/log", search: "", hash: "", state: {}, key: "d" }]}>
			<LogItem
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={contents}
				item={baseItem(contents)}
				showLink={true}
			/>
		</MemoryRouter>
	));

	it("strips <script> tags from markdown HTML output", async () => {
		const payload = "Hello <script>window.__xss=1</script> World";
		const { container } = renderAt(payload);
		await screen.findByText(/Hello/);
		expect(container.querySelector("script")).toBeNull();
		// global side-effect not triggered
		// @ts-ignore
		expect(window.__xss).toBeUndefined();
	});

	it("strips on* event handler attributes from embedded html", async () => {
		const payload = '<img src="x" onerror="window.__xss2=1" />';
		const { container } = renderAt(payload);
		const imgs = container.querySelectorAll("img");
		imgs.forEach((img) => {
			expect(img.getAttribute("onerror")).toBeNull();
		});
		// @ts-ignore
		expect(window.__xss2).toBeUndefined();
	});
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

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogItem
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</MemoryRouter>
	));

	vi.useFakeTimers();
	window.confirm = vi.fn(() => false);

	const deleteButton = screen.getByTestId("delete-button");
	expect(deleteButton).toBeDefined();
	fireEvent.click(deleteButton);

	window.confirm = vi.fn(() => true);
	expect(deleteButton).toBeDefined();
	fireEvent.click(deleteButton);

	vi.runOnlyPendingTimers();

	const afterDelete = await screen.findByText("Delete");

	vi.useRealTimers();

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

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);

	const testEntry = {
		pathname: "/log"
		, search: ""
		, hash: ""
		, state: {}
		, key: "default"
	};

	render(withQuery(
		<MemoryRouter initialEntries={[ testEntry ]}>
			<LogItem
				author={"park108@gmail.com"}
				timestamp={1655736946977}
				contents={markdownText}
				item={item}
				showLink={true}
			/>
		</MemoryRouter>
	));

	vi.useFakeTimers();
	window.confirm = vi.fn(() => true);

	const deleteButton = screen.getByTestId("delete-button");
	expect(deleteButton).toBeDefined();
	fireEvent.click(deleteButton);

	vi.runOnlyPendingTimers();

	const afterDelete = await screen.findByText("Delete");

	vi.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

it('parse unordered list tag correctly', () => {

	const contents = "list item test contents";
	const markdownText = "- " + contents;

	render(withQuery(<MemoryRouter><LogItem
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}
	/></MemoryRouter>));

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

	render(withQuery(<MemoryRouter><LogItem
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}
	/></MemoryRouter>));

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

	render(withQuery(<MemoryRouter><LogItem
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}
	/></MemoryRouter>));

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

	render(withQuery(<MemoryRouter><LogItem
		author={"park108@gmail.com"}
		timestamp={20211008195400}
		contents={markdownText}
	/></MemoryRouter>));

	const html = screen.getByText(text).closest('a');

	const expected = document.createElement("a");
	expected.setAttribute("href", url);
	// sanitizeHtml afterSanitizeAttributes hook expands rel for target="_blank".
	expected.setAttribute("rel", "noopener noreferrer");
	expected.setAttribute("target", "_blank");
	expected.setAttribute("title", titleText);
	expected.innerHTML = text;

	expect(expected).toStrictEqual(html);
});