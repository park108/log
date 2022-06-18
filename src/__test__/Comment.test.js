import { render, screen } from '@testing-library/react'
import Comment from '../Comment/Comment';;
import CommentForm from '../Comment/CommentForm';
import CommentItem from '../Comment/CommentItem';

it('render comment button text correctly', () => {
	render(<Comment timestamp={1655302060414} />);
	const togglbutton = screen.getByText("... comments");
	expect(togglbutton).toBeInTheDocument();
});

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