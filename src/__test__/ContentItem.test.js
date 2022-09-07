import { render, screen } from '@testing-library/react';
import ContentItem from '../Monitor/ContentItem';

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

afterAll(() => {
	global.fetch = unmockedFetch;
	jest.useRealTimers();
});

it('render content item monitor', async () => {

	jest
		.useFakeTimers()
		.setSystemTime(new Date('2022-01-28'));

	const testTime = 1643375805000; // 2022.01.28
	const day = 144000000;
	const month = day * 30;

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			Count: 6,
			body: {
				Items: [
					{timestamp: testTime, size: 3, sortKey: testTime},
					{timestamp: testTime - month * 1, size: 5, sortKey: -testTime},
					{timestamp: testTime - month * 2},
					{timestamp: testTime - month * 3},
					{timestamp: testTime - month * 4},
					{timestamp: testTime - month * 5},
				]
			}
		}),
	});

	process.env.NODE_ENV = 'production';

	render(
		<ContentItem 
			title="Logs"
			path="content/log"
			unit="count"
			stackPallet={stackPallet.colors}
		/>
	);
	
	const text = await screen.findAllByText("1");
	expect(text[0]).toBeInTheDocument();
});

it('render file content item monitor', async () => {

	jest
		.useFakeTimers()
		.setSystemTime(new Date('2022-01-28'));

	const testTime = 1643375805000; // 2022.01.28
	const day = 144000000;
	const month = day * 30;

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			Count: 6,
			body: {
				Items: [
					{timestamp: testTime, size: 1000, sortKey: testTime},
					{timestamp: testTime - month * 1, size: 100000, sortKey: -testTime},
					{timestamp: testTime, size: 2222, sortkKey: testTime},
					{timestamp: testTime - month * 4},
					{timestamp: testTime - month * 5},
				]
			}
		}),
	});

	process.env.NODE_ENV = 'production';

	render(
		<ContentItem 
			title="Files"
			path="content/file"
			unit="capacity"
			stackPallet={stackPallet.colors}
		/>
	);
	
	const text = await screen.findAllByText("3.22 KB (2 files)");
	expect(text[0]).toBeInTheDocument();
});

it('render content item monitor if it fetch error', async () => {

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	process.env.NODE_ENV = 'development';

	render(
		<ContentItem 
			title="Logs"
			path="content/log"
			unit="count"
			stackPallet={stackPallet.colors}
		/>
	);
	
	const text = await screen.findByText("Logs", {}, { timeout: 0 });
	expect(text).toBeInTheDocument();
});

it('render visitor monitor when API is down', async () => {
	
	// fetchMore -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	render(
		<ContentItem 
			title="Logs"
			path="content/log"
			unit="count"
			stackPallet={stackPallet.colors}
		/>
	);
	
	const text = await screen.findByText("Logs", {}, { timeout: 0 });
	expect(text).toBeInTheDocument();
});