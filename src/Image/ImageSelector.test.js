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
