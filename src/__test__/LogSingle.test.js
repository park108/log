import { render, screen, act } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom';
import LogSingle from '../Log/LogSingle';

it('render LogSingle', async () => {
  
  const history = createMemoryHistory();

  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({
      timestamp: '1643425268253',
    }),
  }));

  render(
    <Router history={history}>
      <LogSingle />
    </Router>
  );

  expect(await screen.findByText("Loading a log...", {}, { timeout: 0 })).toBeInTheDocument();
});