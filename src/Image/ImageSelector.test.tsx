import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as mock from './api.mock'
import ImageSelector from '../Image/ImageSelector';
import * as api from '../Image/api';
import * as common from '../common/common';
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

		// 증가분의 **도착을 먼저 관측**한다. findAllByTestId 는 1개 이상만 있으면
		// 즉시 반환하므로, 이것 없이 곧장 개수를 단언하면 아직 4개인 상태로
		// 통과할 수 있고 toBe(6) 이 경합에 따라 깨진다. 게다가 깨져도 원인이
		// "6개가 아니다" 로만 보여 도착 미대기임이 드러나지 않는다.
		// (File.test / Log.test 가 쓰는 것과 같은 이디엄이다.)
		const added = await screen.findByTitle(
			"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg"
		);
		expect(added).toBeInTheDocument();

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

		// 이 단언은 "다음 페이지가 실패하면 전면 오류 화면" 을 못 박고 있었다.
		// 그 동작은 보고 있던 썸네일을 통째로 지운다 (실측: 6 → 0). 글을 쓰며
		// 고르는 화면이라 보던 자리를 잃는 것이 그대로 손해다. 전면 오류는
		// 보여줄 것이 없을 때만 내고, 여기서는 그 자리에서 다시 시도한다.
		const retryButton = await screen.findByTestId("imageSeeMoreRetryButton");
		expect(screen.queryByText("Failed getting images")).toBeNull();
		expect((await screen.findAllByTestId("imageItem")).length).toBe(6);

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

		// 위와 같은 이유로 계약을 고쳐 적는다 — 보고 있던 썸네일은 남고, 실패는
		// 그 자리에서 알린다.
		expect(await screen.findByTestId("imageSeeMoreRetryButton")).toBeInTheDocument();
		expect(screen.queryByText("Failed getting images")).toBeNull();
		expect(screen.getAllByTestId("imageItem").length).toBe(6);
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

		// span[role=button] + activateOnKey 손조립을 네이티브 button 으로 바꿨다.
		// 손조립은 키 핸들러를 빠뜨리면 조용히 키보드 접근을 잃지만, 네이티브
		// button 은 Enter·Space 활성이 브라우저 보장이다.
		const retryButton = await screen.findByRole('button', { name: 'Retry' });
		expect(retryButton.tagName).toBe('BUTTON');

		// 손조립 잔재가 남으면 안 된다 — onKeyDown 까지 남으면 Enter 에서
		// 핸들러와 네이티브 click 이 이중 발화한다.
		expect(retryButton).not.toHaveAttribute('role');
		expect(retryButton).not.toHaveAttribute('tabindex');
		expect(retryButton).toHaveAttribute('type', 'button');

		// tabindex 없이 초점을 받는다 — 깨지면 키보드 사용자가 도달하지 못한다.
		retryButton.focus();
		expect(document.activeElement).toBe(retryButton);
	});

	it('Retry 클릭이 오류 표면을 걷어낸다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render(<ImageSelector show={true} />);

		const failMessage = await screen.findByText('Failed getting images');
		expect(failMessage).toBeDefined();

		fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

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
		// 관측 창을 unmount 이후로 한정한다 — 마운트 중 발화까지 세면
		// 단정이 성립하지 않는다 (현재 마운트 중 발화는 0 이지만 창을 명시한다).
		consoleErrorSpy.mockClear();
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

		// REQ-091 cross-validate — **무필터** console.error 0 hit.
		// 문구 필터는 두지 않는다: React 18.2 는 unmount 된 fiber 의 setState 에
		// 경고를 내지 않으므로(dispatchSetState 가 조용히 bail out) 특정 문구로
		// 거른 뒤 0 을 세는 단정은 코드 상태와 무관하게 항상 통과한다 (민감도 0).
		// 관측 창은 unmount() 직전 mockClear 로 연다.
		expect(consoleErrorSpy).not.toHaveBeenCalled();
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
		// 관측 창을 unmount 이후로 한정한다 — 마운트 중 발화까지 세면
		// 단정이 성립하지 않는다 (현재 마운트 중 발화는 0 이지만 창을 명시한다).
		consoleErrorSpy.mockClear();
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

		// **무필터** console.error 0 hit (관측 창 = unmount 이후).
		expect(consoleErrorSpy).not.toHaveBeenCalled();
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

		// 관측 창을 unmount 이후로 한정한다 — 마운트 중 발화까지 세면
		// 단정이 성립하지 않는다 (현재 마운트 중 발화는 0 이지만 창을 명시한다).
		consoleErrorSpy.mockClear();
		unmount();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		// **무필터** console.error 0 hit (관측 창 = unmount 이후).
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	// ── G-G 경계 도달 대조 (TSK-20260828-01 / REQ-20260825-013) ────────────────
	// 위 세 케이스는 전부 **무발화** 단정이다. 무발화는 "가드가 막았다" 와 "애초에
	// 그 경로에 도달하지 않았다" 를 구별하지 못한다 — 중간 가드 1개가 사라져도 뒤
	// 경계의 가드가 대신 막아 초록이 유지된다 (spec post-await-guard-individual-
	// observability §역할 (a)). 아래 둘은 그 창을 여는 **양성** 관측이며, 이 컴포넌트의
	// 두 effect (첫 페치 · 추가 페치) 가 각각 갖는 catch 진입 경계에 하나씩 대응한다.
	// `log()` 는 DEV 에서만 console 에 쓰므로(common.log) 콘솔 spy 로는 이 경계가
	// 보이지 않는다 — 발화 함수 자체를 관측한다 (FileItem 선례와 동일 이디엄).
	it('unmount 하지 않은 첫 페치 reject 는 catch 경계를 넘어 log · reportError 를 발화한다 (경계 도달 대조)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		let rejectResp!: (e: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getImages').mockReturnValue(pending);

		const logSpy = vi.spyOn(common, 'log').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		render(<ImageSelector show={true} />);
		await screen.findByText('Loading...');

		// 관측 창을 응답 도착 이후로 한정한다 (마운트 중 발화 제외).
		logSpy.mockClear();
		reportErrorSpy.mockClear();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(logSpy).toHaveBeenCalledWith('[API GET] FAILED - Images', 'ERROR');
		expect(reportErrorSpy).toHaveBeenCalledTimes(1);
	});

	it('unmount 하지 않은 추가 페치 reject 는 catch 경계를 넘어 log · reportError 를 발화한다 (경계 도달 대조)', async () => {

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

		let rejectNext!: (e: unknown) => void;
		const pendingNext = new Promise<Response>((_, reject) => { rejectNext = reject; });
		const getNextSpy = vi.spyOn(api, 'getNextImages').mockReturnValue(pendingNext);

		const logSpy = vi.spyOn(common, 'log').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		render(<ImageSelector show={true} />);

		const seeMore = await screen.findByRole('button', { name: /see\s*more/i });
		fireEvent.click(seeMore);
		await waitFor(() => expect(getNextSpy).toHaveBeenCalledTimes(1));

		// 관측 창을 2차 응답 도착 이후로 한정한다 (1차 페치의 정상 발화 제외).
		logSpy.mockClear();
		reportErrorSpy.mockClear();

		await act(async () => {
			rejectNext(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(logSpy).toHaveBeenCalledWith('[API GET] FAILED - Next Images', 'ERROR');
		expect(reportErrorSpy).toHaveBeenCalledTimes(1);
	});
});

// 전면 로딩·오류 화면은 **보여줄 것이 없을 때만** 맞다. 상태만 보고 갈랐던
// 동안에는 "See More" 를 누르는 순간 보고 있던 썸네일이 전부 사라지고
// "Loading..." 이 그 자리를 차지했고 (실측: 2 → 0 → 3), 실패하면
// "Failed getting images" 만 남았다 (2 → 0).
describe('ImageSelector 갤러리 보존', () => {

	const page = (keys: string[], next?: number) => new Response(JSON.stringify({
		body: {
			Items: keys.map(key => ({ key, url: 'https://example.com/thumbnail/' + key })),
			...(next === undefined ? {} : { LastEvaluatedKey: { timestamp: next } }),
		},
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	const shots = () => document.querySelectorAll('[data-testid="imageItem"]').length;
	const settle = async () => {
		for(let i = 0; i < 6; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
	};

	it('다음 페이지를 받는 동안에도 썸네일이 남는다', async () => {

		vi.spyOn(api, 'getImages').mockImplementation(async () => page(['a.png', 'b.png'], 99));

		let release: ((value: Response) => void) | null = null;
		vi.spyOn(api, 'getNextImages').mockImplementation(() =>
			new Promise<Response>(resolve => { release = resolve; })
		);

		render(<ImageSelector show={true} />);
		await settle();
		expect(shots()).toBe(2);

		await act(async () => { fireEvent.click(screen.getByTestId('imageSeeMoreButton')); });

		expect(shots()).toBe(2);
		expect(screen.getByTestId('imageSeeMoreButton')).toBeDisabled();

		await act(async () => {
			(release as unknown as (value: Response) => void)(page(['c.png']));
			await new Promise(resolve => setTimeout(resolve, 20));
		});

		expect(shots()).toBe(3);
	});

	// 반대 방향 — 보여줄 것이 없으면 전면 화면이 맞다.
	it('첫 로드가 실패하면 전면 오류 화면을 보여준다', async () => {

		vi.spyOn(api, 'getImages').mockRejectedValue(new Error('down'));
		vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		render(<ImageSelector show={true} />);
		await settle();

		expect(screen.getByText('Failed getting images')).toBeInTheDocument();
		expect(shots()).toBe(0);
	});
});
