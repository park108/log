import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import Writer from '../Log/Writer';
import { Router } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import * as common from '../common/common';

console.error = jest.fn();

it('render text area correctly', async () => {
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
	common.setFullscreen = jest.fn().mockResolvedValue(true);
	document.execCommand = jest.fn();

	const history = createMemoryHistory();
	history.push({
		location: {
			pathname: "/log/write",
			state: {
				from: {
					logs: [
						{"contents":"Current contents","timestamp":1655737033793}
						,{"contents":"Previous contents","timestamp":1655736946977}
					]
				}
			}
		}
	});
  
	render(
		<div id="root" className="div fullscreen">
			<Router location={history.location} history={history}>
				<Writer />
			</Router>
		</div>
	);
	
	// Submit test
	// TODO: Didn't covered postLog()
	const textInput = await screen.findByTestId("writer-text-area");
	const typedValue = "Posting test";
	userEvent.type(textInput, typedValue);

	const submitButton = await screen.findByTestId("submit-button");
	expect(submitButton).toBeDefined();
	userEvent.click(submitButton);

	
	// Button click tests
	const imgButton = await screen.findByTestId("img-button");
	expect(imgButton).toBeDefined();
	userEvent.click(imgButton);

	const aButton = await screen.findByTestId("a-button");
	expect(aButton).toBeDefined();
	userEvent.click(aButton);
	
	// Image selector mode change tests
	const selectorButton1 = await screen.findByTestId("img-selector-button");
	expect(selectorButton1).toBeDefined();
	userEvent.click(selectorButton1);

	const selectorButton2 = await screen.findByTestId("img-selector-button");
	expect(selectorButton2).toBeDefined();
	userEvent.click(selectorButton2);

	const selectorButton3 = await screen.findByTestId("img-selector-button");
	expect(selectorButton3).toBeDefined();
	userEvent.click(selectorButton3);

	// Test conversion toggle
	const modeHTML = await screen.findByTestId("mode-button");
	expect(modeHTML).toBeDefined();
	userEvent.click(modeHTML);

	const conversionModeHTML = await screen.findByText("HTML");
	expect(conversionModeHTML).toBeInTheDocument();
	
	const modeMD = await screen.findByTestId("mode-button");
	expect(modeMD).toBeDefined();
	userEvent.click(modeMD);

	const conversionModeMarkdown = await screen.findByText("Markdown Converted");
	expect(conversionModeMarkdown).toBeInTheDocument();
});

it('render text area if not logged in', async () => {
	
	common.isLoggedIn = jest.fn().mockResolvedValue(false);
	common.isAdmin = jest.fn().mockResolvedValue(false);
	common.setFullscreen = jest.fn().mockResolvedValue(true);
	
	const history = createMemoryHistory();
	history.push({location: {pathname: "/log/write"}});
  
	render(
		<div id="root" className="div fullscreen">
			<Router location={history.location} history={history}>
				<Writer />
			</Router>
		</div>
	);
});