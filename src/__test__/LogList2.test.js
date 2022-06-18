import { render, screen } from '@testing-library/react';
import LogList from '../Log/LogList2';

it('render logs correctly', () => {

  render(<LogList />);

  const div = screen.getByRole("list");

  expect(div).toBeInTheDocument();
});