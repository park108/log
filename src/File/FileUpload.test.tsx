import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import FileUpload from '../File/FileUpload';
import * as mock from './api.mock';
import * as api from '../File/api';
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

describe('FileUpload presigned url failed on dev server', () => {
	useMockServer(() => mock.devServerFailed);

	test('getting presigned url failed on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

		const input = screen.getByLabelText('file-upload');
		expect(input).toBeInTheDocument();

		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		const failText = await screen.findByText("Upload failed.");
		expect(failText).toBeInTheDocument();
	});
});

describe('FileUpload presigned url network error on dev server', () => {
	useMockServer(() => mock.devServerNetworkError);

	test('getting presigned url network error on dev server', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

		const input = screen.getByLabelText('file-upload');
		expect(input).toBeInTheDocument();

		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		const failText = await screen.findByText("Upload failed.");
		expect(failText).toBeInTheDocument();
	});
});

describe('FileUpload upload ok on dev server', () => {
	useMockServer(() => mock.devServerOk);

	test('upload ok', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

		const input = screen.getByLabelText('file-upload');
		expect(input).toBeInTheDocument();

		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		const toaster = await screen.findByText("Upload complete.");
		expect(toaster).toBeInTheDocument();

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const toasterFadedout = await screen.findByText("Upload complete."); // Result message change to ready in few seconds
		expect(toasterFadedout).toHaveAttribute('data-position', 'bottom');
		expect(toasterFadedout).toHaveAttribute('data-type', 'success');
		expect(toasterFadedout).toHaveAttribute('data-show', '2');
	});
});

describe('FileUpload presigned url ok but upload failed', () => {
	useMockServer(() => mock.devServerPresignedUrlOkButUploadFailed);

	test('getting presigned url ok, but upload failed', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

		const input = screen.getByLabelText('file-upload');
		expect(input).toBeInTheDocument();

		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		const toaster = await screen.findByText("Upload failed.");
		expect(toaster).toBeInTheDocument();
	});
});

describe('FileUpload presigned url ok but upload network error', () => {
	useMockServer(() => mock.devServerPresignedUrlOkButUploadNetworkError);

	test('getting presigned url ok, but upload network error', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true });

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

		const input = screen.getByLabelText('file-upload');
		expect(input).toBeInTheDocument();

		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" },
					{ name: "testfile2.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		const toaster = await screen.findByText("Upload failed.");
		expect(toaster).toBeInTheDocument();

		await act(async () => {
			await vi.runAllTimersAsync();
		});

		const toasterFadedout = await screen.findByText("Upload failed."); // Result message change to ready in few seconds
		expect(toasterFadedout).toHaveAttribute('data-position', 'bottom');
		expect(toasterFadedout).toHaveAttribute('data-type', 'error');
		expect(toasterFadedout).toHaveAttribute('data-show', '2');
	});
});

describe('FileUpload unmount race — setTimeout cleanup (REQ-20260517-092 FR-01/FR-02)', () => {

	describe('COMPLETE 분기 unmount 후 refreshFiles 0회', () => {
		useMockServer(() => mock.devServerOk);

		test('unmount before REFRESH_TIMEOUT — refreshFiles not called, no stale setState', async () => {

			vi.useFakeTimers({ shouldAdvanceTime: true });

			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			const refreshSpy = vi.fn();

			const { unmount } = render(<FileUpload callbackAfterUpload = {refreshSpy} />);

			const input = screen.getByLabelText('file-upload');
			expect(input).toBeInTheDocument();

			const event = {
				target: {
					files: [
						{ name: "testfile1.txt", type: "text" }
					]
				}
			};

			fireEvent.change(input, event);

			const toaster = await screen.findByText("Upload complete.");
			expect(toaster).toBeInTheDocument();

			// COMPLETE 전이 직후 — REFRESH_TIMEOUT 경과 전 unmount.
			unmount();

			// pending timer 가 cleanup 으로 취소되었는지: timer 진행해도 refreshSpy 미호출.
			await act(async () => {
				await vi.runAllTimersAsync();
			});

			expect(refreshSpy).not.toHaveBeenCalled();
		});
	});

	describe('FAILED 분기 unmount 후 refreshFiles 0회', () => {
		useMockServer(() => mock.devServerPresignedUrlOkButUploadNetworkError);

		test('unmount before REFRESH_TIMEOUT after FAILED — refreshFiles not called', async () => {

			vi.useFakeTimers({ shouldAdvanceTime: true });

			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			const refreshSpy = vi.fn();

			const { unmount } = render(<FileUpload callbackAfterUpload = {refreshSpy} />);

			const input = screen.getByLabelText('file-upload');
			expect(input).toBeInTheDocument();

			const event = {
				target: {
					files: [
						{ name: "testfile1.txt", type: "text" }
					]
				}
			};

			fireEvent.change(input, event);

			const failText = await screen.findByText("Upload failed.");
			expect(failText).toBeInTheDocument();

			// FAILED 전이 직후 — REFRESH_TIMEOUT 경과 전 unmount.
			unmount();

			// pending timer 가 cleanup 으로 취소되었는지: timer 진행해도 refreshSpy 미호출.
			await act(async () => {
				await vi.runAllTimersAsync();
			});

			expect(refreshSpy).not.toHaveBeenCalled();
		});
	});
});

describe('FileUpload reportError 채널 (REQ-20260421-039 FR-03)', () => {

	describe('Pre-signed URL fetch failed', () => {
		useMockServer(() => mock.devServerFailed);

		test('reports error via reportError when pre-signed URL fetch fails', async () => {

			const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

			vi.stubEnv('DEV', true);
			vi.stubEnv('PROD', false);

			vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
			vi.spyOn(common, "isAdmin").mockReturnValue(true);

			render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

			const input = screen.getByLabelText('file-upload');
			expect(input).toBeInTheDocument();

			const event = {
				target: {
					files: [
						{ name: "testfile1.txt", type: "text" }
					]
				}
			};

			fireEvent.change(input, event);

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

			render(<FileUpload callbackAfterUpload = {uploadedCallbackFunction} />);

			const input = screen.getByLabelText('file-upload');
			expect(input).toBeInTheDocument();

			const event = {
				target: {
					files: [
						{ name: "testfile1.txt", type: "text" }
					]
				}
			};

			fireEvent.change(input, event);

			const failText = await screen.findByText("Upload failed.");
			expect(failText).toBeInTheDocument();

			expect(reportErrorSpy).toHaveBeenCalled();

			reportErrorSpy.mockRestore();
		});
	});
});

// REQ-093 (I2)(FR-02) — fetch unmount race 박제 (TSK-20260517-27).
// pending `getPreSignedUrl` / `putFile` + unmount() + 응답 resolve 시 `setIsUploading`
// (UPLOADING / FAILED / COMPLETE 전이 setter) 발화 0 hit + REQ-091 cross-validate
// (`console.error` unmounted setState 패턴 0 hit) 박제. `getPreSignedUrl` / `putFile` 을
// vi.spyOn 으로 stub — pending Promise / resolve / reject 제어 박제.
describe('FileUpload unmount-safety (REQ-20260517-093 FR-02)', () => {

	it('pending getPreSignedUrl 중 unmount → 이후 응답 resolve 가 setIsUploading 분기 setter 0 hit (Warning 0 + console.error 0)', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		// pending fetch 제어 — 외부 resolve 가능한 deferred Response.
		let resolveResp!: (r: Response) => void;
		const pending = new Promise<Response>((resolve) => { resolveResp = resolve; });
		const getPreSignedUrlSpy = vi.spyOn(api, 'getPreSignedUrl').mockReturnValue(pending);

		// console.error spy — beforeEach 등록분과 동일 채널. unmounted setState 패턴 0 hit 박제.
		const consoleErrorSpy = vi.spyOn(console, 'error');

		const refreshSpy = vi.fn();

		const { unmount } = render(<FileUpload callbackAfterUpload = {refreshSpy} />);

		const input = screen.getByLabelText('file-upload');
		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		// fetch 트리거 도달 확인 — 1차 setter (UPLOADING) 도착 후 pending 상태 확정.
		await waitFor(() => expect(getPreSignedUrlSpy).toHaveBeenCalledTimes(1));

		// unmount 후 응답 도착 — cancelled.current = true 박제로 setter 0 hit 유지 기대.
		unmount();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: { UploadUrl: 'http://x/upload' },
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			await Promise.resolve();
			await Promise.resolve();
		});

		// REQ-091 cross-validate — unmounted setState Warning 0 hit.
		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);

		// refreshFiles 도 호출되지 않아야 한다 — COMPLETE 분기 setIsUploading 도달 0 hit 의 surface.
		expect(refreshSpy).not.toHaveBeenCalled();
	});

	it('pending putFile 중 unmount → 이후 응답 resolve 가 setIsUploading 분기 setter 0 hit', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		// 1차: getPreSignedUrl 즉시 OK 응답 — putFile 진입까지 통과.
		const preSignedResp = new Response(JSON.stringify({
			body: { UploadUrl: 'http://x/upload' },
		}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue(preSignedResp);

		// 2차: putFile pending — unmount 직전 트리거.
		let resolvePut!: (r: Response) => void;
		const pendingPut = new Promise<Response>((resolve) => { resolvePut = resolve; });
		const putFileSpy = vi.spyOn(api, 'putFile').mockReturnValue(pendingPut);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const refreshSpy = vi.fn();

		const { unmount } = render(<FileUpload callbackAfterUpload = {refreshSpy} />);

		const input = screen.getByLabelText('file-upload');
		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		// putFile 진입 도달 확인.
		await waitFor(() => expect(putFileSpy).toHaveBeenCalledTimes(1));

		// unmount 후 응답 도착.
		unmount();

		await act(async () => {
			resolvePut(new Response(null, { status: 200 }));
			await Promise.resolve();
			await Promise.resolve();
		});

		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);

		expect(refreshSpy).not.toHaveBeenCalled();
	});

	it('pending getPreSignedUrl 중 unmount 후 reject → catch 분기도 setter / console.error 0 hit', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		let rejectResp!: (e: unknown) => void;
		const pending = new Promise<Response>((_, reject) => { rejectResp = reject; });
		const getPreSignedUrlSpy = vi.spyOn(api, 'getPreSignedUrl').mockReturnValue(pending);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const refreshSpy = vi.fn();

		const { unmount } = render(<FileUpload callbackAfterUpload = {refreshSpy} />);

		const input = screen.getByLabelText('file-upload');
		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		await waitFor(() => expect(getPreSignedUrlSpy).toHaveBeenCalledTimes(1));

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

		expect(refreshSpy).not.toHaveBeenCalled();
	});

	it('pending putFile 중 unmount 후 reject → putFile catch 분기 cancelled 가드도 setter 0 hit', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
		vi.spyOn(common, "isAdmin").mockReturnValue(true);

		// 1차: getPreSignedUrl 즉시 OK 응답 — putFile 진입까지 통과.
		const preSignedResp = new Response(JSON.stringify({
			body: { UploadUrl: 'http://x/upload' },
		}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue(preSignedResp);

		// 2차: putFile pending → reject — unmount 직전 트리거.
		let rejectPut!: (e: unknown) => void;
		const pendingPut = new Promise<Response>((_, reject) => { rejectPut = reject; });
		const putFileSpy = vi.spyOn(api, 'putFile').mockReturnValue(pendingPut);

		const consoleErrorSpy = vi.spyOn(console, 'error');

		const refreshSpy = vi.fn();

		const { unmount } = render(<FileUpload callbackAfterUpload = {refreshSpy} />);

		const input = screen.getByLabelText('file-upload');
		const event = {
			target: {
				files: [
					{ name: "testfile1.txt", type: "text" }
				]
			}
		};

		fireEvent.change(input, event);

		await waitFor(() => expect(putFileSpy).toHaveBeenCalledTimes(1));

		unmount();

		await act(async () => {
			rejectPut(new Error('upload network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		const errorCalls = consoleErrorSpy.mock.calls;
		const unmountedSetStateCalls = errorCalls.filter((c) => {
			const msg = typeof c[0] === 'string' ? c[0] : '';
			return /update.*was not wrapped|cannot update a component|unmounted/i.test(msg);
		});
		expect(unmountedSetStateCalls.length).toBe(0);

		expect(refreshSpy).not.toHaveBeenCalled();
	});
});
