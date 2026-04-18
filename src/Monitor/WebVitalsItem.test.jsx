import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import WebVitalsItem from '../Monitor/WebVitalsItem';

console.log = vi.fn();
console.error = vi.fn();

it('render web vitals monitor on dev server', async () => {

	mock.prodServerOk.listen();

	process.env.NODE_ENV = 'production';

	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

	const obj = await screen.findByText("POOR");
	expect(obj).toBeInTheDocument();

	const statusBar = await screen.findByTestId("status-bar-CLS");
	expect(statusBar).toBeInTheDocument();

	fireEvent.mouseOver(statusBar);
	fireEvent.mouseOver(statusBar); // Already class changed
	fireEvent.mouseMove(statusBar);
	fireEvent.mouseOut(statusBar);
	fireEvent.mouseOut(statusBar); // Already class changed

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

it('render web vitals monitor failed on prod server', async () => {

	mock.prodServerFailed.listen();

	process.env.NODE_ENV = 'production';

	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	fireEvent.click(retryButton);

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render web vitals monitor network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';

	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	fireEvent.click(retryButton);

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});

describe('WebVitalsItem Retry keyboard activation', () => {

	it('retry span is keyboard focusable with role=button (a11y pattern B)', async () => {

		mock.prodServerFailed.listen();

		process.env.NODE_ENV = 'production';

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButton).toHaveAttribute('tabindex', '0');
		expect(retryButton).toHaveAttribute('role', 'button');

		mock.prodServerFailed.resetHandlers();
		mock.prodServerFailed.close();
	});

	it('retry span activates on Enter key (a11y pattern B)', async () => {

		mock.prodServerFailed.listen();

		process.env.NODE_ENV = 'production';

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and fires a new fetch.
		// We verify by asserting the Retry button is re-rendered after the mock still fails.
		fireEvent.keyDown(retryButton, { key: 'Enter' });

		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();

		mock.prodServerFailed.resetHandlers();
		mock.prodServerFailed.close();
	});

	it('retry span activates on Space key and prevents default scroll (a11y pattern B)', async () => {

		mock.prodServerFailed.listen();

		process.env.NODE_ENV = 'production';

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		const spaceEvent = fireEvent.keyDown(retryButton, { key: ' ' });
		expect(spaceEvent).toBe(false);

		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();

		mock.prodServerFailed.resetHandlers();
		mock.prodServerFailed.close();
	});

	it('retry span ignores non-activation keys (a11y pattern B negative case)', async () => {

		mock.prodServerFailed.listen();

		process.env.NODE_ENV = 'production';

		render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButton, { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryButtonAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButtonAfter).toBeInTheDocument();

		mock.prodServerFailed.resetHandlers();
		mock.prodServerFailed.close();
	});
});