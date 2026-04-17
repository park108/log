import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import ContentItem from '../Monitor/ContentItem';

console.log = vi.fn();
console.error = vi.fn();

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

	vi.useFakeTimers('modern')
		.setSystemTime(new Date(1643375805000));

	process.env.NODE_ENV = 'development';

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const text = await screen.findByText("'22.01");
	expect(text).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

it('render log with no data on dev server', async () => {

	mock.devServerHasNoCount.listen();

	vi.useFakeTimers('modern')
		.setSystemTime(new Date(1643375805000));

	process.env.NODE_ENV = 'development';

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const text = await screen.findAllByText("0");
	expect(text[0]).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerHasNoCount.resetHandlers();
	mock.devServerHasNoCount.close();
});

it('render log failed on dev server', async () => {

	mock.devServerFailed.listen();

	vi.useFakeTimers('modern')
		.setSystemTime(new Date(1643375805000));

	process.env.NODE_ENV = 'development';

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

	vi.useFakeTimers('modern')
		.setSystemTime(new Date(1643375805000));

	process.env.NODE_ENV = 'development';

	render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

// TODO: Cannot render component.
it('render file on dev server', async () => {

	mock.devServerOk.listen();

	vi.useFakeTimers('modern')
		.setSystemTime(new Date(1643375805000));

	process.env.NODE_ENV = 'development';

	render( <ContentItem title="Files" path="content/file" unit="capacity" stackPallet={ stackPallet.colors } /> );

	const text = await screen.findByText("Loading...");
	expect(text).toBeInTheDocument();

	vi.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});