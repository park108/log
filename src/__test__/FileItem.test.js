import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import FileItem from '../File/FileItem';
import { deleteFile } from '../File/api';

const unmockedFetch = global.fetch;

describe('render file item name "20220606_log_CQRS.png" correctly', () => {
	
	const fileName = "20220606_log_CQRS.png";
	
	it("test button click events", () => {

		window.confirm = jest.fn();
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
		const deleteButton = buttons[1];
	
		expect(fileButton).toBeInTheDocument();
		expect(deleteButton).toBeInTheDocument();
	
		userEvent.click(fileButton);
		userEvent.click(deleteButton);
	});

	it("test delete file", async () => {
		
		global.fetch = () => {
			Promise.resolve({
				json: () => Promise.resolve({
					res: {
						status: 200
					}
				})
			});
		}

		await deleteFile(fileName);

		global.fetch = unmockedFetch;
	});
});