import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history'
import Writer from '../Log/Writer';
import { Router } from 'react-router-dom';
import * as common from '../common/common';

console.error = jest.fn();

it('render empty text area correctly', () => {
  
	common.isLoggedIn = jest.fn().mockResolvedValue(true);
	common.isAdmin = jest.fn().mockResolvedValue(true);
  
	const history = createMemoryHistory();
  
	jest.mock("react-router-dom", () => ({
		...jest.requireActual("react-router-dom"),
		useLocation: () => ({
			pathname: "/log/write"
		})
	}));
  
	render(
		<div id="root" className="div fullscreen">
			<Router location={history.location} history={history}>
				<Writer />
			</Router>
		</div>
	);

	const textArea = screen.getByPlaceholderText("Take your note in markdown");
	expect(textArea).toBeInTheDocument();
});