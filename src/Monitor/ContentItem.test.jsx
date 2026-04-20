import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import ContentItem from '../Monitor/ContentItem';
import * as errorReporter from '../common/errorReporter';

console.log = vi.fn();
console.error = vi.fn();
vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

const stackPallet = {
	pallet: "Red to Green",
	colors: [
		{color: "black", backgroundColor: "rgb(243, 129, 129)"},
		{color: "black", backgroundColor: "rgb(248, 178, 134)"},
		{color: "black", backgroundColor: "rgb(252, 227, 138)"},
		{color: "black", backgroundColor: "rgb(243, 241, 173)"},
		{color: "black", backgroundColor: "rgb(234, 255, 208)"},
		{color: "black", backgroundColor: "rgb(190, 240, 210)"},
		{color: "black", backgroundColor: "rgb(149, 225, 211)"},
	]
};

it('render log on dev server', async () => {

	mock.devServerOk.listen();

	vi.useFakeTimers({ shouldAdvanceTime: true })
		.setSystemTime(new Date(1643375805000));

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const text = await screen.findByText("'22.01");
	expect(text).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

it('render log with no data on dev server', async () => {

	mock.devServerHasNoCount.listen();

	vi.useFakeTimers({ shouldAdvanceTime: true })
		.setSystemTime(new Date(1643375805000));

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const text = await screen.findAllByText("0");
	expect(text[0]).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerHasNoCount.resetHandlers();
	mock.devServerHasNoCount.close();
});

it('render log failed on dev server', async () => {

	mock.devServerFailed.listen();

	vi.useFakeTimers({ shouldAdvanceTime: true })
		.setSystemTime(new Date(1643375805000));

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	fireEvent.click(retryButton);

	vi.useRealTimers();

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

it('render log network error on dev server', async () => {

	mock.devServerNetworkError.listen();

	vi.useFakeTimers({ shouldAdvanceTime: true })
		.setSystemTime(new Date(1643375805000));

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

describe('ContentItem Retry keyboard activation (a11y pattern B)', () => {

	it('retry span is keyboard focusable with role=button', async () => {

		mock.devServerFailed.listen();

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButton).toHaveAttribute('tabindex', '0');
		expect(retryButton).toHaveAttribute('role', 'button');

		vi.useRealTimers();

		mock.devServerFailed.resetHandlers();
		mock.devServerFailed.close();
	});

	it('retry span activates on Enter key', async () => {

		mock.devServerFailed.listen();

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and fires a new fetch.
		// Re-query confirms the error UI re-renders (mock still fails → Retry reappears).
		fireEvent.keyDown(retryButton, { key: 'Enter' });

		const retryAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryAfter).toBeInTheDocument();

		vi.useRealTimers();

		mock.devServerFailed.resetHandlers();
		mock.devServerFailed.close();
	});

	it('retry span activates on Space key and prevents default scroll', async () => {

		mock.devServerFailed.listen();

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		const spaceEvent = fireEvent.keyDown(retryButton, { key: ' ' });
		expect(spaceEvent).toBe(false);

		const retryAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryAfter).toBeInTheDocument();

		vi.useRealTimers();

		mock.devServerFailed.resetHandlers();
		mock.devServerFailed.close();
	});

	it('retry span ignores non-activation keys (negative case)', async () => {

		mock.devServerFailed.listen();

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButton, { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryAfter).toBeInTheDocument();

		vi.useRealTimers();

		mock.devServerFailed.resetHandlers();
		mock.devServerFailed.close();
	});
});

// TODO: Cannot render component.
it('render file on dev server', async () => {

	mock.devServerOk.listen();

	vi.useFakeTimers({ shouldAdvanceTime: true })
		.setSystemTime(new Date(1643375805000));

	vi.stubEnv('DEV', true);
	vi.stubEnv('PROD', false);

	render( <ContentItem title="Files" path="content/file" unit="capacity" stackPallet={ stackPallet.colors } /> );

	const text = await screen.findByText("Loading...");
	expect(text).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});