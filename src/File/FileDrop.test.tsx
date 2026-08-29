import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import FileDrop from '../File/FileDrop';
import * as mock from './api.mock';
import * as api from './api';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

const uploadedCallbackFunction = vi.fn();

test('toggles data-dragover attribute on drag events', () => {

	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(true);

	render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

	const dropZone = screen.getByTestId('dropzone');
	expect(dropZone).toHaveAttribute('data-dragover', 'N');

	fireEvent.dragEnter(dropZone);
	expect(dropZone).toHaveAttribute('data-dragover', 'Y');

	fireEvent.dragLeave(dropZone);
	expect(dropZone).toHaveAttribute('data-dragover', 'N');

	fireEvent.dragEnter(dropZone);
	expect(dropZone).toHaveAttribute('data-dragover', 'Y');

	fireEvent.drop(dropZone, { dataTransfer: { files: [] } });
	expect(dropZone).toHaveAttribute('data-dragover', 'N');
});

describe('FileDrop presigned url failed on dev server', () => {
	useMockServer(() => mock.devServerFailed);

	test('getting presigned url failed on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();

		const event = {
			dataTransfer: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.dragOver(dropZone, event);
		fireEvent.drop(dropZone, event);
		fireEvent.dragEnter(dropZone, event);
		fireEvent.dragLeave(dropZone, event);

		const failText = await screen.findByText("Upload failed.");
		expect(failText).toBeInTheDocument();
	});
});

describe('FileDrop presigned url network error on dev server', () => {
	useMockServer(() => mock.devServerNetworkError);

	test('getting presigned url network error on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();

		const event = {
			dataTransfer: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.drop(dropZone, event);

		const failText = await screen.findByText("Upload failed.");
		expect(failText).toBeInTheDocument();
	});
});

describe('FileDrop upload ok on dev server', () => {
	useMockServer(() => mock.devServerOk);

	test('upload ok', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();

		const event = {
			dataTransfer: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.drop(dropZone, event);

		const resultText = await screen.findByText("Upload complete.");
		expect(resultText).toBeInTheDocument();

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const dropZoneAgain = await screen.findByText("Drop files here!"); // Result message change to ready in few seconds
		expect(dropZoneAgain).toBeDefined();
	});
});

describe('FileDrop presigned url ok but upload failed', () => {
	useMockServer(() => mock.devServerPresignedUrlOkButUploadFailed);

	test('getting presigned url ok, but upload failed', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();

		const event = {
			dataTransfer: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.drop(dropZone, event);

		const resultText = await screen.findByText("Upload failed.");
		expect(resultText).toBeInTheDocument();
	});

	// 실패 상태가 진행 상태와 같은 클래스를 쓰면 정상 업로드 중에도 에러
	// 배색이 뜬다. 두 상태가 **서로 다른** 클래스를 갖는지 못 박는다 —
	// 한쪽만 확인하면 둘을 도로 합쳐도 통과한다.
	test('failed state does not share the in-progress class', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

		const dropZone = screen.getByTestId('dropzone');
		expect(dropZone).toHaveClass('div--filedrop-ready');

		fireEvent.drop(dropZone, {
			dataTransfer: { files: [{ name: "testfile1.txt", type: "text" }] },
		});

		await screen.findByText("Upload failed.");

		expect(dropZone).toHaveClass('div--filedrop-failed');
		expect(dropZone).not.toHaveClass('div--filedrop-uploading');
	});
});

describe('FileDrop presigned url ok but upload network error', () => {
	useMockServer(() => mock.devServerPresignedUrlOkButUploadNetworkError);

	test('getting presigned url ok, but upload network error', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

		const dropZone = await screen.findByText("Drop files here!");
		expect(dropZone).toBeDefined();

		const event = {
			dataTransfer: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.drop(dropZone, event);

		const resultText = await screen.findByText("Upload failed.");
		expect(resultText).toBeInTheDocument();

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const dropZoneAgain = await screen.findByText("Drop files here!"); // Result message change to ready in few seconds
		expect(dropZoneAgain).toBeDefined();
	});
});

describe('FileDrop reportError 채널 (REQ-20260421-039 FR-03)', () => {

	describe('Pre-signed URL fetch failed', () => {
		useMockServer(() => mock.devServerFailed);

		test('reports error via reportError when pre-signed URL fetch fails', async () => {

			const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

			const dropZone = await screen.findByText("Drop files here!");
			expect(dropZone).toBeDefined();

			const event = {
				dataTransfer: {
					files: [
						{ name: "testfile1.txt", type: "text" }
					]
				}
			};

			fireEvent.drop(dropZone, event);

			const failText = await screen.findByText("Upload failed.");
			expect(failText).toBeInTheDocument();

			expect(reportErrorSpy).toHaveBeenCalled();

			reportErrorSpy.mockRestore();
		});
	});

	describe('PUT upload failed after pre-signed URL ok', () => {
		useMockServer(() => mock.devServerPresignedUrlOkButUploadFailed);

		test('reports error via reportError when PUT upload fails', async () => {

			const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			render(< FileDrop callbackAfterUpload = {uploadedCallbackFunction} />);

			const dropZone = await screen.findByText("Drop files here!");
			expect(dropZone).toBeDefined();

			const event = {
				dataTransfer: {
					files: [
						{ name: "testfile1.txt", type: "text" }
					]
				}
			};

			fireEvent.drop(dropZone, event);

			const failText = await screen.findByText("Upload failed.");
			expect(failText).toBeInTheDocument();

			expect(reportErrorSpy).toHaveBeenCalled();

			reportErrorSpy.mockRestore();
		});
	});
});

// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-b —
// async effect unmount race 박제. pending `getPreSignedUrl` / `putFile` 을 `vi.spyOn` 으로
// 외부 resolve/reject 가능한 deferred 로 바꾼 뒤 `unmount()` → 응답 도착 왕복을 만든다.
// 단정 3종: (a) state 전이 0 (refreshFiles 0 hit + 결과 문구 DOM 부재),
// (b) `console.log` 0 hit, (c) `console.error` 0 hit. spy 는 unmount 직후 `mockClear()` 로
// 기준점을 잡아 unmount **이전** 발화(UPLOADING 전이 / presigned OK 로그)와 분리한다.
// DEV stub 필수 — `log()` 는 `isDev()` 분기 안에서만 `console.log` 로 나간다.
describe('FileDrop unmount-safety (REQ-20260517-093 (I1)(I2))', () => {

	const OK_PRESIGNED = (): Response => new Response(JSON.stringify({
		body: { UploadUrl: 'http://x/upload' },
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	const dropEvent = {
		dataTransfer: {
			files: [
				{ name: "testfile1.txt", type: "text" }
			]
		}
	};

	const flushAfterResponse = async (): Promise<void> => {
		await act(async () => {
			await new Promise<void>(resolve => setTimeout(resolve, 0));
		});
	};

	beforeEach(() => {
		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);
		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);
	});

	it('pending getPreSignedUrl 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		let resolveResp!: (r: Response) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
		const getPreSignedUrlSpy = vi.spyOn(api, 'getPreSignedUrl').mockReturnValue(pending);

		const refreshSpy = vi.fn();
		const { unmount } = render(< FileDrop callbackAfterUpload = {refreshSpy} />);

		fireEvent.drop(screen.getByTestId('dropzone'), dropEvent);

		await waitFor(() => expect(getPreSignedUrlSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolveResp(OK_PRESIGNED());
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(refreshSpy).not.toHaveBeenCalled();
	});

	it('pending getPreSignedUrl 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		let rejectResp!: (e: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		const getPreSignedUrlSpy = vi.spyOn(api, 'getPreSignedUrl').mockReturnValue(pending);

		const refreshSpy = vi.fn();
		const { unmount } = render(< FileDrop callbackAfterUpload = {refreshSpy} />);

		fireEvent.drop(screen.getByTestId('dropzone'), dropEvent);

		await waitFor(() => expect(getPreSignedUrlSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectResp(new Error('presigned network down'));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(refreshSpy).not.toHaveBeenCalled();
	});

	it('pending putFile 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue(OK_PRESIGNED());

		let resolvePut!: (r: Response) => void;
		const pendingPut = new Promise<Response>((resolve) => { resolvePut = resolve; });
		const putFileSpy = vi.spyOn(api, 'putFile').mockReturnValue(pendingPut);

		const refreshSpy = vi.fn();
		const { unmount } = render(< FileDrop callbackAfterUpload = {refreshSpy} />);

		fireEvent.drop(screen.getByTestId('dropzone'), dropEvent);

		await waitFor(() => expect(putFileSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		resolvePut(new Response(null, { status: 200 }));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(refreshSpy).not.toHaveBeenCalled();
	});

	it('pending putFile 중 unmount 후 reject → catch 경로도 어떤 발화도 하지 않는다', async () => {

		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue(OK_PRESIGNED());

		let rejectPut!: (e: unknown) => void;
		const pendingPut = new Promise<Response>((_, reject) => { rejectPut = reject; });
		const putFileSpy = vi.spyOn(api, 'putFile').mockReturnValue(pendingPut);

		const refreshSpy = vi.fn();
		const { unmount } = render(< FileDrop callbackAfterUpload = {refreshSpy} />);

		fireEvent.drop(screen.getByTestId('dropzone'), dropEvent);

		await waitFor(() => expect(putFileSpy).toHaveBeenCalledTimes(1));

		unmount();

		const logSpy = vi.spyOn(console, 'log');
		const errorSpy = vi.spyOn(console, 'error');
		logSpy.mockClear();
		errorSpy.mockClear();

		rejectPut(new Error('upload network down'));
		await flushAfterResponse();

		expect(logSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();
		expect(refreshSpy).not.toHaveBeenCalled();
	});
});
