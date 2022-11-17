import { render, screen, fireEvent } from '@testing-library/react'
import * as mock from './api.mock'
import userEvent from '@testing-library/user-event';
import Comment from './Comment';;
import CommentItem from './CommentItem';
import * as common from '../common/common';

// const unmockedFetch = global.fetch;
// console.log = jest.fn();
// console.error = jest.fn();

test('render comment list and post comment correctly on dev server', async () => {

	mock.devServerOk.listen();
	jest.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});

	process.env.NODE_ENV = 'development';

	render(<Comment timestamp={1655302060414} />);

	const togglebutton = await screen.findByText("10 comments");
	expect(togglebutton).toBeInTheDocument();
	fireEvent.click(togglebutton);

	// Validation error -> No name and comment
	const submitButton = await screen.findByText("Submit Comment");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	// Add name
	const nameInput = await screen.findByPlaceholderText("Type your name");
	expect(nameInput).toBeDefined();
	fireEvent.change(nameInput, {target: {value: 'Test name'}});

	// Validation error -> No comment
	const submitButton2 = await screen.findByText("Submit Comment");
	expect(submitButton2).toBeDefined();
	fireEvent.click(submitButton2);

	// Add comment
	const textArea = await screen.findByPlaceholderText("Write your comment");
	expect(textArea).toBeDefined();
	fireEvent.change(textArea, {target: {value: 'Test comment'}});

	// Ok!
	const submitButton3 = await screen.findByText("Submit Comment");
	expect(submitButton3).toBeDefined();
	fireEvent.click(submitButton3);

	// Change comment
	const textArea2 = await screen.findByPlaceholderText("Write your comment");
	expect(textArea2).toBeDefined();
	fireEvent.change(textArea2, {target: {value: ''}});

	// Ok!
	const submitButton4 = await screen.findByText("Submit Comment");
	expect(submitButton4).toBeDefined();
	fireEvent.click(submitButton4);

	mock.devServerOk.resetHandlers();
	mock.devServerOk.close();
});

test('render comment list and post comment correctly on prod server', async () => {

	mock.prodServerOk.listen();
	jest.spyOn(window, 'alert').mockImplementation((message) => {
		console.log("INPUT MESSAGE on ALERT = " + message);
	});

	process.env.NODE_ENV = 'production';

	render(<Comment timestamp={1655302060414} />);

	const togglebutton = await screen.findByText("1 comment");
	expect(togglebutton).toBeInTheDocument();
	fireEvent.click(togglebutton);

	// Validation error -> No name and comment
	const submitButton = await screen.findByText("Submit Comment");
	expect(submitButton).toBeDefined();
	fireEvent.click(submitButton);

	// Add name
	const nameInput = await screen.findByPlaceholderText("Type your name");
	expect(nameInput).toBeDefined();
	fireEvent.change(nameInput, {target: {value: 'Test name'}});

	// Validation error -> No comment
	const submitButton2 = await screen.findByText("Submit Comment");
	expect(submitButton2).toBeDefined();
	fireEvent.click(submitButton2);

	// Add comment
	const textArea = await screen.findByPlaceholderText("Write your comment");
	expect(textArea).toBeDefined();
	fireEvent.change(textArea, {target: {value: 'Test comment'}});

	// Ok!
	const submitButton3 = await screen.findByText("Submit Comment");
	expect(submitButton3).toBeDefined();
	fireEvent.click(submitButton3);

	// Change comment
	const textArea2 = await screen.findByPlaceholderText("Write your comment");
	expect(textArea2).toBeDefined();
	fireEvent.change(textArea2, {target: {value: ''}});

	// Ok!
	const submitButton4 = await screen.findByText("Submit Comment");
	expect(submitButton4).toBeDefined();
	fireEvent.click(submitButton4);

	mock.prodServerOk.resetHandlers();
	mock.prodServerOk.close();
});

// describe('render comment list and post comment correctly if admin logged in', () => {
	
// 	beforeEach(async () => {
// 		global.fetch = () =>
// 			Promise.resolve({
// 			json: () => Promise.resolve({
// 				body:{
// 					Items:[
// 						{"sortKey":"1655389504138-0000000000000","logTimestamp":1655302060414,"timestamp":1655389504138,"message":"나는 엉망으로 살고 있구나!","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
// 						,{"sortKey":"1655389797918-0000000000000","logTimestamp":1655302060414,"timestamp":1655389797918,"message":"내가 썼지만 숨겨져서 못보지롱?","isHidden":true,"isAdminComment":false,"name":"숨겨져있는 나"}
// 						,{"commentTimestamp":1655389797918,"sortKey":"1655389797918-1655389832698","logTimestamp":1655302060414,"timestamp":1655389832698,"message":"비밀 댓글이 아니지만, 비밀 댓글에 대댓글을 달았다.","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
// 						,{"sortKey":"1655392096432-0000000000000","logTimestamp":1655302060414,"timestamp":1655392096432,"message":"Posting Lock Test","isHidden":false,"isAdminComment":false,"name":"Posting!"}
// 						,{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
// 						,{"sortKey":"1655392394275-0000000000000","logTimestamp":1655302060414,"timestamp":1655392394275,"message":"Posting Test 2","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
// 						,{"sortKey":"1655392407974-0000000000000","logTimestamp":1655302060414,"timestamp":1655392407974,"message":"Posting Test3","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
// 						,{"sortKey":"1655392503660-0000000000000","logTimestamp":1655302060414,"timestamp":1655392503660,"message":"Posting Test4","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
// 						,{"sortKey":"1655589447546-0000000000000","logTimestamp":1655302060414,"timestamp":1655589447546,"message":"Admin comment","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
// 						,{"sortKey":"1655589469726-0000000000000","logTimestamp":1655302060414,"timestamp":1655589469726,"message":"Admin Hidden","isHidden":true,"isAdminComment":true,"name":"Jongkil Park"}
// 					]
// 					,"Count":10,
// 					"ScannedCount":10
// 				}
// 			}),
// 		});

// 		common.isAdmin = jest.fn().mockResolvedValue(true);
// 		render(<Comment timestamp={1655302060414} />);

// 		const togglebutton = await screen.findByText("10 comments");
// 		expect(togglebutton).toBeInTheDocument();
// 		fireEvent.click(togglebutton);
// 	});

// 	afterEach(() => {
// 		global.fetch = unmockedFetch;
// 	});

// 	it('test all exists and submit -> OK', async () => {
// 		const textArea = await screen.findByPlaceholderText("Write your comment");
// 		expect(textArea).toBeDefined();
// 		userEvent.type(textArea, 'Test comment');

// 		process.env.NODE_ENV = 'production';

// 		global.fetch = () => Promise.resolve({
// 			json: () => Promise.resolve({
// 				statusCode: 200
// 			}),
// 		});

// 		const submitButton = await screen.findByText("Submit Comment");
// 		expect(submitButton).toBeDefined();
// 		fireEvent.click(submitButton);
// 	});

// 	it('test all exists and reply -> OK', async () => {

// 		const replyButtons = await screen.findAllByTestId("reply-toggle-button");
// 		expect(replyButtons[0]).toBeInTheDocument();
// 		fireEvent.click(replyButtons[0]);

// 		const textArea = await screen.findByPlaceholderText("Write your Reply");
// 		expect(textArea).toBeDefined();
// 		userEvent.type(textArea, 'Test reply');

// 		process.env.NODE_ENV = '';

// 		global.fetch = () => Promise.resolve({
// 			json: () => Promise.resolve({
// 				statusCode: 200
// 			}),
// 		});

// 		const submitButton = await screen.findByText("Send Reply");
// 		expect(submitButton).toBeDefined();
// 		fireEvent.click(submitButton);

// 		const replyPopup = await screen.findByTestId("reply-popup-1655389504138");
// 		expect(replyPopup).toBeDefined();
	
// 		fireEvent.mouseOver(replyButtons[0]);
// 		fireEvent.mouseOver(replyButtons[0]); // Already class changed
// 		fireEvent.mouseMove(replyButtons[0]);
// 		fireEvent.mouseOut(replyButtons[0]);
// 		fireEvent.mouseOut(replyButtons[0]); // Already class changed
// 	});
// });

// it('render comment list if it has error', async () => {
	
// 	// fetchData -> return error
// 	global.fetch = () => Promise.resolve({
// 		json: () => Promise.resolve({
// 			errorType: "404"
// 		}),
// 	});

// 	render(<Comment timestamp={1655302060414} />);
// 	const togglbutton = await screen.findByText("Add a comment");
// 	expect(togglbutton).toBeInTheDocument();

// 	global.fetch = unmockedFetch;
// });

// it('render comment item correctly', () => {
// 	const message = "Wow, this is message";
// 	render(
// 		<CommentItem
// 			isHidden={false}
// 			isAdminComment={false}
// 			message={message}
// 			name="Tester"
// 			logTimestamp={1655302060414}
// 			commentTimestamp={1655302099999}
// 			timestamp={1655302060414}
// 		/>
// 	);
// 	const messageText = screen.getByText(message);
// 	expect(messageText).toBeInTheDocument();
// });

// it('render hidden comment item correctly', () => {
// 	const message = "Wow, this is message";
// 	render(
// 		<CommentItem
// 			isHidden={true}
// 			isAdminComment={false}
// 			message={message}
// 			name="Tester"
// 			logTimestamp={1655302060414}
// 			commentTimestamp={1655302099999}
// 			timestamp={1655302060414}
// 		/>
// 	);
// 	const messageText = screen.getByText("🥷 Hidden Message 🥷");
// 	expect(messageText).toBeInTheDocument();
// });