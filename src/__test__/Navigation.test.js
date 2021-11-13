import { render, screen } from '@testing-library/react';
import {createMemoryHistory} from 'history'
import { Router } from 'react-router-dom';
import Navigation from '../Navigation';
import * as common from '../common';

describe('render navigation menu correctly', () => {
  
  const history = createMemoryHistory();

  it('render title menu correctly', () => {

    jest.mock("react-router-dom", () => ({
      ...jest.requireActual("react-router-dom"),
      useLocation: () => ({
        pathname: "/log"
      })
    }));

    render(<Router history={history}>
      <Navigation />
    </Router>);

    const html = screen.getByText("park108.net").closest('a');

    const expected = document.createElement("a");
    expected.innerHTML = "park108.net";

    expect(expected).toStrictEqual(html);
  });

  it('render file menu correctly', () => {

    // Mocking login and admin check
    common.isLoggedIn = jest.fn().mockResolvedValue(true);
    common.isAdmin = jest.fn().mockResolvedValue(true);

    jest.mock("react-router-dom", () => ({
      ...jest.requireActual("react-router-dom"),
      useLocation: () => ({
        pathname: "/file"
      })
    }));

    render(<Router history={history}>
      <Navigation />
    </Router>);

    const html = screen.getByText("file").closest('a');

    const expected = document.createElement("a");
    expected.setAttribute("href", "/file");
    expected.innerHTML = "file";

    expect(expected).toStrictEqual(html);
  });
});