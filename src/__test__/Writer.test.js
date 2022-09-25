import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import Writer from '../Log/Writer';
import { Router } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import * as common from '../common/common';

console.error = jest.fn();

it('redirect if not admin', async () => {
	
	common.isLoggedIn = jest.fn().mockReturnValue(true);
	common.isAdmin = jest.fn().mockReturnValue(false);
  
	const history = createMemoryHistory({ initialEntries: ["/log/write"]});
  
	render(
		<div id="root" className="div fullscreen">
			<Router location={history.location} navigator={history}>
				<Writer />
			</Router>
		</div>
	);
});

it('render text area correctly', async () => {
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
	common.setFullscreen = jest.fn().mockResolvedValue(true);
	document.execCommand = jest.fn();

	const history = createMemoryHistory();
	const location = {
		pathname: "/log/write",
		state: {
			from: {
				logs: [
					{"contents":"Current contents","timestamp":1655737033793}
					,{"contents":"Previous contents","timestamp":1655736946977}
				],
				temporary: true
			}
		}
	};

	history.push(location);
  
	render(
		<div id="root" className="div fullscreen">
			<Router location={location} history={history}>
				<Writer />
			</Router>
		</div>
	);

	jest.useFakeTimers();
	
	// Text input test
	const textInput = await screen.findByTestId("writer-text-area");
	const typedValue = "Posting test";
	userEvent.type(textInput, typedValue);

	jest.runOnlyPendingTimers();
	
	// Button click tests
	const imgButton = await screen.findByTestId("img-button");
	expect(imgButton).toBeDefined();
	userEvent.click(imgButton);

	jest.runOnlyPendingTimers();

	const aButton = await screen.findByTestId("a-button");
	expect(aButton).toBeDefined();
	userEvent.click(aButton);

	jest.runOnlyPendingTimers();

	const tempCheckbox = await screen.findByText("Temporary Save");
	expect(tempCheckbox).toBeDefined();
	userEvent.click(tempCheckbox);

	jest.runOnlyPendingTimers();
	
	// Image selector mode change tests
	const selectorButton1 = await screen.findByTestId("img-selector-button");
	expect(selectorButton1).toBeDefined();
	userEvent.click(selectorButton1);

	jest.runOnlyPendingTimers();

	const selectorButton2 = await screen.findByTestId("img-selector-button");
	expect(selectorButton2).toBeDefined();
	userEvent.click(selectorButton2);

	jest.runOnlyPendingTimers();

	const selectorButton3 = await screen.findByTestId("img-selector-button");
	expect(selectorButton3).toBeDefined();
	userEvent.click(selectorButton3);

	jest.runOnlyPendingTimers();

	// Test conversion toggle
	const modeHTML = await screen.findByTestId("mode-button");
	expect(modeHTML).toBeDefined();
	userEvent.click(modeHTML);

	jest.runOnlyPendingTimers();

	const conversionModeHTML = await screen.findByText("HTML");
	expect(conversionModeHTML).toBeInTheDocument();
	
	const modeMD = await screen.findByTestId("mode-button");
	expect(modeMD).toBeDefined();
	userEvent.click(modeMD);

	jest.runOnlyPendingTimers();

	const conversionModeMarkdown = await screen.findByText("Markdown Converted");
	expect(conversionModeMarkdown).toBeInTheDocument();

	jest.runOnlyPendingTimers();

	// Submit test
	// TODO: Didn't covered postLog()
	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	userEvent.click(submitButton);

	jest.runOnlyPendingTimers();

	jest.useRealTimers();
});

it('render text area if not logged in', async () => {
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(false);
	common.setFullscreen = jest.fn().mockResolvedValue(true);
	document.execCommand = jest.fn();

	const history = createMemoryHistory();
	const location = {
		pathname: "/log/write",
		state: {
			from: {
				logs: [
					{"contents":"Current contents","timestamp":1655737033793}
					,{"contents":"Previous contents","timestamp":1655736946977}
				]
			}
		}
	};

	history.push(location);
  
	render(
		<div id="root" className="div fullscreen">
			<Router location={location} navigator={history}>
				<Writer />
			</Router>
		</div>
	);
});