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
                totalCount: 165,
                Items: [
                    { timestamp: fromTimestamp, count: 10 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24), count: 20 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 2, count: 25 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 3, count: 40 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 4, count: 45 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 5, count: 20 },
                    { timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 6, count: 5 },
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