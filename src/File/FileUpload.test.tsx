import { render, screen, fireEvent, act } from '@testing-library/react';
import FileUpload from '../File/FileUpload';
import * as mock from './api.mock';
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
