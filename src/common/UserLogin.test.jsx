import { render, screen } from '@testing-library/react';

const setEnv = (dev, prod) => {
  vi.stubEnv('DEV', dev);
  vi.stubEnv('PROD', prod);
};

// env.js caches `import.meta.env.DEV` / `import.meta.env.PROD` at module load
// time (ESM binding). `vi.stubEnv` alone cannot retroactively change the
// already-evaluated module, so we reset the module graph and re-import
// `UserLogin` after each stub. Following env-spec.md §5.2 (testing guide)
// and §9 risk mitigation (alternative 1: resetModules + dynamic import).
const importUserLogin = async () => {
  vi.resetModules();
  const mod = await import('./UserLogin');
  const common = await import('./common');
  return { ...mod, common };
};

describe('reder UserLogin by stage', () => {

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("render test stage login menu correctly", async () => {
    setEnv(true, false);

    const { default: UserLogin } = await importUserLogin();
    render(<UserLogin />);
    const menu = screen.getByText("Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render prod stage login menu correctly", async () => {
    setEnv(false, true);

    const { default: UserLogin } = await importUserLogin();
    render(<UserLogin />);
    const menu = screen.getByText("Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render test stage logout menu correctly", async () => {
    setEnv(true, false);

    const { default: UserLogin, common } = await importUserLogin();
    vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
    vi.spyOn(common, "isAdmin").mockResolvedValue(true);

    render(<UserLogin />);
    const menu = screen.getByText("👨‍💻 Jongkil Park");

    expect(menu).toBeInTheDocument();
  });

  it("render prod stage logout menu correctly", async () => {
    setEnv(false, true);

    const { default: UserLogin, common } = await importUserLogin();
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

  it('test stage login url', async () => {
    setEnv(true, false);
    const { getLoginUrl } = await importUserLogin();
    const url = getLoginUrl();
    expect(url).toContain("localhost:3000");
  });

  it('prod stage login url', async () => {
    setEnv(false, true);
    const { getLoginUrl } = await importUserLogin();
    const url = getLoginUrl();
    expect(url).toContain("park108.net");
  });

  it('test stage logout url', async () => {
    setEnv(true, false);
    const { getLogoutUrl } = await importUserLogin();
    const url = getLogoutUrl();
    expect(url).toContain("localhost:3000");
  });

  it('prod stage logout url', async () => {
    setEnv(false, true);
    const { getLogoutUrl } = await importUserLogin();
    const url = getLogoutUrl();
    expect(url).toContain("park108.net");
  });
});
