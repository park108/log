import React, { useState, useEffect, lazy } from "react";
import { hasValue, getFormattedDate, getFormattedTime, isAdmin } from '../common/common';
import { useHoverPopup } from '../common/useHoverPopup';
import { activateOnKey } from '../common/a11y';

import styles from './Comment.module.css';

const CommentForm = lazy(() => import('./CommentForm'));

interface CommentReplyPayload {
	logTimestamp?: number;
	isAdminComment: boolean;
	message: string;
	name: string;
	commentTimestamp?: number;
	isHidden: boolean;
}

interface CommentItemProps {
	isHidden: boolean;
	isAdminComment: boolean;
	message: string;
	name: string;
	logTimestamp?: number;
	commentTimestamp?: number;
	timestamp: number;
	openReplyForm: (isOpened: boolean) => void;
	reply: (comment: CommentReplyPayload) => void;
	/** 성공한 전송의 세대 번호 — 성공했을 때만 올라간다 (`Comment.tsx`). */
	postedGeneration?: number;
}

const CommentItem = (props: CommentItemProps): React.ReactElement => {

	const [isShowReplyForm, setIsShowReplyForm] = useState<boolean>(false);

	const isHidden = props.isHidden;
	const isAdminComment = props.isAdminComment;
	const message = isHidden && !isAdmin() ? ["🥷 Hidden Message 🥷"] : props.message.split("\n");
	const name = isHidden && !isAdmin() ? "" : props.name + ", ";
	const logTimestamp = isHidden && !isAdmin() ? "" : props.logTimestamp;
	const commentTimestamp = props.commentTimestamp;
	const timestamp = isHidden && !isAdmin() ? "" : props.timestamp;

	// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
	// 기존 hoverPopup(event, "reply-popup-" + timestamp) 명령형 호출 대체.
	const replyPopup = useHoverPopup();

	const toggleReplyForm = (): void => {
		setIsShowReplyForm(!isShowReplyForm);
		props.openReplyForm(!isShowReplyForm);
	}

	// 보내기만 하고 닫지 않는다. 구 구현은 곧바로 닫아, 전송이 실패하면 사용자가
	// 쓴 답글이 결과를 보기도 전에 사라졌다 (`props.reply` 는 비동기이고 결과를
	// 돌려주지 않는다). 닫는 것은 성공 신호가 왔을 때다 (아래 effect).
	const postReply = (comment: CommentReplyPayload): void => {
		props.reply(comment);
	}

	const postedGeneration = props.postedGeneration;
	const openReplyForm = props.openReplyForm;
	useEffect(() => {
		setIsShowReplyForm(false);
		openReplyForm(false);
		// 세대가 오를 때만 닫는다 — 최초 렌더의 0 도 함께 지나가지만 그때는 이미 닫혀 있다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [postedGeneration]);

	const isReply = hasValue(commentTimestamp);

	const wrapperClassName = [
		'div',
		styles.divCommentItem,
		isReply && styles.divCommentReply,
	].filter(Boolean).join(' ');

	const timestampText
		= isHidden && !isAdmin()
		? ""
		: getFormattedDate(timestamp as number) + " " + getFormattedTime(timestamp as number);

	// 네이티브 button 으로 전환하지 않는다 (2026-08-29 판단) — LogItemInfo 의
	// link-copy-button 과 동일 구조다. 트리거가 팝업 div 를 품어 button 의 콘텐츠
	// 모델에 어긋나고, 팝업이 `position: fixed` + 좌표 부재라 형제로 빼면 정적
	// 위치가 바뀌어 오배치된다. 현 상태는 패턴 B 를 충족하는 온전한 손조립이다.
	const replyButton = isHidden && !isAdmin() ? ""
		: isReply ? ""
		: <div
			role="button"
			tabIndex={0}
			data-testid="reply-toggle-button"
			className={`div ${styles.divCommentReplybutton}`}
			// 🪃 글리프는 이름이 되지 못한다 — 스크린리더가 "부메랑" 으로 읽는다.
			// 아래 팝업은 `role="tooltip"` + `aria-describedby` 라 **설명**이지 이름이 아니다.
			aria-label="Reply this message"
			onClick={toggleReplyForm}
			onKeyDown={activateOnKey(toggleReplyForm)}
			{...replyPopup.triggerProps}
		>
			<span aria-hidden="true">🪃</span>

			{ replyPopup.isVisible && (
				<div
					data-testid={"reply-popup-" + timestamp}
					className="div div--logitem-linkmessage"
					{...replyPopup.contentProps}
				>
					Reply this message
				</div>
			) }
		</div>;

	const replyForm = isHidden && !isAdmin() ? ""
		: isShowReplyForm ? <CommentForm
				isReply={true}
				logTimestamp={logTimestamp as number | undefined}
				commentTimestamp={timestamp as number | undefined}
				post={postReply}
			/>
		: ""

	const messageClassName = [
		'div',
		styles.divCommentMessage,
		isHidden && styles.divCommentHidden,
		isAdmin() && styles.divCommentAdminhidden,
		isAdmin() && isHidden && styles.divCommentRevealhidden,
		isAdminComment ? styles.divCommentAdmin : styles.divCommentVisitor,
	].filter(Boolean).join(' ');

	return (
		<div className={wrapperClassName}>
			<div className={`div ${styles.divCommentContents}`}>
				<div className={messageClassName}>
					{message.map((sentence, index) => (
						<p key={index}>
							{sentence}
						</p>
					))}
				</div>
				{replyButton}
				<div className={`div ${styles.divCommentTimestamp}`}>
					<span>{name}</span>
					<span>{timestampText}</span>
				</div>
			</div>
			{replyForm}
		</div>
	);
}

export default CommentItem;
