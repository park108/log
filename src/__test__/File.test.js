import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import File from '../File/File';
import * as common from '../common';

it('render file if it logged in', () => {
  
  const history = createMemoryHistory({ initialEntries: ["/file"]});

  common.isLoggedIn = jest.fn().mockResolvedValue(true);
  common.isAdmin = jest.fn().mockResolvedValue(true);

  const result = render(
    <Router location={history.location} navigator={history}>
      <File />
    </Router>
  );

  const dropZone = screen.getByText("Drop files here!");

  expect(dropZone).toBeInTheDocument();
});