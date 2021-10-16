import { render, screen } from '@testing-library/react';
import {createMemoryHistory} from 'history'
import { Router } from 'react-router-dom';
import Monitor from '../Monitor/Monitor';
import * as common from '../common';

it('render monitor if it logged in', () => {
  
  const history = createMemoryHistory();

  common.isLoggedIn = jest.fn().mockResolvedValue(true);
  common.isAdmin = jest.fn().mockResolvedValue(true);

  jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useLocation: () => ({
      pathname: "/monitor"
    })
  }));

  render(<Router history={history}>
    <Monitor />
  </Router>);

  const title = screen.getByText("Visitors");

  expect(title).toBeInTheDocument();
});