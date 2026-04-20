import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as mock from './api.mock'
import ImageSelector from '../Image/ImageSelector';
import { useMockServer } from '../test-utils/msw';

console.error = vi.fn();
console.log = vi.fn();

// clipboard-spec §3.2.1 — ImageSelector 호출자는 `navigator.clipboard.writeText` 를 통해 헬퍼가 Promise<boolean>
// 으로 정규화한 결과를 await 분기한다. Async Clipboard API 기반 stub 만 사용.
beforeEach(() => {
	Object.assign(navigator, {
		clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
	});
});

describe('ImageSelector loading > loading more > and fail on prod server', () => {
	// Start with prodServerOk; swap handlers mid-test via `server.use(...)` to simulate
	// the "failed after load more" scenario — avoids body-level `.listen()/.close()`.
	const server = useMockServer(() => mock.prodServerOk);

	it('render image selector loading images > loading more images > and fail when load more images', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

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

		// Swap handler to failure response (mirrors prodServerFailed).
		server.use(mock.prodFailedHandler);

		const seeMoreButton2 = screen.getByRole("button");
		expect(seeMoreButton2).toBeDefined();

		fireEvent.click(seeMoreButton2);
		const failMessage = await screen.findByText("Failed getting images");
		expect(failMessage).toBeDefined();

		// Retry after fetch error
		const retryButton = await screen.findByText("Retry");
		fireEvent.click(retryButton);
	});
});

describe('ImageSelector loading > loading more > and network error on dev server', () => {
	const server = useMockServer(() => mock.devServerOk);

	it('render image selector loading images > loading more images > and network error when load more images', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<ImageSelector show={true} />);

		// Get 4 images
		const imageItems = await screen.findAllByRole("listitem");
		expect(imageItems.length).toBe(4);

		// After click see more button, added 2 more images
		const seeMoreButton = await screen.findByRole("button");
		expect(seeMoreButton).toBeDefined();

		fireEvent.click(seeMoreButton);
		await waitFor(() => expect(screen.getAllByRole("listitem").length).toBe(6));

		// Swap handler to network error (mirrors devServerNetworkError).
		server.use(mock.devNetworkErrorHandler);

		const seeMoreButton3 = await screen.findByRole("button");
		expect(seeMoreButton3).toBeDefined();

		fireEvent.click(seeMoreButton3);
		const failMessage2 = await screen.findByText("Failed getting images");
		expect(failMessage2).toBeDefined();
	});
});

describe('ImageSelector failed fetching images on dev server', () => {
	useMockServer(() => mock.devServerFailed);

	it('render image selector failed fetching images', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<ImageSelector show={true} />);

		const failMessage = await screen.findByText("Failed getting images");
		expect(failMessage).toBeDefined();
	});
});

describe('ImageSelector network error on prod server', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render image selector when network error', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<ImageSelector show={true} />);

		const failMessage = await screen.findByText("Failed getting images");
		expect(failMessage).toBeDefined();
	});
});

describe('keyboard a11y (REQ-20260418-017 FR-07, REQ-20260418-029, accessibility-spec §2.1 #8)', () => {
	useMockServer(() => mock.devServerFailed);

	it('Retry 요소에 tabIndex=0 과 role="button" 이 부여된다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<ImageSelector show={true} />);

		const retrySpan = await screen.findByText('Retry');
		expect(retrySpan.getAttribute('tabindex')).toBe('0');
		expect(retrySpan.getAttribute('role')).toBe('button');
	});

	it('Enter 키로 Retry 가 활성화되어 "Failed getting images" 가 사라진다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<ImageSelector show={true} />);

		const failMessage = await screen.findByText('Failed getting images');
		expect(failMessage).toBeDefined();

		const retrySpan = await screen.findByText('Retry');
		fireEvent.keyDown(retrySpan, { key: 'Enter' });

		await waitFor(() => {
			expect(screen.queryByText('Failed getting images')).toBeNull();
		});
	});

	it('Space 키로 Retry 가 활성화되어 "Failed getting images" 가 사라진다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<ImageSelector show={true} />);

		const failMessage = await screen.findByText('Failed getting images');
		expect(failMessage).toBeDefined();

		const retrySpan = await screen.findByText('Retry');
		fireEvent.keyDown(retrySpan, { key: ' ' });

		await waitFor(() => {
			expect(screen.queryByText('Failed getting images')).toBeNull();
		});
	});
});

describe('ImageSelector clipboard rejection error Toaster', () => {
	useMockServer(() => mock.prodServerOk);

	it('shows error Toaster when clipboard write rejects (REQ-20260418-025 FR-04, US-03)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

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
	});
});
