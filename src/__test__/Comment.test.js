import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event';
import Comment from '../Comment/Comment';;
import CommentForm from '../Comment/CommentForm';
import CommentItem from '../Comment/CommentItem';
import { getComments, postComment } from '../Comment/api';

const unmockedFetch = global.fetch;

it('render comment button text correctly', async () => {
	
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

	await getComments(1655302060414, true);

	render(<Comment timestamp={1655302060414} />);
	const togglbutton = await screen.findByText("10 comments", {}, { timeout: 0});
	expect(togglbutton).toBeInTheDocument();

	global.fetch = unmockedFetch;
});

it('test call posting method', async () => {
	
	global.fetch = () =>
		Promise.resolve({
		json: () => Promise.resolve({
			res: {
				result: 200
			}
		})
	});

	process.env.NODE_ENV = 'production';
	await postComment("Test Posting in prod");

	process.env.NODE_ENV = 'development';
	await postComment("Test Posting in dev");

	global.fetch = unmockedFetch;
})

it('render comment form correctly', () => {
	render(<CommentForm timestamp={1655302060414} />);
	const placeholder = screen.getByPlaceholderText("Write your comment");
	expect(placeholder).toBeInTheDocument();
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
	const messageText = screen.getByText("Hidden message");
	expect(messageText).toBeInTheDocument();
});