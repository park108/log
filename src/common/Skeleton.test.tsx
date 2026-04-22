import { render, screen } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
	it('renders the default page variant when no prop is provided', () => {
		render(<Skeleton />);

		const statusNode = screen.getByRole('status');
		expect(statusNode).toBeInTheDocument();
		expect(statusNode).toHaveAttribute('aria-label', '로딩 중');
		expect(screen.getByTestId('skeleton-page')).toBeInTheDocument();
	});

	it('renders the list variant when variant="list"', () => {
		render(<Skeleton variant="list" />);

		expect(screen.getByTestId('skeleton-list')).toBeInTheDocument();
		expect(screen.queryByTestId('skeleton-page')).not.toBeInTheDocument();
	});

	it('renders the detail variant when variant="detail"', () => {
		render(<Skeleton variant="detail" />);

		expect(screen.getByTestId('skeleton-detail')).toBeInTheDocument();
	});

	it('falls back to the page variant for invalid variant values', () => {
		render(<Skeleton variant="bogus" />);

		expect(screen.getByTestId('skeleton-page')).toBeInTheDocument();
	});

	it('renders at least three skeleton blocks as visual placeholders', () => {
		const { container } = render(<Skeleton variant="page" />);

		const blocks = container.querySelectorAll('.skeleton__block');
		expect(blocks.length).toBeGreaterThanOrEqual(3);
	});
});
