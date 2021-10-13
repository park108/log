import { render, screen } from '@testing-library/react';
import {createMemoryHistory} from 'history'
import { Router } from 'react-router-dom';
import File from '../File/File';
import * as common from '../common';

it('render file if it logged in', () => {
  
  const history = createMemoryHistory();

  common.isLoggedIn = jest.fn().mockResolvedValue(true);
  common.isAdmin = jest.fn().mockResolvedValue(true);

  jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useLocation: () => ({
      pathname: "/file"
    })
  }));

  render(<Router history={history}>
    <File />
  </Router>);

  const dropZone = screen.getByText("Drop files here!");

  expect(dropZone).toBeInTheDocument();
});