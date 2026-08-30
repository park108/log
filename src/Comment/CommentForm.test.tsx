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

	// 이 테스트는 "전송이 끝나면 본문을 비운다" 를 못 박고 있었다. 그런데 이 폼은
	// 전송 **결과**를 모른다 — `isPosting` 은 실패해도 내려간다. 그래서 전송이
	// 실패하면 공들여 쓴 댓글이 사라졌다 (실측: 실패 후 본문 ""). 비우는 신호를
	// 성공 전용(`postedGeneration`)으로 옮겼으므로 계약을 사실에 맞게 고쳐 적는다.
	it('disables the inputs while posting and re-enables them without clearing', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		const post = vi.fn();

		const { rerender } = render(<CommentForm logTimestamp={1655302060414} post={post} isPosting={false} postedGeneration={0} />);

		fireEvent.change(screen.getByPlaceholderText('Type your name'), { target: { value: 'Tester' } });
		fireEvent.change(screen.getByPlaceholderText('Write your comment'), { target: { value: 'Hello there' } });
		expect(screen.getByPlaceholderText('Write your comment')).toHaveValue('Hello there');

		rerender(<CommentForm logTimestamp={1655302060414} post={post} isPosting={true} postedGeneration={0} />);

		expect(screen.getByPlaceholderText('Write your comment')).toBeDisabled();
		expect(screen.getByPlaceholderText('Type your name')).toBeDisabled();

		rerender(<CommentForm logTimestamp={1655302060414} post={post} isPosting={false} postedGeneration={0} />);

		expect(screen.getByPlaceholderText('Write your comment')).toBeEnabled();
		expect(screen.getByPlaceholderText('Write your comment')).toHaveValue('Hello there');
	});
});

// 이 폼은 전송 결과를 모른다. `isPosting` 이 내려가는 것을 완료 신호로 쓰면
// **실패해도** 비워진다 — 실측: 전송 실패 후 본문이 "" 가 됐고 사용자는 처음부터
// 다시 써야 했다. 성공만 가리키는 신호(`postedGeneration`)를 따로 받는다.
describe('CommentForm 성공 신호', () => {

	const nameBox = () => screen.getByPlaceholderText('Type your name');
	const bodyBox = () => screen.getByPlaceholderText('Write your comment');
	const hiddenBox = () => document.querySelector('input[type="checkbox"]') as HTMLInputElement;

	const fill = () => {
		fireEvent.change(nameBox(), { target: { value: '홍길동' } });
		fireEvent.change(bodyBox(), { target: { value: '공들여 쓴 긴 댓글입니다' } });
		fireEvent.click(hiddenBox());
	};

	it('실패하면 쓴 글과 숨김 선택이 남는다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		const { rerender } = render(<CommentForm logTimestamp={1} post={vi.fn()} isPosting={false} postedGeneration={3} />);
		fill();

		// 전송 중 → 실패 (세대는 그대로)
		rerender(<CommentForm logTimestamp={1} post={vi.fn()} isPosting={true} postedGeneration={3} />);
		rerender(<CommentForm logTimestamp={1} post={vi.fn()} isPosting={false} postedGeneration={3} />);

		expect(bodyBox()).toHaveValue('공들여 쓴 긴 댓글입니다');
		expect(hiddenBox().checked).toBe(true);
	});

	it('성공하면 쓴 글과 숨김 선택이 모두 비워진다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		const { rerender } = render(<CommentForm logTimestamp={1} post={vi.fn()} isPosting={false} postedGeneration={3} />);
		fill();

		// 전송 중 → 성공 (세대가 오른다)
		rerender(<CommentForm logTimestamp={1} post={vi.fn()} isPosting={true} postedGeneration={3} />);
		rerender(<CommentForm logTimestamp={1} post={vi.fn()} isPosting={false} postedGeneration={4} />);

		expect(bodyBox()).toHaveValue('');
		expect(hiddenBox().checked).toBe(false);
	});

	// 숨김 체크박스가 uncontrolled 이던 동안, 한 번 숨김으로 올린 뒤에는 **다음
	// 댓글도 숨김으로 나갔다** (실측: 두 번째 전송의 isHidden 이 true). 체크한
	// 적이 없는 사람은 자기 글이 안 보이는 이유를 알 수 없다.
	it('성공 뒤 다음 댓글은 숨김으로 나가지 않는다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		const post = vi.fn();

		const { rerender } = render(<CommentForm logTimestamp={1} post={post} isPosting={false} postedGeneration={0} />);
		fill();
		fireEvent.submit(bodyBox().closest('form') as HTMLFormElement);
		expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ isHidden: true }));

		rerender(<CommentForm logTimestamp={1} post={post} isPosting={false} postedGeneration={1} />);

		fireEvent.change(bodyBox(), { target: { value: '두 번째 댓글입니다' } });
		fireEvent.submit(bodyBox().closest('form') as HTMLFormElement);

		expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ isHidden: false }));
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

// 정적 게이트(`__tests__/form-control-accessible-name`)는 속성이 있는지만 본다.
// 실제로 이름이 계산되는지는 접근성 트리에서 확인한다 — 실측으로 이 두 칸의
// 접근 이름이 "" 였다.
describe('CommentForm 접근 이름', () => {

	it('이름 칸과 본문 칸이 접근 이름을 갖는다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(<CommentForm post={() => {}} />);

		expect(screen.getByRole('textbox', { name: 'Type your name' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: 'Write your comment' })).toBeInTheDocument();
	});

	it('답글일 때는 답글 문구로 이름이 선다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(<CommentForm post={() => {}} isReply={true} commentTimestamp={1656034616036} />);

		expect(screen.getByRole('textbox', { name: 'Write your Reply' })).toBeInTheDocument();
	});
});

// 포커스는 **답글 폼일 때만** 옮긴다.
//
// 예전에는 이름 칸에 `autoFocus` 가 붙어 있었다. 이 폼은 댓글을 **펼치는 순간**
// 함께 렌더되므로, 읽으려고 "N comments" 를 누른 사람의 포커스가 입력칸으로
// 끌려갔다 (실측: `body` → `input[Type your name]`). 그 칸은 댓글 목록 아래에
// 있어 방금 보려던 댓글들을 지나쳐 스크롤된다.
//
// 관리자에게는 그 `autoFocus` 가 애초에 무효였다 — 같은 칸이 `disabled` 라
// 브라우저가 무시한다 (실측: 답글을 열어도 포커스가 트리거에 남았다).
describe('CommentForm 포커스', () => {

	const activeTag = () => {
		const el = document.activeElement as HTMLElement | null;
		return !el || el === document.body ? 'body' : el.tagName.toLowerCase();
	};

	it('일반 댓글 폼은 포커스를 가져가지 않는다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		render(<CommentForm logTimestamp={1} post={vi.fn()} />);

		expect(activeTag()).toBe('body');
	});

	// 반대 방향 — 답글은 사용자가 쓰려고 연 것이므로 옮겨야 한다.
	it('답글 폼은 첫 활성 칸으로 옮긴다 (방문자)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		render(<CommentForm logTimestamp={1} commentTimestamp={2} isReply={true} post={vi.fn()} />);

		expect(document.activeElement).toBe(screen.getByPlaceholderText('Type your name'));
	});

	// 관리자는 이름 칸이 비활성이라 그쪽으로 옮기면 아무 일도 일어나지 않는다.
	it('답글 폼은 첫 활성 칸으로 옮긴다 (관리자)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		render(<CommentForm logTimestamp={1} commentTimestamp={2} isReply={true} post={vi.fn()} />);

		expect(screen.getByPlaceholderText('Type your name')).toBeDisabled();
		expect(document.activeElement).toBe(screen.getByPlaceholderText('Write your Reply'));
	});
});
