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

// it('render web vitals monitor for GOOD', async () => {

// 	global.fetch = () => Promise.resolve({
// 		json: () => Promise.resolve({
// 			body: {
// 				Count: 1,
// 				Items: [
// 					{
// 						evaluation: "GOOD",
// 						id: "v2-1656034616036-7298271418539",
// 						name: "CLS",
// 						timestamp: 1656034616036,
// 						value: 0.009544711182232976
// 					}
// 				],
// 				ScannedCount: 12725
// 			}
// 		}),
// 	});

// 	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

// 	const obj = await screen.findByText("GOOD");
// 	expect(obj).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render web vitals monitor for POOR', async () => {

// 	global.fetch = () => Promise.resolve({
// 		json: () => Promise.resolve({
// 			body: {
// 				Count: 1,
// 				Items: [
// 					{
// 						evaluation: "POOR",
// 						id: "v2-1656034635378-2481399101706",
// 						name: "CLS",
// 						timestamp: 16560346353781,
// 						value: 0.340741517698529
// 					}
// 				],
// 				ScannedCount: 12725
// 			}
// 		}),
// 	});

// 	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

// 	const obj = await screen.findByText("POOR");
// 	expect(obj).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render web vitals monitor for NEEDS IMPROVEMENT', async () => {

// 	global.fetch = () => Promise.resolve({
// 		json: () => Promise.resolve({
// 			body: {
// 				Count: 1,
// 				Items: [
// 					{
// 						evaluation: "NEEDS IMPROVEMENT",
// 						id: "v2-1656035041776-4470523187290",
// 						name: "CLS",
// 						timestamp: 1656035041776,
// 						value: 0.126102708124442
// 					}
// 				],
// 				ScannedCount: 12725
// 			}
// 		}),
// 	});

// 	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

// 	const obj = await screen.findByText("NEEDS IMPROVEMENT");
// 	expect(obj).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render web vitals monitor with no data', async () => {

// 	global.fetch = () => Promise.resolve({
// 		json: () => Promise.resolve({
// 			body: {
// 				Count: 0,
// 				Items: [],
// 				ScannedCount: 12725
// 			}
// 		}),
// 	});

// 	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

// 	const obj = await screen.findByText("None");
// 	expect(obj).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render web vitals monitor when fetch failed', async () => {
	
// 	// fetchFirst -> return error
// 	global.fetch = () => Promise.resolve({
// 		json: () => Promise.resolve({
// 			errorType: "404"
// 		}),
// 	});

// 	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

// 	const obj = await screen.findByText("CLS");
// 	expect(obj).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render web vitals if API is down', async () => {

// 	// fetchFirst -> Server error
// 	global.fetch = () => Promise.reject(errorMessage);

// 	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

// 	const obj = await screen.findByText("CLS");
// 	expect(obj).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });