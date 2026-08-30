import type React from 'react';
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import Writer from '../Log/Writer';
import { Router, MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import * as api from './api';
import * as mock from './api.mock';
import * as common from '../common/common';
import { useMockServer } from '../test-utils/msw';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-c — setter 호출 recorder.
// `Writer.jsx` 의 유일한 `await` 는 `copyMarkdownString` 핸들러(async effect 0개)에 있고,
// 그 post-await 발화는 **전부 state setter** 다 (`log()` / `reportError()` 0 hit).
// React 18 의 `dispatchSetState` 는 unmount 된 fiber 에서 root=null 로 조용히 bail out 하므로
// (`react-dom.development.js` — 경고 없음) 콘솔·DOM 어느 표면에도 흔적이 남지 않는다.
// 즉 "가드 제거 → race 케이스 FAIL" 왕복이 성립하려면 setter 호출 자체를 세야 한다.
// `vi.spyOn(React, 'useState')` 는 ESM namespace 가 non-configurable 이라 불가하므로
// (`Cannot spy on export "useState"`), `vi.mock('react')` 로 `useState` 를 감싼다.
// recorder 가 off 인 동안 동작·setter identity 는 원본과 동일하다 (identity 는 Map 으로 고정).
const setterRecorder = vi.hoisted(() => ({ on: false, calls: 0 }));

// 이력 재계산 계수기. `markChangedLines` 는 이력 블록에서만 쓰이므로, 타자마다
// 이력이 다시 계산되는지를 이 호출 수로 직접 잰다. 실제 구현을 그대로 감싸므로
// 동작은 원본과 같다.
const diffRecorder = vi.hoisted(() => ({ calls: 0 }));

vi.mock('./diffContents', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./diffContents')>();
	return {
		...actual,
		markChangedLines: (...args: Parameters<typeof actual.markChangedLines>) => {
			diffRecorder.calls += 1;
			return actual.markChangedLines(...args);
		},
	};
});

vi.mock('react', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react') & { default: Record<string, unknown> }>();
	const wrapped = new Map();
	const useState = (initial?: unknown) => {
		const [value, set] = actual.useState(initial);
		if (!wrapped.has(set)) {
			wrapped.set(set, (...args: unknown[]) => {
				if (setterRecorder.on) setterRecorder.calls += 1;
				return (set as (...a: unknown[]) => unknown)(...args);
			});
		}
		return [value, wrapped.get(set)];
	};
	return { ...actual, useState, default: { ...actual.default, useState } };
});

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode: string) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

// Writer depends on `useCreateLog` (TanStack Query mutation hook) since
// TSK-20260418-MUT-CREATE. A QueryClientProvider is mandatory for the
// component to mount; each call instantiates a fresh isolated client via the
// single-source helper to avoid cache leakage between tests (REQ-20260519-001 /
// `createQueryTestWrapper`).
const withQuery = (node: React.ReactNode) => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(async () => true);
	vi.spyOn(console, 'error').mockImplementation(async () => true);
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
		configurable: true,
		writable: true,
	});
});

// REQ-20260825-003 FR-01 — clipboard 는 최상위 beforeEach 와 케이스 본문(현 L491)
// 두 곳에서 재정의된다. jsdom 기본 navigator 에 own clipboard 는 없다.
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
	if (originalClipboard) {
		Object.defineProperty(navigator, 'clipboard', originalClipboard);
	} else {
		delete (navigator as { clipboard?: unknown }).clipboard;
	}
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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

// 두 진입점이 같은 `from` 키에 서로 다른 것을 담아 왔다 — 수정(LogItemInfo)은
// 로그 객체를, 새 글 버튼(Log.tsx)은 경로 문자열을 넘겼다. state 의 존재만 보고
// 수정 모드로 가면 새 글 쓰기가 수정 모드로 열리고 historyData 가 문자열이 되어
// logs 접근에서 터진다.
describe('Writer 진입 state 형상 판정', () => {

	test('from 이 로그 형상이 아니면 새 글 모드로 연다', async () => {

		stubMode('production');
		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

		// 경로 문자열 — 로그가 아니다.
		const testEntry = {
			pathname: "/log/write",
			state: { from: "/log" },
		};

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		const textInput = await screen.findByTestId("writer-text-area");
		// 수정 모드였다면 historyData 의 최신 리비전이 본문에 복원된다.
		// 새 글 모드이므로 비어 있어야 한다.
		expect(textInput).toHaveValue("");
		// 변경 이력 섹션은 수정 모드에서만 렌더된다.
		expect(screen.queryByText("Change History")).toBeNull();
	});
});

describe('Writer edit log ok on dev server', () => {
	useMockServer(() => mock.devServerOk);

	it('edit log ok on dev server', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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
		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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
		fireEvent.change(textInput, { target: { value: "Hello <script>(window as unknown as Record<string, unknown>).__xss=1</script> World" } });

		const preview = container.querySelector("#div--writer-converted");
		expect(preview).not.toBeNull();
		expect(preview!.querySelector("script")).toBeNull();
		// global side-effect not triggered
		expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
	});

	it("strips on* event handler attributes from embedded html in preview", async () => {
		const { container } = renderWriter();

		const textInput = await screen.findByTestId("writer-text-area");
		fireEvent.change(textInput, { target: { value: '<img src="x" onerror="(window as unknown as Record<string, unknown>).__xss2=1" />' } });

		const preview = container.querySelector("#div--writer-converted");
		expect(preview).not.toBeNull();
		preview!.querySelectorAll("img").forEach((img) => {
			expect(img.getAttribute("onerror")).toBeNull();
		});
		expect((window as unknown as Record<string, unknown>).__xss2).toBeUndefined();
	});
});

test('event testing', async () => {

	vi.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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
		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

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

	it('[IMG] · 모드 토글이 네이티브 button 이다', async () => {
		renderWriter();

		// span[role=button] + activateOnKey 손조립을 네이티브 button 으로 바꿨다.
		// 손조립은 키 핸들러를 빠뜨리면 조용히 키보드 접근을 잃는다.
		for (const id of ['img-selector-button', 'mode-button']) {
			const el = await screen.findByTestId(id);
			expect(el.tagName).toBe('BUTTON');

			// 손조립 잔재 금지 — onKeyDown 이 남으면 Enter 에서 이중 발화한다.
			expect(el).not.toHaveAttribute('role');
			expect(el).not.toHaveAttribute('tabindex');

			// form 밖/안을 가리지 않고 암묵 제출을 막는다.
			expect(el).toHaveAttribute('type', 'button');

			// tabindex 없이 초점을 받는다.
			el.focus();
			expect(document.activeElement).toBe(el);
		}
	});

	it('[IMG] 토글이 펼침 상태를 접근성 트리에 알린다', async () => {
		renderWriter();
		const el = await screen.findByTestId('img-selector-button');

		// 이전에는 펼침 상태가 어디에도 노출되지 않았다.
		expect(el).toHaveAttribute('aria-expanded', 'false');
		fireEvent.click(el);
		expect(el).toHaveAttribute('aria-expanded', 'true');
	});

	it('모드 토글 클릭이 표기를 전환한다', async () => {
		renderWriter();
		const el = await screen.findByTestId('mode-button');

		expect(el.textContent).toContain('Markdown Converted');
		fireEvent.click(el);
		expect(el.textContent).toContain('HTML');
	});

	// form 안의 button 은 type 이 없으면 submit 이 기본이다. 지금은 핸들러의
	// preventDefault 가 막고 있지만 그 방어는 핸들러가 기억해야 성립한다 —
	// 마크다운 보조 버튼이 글을 제출해 버리는 형상을 구조적으로 못 박는다.
	it('마크다운 보조 버튼은 폼을 제출하지 않는다', async () => {
		renderWriter();

		for (const id of ['img-button', 'a-button']) {
			expect(await screen.findByTestId(id)).toHaveAttribute('type', 'button');
		}

		// 제출 버튼만 submit 이다.
		expect(await screen.findByTestId('submit-button')).toHaveAttribute('type', 'submit');
	});
});

// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-c —
// `copyMarkdownString` 핸들러의 unmount race 박제.
// **술어 해상도 주의**: spec §동작 3 의 술어("`useEffect` 등록 + 본문 `await`/`.then(`")는
// 파일 단위라 `Writer.jsx` 를 대상으로 잡지만, 이 파일의 async effect 는 **0개**다.
// 실제 race 표면은 effect 가 아니라 `copyMarkdownString` 클릭 핸들러의 `await copyToClipboard(...)`
// 이후 토스터 발화 3건이다 — 가드를 effect 에 붙이면 게이트만 통과하고 race 는 남는다.
describe('Writer unmount-safety (REQ-20260517-093 (I1)(I2)) — 핸들러 경로', () => {

	const renderWriterForRace = () => {
		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockReturnValue(undefined);

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

	const flushAfterResponse = async () => {
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 0));
		});
	};

	const raceAfterUnmount = async (unmount: () => void, settle: () => void) => {
		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();
		setterRecorder.calls = 0;
		setterRecorder.on = true;

		settle();
		await flushAfterResponse();

		setterRecorder.on = false;

		return { logSpy, errorSpy };
	};

	it('pending copyToClipboard 중 unmount → 성공 resolve 가 토스터 setter 를 호출하지 않는다', async () => {

		let resolveCopy!: (value: boolean | PromiseLike<boolean>) => void;
		const pending = new Promise<boolean>((resolve) => { resolveCopy = resolve; });
		const copySpy = vi.spyOn(common, 'copyToClipboard').mockReturnValue(pending);

		const { unmount } = renderWriterForRace();

		fireEvent.click(await screen.findByTestId("a-button"));
		await waitFor(() => expect(copySpy).toHaveBeenCalledTimes(1));

		const { logSpy, errorSpy } = await raceAfterUnmount(unmount, () => resolveCopy(true));

		expect(setterRecorder.calls).toBe(0);
		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByText("Markdown string copied.")).toBeNull();
	});

	it('pending copyToClipboard 중 unmount → 실패 resolve 도 토스터 setter 를 호출하지 않는다', async () => {

		let resolveCopy!: (value: boolean | PromiseLike<boolean>) => void;
		const pending = new Promise<boolean>((resolve) => { resolveCopy = resolve; });
		const copySpy = vi.spyOn(common, 'copyToClipboard').mockReturnValue(pending);

		const { unmount } = renderWriterForRace();

		fireEvent.click(await screen.findByTestId("img-button"));
		await waitFor(() => expect(copySpy).toHaveBeenCalledTimes(1));

		const { logSpy, errorSpy } = await raceAfterUnmount(unmount, () => resolveCopy(false));

		expect(setterRecorder.calls).toBe(0);
		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(screen.queryByText(/Copy failed \(permission denied or unavailable\)/)).toBeNull();
	});
});

// 5자 미만으로 한 번 제출하면 그 뒤로 Post 가 죽는다.
//
// 제출 핸들러는 `setIsSubmitted(true)` 만 하고, 실제 저장은 `[isSubmitted]` 효과가
// 한다. 그 효과가 짧은 글에서 alert 을 띄우고 `setIsSubmitted(false)` 없이 return
// 하면 플래그가 true 로 남는다. 다시 누르면 `setIsSubmitted(true)` 는 같은 값이라
// React 가 리렌더를 건너뛰고, deps 가 그대로라 효과도 다시 돌지 않는다 —
// 글을 제대로 채워도 저장이 일어나지 않는다.
describe('Writer 짧은 글로 한 번 막힌 뒤', () => {
	useMockServer(() => mock.prodServerOk);

	test('제대로 채워 다시 누르면 저장된다', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[{ pathname: "/log/write", state: null }]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		const textInput = await screen.findByTestId("writer-text-area");
		const submitButton = await screen.findByTestId("submit-button");

		// 너무 짧게 한 번 제출 → 거절된다.
		fireEvent.change(textInput, { target: { value: '짧다' } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(submitButton);
		await act(async () => { await vi.runAllTimersAsync(); });
		expect(alertSpy).toHaveBeenCalledWith("Please note at least 5 characters.");

		// 제대로 채워 다시 제출.
		fireEvent.change(textInput, { target: { value: '이번에는 충분히 긴 글이다.' } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(submitButton);
		await act(async () => { await vi.runAllTimersAsync(); });

		const resultMessage = await screen.findByText("The log posted.");
		expect(resultMessage).toBeDefined();
	});
});

// 이력은 historyData 에만 의존하는데 타자 한 번마다 판본 전부를 다시
// diff → 파싱 → sanitize 했다. 실측(jsdom): 판본 5개 36ms · 15개 103ms ·
// 30개 265ms — 한 글자 칠 때마다다. 판본이 쌓인 글은 편집기가 눈에 띄게 밀린다.
describe('Writer 이력 재계산', () => {
	useMockServer(() => mock.devServerOk);

	it('타자를 쳐도 이력을 다시 계산하지 않는다', async () => {

		stubMode('development');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

		const testEntry = {
			pathname: "/log/write",
			state: {
				from: {
					author: "park108@gmail.com",
					timestamp: 1234567890,
					temporary: false,
					logs: [
						{ contents: "세 번째 판본이다.", timestamp: 1655737033793 },
						{ contents: "두 번째 판본이다.", timestamp: 1655736946977 },
						{ contents: "첫 번째 판본이다.", timestamp: 1655736900000 },
					],
				},
			},
		};

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[testEntry]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		const textInput = await screen.findByTestId("writer-text-area");
		await waitFor(() => expect(diffRecorder.calls).toBeGreaterThan(0));

		const afterFirstRender = diffRecorder.calls;

		for (const value of ["가", "가나", "가나다", "가나다라"]) {
			fireEvent.change(textInput, { target: { value } });
		}
		await waitFor(() => expect((textInput as HTMLTextAreaElement).value).toBe("가나다라"));

		// 이전에는 타자마다 판본 수만큼 늘었다.
		expect(diffRecorder.calls).toBe(afterFirstRender);
	});
});

// 공백만 넣은 것은 안 넣은 것이다. 길이를 날것으로 재던 동안 공백 다섯 칸이
// 검증을 통과했고, 그 글은 요약이 빈 문자열이라 목록에 빈 항목으로 남았다.
describe('Writer 공백만 입력', () => {
	useMockServer(() => mock.prodServerOk);

	const renderWriter = () => render(withQuery(
		<div id="root" className="div fullscreen">
			<MemoryRouter initialEntries={[{ pathname: "/log/write", state: null }]}>
				<Writer />
			</MemoryRouter>
		</div>
	));

	it('공백뿐이면 저장하지 않는다', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		vi.useFakeTimers({ shouldAdvanceTime: true });
		renderWriter();

		fireEvent.change(await screen.findByTestId("writer-text-area"), { target: { value: '       ' } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(await screen.findByTestId("submit-button"));
		await act(async () => { await vi.runAllTimersAsync(); });

		expect(alertSpy).toHaveBeenCalledWith("Please note at least 5 characters.");
		expect(screen.queryByText("The log posted.")).toBeNull();
	});

	// 대조 — 정상 본문은 그대로 저장돼야 한다. 없으면 "언제나 거부" 구현도 통과한다.
	it('정상 본문은 저장한다', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

		vi.useFakeTimers({ shouldAdvanceTime: true });
		renderWriter();

		fireEvent.change(await screen.findByTestId("writer-text-area"), { target: { value: '  충분히 긴 본문이다.  ' } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(await screen.findByTestId("submit-button"));
		await act(async () => { await vi.runAllTimersAsync(); });

		expect(alertSpy).not.toHaveBeenCalled();
		expect(await screen.findByText("The log posted.")).toBeDefined();
	});

	// 저장은 원문 그대로다. 판정만 trim 하고 본문은 건드리지 않는다 —
	// 마크다운의 줄 끝 두 칸은 줄바꿈이라 의미가 있다.
	it('앞뒤 공백을 지운 채 저장하지 않는다', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);
		vi.spyOn(window, 'alert').mockImplementation(() => {});
		const postSpy = vi.spyOn(api, 'postLog');

		vi.useFakeTimers({ shouldAdvanceTime: true });
		renderWriter();

		const raw = '  줄 끝 두 칸이 있는 본문이다.  ';
		fireEvent.change(await screen.findByTestId("writer-text-area"), { target: { value: raw } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(await screen.findByTestId("submit-button"));
		await act(async () => { await vi.runAllTimersAsync(); });

		expect(postSpy).toHaveBeenCalledTimes(1);
		expect(postSpy.mock.calls[0]![1]).toBe(raw);
	});
});

// 글을 쓰면 목록 캐시가 비어야 한다.
//
// LogList 는 React Query 를 소비하지 않는다 — 직접 fetch 하고 sessionStorage 에
// 캐시한다. mutation 훅이 invalidate 하는 `['log','list']` 는 보는 쪽이 없어
// (useLogList 훅의 소비처 0), 목록이 세션 내내 얼어붙었다. 실측: 글을 쓴 뒤
// 목록을 다시 열어도 재조회 0회, 새 글 보이지 않음.
describe('Writer 저장 후 목록 캐시', () => {
	useMockServer(() => mock.prodServerOk);

	const postAndCheck = async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

		sessionStorage.setItem('logList', JSON.stringify([{ contents: '옛 목록' }]));
		sessionStorage.setItem('logListLastTimestamp', '1656034616036');

		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[{ pathname: "/log/write", state: null }]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		fireEvent.change(await screen.findByTestId("writer-text-area"),
			{ target: { value: '새로 쓴 글이다.' } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(await screen.findByTestId("submit-button"));
		await act(async () => { await vi.runAllTimersAsync(); });
	};

	it('저장이 성공하면 목록 캐시를 비운다', async () => {

		await postAndCheck();

		expect(await screen.findByText("The log posted.")).toBeDefined();
		// 이전에는 옛 목록이 그대로 남아 다음 목록 조회가 재조회 없이 그것을 썼다.
		expect(sessionStorage.getItem('logList')).toBeNull();
		expect(sessionStorage.getItem('logListLastTimestamp')).toBeNull();
	});
});

// 대조 — 저장이 실패하면 캐시를 건드리지 않는다. 서버에 반영되지 않은 변경 때문에
// 목록을 다시 받아올 이유가 없다.
describe('Writer 저장 실패 시 목록 캐시', () => {
	useMockServer(() => mock.prodServerFailed);

	it('실패하면 캐시를 그대로 둔다', async () => {

		stubMode('production');

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
		vi.spyOn(common, "setFullscreen").mockResolvedValue(undefined);

		sessionStorage.setItem('logList', JSON.stringify([{ contents: '옛 목록' }]));

		vi.useFakeTimers({ shouldAdvanceTime: true });

		render(withQuery(
			<div id="root" className="div fullscreen">
				<MemoryRouter initialEntries={[{ pathname: "/log/write", state: null }]}>
					<Writer />
				</MemoryRouter>
			</div>
		));

		fireEvent.change(await screen.findByTestId("writer-text-area"),
			{ target: { value: '새로 쓴 글이다.' } });
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		fireEvent.click(await screen.findByTestId("submit-button"));
		await act(async () => { await vi.runAllTimersAsync(); });

		expect(sessionStorage.getItem('logList')).not.toBeNull();
	});
});

// 이 화면은 "새 글" 과 "수정" 이 **같은 라우트**다. 그래서 글을 수정하는 중에
// "+"(새 글)를 눌러도 언마운트되지 않고 진입 효과만 다시 돈다. 그 효과가
// 수정 모드로 **들어가는 갈래만** 갖고 있던 동안에는, 그때 편집 상태가 그대로
// 남았다 — 실측: 버튼은 "Edit", 본문도 기존 글. 새 글을 쓴 줄 알고 저장하면
// 기존 글을 덮어쓴다.
describe('Writer 진입 모드는 주소를 따라간다', () => {

	const EXISTING_CONTENTS = '# 기존 글\n\n기존 본문입니다';
	const existingLog = {
		timestamp: 1656034616036,
		temporary: false,
		logs: [{ timestamp: 1656034616036, contents: EXISTING_CONTENTS }],
	};

	const NavigateButton = ({ to, state }: { to: string; state?: unknown }) => {
		const navigate = useNavigate();
		return <button data-testid="go" onClick={() => navigate(to, state === undefined ? undefined : { state })}>go</button>;
	};

	const textarea = () => document.getElementById('textarea--writer-article') as HTMLTextAreaElement | null;
	const submitLabel = () => (screen.getByTestId('submit-button') as HTMLElement).textContent;

	const renderAt = (entry: { pathname: string; state: unknown; key: string }, nav: React.ReactNode) =>
		render(withQuery(
			<MemoryRouter initialEntries={[{ ...entry, search: '', hash: '' }]}>
				{nav}
				<Routes>
					<Route path="/log/write" element={<Writer />} />
				</Routes>
			</MemoryRouter>
		));

	const settle = async () => {
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
	};

	it('수정 중에 새 글로 이동하면 편집 상태가 남지 않는다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		renderAt(
			{ pathname: '/log/write', state: { from: existingLog }, key: 'edit' },
			<NavigateButton to="/log/write" />
		);
		await settle();

		expect(submitLabel()).toBe('Edit');
		expect(textarea()?.value).toBe(EXISTING_CONTENTS);

		await act(async () => { fireEvent.click(screen.getByTestId('go')); });
		await settle();

		expect(submitLabel()).toBe('Post');
		expect(textarea()?.value).toBe('');
	});

	// 반대 방향 — 수정으로 들어가면 계속 수정이어야 한다.
	it('새 글에서 수정으로 이동하면 그 글이 실린다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		renderAt(
			{ pathname: '/log/write', state: null, key: 'new' },
			<NavigateButton to="/log/write" state={{ from: existingLog }} />
		);
		await settle();

		expect(submitLabel()).toBe('Post');

		await act(async () => { fireEvent.click(screen.getByTestId('go')); });
		await settle();

		expect(submitLabel()).toBe('Edit');
		expect(textarea()?.value).toBe(EXISTING_CONTENTS);
	});
});
