import { render, screen, fireEvent } from '@testing-library/react';
import * as common from '../common/common';
import CommentForm from './CommentForm';

// CommentForm 은 지금까지 Comment.test.tsx 를 통해 간접적으로만 커버되어
// 실행 환경에 따라 분기 커버리지가 흔들렸다 (CI 11/14 vs 로컬 13/14).
// 본 스위트는 form 을 props 직접 주입으로 고립 렌더해 분기를 결정론적으로 고정한다:
//   1) 이름 미입력 / 메시지 5자 미만 validation 2경로 + 정상 제출
//   2) isAdmin() true/false (이름 prefill + 입력 비활성)
//   3) isPosting true/false (textarea 비활성 ↔ 메시지 초기화)
//   4) commentTimestamp 유무에 따른 reply/comment 문구 분기
//   5) hidden 체크박스 반영

describe('CommentForm validation', () => {

	it('blocks submit and focuses the name input when the name is empty', () => {
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
		const post = vi.fn();

		render(<CommentForm logTimestamp={1655302060414} post={post} />);

		fireEvent.click(screen.getByText('Submit Comment'));

		expect(post).not.toHaveBeenCalled();
		expect(alertSpy).toHaveBeenCalledWith('Please input your name.');
		expect(screen.getByPlaceholderText('Type your name')).toHaveFocus();
	});

	it('blocks submit and focuses the textarea when the message is shorter than 5 characters', () => {
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
		const post = vi.fn();

		render(<CommentForm logTimestamp={1655302060414} post={post} />);

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: 'Tester' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: 'four' } });
		fireEvent.click(screen.getByText('Submit Comment'));

		expect(post).not.toHaveBeenCalled();
		expect(alertSpy).toHaveBeenCalledWith('Please comment at least 5 characters.');
		expect(screen.getByPlaceholderText('Write your comment')).toHaveFocus();
	});

	it('posts the payload once the name and a 5+ character message are present', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		const post = vi.fn();

		render(<CommentForm logTimestamp={1655302060414} post={post} />);

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: 'Tester' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: 'Hello there' } });
		fireEvent.click(screen.getByText('Submit Comment'));

		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith({
			logTimestamp: 1655302060414,
			isAdminComment: false,
			message: 'Hello there',
			name: 'Tester',
			commentTimestamp: undefined,
			isHidden: false,
		});
	});

	it('carries the hidden flag from the checkbox into the payload', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		const post = vi.fn();

		render(<CommentForm logTimestamp={1655302060414} post={post} />);

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: 'Tester' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: 'Hello there' } });
		fireEvent.click(screen.getByLabelText('🥷 Hidden Message'));
		fireEvent.click(screen.getByText('Submit Comment'));

		expect(post).toHaveBeenCalledWith(expect.objectContaining({ isHidden: true }));
	});
});

describe('CommentForm admin branch', () => {

	it('prefills and disables the name input when the visitor is an admin', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		const post = vi.fn();

		render(<CommentForm logTimestamp={1655302060414} post={post} />);

		const nameInput = screen.getByPlaceholderText('Type your name');
		expect(nameInput).toHaveValue('Jongkil Park');
		expect(nameInput).toBeDisabled();

		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: 'Admin says hi' } });
		fireEvent.click(screen.getByText('Submit Comment'));

		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			isAdminComment: true,
			name: 'Jongkil Park',
		}));
	});

	it('leaves the name input empty and enabled for a non-admin visitor', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		render(<CommentForm logTimestamp={1655302060414} post={vi.fn()} />);

		const nameInput = screen.getByPlaceholderText('Type your name');
		expect(nameInput).toHaveValue('');
		expect(nameInput).toBeEnabled();
	});
});

describe('CommentForm posting state', () => {

	it('disables the inputs while posting and clears the message once posting ends', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		const post = vi.fn();

		const { rerender } = render(<CommentForm logTimestamp={1655302060414} post={post} isPosting={false} />);

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: 'Tester' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: 'Hello there' } });
		expect(screen.getByPlaceholderText('Write your comment')).toHaveValue('Hello there');

		rerender(<CommentForm logTimestamp={1655302060414} post={post} isPosting={true} />);

		expect(screen.getByPlaceholderText('Write your comment')).toBeDisabled();
		expect(screen.getByPlaceholderText('Type your name')).toBeDisabled();

		rerender(<CommentForm logTimestamp={1655302060414} post={post} isPosting={false} />);

		expect(screen.getByPlaceholderText('Write your comment')).toBeEnabled();
		expect(screen.getByPlaceholderText('Write your comment')).toHaveValue('');
	});
});

describe('CommentForm reply variant', () => {

	it('uses the comment wording when no commentTimestamp is given', () => {
		render(<CommentForm logTimestamp={1655302060414} post={vi.fn()} />);

		expect(screen.getByPlaceholderText('Write your comment')).toBeInTheDocument();
		expect(screen.getByText('Submit Comment')).toBeInTheDocument();
	});

	it('uses the reply wording and forwards commentTimestamp when replying', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		const post = vi.fn();

		render(
			<CommentForm
				logTimestamp={1655302060414}
				commentTimestamp={1655302099999}
				post={post}
				isReply={true}
			/>
		);

		expect(screen.getByPlaceholderText('Write your Reply')).toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: 'Tester' } });
		fireEvent.change(screen.getByPlaceholderText('Write your Reply'), { target: { value: 'This is my reply' } });
		fireEvent.click(screen.getByText('Send Reply'));

		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			commentTimestamp: 1655302099999,
			message: 'This is my reply',
		}));
	});
});

// 공백만 넣은 것은 안 넣은 것이다. 길이를 날것으로 재던 동안 이름 "   " 과
// 본문 "     " 이 검증을 통과해, 이름도 본문도 비어 보이는 댓글이 올라갔다.
describe('CommentForm 공백만 입력', () => {

	const setup = () => {
		const post = vi.fn();
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(<CommentForm post={post} />);
		return { post, alertSpy };
	};

	it('이름이 공백뿐이면 보내지 않는다', () => {

		const { post, alertSpy } = setup();

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: '   ' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: '안녕하세요 반갑습니다' } });
		fireEvent.click(screen.getByRole('button', { name: 'Submit Comment' }));

		expect(post).not.toHaveBeenCalled();
		expect(alertSpy).toHaveBeenCalledWith('Please input your name.');
	});

	it('본문이 공백뿐이면 보내지 않는다', () => {

		const { post, alertSpy } = setup();

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: '홍길동' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: '       ' } });
		fireEvent.click(screen.getByRole('button', { name: 'Submit Comment' }));

		expect(post).not.toHaveBeenCalled();
		expect(alertSpy).toHaveBeenCalledWith('Please comment at least 5 characters.');
	});

	it('앞뒤 공백을 걷어내고 보낸다', () => {

		const { post } = setup();

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: '  홍길동  ' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: '\n  안녕하세요 반갑습니다  \n' } });
		fireEvent.click(screen.getByRole('button', { name: 'Submit Comment' }));

		expect(post).toHaveBeenCalledTimes(1);
		expect(post.mock.calls[0]![0]).toMatchObject({ name: '홍길동', message: '안녕하세요 반갑습니다' });
	});

	// 대조 — 정상 입력은 그대로 통과해야 한다. 없으면 "언제나 거부" 구현도 통과한다.
	it('정상 입력은 그대로 보낸다', () => {

		const { post, alertSpy } = setup();

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: '홍길동' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: '잘 읽었습니다' } });
		fireEvent.click(screen.getByRole('button', { name: 'Submit Comment' }));

		expect(alertSpy).not.toHaveBeenCalled();
		expect(post).toHaveBeenCalledTimes(1);
	});
});
