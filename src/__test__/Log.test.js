import { render, screen } from '@testing-library/react';
import {createMemoryHistory} from 'history'
import { Router } from 'react-router-dom';
import Log from '../Log/Log';
import * as common from '../common/common';

it('render log if it logged in', () => {
  
  const history = createMemoryHistory();

  common.isLoggedIn = jest.fn().mockResolvedValue(true);
  common.isAdmin = jest.fn().mockResolvedValue(true);

  jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useLocation: () => ({
      pathname: "/log"
    })
  }));

  render(
    <Router location={history.location} navigator={history}>
      <Log />
    </Router>
  );

  const div = screen.getByRole("application");

  expect(div).toBeInTheDocument();
});