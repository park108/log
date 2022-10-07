import { render, screen } from '@testing-library/react';
import UserLogin from './UserLogin'
import { getLoginUrl, getLogoutUrl } from './UserLogin'
import * as common from './common';

describe('reder UserLogin by stage', () => {
  
  it("render test stage login menu correctly", () => {
    process.env.NODE_ENV = "development";

    render(<UserLogin />);
    const menu = screen.getByText("Jongkil Park");

    expect(menu).toBeInTheDocument();
  });
  
  it("render prod stage login menu correctly", () => {
    process.env.NODE_ENV = "production";

    render(<UserLogin />);
    const menu = screen.getByText("Jongkil Park");

    expect(menu).toBeInTheDocument();
  });
  
  it("render test stage logout menu correctly", () => {
    process.env.NODE_ENV = "development";

    common.isLoggedIn = jest.fn().mockResolvedValue(true);
    common.isAdmin = jest.fn().mockResolvedValue(true);

    render(<UserLogin />);
    const menu = screen.getByText("👨‍💻 Jongkil Park");

    expect(menu).toBeInTheDocument();
  });
  
  it("render prod stage logout menu correctly", () => {
    process.env.NODE_ENV = "production";

    common.isLoggedIn = jest.fn().mockResolvedValue(true);
    common.isAdmin = jest.fn().mockResolvedValue(true);

    render(<UserLogin />);
    const menu = screen.getByText("👨‍💻 Jongkil Park");

    expect(menu).toBeInTheDocument();
  });
});
  
describe("get login/logout url correctly", () => {

  it('test stage login url', () => {
    process.env.NODE_ENV = "development";
    const url = getLoginUrl();
    expect(url).toContain("localhost:3000");
  });

  it('prod stage login url', () => {
    process.env.NODE_ENV = "production";
    const url = getLoginUrl();
    expect(url).toContain("park108.net");
  });

  it('test stage logout url', () => {
    process.env.NODE_ENV = "development";
    const url = getLogoutUrl();
    expect(url).toContain("localhost:3000");
  });

  it('prod stage logout url', () => {
    process.env.NODE_ENV = "production";
    const url = getLogoutUrl();
    expect(url).toContain("park108.net");
  });
});