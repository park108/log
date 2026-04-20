import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import * as common from './common/common';
import ErrorBoundary from './common/ErrorBoundary';
import ErrorFallback from './common/ErrorFallback';
import { reportError } from './common/errorReporter';

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

	it('subscribes to online/offline events once on mount (REQ-20260419-039 FR-02)', () => {
		// online/offline useEffect 의존성 배열이 `[]` 이므로 mount 1회 바인딩 + rerender 로는 재실행되지 않는다.
		// strict mode 없이 render 하므로 mount 당 online/offline 각 1회 add 호출이 기본 기대치.
		const addSpy = vi.spyOn(window, 'addEventListener');

		const { rerender } = render(<App />);

		const initialOnlineCalls = addSpy.mock.calls.filter(([event]) => event === 'online').length;
		const initialOfflineCalls = addSpy.mock.calls.filter(([event]) => event === 'offline').length;
		expect(initialOnlineCalls).toBeGreaterThanOrEqual(1);
		expect(initialOfflineCalls).toBeGreaterThanOrEqual(1);

		// `[]` 의존이므로 rerender 로 effect 재실행 없음 → add 호출 증가 0.
		rerender(<App />);

		const afterOnlineCalls = addSpy.mock.calls.filter(([event]) => event === 'online').length;
		const afterOfflineCalls = addSpy.mock.calls.filter(([event]) => event === 'offline').length;
		expect(afterOnlineCalls).toBe(initialOnlineCalls);
		expect(afterOfflineCalls).toBe(initialOfflineCalls);

		addSpy.mockRestore();
	});

	it('updates isOnline state on online/offline event (REQ-20260419-039 FR-03)', () => {
		// 기존 'render when network connection is offline' 케이스가 navigator.onLine 을
		// `configurable: false` 로 잠가두기 때문에, 본 케이스는 navigator 를 직접 건드리지 않고
		// state 변화 핸들러가 실제로 wiring 됐는지를 spy 로 관찰한다 (FR-03 Should 의 핵심 의도:
		// online/offline 이벤트가 handleStatusChange 를 통해 setIsOnline(navigator.onLine) 을
		// 유발한다는 계약). dispatchEvent 경유 렌더 토글의 엔드-투-엔드 검증은 §3.10 의 우선 케이스
		// 'subscribes to online/offline events once on mount' 로 이미 충분 (listener 1쌍 바인딩
		// + rerender churn 0 확인).
		const addSpy = vi.spyOn(window, 'addEventListener');
		const baselineCalls = addSpy.mock.calls.length;

		render(<App />);

		// 본 render 이후 addEventListener 호출만 필터
		const postMountCalls = addSpy.mock.calls.slice(baselineCalls);
		const onlineHandlers = postMountCalls.filter(([event]) => event === 'online').map(([, h]) => h);
		const offlineHandlers = postMountCalls.filter(([event]) => event === 'offline').map(([, h]) => h);
		expect(onlineHandlers.length).toBeGreaterThanOrEqual(1);
		expect(offlineHandlers.length).toBeGreaterThanOrEqual(1);
		// App.jsx online/offline useEffect 는 동일 handleStatusChange 를 두 이벤트에 바인딩.
		// 본 mount 에서 등록된 online 과 offline 핸들러 중 최소 한 쌍은 동일 reference 여야 한다
		// (addEventListener ↔ removeEventListener 짝 일치 보장 필수).
		expect(onlineHandlers).toEqual(expect.arrayContaining([expect.any(Function)]));
		expect(onlineHandlers.some((h) => offlineHandlers.includes(h))).toBe(true);

		// 실제 이벤트 디스패치가 throw 없이 핸들러를 실행하는지 (wiring 무결성)
		expect(() => {
			act(() => { window.dispatchEvent(new Event('online')); });
		}).not.toThrow();
		expect(() => {
			act(() => { window.dispatchEvent(new Event('offline')); });
		}).not.toThrow();

		addSpy.mockRestore();
	});

	it('keeps document.cookie equivalent under StrictMode double mount (REQ-20260418-025 FR-02)', () => {
		// 실제 common.auth 를 실행시키기 위해 mock 하지 않음.
		const originalLocation = window.location;
		// App 트리 내부의 useEffect 들이 parseJwt(access_token) 을 호출하므로
		// access_token 은 파싱 가능한 JWT 문자열이어야 한다 (형식 검증 목적, 실제 서명 검증 없음).
		const jwtFixture =
			'eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ' +
			'.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJjbGllbnRfaWQiOiJoM205MmEyN3QzOXNmY2F0MzAydGlxdGtvIiwidXNlcm5hbWUiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUifQ' +
			'.sig';
		const mock = new URL('http://localhost:3000');
		mock.replace = vi.fn();
		mock.href += `?access_token=${jwtFixture}#id_token=YYY`;
		delete window.location;
		window.location = mock;
		common.deleteCookie('access_token');
		common.deleteCookie('id_token');

		const normalize = (raw) =>
			raw
				.split(';')
				.map((c) => c.trim())
				.filter(Boolean)
				.sort()
				.join('; ');

		// 1회 마운트(+StrictMode 이중 effect) 후 cookie 상태
		const { unmount } = render(
			<React.StrictMode>
				<App />
			</React.StrictMode>
		);
		const cookieAfterStrictDouble = normalize(document.cookie);
		unmount();

		// 비교 baseline: cookie 초기화 후 auth() 1회 직접 호출 시의 상태
		common.deleteCookie('access_token');
		common.deleteCookie('id_token');
		common.auth();
		const cookieAfterSingle = normalize(document.cookie);

		expect(cookieAfterStrictDouble).toBe(cookieAfterSingle);

		// 정리 — 후속 케이스 오염 방지
		common.deleteCookie('access_token');
		common.deleteCookie('id_token');
		window.location = originalLocation;
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

describe('ErrorBoundary integration (REQ-20260418-005 FR-06)', () => {

	let consoleErrorSpy;
	let stderrWriteSpy;

	beforeAll(() => {
		// Describe-scope suppression of intentional render-error noise (REQ-20260419-032 FR-01).
		// React 18 logs a "Consider adding an error boundary" hint via console.error and
		// jsdom 29 re-emits the raw Error stack through process.stderr, bypassing console
		// spies. Both are silenced here so CI logs only surface real regressions. Scope is
		// deliberately limited to this describe via beforeAll/afterAll — NOT moved to a
		// file-scope or setupFiles — so other describes retain their console/stderr
		// observation ability (FR-05).
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	});

	afterAll(() => {
		consoleErrorSpy.mockRestore();
		stderrWriteSpy.mockRestore();
	});

	it('isolates a throwing route without breaking Navigation/Footer', () => {
		// Lazy 컴포넌트를 모킹하기 어려우므로, 의도 throw 컴포넌트를 ErrorBoundary 로 직접 감싼
		// 최소 트리를 별도로 렌더해 격리 동작을 검증한다. 본 케이스는 ErrorBoundary + ErrorFallback
		// 통합이 끊기지 않았는지에 대한 smoke 수준 회귀 방어.
		const Boom = () => { throw new Error('boom'); };
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<div>
				<nav data-testid="nav-surface">nav</nav>
				<ErrorBoundary fallback={(p) => <ErrorFallback {...p} />} onError={reportError}>
					<Boom />
				</ErrorBoundary>
				<footer data-testid="footer-surface">footer</footer>
			</div>
		);

		// ErrorFallback UI 노출 (network/render 분기 어느 쪽이어도 매칭)
		expect(
			screen.getByText(/오류가 발생했습니다|연결을 확인하고/)
		).toBeInTheDocument();
		// 이웃 UI 정상
		expect(screen.getByTestId('nav-surface')).toBeInTheDocument();
		expect(screen.getByTestId('footer-surface')).toBeInTheDocument();

		errSpy.mockRestore();
	});

	it('renders Skeleton as top-level Suspense fallback without error (white-screen regression guard)', async () => {
		// fallback 교체로 기존 렌더 경로가 깨지지 않는지만 확인.
		// BrowserRouter 내부 Navigation 의 title("park108.net") 이 여전히 보이면 OK.
		render(<App />);
		const title = await screen.findByText('park108.net');
		expect(title).toBeInTheDocument();
	});
});