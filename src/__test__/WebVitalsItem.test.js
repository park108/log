import { render, screen } from '@testing-library/react';
import WebVitalsItem from '../Monitor/WebVitalsItem';
import { getWebVitals } from '../Monitor/api';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

it('render web vitals monitor', async () => {

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body: {
				Count: 3,
				Items: [
					{
						evaluation: "GOOD",
						id: "v2-1656034616036-7298271418539",
						name: "CLS",
						timestamp: 1656034616036,
						value: 0.009544711182232976
					},
					{
						evaluation: "POOR",
						id: "v2-1656034635378-2481399101706",
						name: "CLS",
						timestamp: 16560346353781,
						value: 0.340741517698529
					},
					{
						evaluation: "NEEDS IMPROVEMENT",
						id: "v2-1656035041776-4470523187290",
						name: "CLS",
						timestamp: 1656035041776,
						value: 0.126102708124442
					},
					{
						evaluation: "BAD DATA",
						id: "v2-1656035041776-4470523187290",
						name: "CLS",
						timestamp: 1656035041776,
						value: 0.126102708124442
					}
				],
				ScannedCount: 12725
			}
		}),
	});

	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

	const obj = await screen.findByText("POOR", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render web vitals monitor when fetch failed', async () => {
	
	// fetchFirst -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

	const obj = await screen.findByText("CLS", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render web vitals if API is down', async () => {

	// fetchFirst -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	render(<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />);

	const obj = await screen.findByText("CLS", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});