import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import FileUpload from '../File/FileUpload';
import * as api from '../File/api';

const unmockedFetch = global.fetch;
console.error = jest.fn();
const errorMessage = "API is down";

it('render upload input correctly and upload ok', async () => {

	jest.useFakeTimers();

	const uploadedCallbackFunction = jest.fn();

	render(<
		FileUpload
		uploaded = {uploadedCallbackFunction}
	/>);

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

	// Fetch pre-signed URL -> error
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	fireEvent.change(input, event);

	// Fetch pre-signed URL -> Server Down
	global.fetch = () => Promise.reject(errorMessage);

	fireEvent.change(input, event);

	// Fetch pre-signed URL -> OK & Upload -> OK
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				UploadUrl: "https://test.url.com/test"
			}
		}),
	});

	api.putFile = jest.fn().mockReturnValue({status: 200});

	fireEvent.change(input, event);

	// First, upload completed.
	jest.runOnlyPendingTimers();
	
	const toasterCompleted = await screen.findByText("Upload complete.");
	expect(toasterCompleted.getAttribute("class")).toBe("div div--toaster-bottom div--toaster-success ");

	// Second, initialize file selector.
	jest.runOnlyPendingTimers();
	
	const toasterReady = await screen.findByText("Upload complete.");
	expect(toasterReady.getAttribute("class")).toBe("div div--toaster-bottom div--toaster-success div--toaster-fadeout");

	global.fetch = unmockedFetch;
	jest.useRealTimers();
});

it('render upload input correctly and upload failed', () => {

	render(<FileUpload />);

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

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				UploadUrl: "https://test.url.com/test"
			}
		}),
	});

	api.putFile = jest.fn().mockReturnValue({status: 404});

	fireEvent.change(input, event);

	global.fetch = unmockedFetch;
});

it('render upload input correctly and server error', () => {

	render(<FileUpload />);

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

	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			body:{
				UploadUrl: "https://test.url.com/test"
			}
		}),
	});

	api.putFile = jest.fn().mockRejectedValue();

	fireEvent.change(input, event);

	global.fetch = unmockedFetch;
});

