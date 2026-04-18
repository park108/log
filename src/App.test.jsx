import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import * as common from './common/common';

console.log = vi.fn();
console.error = vi.fn();

it('render when network connection is offline', async () => {
	
	// Mocking network status -> offline
	Object.defineProperty(navigator, 'onLine', { value: false, configurable: true } );

	render(<App />);
	window.dispatchEvent(new Event('online'));
	const offlineText = await screen.findByText("You are offline now.");
	expect(offlineText).toBeInTheDocument();
	
	// Mocking network status -> restore to online
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: false } );
});

it('render title text "park108.net" correctly', async () => {

	render(<App />);
	const title = await screen.findByText("park108.net");
	expect(title).toBeInTheDocument();
});

it('render after resize', () => {

	const spyFunction = vi.fn();
	window.addEventListener('resize', spyFunction);

	const testHeight = 400;
	window.innerHeight = testHeight;
	window.dispatchEvent(new Event('resize'));
	render(<App />);

	expect(spyFunction).toHaveBeenCalled();
	expect(window.innerHeight).toBe(testHeight);
});

it('reload page', () => {

	const spyFunction = vi.fn();
	window.addEventListener('beforeunload', spyFunction);

	window.dispatchEvent(new Event('beforeunload'));
	render(<App />);

	expect(spyFunction).toHaveBeenCalled();
});

it('redirect page', () => {

	render(<App />);
});

describe('render body has no direct side effects', () => {

	it('removes the resize listener on unmount (cleanup pair)', () => {

		const addSpy = vi.spyOn(window, 'addEventListener');
		const removeSpy = vi.spyOn(window, 'removeEventListener');

		const { unmount } = render(<App />);

		const addedResizeHandlers = addSpy.mock.calls
			.filter(([event]) => event === 'resize')
			.map(([, handler]) => handler);

		expect(addedResizeHandlers.length).toBeGreaterThan(0);

		unmount();

		const removedResizeHandlers = removeSpy.mock.calls
			.filter(([event]) => event === 'resize')
			.map(([, handler]) => handler);

		// mount 시 등록된 모든 resize 핸들러가 unmount 에서 정리돼야 한다 (NFR-01).
		addedResizeHandlers.forEach((handler) => {
			expect(removedResizeHandlers).toContain(handler);
		});

		addSpy.mockRestore();
		removeSpy.mockRestore();
	});

	it('does not assign window.onresize in the render body (FR-02)', () => {

		const originalOnResize = window.onresize;
		window.onresize = null;

		render(<App />);

		expect(window.onresize).toBeNull();

		window.onresize = originalOnResize;
	});

	it('calls common.auth once per mount and not on re-render (FR-03, FR-04)', () => {

		const authSpy = vi.spyOn(common, 'auth').mockImplementation(() => {});

		const { rerender } = render(<App />);
		const callsAfterMount = authSpy.mock.calls.length;
		expect(callsAfterMount).toBeGreaterThanOrEqual(1);

		rerender(<App />);

		// re-render 로는 auth 가 추가 호출되지 않는다 (mount effect 1회만).
		expect(authSpy.mock.calls.length).toBe(callsAfterMount);

		authSpy.mockRestore();
	});

	it('keeps common.auth idempotent under StrictMode double mount (FR-05, NFR-02)', () => {

		const authSpy = vi.spyOn(common, 'auth').mockImplementation(() => {});

		render(
			<React.StrictMode>
				<App />
			</React.StrictMode>
		);

		// StrictMode 는 effect 를 두 번 실행할 수 있다. auth 자체는 부수효과가 idempotent 하므로
		// 호출 자체는 허용되되 최소 1회 이상 호출돼야 한다.
		expect(authSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

		authSpy.mockRestore();
	});
});

describe('click login button', () => {

	it("test logout", async () => {
	
		vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
		vi.spyOn(common, "isAdmin").mockResolvedValueOnce(true);

		render(<App />);

		const logoutButton = await screen.findByTestId("login-button");
		expect(logoutButton).toBeInTheDocument();
		expect(logoutButton.getAttribute("class")).toBe("span span--login-text");

		fireEvent.click(logoutButton);
	});

	it("test login", async () => {

		vi.spyOn(common, "isLoggedIn").mockResolvedValueOnce(false);
		vi.spyOn(common, "isAdmin").mockResolvedValueOnce(false);
		
		render(<App />);

		const loginButton = await screen.findByTestId("login-button");
		expect(loginButton).toBeInTheDocument();
		expect(loginButton.getAttribute("class")).toBe("span span--login-text");

		fireEvent.click(loginButton);
	});
});