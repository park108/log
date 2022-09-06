import { render, screen } from '@testing-library/react';
import VisitorMon from '../Monitor/VisitorMon';
import * as common from '../common/common';

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

it('render visitor monitor', async () => {

	const testTime = (new Date()).getTime() - 3600000;
	let prevDay = 144000000;

	// fetchData -> ok
	global.fetch = () => Promise.resolve({

		json: () => Promise.resolve({
			body: {
				periodData: {
					Count: 2,
					Items: [
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime),
							timestamp: testTime,
							url: "http://localhost:3000/",
						},
						{
							browser: "Firefox",
							date: common.getFormattedDate(testTime - prevDay),
							operatingSystem: "Windows",
							originalText: "Test Text",
							renderingEngine: "Gecko",
							time: common.getFormattedTime(testTime - prevDay),
							timestamp: (testTime - prevDay),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 2),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 2),
							timestamp: (testTime - prevDay * 2),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 3),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 3),
							timestamp: (testTime - prevDay * 3),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 4),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 4),
							timestamp: (testTime - prevDay * 4),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 5),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 5),
							timestamp: (testTime - prevDay * 5),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 6),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 6),
							timestamp: (testTime - prevDay * 6),
							url: "http://localhost:3000/",
						}
					]
				},
				totalCount: 2533
			}
		}),
	});

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

it('render visitor monitor for sort order test', async () => {

	const testTime = (new Date()).getTime() - 3600000;
	let prevDay = 144000000;

	// fetchData -> ok
	global.fetch = () => Promise.resolve({

		json: () => Promise.resolve({
			body: {
				periodData: {
					Count: 7,
					Items: [
						{
							browser: "Firefox",
							date: common.getFormattedDate(testTime - prevDay),
							operatingSystem: "Windows",
							originalText: "Test Text",
							renderingEngine: "Gecko",
							time: common.getFormattedTime(testTime - prevDay),
							timestamp: (testTime - prevDay),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime),
							timestamp: testTime,
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 2),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 2),
							timestamp: (testTime - prevDay * 2),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 3),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 3),
							timestamp: (testTime - prevDay * 3),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 4),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 4),
							timestamp: (testTime - prevDay * 4),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 5),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 5),
							timestamp: (testTime - prevDay * 5),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 6),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 6),
							timestamp: (testTime - prevDay * 6),
							url: "http://localhost:3000/",
						}
					]
				},
				totalCount: 2533
			}
		}),
	});

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

it('render visitor monitor for sort order test - 2', async () => {

	const testTime = (new Date()).getTime() - 3600000;
	let prevDay = 144000000;

	// fetchData -> ok
	global.fetch = () => Promise.resolve({

		json: () => Promise.resolve({
			body: {
				periodData: {
					Count: 2,
					Items: [
						{
							browser: "Firefox",
							date: common.getFormattedDate(testTime - prevDay),
							operatingSystem: "Windows",
							originalText: "Test Text",
							renderingEngine: "Gecko",
							time: common.getFormattedTime(testTime - prevDay),
							timestamp: (testTime - prevDay),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime),
							timestamp: testTime,
							url: "http://localhost:3000/",
						}
					]
				},
				totalCount: 2533
			}
		}),
	});

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

	render(
		<VisitorMon 
			stackPallet={stackPallet.colors}
		/>
	);

	const obj = await screen.findByText("Rendering Engine", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render visitor monitor when API is down', async () => {
	
	// fetchMore -> Server error
	global.fetch = () => Promise.reject(errorMessage);

	render(
		<VisitorMon 
			stackPallet={stackPallet.colors}
		/>
	);

	const obj = await screen.findByText("Rendering Engine", {}, { timeout: 0});
	expect(obj).toBeInTheDocument();

	global.fetch = unmockedFetch;
});