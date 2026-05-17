import { render, screen, fireEvent } from '@testing-library/react';
import UserLogin, { getLoginUrl, getLogoutUrl } from './UserLogin';
import * as common from './common';

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

    vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
    vi.spyOn(common, "isAdmin").mockResolvedValue(true);

    render(<UserLogin />);
    const menu = screen.getByText("👨‍💻 Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render prod stage logout menu correctly", () => {
    setEnv(false, true);

    vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
    vi.spyOn(common, "isAdmin").mockResolvedValue(true);

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
