import { render, screen, fireEvent } from '@testing-library/react';
import * as mock from './api.mock'
import ImageSelector from '../Image/ImageSelector';

console.error = jest.fn();
console.log = jest.fn();

it('render image selector loading images > loading more images > and fail when load more images', async () => {

	mock.prodServerOk.listen();

	process.env.NODE_ENV = 'production';

	render(<ImageSelector show={true} />);

	// Get 4 images
	const imageItems = await screen.findAllByRole("listitem");
	expect(imageItems.length).toBe(4);
	
	// After click see more button, added 2 more images
	const seeMoreButton = screen.getByRole("button");
	expect(seeMoreButton).toBeDefined();

	fireEvent.click(seeMoreButton);
	const imageItems2 = await screen.findAllByRole("listitem");
	expect(imageItems2.length).toBe(6);

	// Click first image
	jest.useFakeTimers(); // Set timer to test toaster message changing

	document.execCommand = jest.fn();
	fireEvent.click(imageItems2[0]); // enlarge
	fireEvent.click(imageItems2[0]); // shrink and copy url

	jest.runAllTimers();
	jest.useRealTimers();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();

	// When server return failed, display fail message after click see more button
	mock.prodServerFailed.listen();
	
	const seeMoreButton2 = screen.getByRole("button");
	expect(seeMoreButton2).toBeDefined();

	fireEvent.click(seeMoreButton2);
	const failMessage = await screen.findByText("Failed getting images");
	expect(failMessage).toBeDefined();

	// Retry after fetch error
	const retryButton = await screen.findByText("Retry");
	fireEvent.click(retryButton);

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

it('render image selector loading images > loading more images > and network error when load more images', async () => {

	mock.devServerOk.listen();

	process.env.NODE_ENV = 'development';

	render(<ImageSelector show={true} />);

	// Get 4 images
	const imageItems = await screen.findAllByRole("listitem");
	expect(imageItems.length).toBe(4);
	
	// After click see more button, added 2 more images
	const seeMoreButton = screen.getByRole("button");
	expect(seeMoreButton).toBeDefined();

	fireEvent.click(seeMoreButton);
	const imageItems2 = await screen.findAllByRole("listitem");
	expect(imageItems2.length).toBe(6);

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();

	// When server network error, display fail message after click see more button
	mock.devServerNetworkError.listen();
	
	const seeMoreButton3 = screen.getByRole("button");
	expect(seeMoreButton3).toBeDefined();

	fireEvent.click(seeMoreButton3);
	const failMessage2 = await screen.findByText("Failed getting images");
	expect(failMessage2).toBeDefined();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

it('render image selector failed fetching images', async () => {

	mock.devServerFailed.listen();

	process.env.NODE_ENV = 'development';

	render(<ImageSelector show={true} />);

	const failMessage = await screen.findByText("Failed getting images");
	expect(failMessage).toBeDefined();

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

it('render image selector when network error', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';

	render(<ImageSelector show={true} />);

	const failMessage = await screen.findByText("Failed getting images");
	expect(failMessage).toBeDefined();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});






// it('render image selector if fetched no result', async () => {

// 	process.env.NODE_ENV = 'development';

// 	render(<ImageSelector show={"SHOW"} />);
// 	const list = await screen.findByRole("list");
// 	expect(list).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render image selector loading images and fetchMore result is null', async () => {

// 	// fetchFirst -> ok
// 	// global.fetch = () =>
// 	// 	Promise.resolve({
// 	// 	json: () => Promise.resolve({
// 	// 		body:{
// 	// 			Items:[
// 	// 				{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
// 	// 				,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
// 	// 				,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
// 	// 				,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
// 	// 				,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
// 	// 				,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
// 	// 			],
// 	// 			"Count":6,
// 	// 			"ScannedCount":10,
// 	// 			"LastEvaluatedKey":{"key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","bucket":"park108-image-dev","timestamp":1639269525326}
// 	// 		}
// 	// 	}),
// 	// });

// 	// getImages();

// 	process.env.NODE_ENV = 'development';

// 	render(<ImageSelector show={"SHOW"} />);
// 	expect(await screen.findByRole("alert")).toBeInTheDocument();
	
// 	// fetchMore -> return null
// 	// global.fetch = () => Promise.resolve({
// 	// 	json: () => Promise.resolve({
// 	// 		body:{
// 	// 			"Count":0,
// 	// 			"ScannedCount":0,
// 	// 		}
// 	// 	}),
// 	// });

// 	const seeMoreButton = screen.getByRole("button");
// 	expect(seeMoreButton).toBeDefined();

// 	fireEvent.click(seeMoreButton);

// 	global.fetch = unmockedFetch;
// });
