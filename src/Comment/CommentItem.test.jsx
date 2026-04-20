import { render, screen, act, fireEvent } from '@testing-library/react';
import * as common from '../common/common';
import CommentItem from './CommentItem';

// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02, FR-07
// 목적: CommentItem 의 reply-toggle 버튼 popup (useHoverPopup 이관) 이
//   1) 기본 콘텐츠 렌더는 유지되고 (회귀 보호),
//   2) 초기 popup content 는 미렌더,
//   3) focus 시 "Reply this message" 가 role="tooltip" 으로 노출,
//   4) blur + 100ms 후 숨김,
//   5) Escape 로 즉시 닫힘
// 되는지 확인.

describe('CommentItem rendering + hoverPopup migration', () => {

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('renders comment item message (regression guard)', () => {
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
		expect(screen.getByText(message)).toBeInTheDocument();
	});

	it('renders hidden comment placeholder when non-admin', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(
			<CommentItem
				isHidden={true}
				isAdminComment={false}
				message="secret"
				name="Tester"
				logTimestamp={1655302060414}
				commentTimestamp={1655302099999}
				timestamp={1655302060414}
			/>
		);
		expect(screen.getByText("🥷 Hidden Message 🥷")).toBeInTheDocument();
	});

	it('reply popup is not in DOM until the toggle button receives focus', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(
			<CommentItem
				isHidden={false}
				isAdminComment={false}
				message="hi"
				name="Tester"
				logTimestamp={1655302060414}
				timestamp={1655302060414}
				openReplyForm={() => {}}
				reply={() => {}}
			/>
		);

		expect(screen.queryByText('Reply this message')).toBeNull();
	});

	it('focus on reply button shows popup with aria-describedby; blur hides after 100ms', () => {
		vi.useFakeTimers();
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(
			<CommentItem
				isHidden={false}
				isAdminComment={false}
				message="hi"
				name="Tester"
				logTimestamp={1655302060414}
				timestamp={1655302060414}
				openReplyForm={() => {}}
				reply={() => {}}
			/>
		);

		const replyButton = screen.getByTestId('reply-toggle-button');

		act(() => {
			fireEvent.focus(replyButton);
		});

		const popup = screen.getByText('Reply this message');
		expect(popup).toBeInTheDocument();
		expect(popup).toHaveAttribute('role', 'tooltip');
		expect(popup).toHaveAttribute('aria-hidden', 'false');

		const describedBy = replyButton.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		expect(popup.getAttribute('id')).toBe(describedBy);

		act(() => {
			fireEvent.blur(replyButton);
			vi.advanceTimersByTime(100);
		});

		expect(screen.queryByText('Reply this message')).toBeNull();
	});

	it('Escape key closes popup immediately (dismissible, WCAG 2.1 SC 1.4.13)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		render(
			<CommentItem
				isHidden={false}
				isAdminComment={false}
				message="hi"
				name="Tester"
				logTimestamp={1655302060414}
				timestamp={1655302060414}
				openReplyForm={() => {}}
				reply={() => {}}
			/>
		);

		const replyButton = screen.getByTestId('reply-toggle-button');
		act(() => {
			fireEvent.focus(replyButton);
		});
		expect(screen.getByText('Reply this message')).toBeInTheDocument();

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		});

		expect(screen.queryByText('Reply this message')).toBeNull();
	});
});
