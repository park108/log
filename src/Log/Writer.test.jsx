import { fireEvent, render, screen, act } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import Writer from '../Log/Writer';
import { Router, MemoryRouter } from 'react-router-dom';
import * as mock from './api.mock';
import * as common from '../common/common';

console.log = vi.fn();
console.error = vi.fn();

it('redirect if not admin', async () => {
	vi.spyOn(common, "isLoggedIn").mockReturnValue(true);
	vi.spyOn(common, "isAdmin").mockReturnValue(false);
  
	const history = createMemoryHistory({ initialEntries: ["/log/write"]});
	
	render(
		<Router location={history.location} navigator={history}>
			<Writer />
		</Router>
	)
});

test('create log ok on prod server', async () => {

	mock.prodServerOk.listen();

	process.env.NODE_ENV = 'production';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write",
		state: null,
	};

	vi.useFakeTimers();
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	const textInput = await screen.findByTestId("writer-text-area");
	fireEvent.change(textInput, {target: {value: 'Create Log!'}});

	act(() => {
		vi.runOnlyPendingTimers();
	});

	// Submit test
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	act(() => {
		vi.runAllTimers();
	});

	const resultMessage = await screen.findByText("The log posted.");
	expect(resultMessage).toBeDefined();

	vi.useRealTimers();

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

test('create log failed on prod server', async () => {

	mock.prodServerFailed.listen();

	process.env.NODE_ENV = 'production';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write",
		state: null,
	};

	vi.useFakeTimers();
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	const textInput = await screen.findByTestId("writer-text-area");
	fireEvent.change(textInput, {target: {value: 'Create Log!'}});

	act(() => {
		vi.runOnlyPendingTimers();
	});

	// Submit test
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	act(() => {
		vi.runAllTimers();
	});

	const resultMessage = await screen.findByText("Posting log failed.");
	expect(resultMessage).toBeDefined();

	vi.useRealTimers();

	mock.prodServerFailed.resetHandlers();
	mock.prodServerFailed.close();
});

test('create log network error on prod server', async () => {

	mock.prodServerNetworkError.listen();

	process.env.NODE_ENV = 'production';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write",
		state: null,
	};

	vi.useFakeTimers();
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	const textInput = await screen.findByTestId("writer-text-area");
	fireEvent.change(textInput, {target: {value: 'Create Log!'}});

	act(() => {
		vi.runOnlyPendingTimers();
	});

	// Submit test
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	act(() => {
		vi.runAllTimers();
	});

	const resultMessage = await screen.findByText("Posting log network error.");
	expect(resultMessage).toBeDefined();

	vi.useRealTimers();

	mock.prodServerNetworkError.resetHandlers();
	mock.prodServerNetworkError.close();
});

it('edit log ok on dev server', async () => {

	mock.devServerOk.listen();

	process.env.NODE_ENV = 'development';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write",
		state: {
			from: {
				logs: [
					{"contents":"Current contents","timestamp":1655737033793}
					,{"contents":"Previous contents","timestamp":1655736946977}
				],
				temporary: true,
				timestamp: 1234567890
			}
		}
	};
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	vi.useFakeTimers();

	// Submit test
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	act(() => {
		vi.runOnlyPendingTimers();
	});

	const resultMessage = await screen.findByText("The log changed.");
	expect(resultMessage).toBeDefined();

	vi.useRealTimers();

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

it('edit log failed on dev server', async () => {

	mock.devServerFailed.listen();

	process.env.NODE_ENV = 'development';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write",
		state: {
			from: {
				logs: [
					{"contents":"Current contents","timestamp":1655737033793}
					,{"contents":"Previous contents","timestamp":1655736946977}
				],
				temporary: false,
				timestamp: 1234567890
			}
		}
	};
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	vi.useFakeTimers();

	// Submit test
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	act(() => {
		vi.runOnlyPendingTimers();
	});

	const resultMessage = await screen.findByText("Editing log failed.");
	expect(resultMessage).toBeDefined();

	vi.useRealTimers();

	mock.devServerFailed.resetHandlers();
	mock.devServerFailed.close();
});

it('edit log network error on dev server', async () => {

	mock.devServerNetworkError.listen();

	process.env.NODE_ENV = 'development';
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write",
		state: {
			from: {
				logs: [
					{"contents":"Current contents","timestamp":1655737033793}
					,{"contents":"Previous contents","timestamp":1655736946977}
				],
				timestamp: 1234567890
			}
		}
	};
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	vi.useFakeTimers();

	// Submit test
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	act(() => {
		vi.runOnlyPendingTimers();
	});

	const resultMessage = await screen.findByText("Editing log network error.");
	expect(resultMessage).toBeDefined();

	vi.useRealTimers();

	mock.devServerNetworkError.resetHandlers();
	mock.devServerNetworkError.close();
});


test('event testing', async () => {

	vi.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});
  
	vi.spyOn(common, "isLoggedIn").mockResolvedValue(true);
	vi.spyOn(common, "isAdmin").mockResolvedValue(true);
	vi.spyOn(common, "setFullscreen").mockResolvedValue(true);
	document.execCommand = vi.fn();

	const testEntry = {
		pathname: "/log/write"
	};
  
	render(
		<div id="root" className="div fullscreen">
        	<MemoryRouter initialEntries={[testEntry]}>
				<Writer />
			</MemoryRouter>
		</div>
	);

	vi.useFakeTimers();

	// Convert display mode
	const modeButton = await screen.findByTestId("mode-button");
	expect(modeButton).toBeDefined();
	fireEvent.click(modeButton);
	fireEvent.click(modeButton);

	// Get markdown string for anchor
	const aButton = await screen.findByTestId("a-button");
	expect(aButton).toBeDefined();
	fireEvent.click(aButton);

	// Get markdown string for image
	const imgButton = await screen.findByTestId("img-button");
	expect(imgButton).toBeDefined();
	fireEvent.click(imgButton);

	// Toggle temporary
	const temporaryCheckbox = await screen.findByText("Temporary Save");
	expect(temporaryCheckbox).toBeDefined();
	fireEvent.click(temporaryCheckbox);

	// Open imag selector
	const imgSelector = await screen.findByTestId("img-selector-button");
	expect(imgSelector).toBeDefined();
	fireEvent.click(imgSelector);
	fireEvent.click(imgSelector);

	// Submit with no text
	const form = await screen.findByTestId("writer-form");
	expect(form).toBeDefined();
	fireEvent.submit(form);

	vi.runOnlyPendingTimers();
	
	// Text input test
	const textInput = await screen.findByTestId("writer-text-area");
	fireEvent.change(textInput, {target: {value: '123456'}});
	
	vi.runOnlyPendingTimers();

	// Submit test with text
	const form2 = await screen.findByTestId("writer-form");
	expect(form2).toBeDefined();
	fireEvent.submit(form2);

	vi.runOnlyPendingTimers();

	vi.useRealTimers();
});