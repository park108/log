import { render, screen } from '@testing-library/react';
import UserLogin, { getLoginUrl, getLogoutUrl } from './UserLogin';
import * as common from './common';

// REQ-20260420-010: functional env getter (`isDev()` / `isProd()` in `env.js`)
// reads `import.meta.env.DEV` / `.PROD` lazily on each call, so `vi.stubEnv`
// is reflected without a module-graph reset + dynamic re-import. Static ESM
// imports are sufficient — see env-spec.md §5.2 / §9.
const setEnv = (dev, prod) => {
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
