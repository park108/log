import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Bomb({ shouldThrow }) {
	if (shouldThrow) {
		throw new Error('boom');
	}
	return <div>child ok</div>;
}

describe('ErrorBoundary', () => {

	let consoleErrorSpy;

	beforeEach(() => {
		// Suppress React's internal error logs emitted from ErrorBoundary catches.
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('renders children when no error is thrown', () => {
		render(
			<ErrorBoundary fallback={<div>fallback ui</div>}>
				<Bomb shouldThrow={false} />
			</ErrorBoundary>
		);

		expect(screen.getByText('child ok')).toBeInTheDocument();
		expect(screen.queryByText('fallback ui')).not.toBeInTheDocument();
	});

	it('invokes function fallback with { error, reset } when child throws', () => {
		const fallback = vi.fn(({ error, reset }) => (
			<div>
				<span>caught: {error.message}</span>
				<button type="button" onClick={reset}>retry</button>
			</div>
		));

		render(
			<ErrorBoundary fallback={fallback}>
				<Bomb shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(fallback).toHaveBeenCalled();
		const args = fallback.mock.calls[0][0];
		expect(args.error).toBeInstanceOf(Error);
		expect(args.error.message).toBe('boom');
		expect(typeof args.reset).toBe('function');
		expect(screen.getByText('caught: boom')).toBeInTheDocument();
	});

	it('calls onError exactly once when child throws', () => {
		const onError = vi.fn();

		render(
			<ErrorBoundary fallback={<div>fallback ui</div>} onError={onError}>
				<Bomb shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(onError).toHaveBeenCalledTimes(1);
		const [errorArg, infoArg] = onError.mock.calls[0];
		expect(errorArg).toBeInstanceOf(Error);
		expect(errorArg.message).toBe('boom');
		expect(infoArg).toBeDefined();
	});

	it('restores children after reset() is invoked', () => {
		let capturedReset;
		const fallback = ({ reset }) => {
			capturedReset = reset;
			return <div>fallback ui</div>;
		};

		const { rerender } = render(
			<ErrorBoundary fallback={fallback}>
				<Bomb shouldThrow={true} />
			</ErrorBoundary>
		);

		expect(screen.getByText('fallback ui')).toBeInTheDocument();

		capturedReset();

		rerender(
			<ErrorBoundary fallback={fallback}>
				<Bomb shouldThrow={false} />
			</ErrorBoundary>
		);

		expect(screen.getByText('child ok')).toBeInTheDocument();
		expect(screen.queryByText('fallback ui')).not.toBeInTheDocument();
	});
});
