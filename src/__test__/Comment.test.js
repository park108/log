import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event';
import Comment from '../Comment/Comment';;
import CommentItem from '../Comment/CommentItem';
import * as common from '../common/common';

const unmockedFetch = global.fetch;
console.log = jest.fn();
console.error = jest.fn();
const errorMessage = "API is down";

describe('render comment list and post comment correctly', () => {
	
	beforeEach(async () => {
		global.fetch = () =>
			Promise.resolve({
			json: () => Promise.resolve({
				body:{
					Items:[
						{"sortKey":"1655389504138-0000000000000","logTimestamp":1655302060414,"timestamp":1655389504138,"message":"나는 엉망으로 살고 있구나!","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655389797918-0000000000000","logTimestamp":1655302060414,"timestamp":1655389797918,"message":"내가 썼지만 숨겨져서 못보지롱?","isHidden":true,"isAdminComment":false,"name":"숨겨져있는 나"}
						,{"commentTimestamp":1655389797918,"sortKey":"1655389797918-1655389832698","logTimestamp":1655302060414,"timestamp":1655389832698,"message":"비밀 댓글이 아니지만, 비밀 댓글에 대댓글을 달았다.","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655392096432-0000000000000","logTimestamp":1655302060414,"timestamp":1655392096432,"message":"Posting Lock Test","isHidden":false,"isAdminComment":false,"name":"Posting!"}
						,{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392394275-0000000000000","logTimestamp":1655302060414,"timestamp":1655392394275,"message":"Posting Test 2","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392503660-0000000000000","logTimestamp":1655302060414,"timestamp":1655392503660,"message":"Posting Test4","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392407974-0000000000000","logTimestamp":1655302060414,"timestamp":1655392407974,"message":"Posting Test3","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655589447546-0000000000000","logTimestamp":1655302060414,"timestamp":1655589447546,"message":"Admin comment","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655589469726-0000000000000","logTimestamp":1655302060414,"timestamp":1655589469726,"message":"Admin Hidden","isHidden":true,"isAdminComment":true,"name":"Jongkil Park"}
					]
					,"Count":10,
					"ScannedCount":10
				}
			}),
		});

		process.env.NODE_ENV = 'development';

		render(<Comment timestamp={1655302060414} />);

		const togglebutton = await screen.findByText("10 comments", {}, { timeout: 0});
		expect(togglebutton).toBeInTheDocument();
		userEvent.click(togglebutton);
	});

	afterEach(() => {
		global.fetch = unmockedFetch;
	});

	it('test name not exists', async () => {
		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);
	});

	it('test comment not exists', async () => {
		const nameInput = await screen.findByPlaceholderText("Type your name");
		expect(nameInput).toBeDefined();
		userEvent.type(nameInput, 'Test name');

		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);
	});

	it('test all exists and submit -> OK', async () => {
		const nameInput = await screen.findByPlaceholderText("Type your name");
		expect(nameInput).toBeDefined();
		userEvent.type(nameInput, 'Test name');

		const textArea = await screen.findByPlaceholderText("Write your comment");
		expect(textArea).toBeDefined();
		userEvent.type(textArea, 'Test comment');

		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				statusCode: 200
			}),
		});

		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);
	});

	it('test all exists and submit -> error', async () => {
		const nameInput = await screen.findByPlaceholderText("Type your name");
		expect(nameInput).toBeDefined();
		userEvent.type(nameInput, 'Test name');
		
		const textArea = await screen.findByPlaceholderText("Write your comment");
		expect(textArea).toBeDefined();
		userEvent.type(textArea, 'Test comment');

		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				status: 404
			}),
		});

		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);
	});

	it('test all exists and submit -> server down', async () => {
		const nameInput = await screen.findByPlaceholderText("Type your name");
		expect(nameInput).toBeDefined();
		userEvent.type(nameInput, 'Test name');
		
		const textArea = await screen.findByPlaceholderText("Write your comment");
		expect(textArea).toBeDefined();
		userEvent.type(textArea, 'Test comment');

		global.fetch = () => Promise.reject(errorMessage);
		
		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);
	});
});

test('render only one comment', async () => {
	
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			body:{
				Items:[
					{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
				]
				,"Count":1,
				"ScannedCount":1
			}
		}),
	});

	process.env.NODE_ENV = 'production';

	render(<Comment timestamp={1655392348834} />);

	const togglebutton = await screen.findByText("1 comment", {}, { timeout: 0});
	expect(togglebutton).toBeInTheDocument();
	userEvent.click(togglebutton);

	global.fetch = unmockedFetch;
});

describe('render comment list and post comment correctly if admin logged in', () => {
	
	beforeEach(async () => {
		global.fetch = () =>
			Promise.resolve({
			json: () => Promise.resolve({
				body:{
					Items:[
						{"sortKey":"1655389504138-0000000000000","logTimestamp":1655302060414,"timestamp":1655389504138,"message":"나는 엉망으로 살고 있구나!","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655389797918-0000000000000","logTimestamp":1655302060414,"timestamp":1655389797918,"message":"내가 썼지만 숨겨져서 못보지롱?","isHidden":true,"isAdminComment":false,"name":"숨겨져있는 나"}
						,{"commentTimestamp":1655389797918,"sortKey":"1655389797918-1655389832698","logTimestamp":1655302060414,"timestamp":1655389832698,"message":"비밀 댓글이 아니지만, 비밀 댓글에 대댓글을 달았다.","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655392096432-0000000000000","logTimestamp":1655302060414,"timestamp":1655392096432,"message":"Posting Lock Test","isHidden":false,"isAdminComment":false,"name":"Posting!"}
						,{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392394275-0000000000000","logTimestamp":1655302060414,"timestamp":1655392394275,"message":"Posting Test 2","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392407974-0000000000000","logTimestamp":1655302060414,"timestamp":1655392407974,"message":"Posting Test3","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392503660-0000000000000","logTimestamp":1655302060414,"timestamp":1655392503660,"message":"Posting Test4","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655589447546-0000000000000","logTimestamp":1655302060414,"timestamp":1655589447546,"message":"Admin comment","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655589469726-0000000000000","logTimestamp":1655302060414,"timestamp":1655589469726,"message":"Admin Hidden","isHidden":true,"isAdminComment":true,"name":"Jongkil Park"}
					]
					,"Count":10,
					"ScannedCount":10
				}
			}),
		});

		common.isAdmin = jest.fn().mockResolvedValue(true);
		render(<Comment timestamp={1655302060414} />);

		const togglebutton = await screen.findByText("10 comments", {}, { timeout: 0});
		expect(togglebutton).toBeInTheDocument();
		userEvent.click(togglebutton);
	});

	afterEach(() => {
		global.fetch = unmockedFetch;
	});

	it('test all exists and submit -> OK', async () => {
		const textArea = await screen.findByPlaceholderText("Write your comment");
		expect(textArea).toBeDefined();
		userEvent.type(textArea, 'Test comment');

		process.env.NODE_ENV = 'production';

		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				statusCode: 200
			}),
		});

		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);
	});

	it('test all exists and reply -> OK', async () => {

		const replyButtons = await screen.findAllByTestId("reply-toggle-button");
		expect(replyButtons[0]).toBeInTheDocument();
		userEvent.click(replyButtons[0]);

		const textArea = await screen.findByPlaceholderText("Write your Reply");
		expect(textArea).toBeDefined();
		userEvent.type(textArea, 'Test reply');

		process.env.NODE_ENV = '';

		global.fetch = () => Promise.resolve({
			json: () => Promise.resolve({
				statusCode: 200
			}),
		});

		const submitButton = await screen.findByText("Submit");
		expect(submitButton).toBeDefined();
		userEvent.click(submitButton);

		const replyPopup = await screen.findByTestId("reply-popup-1655389504138");
		expect(replyPopup).toBeDefined();
	
		fireEvent.mouseOver(replyButtons[0]);
		fireEvent.mouseOver(replyButtons[0]); // Already class changed
		fireEvent.mouseMove(replyButtons[0]);
		fireEvent.mouseOut(replyButtons[0]);
		fireEvent.mouseOut(replyButtons[0]); // Already class changed
	});
});

it('render comment list if it has error', async () => {
	
	// fetchData -> return error
	global.fetch = () => Promise.resolve({
		json: () => Promise.resolve({
			errorType: "404"
		}),
	});

	render(<Comment timestamp={1655302060414} />);
	const togglbutton = await screen.findByText("Add a comment", {}, { timeout: 0});
	expect(togglbutton).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('render comment item correctly', () => {
	const message = "Wow, this is message";
	render(
		<CommentItem
			isHidden={false}
			isAdminComment={false}
			message={message}
			name="Tester"
			logTimestamp={1655302060414}
			commentTimestamp={1655302099999}
			timestamp={1655302060414}
		/>
	);
	const messageText = screen.getByText(message);
	expect(messageText).toBeInTheDocument();
});

it('render hidden comment item correctly', () => {
	const message = "Wow, this is message";
	render(
		<CommentItem
			isHidden={true}
			isAdminComment={false}
			message={message}
			name="Tester"
			logTimestamp={1655302060414}
			commentTimestamp={1655302099999}
			timestamp={1655302060414}
		/>
	);
	const messageText = screen.getByText("🥷 Hidden Message 🥷");
	expect(messageText).toBeInTheDocument();
});