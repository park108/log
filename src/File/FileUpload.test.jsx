import { render, screen, fireEvent, act } from '@testing-library/react';
import FileUpload from '../File/FileUpload';
import * as mock from './api.mock';
import * as common from '../common/common';

console.log = vi.fn();
console.error = vi.fn();
const uploadedCallbackFunction = vi.fn();

test('getting presigned url failed on dev server', async () => {

	mock.devServerFailed.listen();
	
	process.env.NODE_ENV = 'development';

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

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

test('getting presigned url network error on dev server', async () => {

	mock.devServerNetworkError.listen();
	
	process.env.NODE_ENV = 'development';

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

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

test('upload ok', async () => {

	mock.devServerOk.listen();

	vi.useFakeTimers();
	
	process.env.NODE_ENV = 'development';

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

	act(() => {
		vi.runAllTimers();
	});

	const toasterFadedout = await screen.findByText("Upload complete."); // Result message change to ready in few seconds
	expect(toasterFadedout).toHaveAttribute('data-position', 'bottom');
	expect(toasterFadedout).toHaveAttribute('data-type', 'success');
	expect(toasterFadedout).toHaveAttribute('data-show', '2');

	vi.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

test('getting presigned url ok, but upload failed', async () => {

	mock.devServerPresignedUrlOkButUploadFailed.listen();
	
	process.env.NODE_ENV = 'development';

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

	mock.devServerPresignedUrlOkButUploadFailed.resetHandlers();
	mock.devServerPresignedUrlOkButUploadFailed.close();
});

test('getting presigned url ok, but upload network error', async () => {

	mock.devServerPresignedUrlOkButUploadNetworkError.listen();

	vi.useFakeTimers();
	
	process.env.NODE_ENV = 'development';

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

	act(() => {
		vi.runAllTimers();
	});

	const toasterFadedout = await screen.findByText("Upload failed."); // Result message change to ready in few seconds
	expect(toasterFadedout).toHaveAttribute('data-position', 'bottom');
	expect(toasterFadedout).toHaveAttribute('data-type', 'error');
	expect(toasterFadedout).toHaveAttribute('data-show', '2');

	vi.useRealTimers();

	mock.devServerPresignedUrlOkButUploadNetworkError.resetHandlers();
	mock.devServerPresignedUrlOkButUploadNetworkError.close();
});