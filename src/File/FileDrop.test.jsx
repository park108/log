import { render, screen, fireEvent, act } from '@testing-library/react';
import FileDrop from '../File/FileDrop';
import * as mock from './api.mock';
import * as common from '../common/common';
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
