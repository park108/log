import { render, screen } from '@testing-library/react';
import ApiCallItem from '../Monitor/ApiCallItem';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

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

it('render api call monitor', async () => {

	const fromTimestamp = 1643375805000; // 2022.01.28

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
            statusCode: 200,
            body: {
                totalCount: 700,
				ProcessingTime: 1000,
                Items: [
                    { timestamp: fromTimestamp, succeed: 50, failed: 50, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24), succeed: 61, failed: 39, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 2, succeed: 71, failed: 29, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 3, succeed: 81, failed: 19, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 4, succeed: 91, failed: 9, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 5, succeed: 96, failed: 4, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 6, succeed: 100, failed: 200, total: 100 },
                ],
            }
		}),
	});

	render(
		<ApiCallItem
			title="log"
			service="log"
			stackPallet={stackPallet.colors}
		/>
	);

	const obj = await screen.findByText("02.01 (Tue)", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render api call monitor when totalCount is undefined', async () => {

	const fromTimestamp = 1643375805000; // 2022.01.28

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
            statusCode: 200,
            body: {
				ProcessingTime: 1000,
                Items: [
                    { timestamp: fromTimestamp, succeed: 50, failed: 50, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24), succeed: 61, failed: 39, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 2, succeed: 71, failed: 29, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 3, succeed: 81, failed: 19, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 4, succeed: 91, failed: 9, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 5, succeed: 96, failed: 4, total: 100 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 6, succeed: 100, failed: 200, total: 100 },
                ],
            }
		}),
	});

	render(
		<ApiCallItem
			title="log"
			service="log"
			stackPallet={stackPallet.colors}
		/>
	);

	global.fetch = unmockedFetch;
});

it('render api call monitor when fetch failed', async () => {
	
	// fetchFirst -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	render(
		<ApiCallItem
			title="log"
			service="log"
			stackPallet={stackPallet.colors}
		/>
	);

	global.fetch = unmockedFetch;
});

it('render visitor monitor when API is down', async () => {
	
	// fetchMore -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	render(
		<ApiCallItem
			title="log"
			service="log"
			stackPallet={stackPallet.colors}
		/>
	);
	global.fetch = unmockedFetch;
});