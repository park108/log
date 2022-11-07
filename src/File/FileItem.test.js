import { render, screen, fireEvent } from '@testing-library/react';
import FileItem from '../File/FileItem';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

describe('render file item name "20220606_log_CQRS.png" correctly', () => {
	
	const fileName = "20220606_log_CQRS.png";
	
	it("test button click events", () => {

		jest.useFakeTimers();
		document.execCommand = jest.fn();
		
		render(<FileItem 
			key={fileName}
			fileName={fileName}
			url={"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/" + fileName}
			lastModified={1656034616036}
			size={1000000}
		/>);
	
		const item = screen.getByRole("listitem");
		expect(item).toBeInTheDocument();

		const buttons = screen.getAllByRole("button");
		const fileButton = buttons[0];
		expect(fileButton).toBeInTheDocument();
		fireEvent.click(fileButton);

		jest.runAllTimers();
		jest.useRealTimers();
	});

	it("test delete file", async () => {

		window.confirm = jest.fn(() => true);
		
		render(<FileItem 
			key={fileName}
			fileName={fileName}
			url={"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/" + fileName}
			lastModified={1656034616036}
			size={1000000}
		/>);

		const deleteButton = await screen.findByText("✕");
		expect(deleteButton).toBeInTheDocument();
		
		// Delete -> Server error
		global.fetch = () => Promise.reject(errorMessage);
		process.env.NODE_ENV = '';
		fireEvent.click(deleteButton);
		
		// Delete -> Error
		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				status: 404
			}),
		});
		process.env.NODE_ENV = 'development';
		fireEvent.click(deleteButton);
		
		// Delete -> OK
		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				statusCode: 200
			}),
		});
		process.env.NODE_ENV = 'production';
		fireEvent.click(deleteButton);

		global.fetch = unmockedFetch;
	});
});