import { render, screen } from '@testing-library/react';
import Logs from '../Log/Logs';

it('render logs correctly', () => {

  render(<Logs />);

  const div = screen.getByRole("list");

  expect(div).toBeInTheDocument();
});