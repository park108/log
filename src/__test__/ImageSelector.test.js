import { render, screen, waitFor } from '@testing-library/react';
import ImageSelector from '../Image/ImageSelector';

it('renders image selector loading text correctly', async () => {
  render(<ImageSelector show={"SHOW"} />);
  await waitFor(() => screen.findByText('Loading...'));
});