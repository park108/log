import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import WebVitalsItem from '../Monitor/WebVitalsItem';

console.log = jest.fn();
console.error = jest.fn();

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