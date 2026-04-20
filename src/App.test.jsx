import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from './App';
import * as common from './common/common';
import ErrorBoundary from './common/ErrorBoundary';
import ErrorFallback from './common/ErrorFallback';
import { reportError } from './common/errorReporter';

console.log = vi.fn();
console.error = vi.fn();

// REQ-20260421-003 / TSK-20260421-44 — getUrl() 렌더 경로 (App.jsx:77) stubMode 가드.
// getUrl() 런타임이 isDev()/isProd() (= `import.meta.env.DEV/PROD`) 경유로 전환돼
// vitest 기본 MODE='test' 에서도 `<a href={common.getUrl()}>park108.net</a>` 의
// 기대 동작이 안정적으로 유지되도록 MODE/DEV/PROD 를 명시 stub 한다.
// 이디엄 정본: src/common/Navigation.test.jsx:13-26 승계.
const stubMode = (mode) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

beforeEach(() => stubMode('test'));
afterEach(() => vi.unstubAllEnvs());

// REQ-20260420-018 FR-02: 테스트 간 navigator.onLine 오염을 차단하기 위해
// 파일 최상위 afterAll 에서 descriptor 를 configurable: true 로 복원해 둔다.
// 기존 describe 내부의 afterAll (L314) 은 console/stderr 복원 전용이므로
// scope 혼용을 피해 별도 최상위 훅에 박제한다.
afterAll(() => {
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

it('render when network connection is offline', async () => {
	
	// Mocking network status -> offline
	Object.defineProperty(navigator, 'onLine', { value: false, configurable: true } );

	render(<App />);
	window.dispatchEvent(new Event('online'));
	const offlineText = await screen.findByText("You are offline now.");
	expect(offlineText).toBeInTheDocument();
	
	// Mocking network status -> restore to online
	// REQ-20260420-018 FR-01: descriptor 를 configurable: true 로 완화해
	// 후속 케이스가 navigator.onLine 을 재정의할 수 있도록 lock 을 해제한다.
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true } );
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

	it('updates isOnline state on online/offline event (REQ-20260419-039 FR-03)', async () => {
		// REQ-20260420-018 FR-03: 첫 케이스 L23 descriptor 가 configurable: true 로 완화됨에 따라
		// 본 케이스는 navigator.onLine 을 직접 토글해 dispatchEvent 경유 렌더 토글까지 E2E 로 관측한다.
		// 기존 wiring 계약 (listener 쌍 바인딩 + handleStatusChange 동일 reference + throw-free 디스패치)
		// 도 병행 유지한다.
		const addSpy = vi.spyOn(window, 'addEventListener');
		const baselineCalls = addSpy.mock.calls.length;

		// navigator.onLine 은 이전 케이스 복원으로 true 상태로 들어온다고 가정.
		Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

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

		// FR-03 E2E: navigator.onLine 을 false 로 뒤바꾼 뒤 offline 이벤트를 디스패치하면
		// App 이 isOnline=false 분기로 다시 렌더돼 .div--offline-contents 가 노출돼야 한다.
		Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
		act(() => { window.dispatchEvent(new Event('offline')); });
		await waitFor(() => {
			expect(document.querySelector('.div--offline-contents')).toBeInTheDocument();
		});

		// online 복귀 시 offline 분기가 해제되는지도 확인 (symmetric toggle).
		Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
		act(() => { window.dispatchEvent(new Event('online')); });
		await waitFor(() => {
			expect(document.querySelector('.div--offline-contents')).not.toBeInTheDocument();
		});

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

describe('App mounts cleanly with corrupted access_token (REQ-20260418-032 FR-05)', () => {
	// parseJwt 입력 가드 + isAdmin fail-safe 가 App 마운트 경로에서 throw 전파를 막는지 회귀 방어.
	// 손상된 쿠키 상태에서 <App /> 이 화이트 스크린 없이 렌더돼야 한다.

	afterEach(() => {
		common.deleteCookie('access_token');
		common.deleteCookie('id_token');
	});

	it('renders without throwing when access_token cookie is a single-part garbage string', async () => {
		common.setCookie('access_token', 'ZZZ', { site: 'localhost:3000' });

		expect(() => render(<App />)).not.toThrow();

		// 화이트 스크린이 아니라 Navigation 영역의 타이틀이 렌더되는지 확인 (비-admin 모드).
		const title = await screen.findByText('park108.net');
		expect(title).toBeInTheDocument();
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