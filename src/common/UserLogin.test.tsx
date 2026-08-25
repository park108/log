import { render, screen, fireEvent } from '@testing-library/react';
import UserLogin, { getLoginUrl, getLogoutUrl } from './UserLogin';
import * as common from './common';
import * as errorReporter from './errorReporter';

// REQ-20260420-010: functional env getter (`isDev()` / `isProd()` in `env.js`)
// reads `import.meta.env.DEV` / `.PROD` lazily on each call, so `vi.stubEnv`
// is reflected without a module-graph reset + dynamic re-import. Static ESM
// imports are sufficient — see env-spec.md §5.2 / §9.
const setEnv = (dev: boolean, prod: boolean): void => {
  vi.stubEnv('DEV', dev);
  vi.stubEnv('PROD', prod);
};

describe('reder UserLogin by stage', () => {

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("render test stage login menu correctly", () => {
    setEnv(true, false);

    render(<UserLogin />);
    const menu = screen.getByText("Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render prod stage login menu correctly", () => {
    setEnv(false, true);

    render(<UserLogin />);
    const menu = screen.getByText("Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render test stage logout menu correctly", () => {
    setEnv(true, false);

    vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
    vi.spyOn(common, "isAdmin").mockReturnValue(true);

    render(<UserLogin />);
    const menu = screen.getByText("👨‍💻 Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render prod stage logout menu correctly", () => {
    setEnv(false, true);

    vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
    vi.spyOn(common, "isAdmin").mockReturnValue(true);

    render(<UserLogin />);
    const menu = screen.getByText("👨‍💻 Jongkil Park");

    expect(menu).toBeInTheDocument();
  });
});

describe("get login/logout url correctly", () => {

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('test stage login url', () => {
    setEnv(true, false);
    const url = getLoginUrl();
    expect(url).toContain("localhost:3000");
  });

  it('prod stage login url', () => {
    setEnv(false, true);
    const url = getLoginUrl();
    expect(url).toContain("park108.net");
  });

  it('test stage logout url', () => {
    setEnv(true, false);
    const url = getLogoutUrl();
    expect(url).toContain("localhost:3000");
  });

  it('prod stage logout url', () => {
    setEnv(false, true);
    const url = getLogoutUrl();
    expect(url).toContain("park108.net");
  });
});

describe('UserLogin a11y 패턴 B (REQ-20260421-033 FR-03)', () => {

  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    // jsdom 의 `window.location` 은 read-only setter — 테스트 한정 cast 로 흡수.
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location =
      { ...originalLocation, href: '' } as unknown as Location;
  });

  afterEach(() => {
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location = originalLocation;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('login span 에 tabIndex=0 과 role="button" 이 부여된다', () => {
    setEnv(true, false);

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');

    expect(el).toHaveAttribute('role', 'button');
    expect(el).toHaveAttribute('tabIndex', '0');
  });

  it('Enter 키로 login 이 활성된다 (click 과 동일 핸들러)', () => {
    setEnv(true, false);
    vi.spyOn(common, 'isLoggedIn').mockReturnValue(false);

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');

    fireEvent.keyDown(el, { key: 'Enter' });

    expect(window.location.href).toContain('localhost:3000');
  });

  it('Space 키로 login 이 활성된다 (click 과 동일 핸들러 + preventDefault)', () => {
    setEnv(true, false);
    vi.spyOn(common, 'isLoggedIn').mockReturnValue(false);

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');

    const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });

    // activateOnKey 가 preventDefault 호출 → fireEvent 의 반환값이 false (cancelled)
    expect(spaceEvent).toBe(false);
    expect(window.location.href).toContain('localhost:3000');
  });
});

describe('리디렉트 URL 공란 조건 (REQ-20260825-022 §동작 (U-0)(U-3))', () => {

  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    // jsdom 의 `window.location` 은 read-only setter — 테스트 한정 cast 로 흡수.
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location =
      { ...originalLocation, href: '' } as unknown as Location;
  });

  afterEach(() => {
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: Location }).location = originalLocation;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('로그인 URL 이 공란이면 리디렉트 없이 reportError 로 발화한다', () => {
    setEnv(true, false);
    vi.stubEnv('VITE_COGNITO_LOGIN_URL_DEV', '');
    vi.spyOn(common, 'isLoggedIn').mockReturnValue(false);
    const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');
    fireEvent.click(el);

    // href 불변 + 보고 1회 — "아무 일도 일어나지 않음"(무발화) 과 구별된다.
    expect(window.location.href).toBe('');
    expect(reportErrorSpy).toHaveBeenCalledTimes(1);
    // 사용자 관측 표면 — 콘솔이 아니라 접근성 트리에 도달한다 (양성 단언).
    expect(el).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('로그아웃 URL 이 공란이면 리디렉트 없이 reportError 로 발화한다', () => {
    setEnv(true, false);
    vi.stubEnv('VITE_COGNITO_LOGOUT_URL_DEV', '');
    vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
    vi.spyOn(common, 'deleteCookie').mockImplementation(() => {});
    const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');
    fireEvent.click(el);

    expect(window.location.href).toBe('');
    expect(reportErrorSpy).toHaveBeenCalledTimes(1);
    expect(el).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('키보드 활성(Enter) 경로도 공란이면 동일하게 발화한다', () => {
    setEnv(true, false);
    vi.stubEnv('VITE_COGNITO_LOGIN_URL_DEV', '');
    vi.spyOn(common, 'isLoggedIn').mockReturnValue(false);
    const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');
    fireEvent.keyDown(el, { key: 'Enter' });

    expect(window.location.href).toBe('');
    expect(reportErrorSpy).toHaveBeenCalledTimes(1);
    expect(el).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // 성공 갈래 대조 — 실패 표면이 "항상 떠 있는 배너" 가 아님을 요구한다.
  // 이 케이스가 없으면 상시 렌더 구현이 위 3 케이스를 전부 통과한다.
  // reportErrorSpy 를 세우지 않는다 — (S-2) 판정식의 실패 케이스 모집단에 들어가면
  // 부재 단언만으로 unobserved=0 이 되는 사각이 열린다.
  it('URL 이 도출되는 성공 갈래에서는 실패 표면이 렌더되지 않는다', () => {
    setEnv(true, false);
    vi.spyOn(common, 'isLoggedIn').mockReturnValue(false);

    render(<UserLogin />);
    const el = screen.getByTestId('login-button');
    fireEvent.click(el);

    expect(window.location.href).toContain('localhost:3000');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(el).not.toHaveAttribute('aria-disabled');
  });

  it('prod 도 dev 도 아니면 두 URL 도출이 undefined 다', () => {
    setEnv(false, false);

    expect(getLoginUrl()).toBeUndefined();
    expect(getLogoutUrl()).toBeUndefined();
  });
});
