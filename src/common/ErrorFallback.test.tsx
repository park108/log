import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import ErrorFallback from './ErrorFallback';

describe('ErrorFallback', () => {
	it('shows the network message when the error has name "NetworkError"', () => {
		const error = new Error('dns failure');
		error.name = 'NetworkError';

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/연결을 확인하고 다시 시도하세요/)).toBeInTheDocument();
		expect(screen.queryByText(/예기치 않은/)).not.toBeInTheDocument();
	});

	it('shows the network message when the error message matches /failed to fetch/i', () => {
		const error = new Error('Failed to fetch data');

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/연결을 확인하고 다시 시도하세요/)).toBeInTheDocument();
	});

	it('shows the generic render-error message for other errors', () => {
		const error = new Error('boom');

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/예기치 않은 오류가 발생했습니다/)).toBeInTheDocument();
		expect(screen.queryByText(/연결을 확인하고/)).not.toBeInTheDocument();
	});

	it('renders a retry button that calls reset() when clicked', () => {
		const reset = vi.fn();

		render(<ErrorFallback error={new Error('boom')} reset={reset} />);

		const button = screen.getByRole('button', { name: '다시 시도' });
		fireEvent.click(button);

		expect(reset).toHaveBeenCalledTimes(1);
	});

	it('does not render the retry button when reset is not provided', () => {
		render(<ErrorFallback error={new Error('boom')} />);

		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
	});

	it('uses role="alert" for assistive tech', () => {
		render(<ErrorFallback error={new Error('boom')} />);

		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('shows the generic message when error is undefined', () => {
		render(<ErrorFallback />);

		expect(screen.getByText(/예기치 않은 오류가 발생했습니다/)).toBeInTheDocument();
	});

	it('treats an error without a message as a generic (non-network) error', () => {
		// isNetworkError 의 `error.message ?? ''` 우측 분기 — 직렬화 복원 등으로
		// message 가 없는 오류 객체도 정규식 검사에서 안전하게 일반 메시지로 귀결한다.
		const error = { name: 'RestoredError' } as Error;

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/예기치 않은 오류가 발생했습니다/)).toBeInTheDocument();
		expect(screen.queryByText(/연결을 확인하고/)).not.toBeInTheDocument();
	});
});
