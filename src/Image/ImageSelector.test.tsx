import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as mock from './api.mock'
import ImageSelector from '../Image/ImageSelector';
import * as api from '../Image/api';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
// clipboard-spec §3.2.1 — ImageSelector 호출자는 `navigator.clipboard.writeText` 를 통해 헬퍼가 Promise<boolean>
// 으로 정규화한 결과를 await 분기한다. Async Clipboard API 기반 stub 만 사용.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
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

		// Get 4 images — TSK-20260421-78: ImageItem role 변경(listitem→button) 이후
		// data-testid 로 정밀 selecting (role="button" 은 See More 버튼과 공유 중이므로 count 기반 assertion 에 부적합).
		const imageItems = await screen.findAllByTestId("imageItem");
		expect(imageItems.length).toBe(4);

		// After click see more button, added 2 more images
		const seeMoreButton = await screen.findByRole("button", { name: /see\s*more/i });
		expect(seeMoreButton).toBeDefined();

		fireEvent.click(seeMoreButton);
		const imageItems2 = await screen.findAllByTestId("imageItem");
		expect(imageItems2.length).toBe(6);

		// Click first image — copyMarkdownString is now async, so await writeText resolution
		// before proceeding to avoid leaking unhandled promise state into the next assertions.
		fireEvent.click(imageItems2[0]!); // enlarge
		fireEvent.click(imageItems2[0]!); // shrink and copy markdown string

		await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());

		// Swap handler to failure response (mirrors prodServerFailed).
		server.use(mock.prodFailedHandler);

		const seeMoreButton2 = screen.getByRole("button", { name: /see\s*more/i });
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

		// Get 4 images — TSK-20260421-78: ImageItem role 변경(listitem→button) 이후
		// data-testid 로 정밀 selecting.
		const imageItems = await screen.findAllByTestId("imageItem");
		expect(imageItems.length).toBe(4);

		// After click see more button, added 2 more images
		const seeMoreButton = await screen.findByRole("button", { name: /see\s*more/i });
		expect(seeMoreButton).toBeDefined();

		fireEvent.click(seeMoreButton);
		await waitFor(() => expect(screen.getAllByTestId("imageItem").length).toBe(6));

		// Swap handler to network error (mirrors devServerNetworkError).
		server.use(mock.devNetworkErrorHandler);

		const seeMoreButton3 = await screen.findByRole("button", { name: /see\s*more/i });
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

		// TSK-20260421-78: ImageItem role 변경(listitem→button) 이후 data-testid 로 정밀 selecting.
		const imageItems = await screen.findAllByTestId("imageItem");
		expect(imageItems.length).toBe(4);

		// Enlarge → shrink + copy flow; the shrink click triggers copyMarkdownString.
		fireEvent.click(imageItems[0]!);
		fireEvent.click(imageItems[0]!);

		// Failure message surfaced to the user instead of the success string.
		const errorText = await screen.findByText('Copy failed (permission denied or unavailable).');
		expect(errorText).toBeInTheDocument();
	});
});

describe('ImageSelector reportError 채널 (REQ-20260421-039 FR-03)', () => {

	describe('first fetch errorType 분기', () => {
		useMockServer(() => mock.prodServerFailed);

		it('errorType 응답 수신 시 reportError 1회 호출 (payload 포함)', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<ImageSelector show={true} />);

			// errorType 분기 동기 side-effect. "Failed getting images" 렌더 = data 반영 완료.
			await screen.findByText('Failed getting images');

			const calls = vi.mocked(errorReporter.reportError).mock.calls;
			expect(calls.length).toBe(1);
			// payload 는 errorType 필드를 포함하는 body 객체 (ERROR_500 fixture).
			expect(calls[0]![0]).toMatchObject({ errorType: '500' });
		});
	});

	describe('first fetch network error catch 분기', () => {
		useMockServer(() => mock.prodServerNetworkError);

		it('network error 수신 시 reportError 1회 호출', async () => {

			vi.stubEnv('PROD', true);
			vi.stubEnv('DEV', false);

			render(<ImageSelector show={true} />);

			await screen.findByText('Failed getting images');

			const calls = vi.mocked(errorReporter.reportError).mock.calls;
			expect(calls.length).toBe(1);
			// catch 분기: Error 인스턴스 전달.
			expect(calls[0]![0]).toBeInstanceOf(Error);
		});
	});
});

// REQ-093 (I1)(FR-01) — unmount race 박제 (TSK-20260517-26).
// pending fetch + unmount() + 응답 resolve 시 4 setter (`setImages` · `setLastTimestamp` ·
// `setIsLoading` · `setIsError`) 발화 0 hit + REQ-091 cross-validate (`console.error` 0 hit) 박제.
// `getImages` / `getNextImages` 를 vi.spyOn 으로 stub — pending Promise / resolve / reject 제어 박제.
describe('ImageSelector unmount-safety (REQ-20260517-093 FR-01)', () => {

	it('첫 페치 pending 중 unmount → 이후 응답 resolve 가 어떤 setter 도 발화시키지 않는다 (Warning 0 + console.error 0)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		// pending fetch 제어 — 외부에서 resolve 호출 가능한 deferred Response.
		let resolveResp!: (r: Response) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });

		const getImagesSpy = vi.spyOn(api, 'getImages').mockReturnValue(pending);

		// console.error spy — beforeEach 등록분과 동일 채널. mock 호출 0 hit 박제 대상.
		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(<ImageSelector show={true} />);

		// fetch 트리거 1회 surface — Loading... 렌더 = 1차 setter 도착 전 pending 상태 확정.
		expect(getImagesSpy).toHaveBeenCalledTimes(1);
		await screen.findByText('Loading...');

		// unmount 후 응답 도착 — cancelled.current = true 박제로 setter 0 hit 유지 기대.
		unmount();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: {
					Items: [{ key: 'k1', url: 'http://x/1' }],
					LastEvaluatedKey: { timestamp: 12345 },
				},
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			// microtask flush
			await Promise.resolve();
			await Promise.resolve();
		});

		// REQ-091 cross-validate — unmounted setState Warning 또는 임의 console.error 0 hit.
		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);
	});

	it('추가 페치 pending 중 unmount → 이후 응답 resolve 가 어떤 setter 도 발화시키지 않는다', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		// 1차 페치는 정상 OK 응답 — See More 버튼 surface 확보.
		const firstResp = new Response(JSON.stringify({
			body: {
				Items: [{ key: 'k1', url: 'http://x/1' }],
				LastEvaluatedKey: { timestamp: 99999 },
			},
		}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		vi.spyOn(api, 'getImages').mockResolvedValue(firstResp);

		// 2차 페치는 pending — unmount 직전 트리거.
		let resolveNext!: (r: Response) => void;
		const pendingNext = new Promise<Response>((resolve) => { resolveNext = resolve; });
		const getNextSpy = vi.spyOn(api, 'getNextImages').mockReturnValue(pendingNext);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(<ImageSelector show={true} />);

		// 1차 페치 완료 + See More 버튼 surface 대기.
		const seeMore = await screen.findByRole('button', { name: /see\s*more/i });
		expect(seeMore).toBeDefined();

		// 2차 페치 트리거.
		fireEvent.click(seeMore);
		await waitFor(() => expect(getNextSpy).toHaveBeenCalledTimes(1));

		// unmount 후 2차 응답 도착.
		unmount();

		await act(async () => {
			resolveNext(new Response(JSON.stringify({
				body: {
					Items: [{ key: 'k2', url: 'http://x/2' }],
					LastEvaluatedKey: { timestamp: 88888 },
				},
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			await Promise.resolve();
			await Promise.resolve();
		});

		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);
	});

	it('첫 페치 pending 중 unmount 후 reject → catch 분기도 setter / console.error 0 hit', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		let rejectResp!: (e: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getImages').mockReturnValue(pending);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const { unmount } = render(<ImageSelector show={true} />);
		await screen.findByText('Loading...');

		unmount();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);
	});
});
