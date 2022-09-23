import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import FileDrop from '../File/FileDrop';
import * as api from '../File/api';

const unmockedFetch = global.fetch;
console.error = jest.fn();
const errorMessage = "API is down";

it('render drop zone correctly and upload ok', async () => {

	jest.useFakeTimers();

	const uploadedCallbackFunction = jest.fn();

	render(<
		FileDrop
		uploaded = {uploadedCallbackFunction}
	/>);

	const dropZone = screen.getByTestId("dropzone");
	expect(dropZone).toBeInTheDocument();

	const event = {
		dataTransfer: {
			files: [
				{ name: "testfile1.txt", type: "text" },
				{ name: "testfile2.txt", type: "text" }
			]
		}
	};

	// Fetch pre-signed URL -> error
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	fireEvent.drop(dropZone, event);

	// Fetch pre-signed URL -> Server Down
	global.fetch = () => Promise.reject(errorMessage);

	fireEvent.drop(dropZone, event);

	// Fetch pre-signed URL -> OK & Upload -> OK
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				UploadUrl: "https://test.url.com/test"
			}
		}),
	});

	api.putFile = jest.fn().mockReturnValue({status: 200});

	fireEvent.dragOver(dropZone, event);
	fireEvent.drop(dropZone, event);
	fireEvent.dragEnter(dropZone, event);
	fireEvent.dragLeave(dropZone, event);

	// First, upload completed.
	jest.runOnlyPendingTimers();
	
	const dropZoneTextComplete = await screen.findByText("Upload complete.");
	expect(dropZoneTextComplete).toBeInTheDocument();

	// Second, initialize dropzone.
	jest.runOnlyPendingTimers();
	
	const dropZoneTextReady = await screen.findByText("Drop files here!");
	expect(dropZoneTextReady).toBeInTheDocument();

	expect(uploadedCallbackFunction).toBeCalledTimes(2);

	global.fetch = unmockedFetch;
	jest.useRealTimers();
});

it('render drop zone correctly and upload failed', async () => {

	render(<FileDrop />);

	const dropZone = screen.getByTestId("dropzone");
	expect(dropZone).toBeInTheDocument();

	const event = {
		dataTransfer: {
			files: [
				{ name: "testfile1.txt", type: "text" },
				{ name: "testfile2.txt", type: "text" }
			]
		}
	}

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				UploadUrl: "https://test.url.com/test"
			}
		}),
	});

	api.putFile = jest.fn().mockReturnValue({status: 404});

	fireEvent.drop(dropZone, event);

	global.fetch = unmockedFetch;
});

it('render drop zone correctly and upload server error', async () => {

	render(<FileDrop />);

	const dropZone = screen.getByTestId("dropzone");
	expect(dropZone).toBeInTheDocument();

	const event = {
		dataTransfer: {
			files: [
				{ name: "testfile1.txt", type: "text" },
				{ name: "testfile2.txt", type: "text" }
			]
		}
	}

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				UploadUrl: "https://test.url.com/test"
			}
		}),
	});

	api.putFile = jest.fn().mockRejectedValue();

	fireEvent.drop(dropZone, event);

	global.fetch = unmockedFetch;
});
