import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import VisitorMon from '../Monitor/VisitorMon';

// const unmockedFetch = global.fetch;
// console.log = jest.fn();
// console.error = jest.fn();
// const errorMessage = "API is down";

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

it('render visitor monitor on prod server', async () => {

	mock.prodServerOk.listen();

	jest.useFakeTimers('modern')
		.setSystemTime(new Date(1643673600000));

	process.env.NODE_ENV = 'production';

	render(<VisitorMon stackPallet={stackPallet.colors}/>);

	const obj = await screen.findByText("Rendering Engine");
	expect(obj).toBeInTheDocument();

	// Test mouse over, move and out events
	const statusBar = await screen.findByTestId("visitor-env-Browser-1");
	expect(statusBar).toBeInTheDocument();

	fireEvent.mouseOver(statusBar);
	fireEvent.mouseOver(statusBar); // Already class changed
	fireEvent.mouseMove(statusBar);
	fireEvent.mouseOut(statusBar);
	fireEvent.mouseOut(statusBar); // Already class changed

	jest.useRealTimers();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

it('render visitor monitor failed on prod server', async () => {

	mock.prodServerFailed.listen();

	process.env.NODE_ENV = 'production';

	render(<VisitorMon stackPallet={stackPallet.colors}/>);

	const retryButtons = await screen.findAllByText("Retry");
	expect(retryButtons[0]).toBeInTheDocument();

	fireEvent.click(retryButtons[0]);

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render visitor monitor network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';

	render(<VisitorMon stackPallet={stackPallet.colors}/>);

	const retryButtons = await screen.findAllByText("Retry");
	expect(retryButtons[0]).toBeInTheDocument();

	fireEvent.click(retryButtons[1]);

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});