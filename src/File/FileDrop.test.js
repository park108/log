import { render, screen, fireEvent, act } from '@testing-library/react';
import FileDrop from '../File/FileDrop';
import * as mock from './api.mock';
import * as common from '../common/common';

console.log = jest.fn();
console.error = jest.fn();
const uploadedCallbackFunction = jest.fn();

test('getting presigned url failed on dev server', async () => {

	mock.devServerFailed.listen();
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

test('getting presigned url network error on dev server', async () => {

	mock.devServerNetworkError.listen();
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});

test('upload ok', async () => {

	mock.devServerOk.listen();

	jest.useFakeTimers();
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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

	act(() => {
		jest.runAllTimers();
	});

	const dropZoneAgain = await screen.findByText("Drop files here!"); // Result message change to ready in few seconds
	expect(dropZoneAgain).toBeDefined();
	
	jest.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

test('getting presigned url ok, but upload failed', async () => {

	mock.devServerPresignedUrlOkButUploadFailed.listen();
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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

	mock.devServerPresignedUrlOkButUploadFailed.resetHandlers();
	mock.devServerPresignedUrlOkButUploadFailed.close();
});

test('getting presigned url ok, but upload network error', async () => {

	mock.devServerPresignedUrlOkButUploadNetworkError.listen();

	jest.useFakeTimers();
	
	process.env.NODE_ENV = 'development';

	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(true);

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

	act(() => {
		jest.runAllTimers();
	});

	const dropZoneAgain = await screen.findByText("Drop files here!"); // Result message change to ready in few seconds
	expect(dropZoneAgain).toBeDefined();
	
	jest.useRealTimers();

	mock.devServerPresignedUrlOkButUploadNetworkError.resetHandlers();
	mock.devServerPresignedUrlOkButUploadNetworkError.close();
});