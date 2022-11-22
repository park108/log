import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import ApiCallItem from './ApiCallItem';

console.log = jest.fn();
console.error = jest.fn();

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

it('render api call monitor on prod server', async () => {

	mock.prodServerOk.listen();

	process.env.NODE_ENV = 'production';

	render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

	const obj = await screen.findByText("02.01 (Tue)");
	expect(obj).toBeInTheDocument();

	// Test mouse over, move and out events
	const firstPillar = await screen.findByTestId("api-call-item-log-0");
	expect(firstPillar).toBeInTheDocument();

	fireEvent.mouseOver(firstPillar);
	fireEvent.mouseOver(firstPillar); // Already class changed
	fireEvent.mouseMove(firstPillar);
	fireEvent.mouseOut(firstPillar);
	fireEvent.mouseOut(firstPillar); // Already class changed

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

it('render api call monitor has zero total count on prod server', async () => {

	mock.prodServerHasNoCount.listen();

	process.env.NODE_ENV = 'production';

	render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

	const obj = await screen.findByText("02.01 (Tue)");
	expect(obj).toBeInTheDocument();

	mock.prodServerHasNoCount.resetHandlers();
	mock.prodServerHasNoCount.close();
});

it('render api call monitor but has no total count on prod server', async () => {

	mock.prodServerHasNoTotalCount.listen();

	process.env.NODE_ENV = 'production';

	render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	fireEvent.click(retryButton);

	mock.prodServerHasNoTotalCount.resetHandlers();
	mock.prodServerHasNoTotalCount.close();
});

it('render api call monitor failed on prod server', async () => {

	mock.prodServerFailed.listen();

	process.env.NODE_ENV = 'production';

	render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render api call monitor network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';

	render( <ApiCallItem title="log" service="log" stackPallet={stackPallet.colors} /> );

	const retryButton = await screen.findByText("Retry");
	expect(retryButton).toBeInTheDocument();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});