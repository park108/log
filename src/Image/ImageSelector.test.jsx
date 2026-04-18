import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as mock from './api.mock'
import ImageSelector from '../Image/ImageSelector';

console.error = vi.fn();
console.log = vi.fn();

// clipboard-spec §3.2.1 — ImageSelector 호출자는 `navigator.clipboard.writeText` 를 통해 헬퍼가 Promise<boolean>
// 으로 정규화한 결과를 await 분기한다. Async Clipboard API 기반 stub 만 사용.
beforeEach(() => {
	Object.assign(navigator, {
		clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
	});
});

it('render image selector loading images > loading more images > and fail when load more images', async () => {

	mock.prodServerOk.listen();

	process.env.NODE_ENV = 'production';

	render(<ImageSelector show={true} />);

	// Get 4 images
	const imageItems = await screen.findAllByRole("listitem");
	expect(imageItems.length).toBe(4);

	// After click see more button, added 2 more images
	const seeMoreButton = await screen.findByRole("button");
	expect(seeMoreButton).toBeDefined();

	fireEvent.click(seeMoreButton);
	const imageItems2 = await screen.findAllByRole("listitem");
	expect(imageItems2.length).toBe(6);

	// Click first image — copyMarkdownString is now async, so await writeText resolution
	// before proceeding to avoid leaking unhandled promise state into the next assertions.
	fireEvent.click(imageItems2[0]); // enlarge
	fireEvent.click(imageItems2[0]); // shrink and copy markdown string

	await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());

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
	const seeMoreButton = await screen.findByRole("button");
	expect(seeMoreButton).toBeDefined();

	fireEvent.click(seeMoreButton);
	await waitFor(() => expect(screen.getAllByRole("listitem").length).toBe(6));

	// Switch mock server: close OK, start network error before clicking again
	mock.devServerOk.close();
	mock.devServerNetworkError.listen();

	const seeMoreButton3 = await screen.findByRole("button");
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

it('shows error Toaster when clipboard write rejects (REQ-20260418-025 FR-04, US-03)', async () => {

	mock.prodServerOk.listen();
	process.env.NODE_ENV = 'production';

	// Per-case override: clipboard.writeText rejects to simulate permission denied / unavailable.
	Object.assign(navigator, {
		clipboard: { writeText: vi.fn().mockRejectedValue(new Error('permission denied')) },
	});

	render(<ImageSelector show={true} />);

	const imageItems = await screen.findAllByRole("listitem");
	expect(imageItems.length).toBe(4);

	// Enlarge → shrink + copy flow; the shrink click triggers copyMarkdownString.
	fireEvent.click(imageItems[0]);
	fireEvent.click(imageItems[0]);

	// Failure message surfaced to the user instead of the success string.
	const errorText = await screen.findByText('Copy failed (permission denied or unavailable).');
	expect(errorText).toBeInTheDocument();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});
