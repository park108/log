import { render, screen } from '@testing-library/react';
import VisitorMon from '../Monitor/VisitorMon';
import { getVisitors } from '../Monitor/api';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

it('render visitor monitor', async () => {

	// fetchData -> ok
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body: {
				periodData: {
					Count: 2,
					Items: [
						{
							browser: "Chrome",
							date: "2022-06-18",
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: "18:03:03",
							timestamp: 1655542983477,
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: "2022-06-18",
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: "18:03:03",
							timestamp: 1655542983481,
							url: "http://localhost:3000/",
						}
					]
				},
				totalCount: 2533
			}
		}),
	});

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

	process.env.NODE_ENV = 'production';

	render(
		<VisitorMon 
			stackPallet={stackPallet.colors}
		/>
	);

	const obj = await screen.findByText("Rendering Engine", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render visitor monitor when fetch failed', async () => {
	
	// fetchFirst -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

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

	render(
		<VisitorMon 
			stackPallet={stackPallet.colors}
		/>
	);

	const obj = await screen.findByText("Rendering Engine", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});