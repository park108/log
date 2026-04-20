import { render, screen, fireEvent, act } from '@testing-library/react';
import FileUpload from '../File/FileUpload';
import * as mock from './api.mock';
import * as common from '../common/common';
import { useMockServer } from '../test-utils/msw';

console.log = vi.fn();
console.error = vi.fn();
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
