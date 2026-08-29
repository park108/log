import type React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import LogItem from './LogItem';
import * as common from '../common/common';
import { useMockServer } from '../test-utils/msw';
import { beforeAll } from 'vitest';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// REQ-20260421-007 / TSK-20260421-51 — React 19 concurrent initial commit 의 async flush 에 대응해 delete-button 선택을 findBy* 로 전환 (Layer 1 옵션 A).

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
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

// LogItem depends on `useDeleteLog` (TanStack Query mutation hook) since
// TSK-20260418-MUT-DELETE. A QueryClientProvider is mandatory for the
// component to mount; each call instantiates a fresh isolated client via the
// single-source helper to avoid cache leakage (REQ-20260519-001 /
// `createQueryTestWrapper`).
const withQuery = (node: React.ReactNode) => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

// REQ-20260421-027 / TSK-20260421-63 — shuffle seed=1 cold-start race 방어.
// `LogItem` 은 `LogItemInfo` (delete-button) 와 `Toaster` 를 `lazy()` 로 로드한다.
// 파일 단위 beforeAll 에서 한 번 render 해 두면 dynamic import + initial mount
// 경로가 module cache 에 고정되어, 이후 어떤 describe 가 파일 첫 실행으로
// 섞여도 `findByTestId("delete-button")` + `findByText(...)` 가 1000ms 기본
// polling 안에 결정적으로 충족된다. render 본체는 즉시 cleanup 해 테스트 간
// DOM / React 상태 격리 불변식 (REQ-20260420-004 §FR-01) 을 깨뜨리지 않는다.
beforeAll(async () => {
	vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
	vi.spyOn(common, 'isAdmin').mockReturnValue(true);
	render(withQuery(
		<MemoryRouter>
			<LogItem
				author={'park108@gmail.com'}
				timestamp={1655736946977}
				contents={'## warm-up'}
				item={{
					logs: [{ contents: '## warm-up', timestamp: 1655736946977 }],
					summary: 'w',
					sortKey: 1655736946977,
					timestamp: 1655736946977,
					author: 'park108@gmail.com',
				}}
				showLink={false}
			/>
		</MemoryRouter>
	));
	await screen.findByTestId('delete-button');
	cleanup();
	vi.restoreAllMocks();
});

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

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(true);

	stubMode('production');

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
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const linkCopyButton = await screen.findByTestId("link-copy-button");
	expect(linkCopyButton).toBeInTheDocument();
	fireEvent.click(linkCopyButton);

	await vi.runOnlyPendingTimersAsync();

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
	const linkTrigger = await screen.findByTestId("link-copy-button");
	expect(linkTrigger).toBeInTheDocument();

	fireEvent.mouseOver(linkTrigger);
	fireEvent.mouseOver(linkTrigger); // Already class changed
	fireEvent.mouseMove(linkTrigger);
	fireEvent.mouseOut(linkTrigger);
	fireEvent.mouseOut(linkTrigger); // Already class changed
});

describe("LogItem sanitizes rendered markdown HTML", () => {
	beforeEach(() => {
		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(false);
	});

	const baseItem = (contents: string) => ({
		logs: [{ contents, timestamp: 1655736946977 }],
		summary: "s",
		sortKey: 1655736946977,
		timestamp: 1655736946977,
		author: "park108@gmail.com",
	});

	const renderAt = (contents: string) => render(withQuery(
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
		const payload = "Hello <script>(window as unknown as Record<string, unknown>).__xss=1</script> World";
		const { container } = renderAt(payload);
		await screen.findByText(/Hello/);
		expect(container.querySelector("script")).toBeNull();
		// global side-effect not triggered
		// @ts-ignore
		expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
	});

	it("strips on* event handler attributes from embedded html", async () => {
		const payload = '<img src="x" onerror="(window as unknown as Record<string, unknown>).__xss2=1" />';
		const { container } = renderAt(payload);
		const imgs = container.querySelectorAll<HTMLElement>("img");
		imgs.forEach((img) => {
			expect(img.getAttribute("onerror")).toBeNull();
		});
		// @ts-ignore
		expect((window as unknown as Record<string, unknown>).__xss2).toBeUndefined();
	});
});

describe('LogItem DELETE 5xx error toaster', () => {
	useMockServer(() => mock.devServerFailed);

	it('shows error toaster on DELETE 5xx response', async () => {

		stubMode('development');

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

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

		window.confirm = vi.fn(() => true);

		// 발화 관측기 (TSK-20260828-09 / FR-02) — `LogItem.jsx` deleteMutation onError 는
		// `log(...)` 2회 + setter 3개를 발화한다. 그 발화를 관측하는 spy 가 없으면 이 파일은
		// post-unmount 발화 감사에서 **단락**되어 축 1~4 판정을 한 건도 받지 않는다.
		// 좁힘 없는 **양성** 인자 단정이다 (영단정 아님).
		const emissionSpy = vi.spyOn(common, "log");

		const deleteButton = await screen.findByTestId("delete-button");
		fireEvent.click(deleteButton);

		// Error toaster should be visible with the 5xx-specific copy.
		const toasterMessage = await screen.findByText("Deleting log failed.");
		expect(toasterMessage).toBeInTheDocument();
		expect(emissionSpy).toHaveBeenCalledWith("[API DELETE] FAILED - Log", "ERROR");
	});
});

describe('LogItem DELETE network-error toaster', () => {
	useMockServer(() => mock.devServerNetworkError);

	it('shows network error toaster on DELETE network failure', async () => {

		stubMode('development');

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

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

		window.confirm = vi.fn(() => true);

		const deleteButton = await screen.findByTestId("delete-button");
		fireEvent.click(deleteButton);

		// Network-level failure branches to the distinct message.
		const toasterMessage = await screen.findByText("Deleting log network error.");
		expect(toasterMessage).toBeInTheDocument();
	});
});

describe('LogItem render and delete failed (confirm cancel then accept)', () => {
	useMockServer(() => mock.devServerFailed);

	it('render log item and delete failed correctly', async () => {

		stubMode('development');

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

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

		vi.useFakeTimers({ shouldAdvanceTime: true });
		window.confirm = vi.fn(() => false);

		const deleteButton = await screen.findByTestId("delete-button");
		expect(deleteButton).toBeDefined();
		fireEvent.click(deleteButton);

		window.confirm = vi.fn(() => true);
		expect(deleteButton).toBeDefined();
		fireEvent.click(deleteButton);

		await vi.runOnlyPendingTimersAsync();

		await screen.findByText("Delete");
	});
});

describe('LogItem render and delete network error', () => {
	useMockServer(() => mock.devServerNetworkError);

	it('render log item and delete network error', async () => {

		stubMode('development');

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

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

		vi.useFakeTimers({ shouldAdvanceTime: true });
		window.confirm = vi.fn(() => true);

		const deleteButton = await screen.findByTestId("delete-button");
		expect(deleteButton).toBeDefined();
		fireEvent.click(deleteButton);

		await vi.runOnlyPendingTimersAsync();

		await screen.findByText("Delete");
	});
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
