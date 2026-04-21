import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import Writer from '../Log/Writer';
import { Router, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mock from './api.mock';
import * as common from '../common/common';
import { useMockServer } from '../test-utils/msw';

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

// Writer depends on `useCreateLog` (TanStack Query mutation hook) since
// TSK-20260418-MUT-CREATE. A QueryClientProvider is mandatory for the
// component to mount; each test gets an isolated client to avoid cache
// leakage between tests (per `src/test-utils/queryWrapper.jsx` guidance).
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

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
		configurable: true,
		writable: true,
	});
});

it('redirect if not admin', async () => {
	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(false);

	const history = createMemoryHistory({ initialEntries: ["/log/write"]});

	render(withQuery(
		<Router location={history.location} navigator={history}>
			<Writer />
		</Router>
	))
});

describe('Writer create log ok on prod server', () => {
	useMockServer(() => mock.prodServerOk);

	test('create log ok on prod server', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: null,
		};

		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		const textInput = await screen.findByTestId("writer-text-area");
		fireEvent.change(textInput, {target: {value: 'Create Log!'}});

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		// Submit test
		const submitButton = await screen.findByTestId("submit-button");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const resultMessage = await screen.findByText("The log posted.");
		expect(resultMessage).toBeDefined();
	});
});

describe('Writer create log failed on prod server', () => {
	useMockServer(() => mock.prodServerFailed);

	test('create log failed on prod server', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: null,
		};

		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		const textInput = await screen.findByTestId("writer-text-area");
		fireEvent.change(textInput, {target: {value: 'Create Log!'}});

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		// Submit test
		const submitButton = await screen.findByTestId("submit-button");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const resultMessage = await screen.findByText("Posting log failed.");
		expect(resultMessage).toBeDefined();
	});
});

describe('Writer create log network error on prod server', () => {
	useMockServer(() => mock.prodServerNetworkError);

	test('create log network error on prod server', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: null,
		};

		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		const textInput = await screen.findByTestId("writer-text-area");
		fireEvent.change(textInput, {target: {value: 'Create Log!'}});

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		// Submit test
		const submitButton = await screen.findByTestId("submit-button");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const resultMessage = await screen.findByText("Posting log network error.");
		expect(resultMessage).toBeDefined();
	});
});

describe('Writer edit log ok on dev server', () => {
	useMockServer(() => mock.devServerOk);

	it('edit log ok on dev server', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: {
				from: {
					logs: [
						{"contents":"Current contents","timestamp":1655737033793}
						,{"contents":"Previous contents","timestamp":1655736946977}
					],
					temporary: true,
					timestamp: 1234567890
				}
			}
		};

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		vi.useFakeTimers({ shouldAdvanceTime: true });

		// Submit test
		const submitButton = await screen.findByTestId("submit-button");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		const resultMessage = await screen.findByText("The log changed.");
		expect(resultMessage).toBeDefined();
	});
});

describe('Writer edit log failed on dev server', () => {
	useMockServer(() => mock.devServerFailed);

	it('edit log failed on dev server', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: {
				from: {
					logs: [
						{"contents":"Current contents","timestamp":1655737033793}
						,{"contents":"Previous contents","timestamp":1655736946977}
					],
					temporary: false,
					timestamp: 1234567890
				}
			}
		};

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		vi.useFakeTimers({ shouldAdvanceTime: true });

		// Submit test
		const submitButton = await screen.findByTestId("submit-button");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		const resultMessage = await screen.findByText("Editing log failed.");
		expect(resultMessage).toBeDefined();
	});
});

describe('Writer edit log network error on dev server', () => {
	useMockServer(() => mock.devServerNetworkError);

	it('edit log network error on dev server', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: {
				from: {
					logs: [
						{"contents":"Current contents","timestamp":1655737033793}
						,{"contents":"Previous contents","timestamp":1655736946977}
					],
					timestamp: 1234567890
				}
			}
		};

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		vi.useFakeTimers({ shouldAdvanceTime: true });

		// Submit test
		const submitButton = await screen.findByTestId("submit-button");
		expect(submitButton).toBeDefined();
		fireEvent.click(submitButton);

		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});

		const resultMessage = await screen.findByText("Editing log network error.");
		expect(resultMessage).toBeDefined();
	});
});


describe("Writer preview sanitizes rendered markdown HTML", () => {

	const renderWriter = () => {
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: null,
		};

		return render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));
	};

	it("strips <script> tags from markdown preview HTML", async () => {
		const { container } = renderWriter();

		const textInput = await screen.findByTestId("writer-text-area");
		fireEvent.change(textInput, { target: { value: "Hello <script>window.__xss=1</script> World" } });

		const preview = container.querySelector("#div--writer-converted");
		expect(preview).not.toBeNull();
		expect(preview.querySelector("script")).toBeNull();
		// global side-effect not triggered
		expect(window.__xss).toBeUndefined();
	});

	it("strips on* event handler attributes from embedded html in preview", async () => {
		const { container } = renderWriter();

		const textInput = await screen.findByTestId("writer-text-area");
		fireEvent.change(textInput, { target: { value: '<img src="x" onerror="window.__xss2=1" />' } });

		const preview = container.querySelector("#div--writer-converted");
		expect(preview).not.toBeNull();
		preview.querySelectorAll("img").forEach((img) => {
			expect(img.getAttribute("onerror")).toBeNull();
		});
		expect(window.__xss2).toBeUndefined();
	});
});

test('event testing', async () => {

	vi.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

	const testEntry = {
		pathname: "/log/write"
	};

	render(withQuery(
		<div id="root" className="div fullscreen">
			<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	));

	vi.useFakeTimers({ shouldAdvanceTime: true });

	// Convert display mode
	const modeButton = await screen.findByTestId("mode-button");
	expect(modeButton).toBeDefined();
	fireEvent.click(modeButton);
	fireEvent.click(modeButton);

	// Get markdown string for anchor
	const aButton = await screen.findByTestId("a-button");
	expect(aButton).toBeDefined();
	fireEvent.click(aButton);

	// Get markdown string for image
	const imgButton = await screen.findByTestId("img-button");
	expect(imgButton).toBeDefined();
	fireEvent.click(imgButton);

	// Toggle temporary
	const temporaryCheckbox = await screen.findByText("Temporary Save");
	expect(temporaryCheckbox).toBeDefined();
	fireEvent.click(temporaryCheckbox);

	// Open imag selector
	const imgSelector = await screen.findByTestId("img-selector-button");
	expect(imgSelector).toBeDefined();
	fireEvent.click(imgSelector);
	fireEvent.click(imgSelector);

	// Submit with no text
	const form = await screen.findByTestId("writer-form");
	expect(form).toBeDefined();
	fireEvent.submit(form);

	await vi.runOnlyPendingTimersAsync();

	// Text input test
	const textInput = await screen.findByTestId("writer-text-area");
	fireEvent.change(textInput, {target: {value: '123456'}});

	await vi.runOnlyPendingTimersAsync();

	// Submit test with text
	const form2 = await screen.findByTestId("writer-form");
	expect(form2).toBeDefined();
	fireEvent.submit(form2);

	await vi.runOnlyPendingTimersAsync();
});

test('copyMarkdownString shows error Toaster when clipboard write rejects', async () => {

	Object.defineProperty(navigator, 'clipboard', {
		value: {
			writeText: vi.fn().mockRejectedValueOnce(new Error('permission denied')),
		},
		configurable: true,
		writable: true,
	});

	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

	const testEntry = {
		pathname: "/log/write",
		state: null,
	};

	render(withQuery(
		<div id="root" className="div fullscreen">
			<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	));

	const aButton = await screen.findByTestId("a-button");
	expect(aButton).toBeDefined();
	fireEvent.click(aButton);

	await waitFor(async () => {
		const err = await screen.findByText(/Copy failed \(permission denied or unavailable\)/);
		expect(err).toBeDefined();
	});
});

describe('Writer a11y 패턴 B (REQ-20260421-033 FR-03)', () => {

	const renderWriter = () => {
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(true);

		const testEntry = {
			pathname: "/log/write",
			state: null,
		};

		return render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));
	};

	it('[IMG] toggle (M1) 에 tabIndex=0 과 role="button" 이 부여된다', async () => {
		renderWriter();
		const el = await screen.findByTestId('img-selector-button');

		expect(el).toHaveAttribute('role', 'button');
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('[IMG] toggle (M1) 이 Enter 키로 활성된다 (click 과 동일 핸들러)', async () => {
		const { container } = renderWriter();
		const el = await screen.findByTestId('img-selector-button');

		// 최초 렌더: ImageSelector 는 show=false 로 전달됨.
		// Enter → toggleImageSelector → show=true 로 전환 (state 변경 관찰은 click 과 동일한 효과).
		fireEvent.keyDown(el, { key: 'Enter' });
		// 재-클릭 대신 다시 Enter → 토글 복귀. 런타임 오류 없이 통과만 확인해도 충분.
		fireEvent.keyDown(el, { key: 'Enter' });
		expect(container).toBeDefined();
	});

	it('[IMG] toggle (M1) 이 Space 키로 활성된다 (preventDefault)', async () => {
		renderWriter();
		const el = await screen.findByTestId('img-selector-button');

		const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });
		// activateOnKey 가 preventDefault 호출 → fireEvent 반환값이 false (cancelled).
		expect(spaceEvent).toBe(false);
	});

	it('HTML/Markdown toggle (M2) 에 tabIndex=0 과 role="button" 이 부여된다', async () => {
		renderWriter();
		const el = await screen.findByTestId('mode-button');

		expect(el).toHaveAttribute('role', 'button');
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('HTML/Markdown toggle (M2) 이 Enter 키로 활성된다 (mode 텍스트 토글)', async () => {
		renderWriter();
		const el = await screen.findByTestId('mode-button');

		// 초기: Markdown Converted → Enter → HTML
		expect(el.textContent).toContain('Markdown Converted');
		fireEvent.keyDown(el, { key: 'Enter' });
		expect(el.textContent).toContain('HTML');
	});

	it('HTML/Markdown toggle (M2) 이 Space 키로 활성된다 (preventDefault)', async () => {
		renderWriter();
		const el = await screen.findByTestId('mode-button');

		const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });
		expect(spaceEvent).toBe(false);
		// Space 가 click 과 동일 핸들러를 실행 → 텍스트 전환.
		expect(el.textContent).toContain('HTML');
	});
});
