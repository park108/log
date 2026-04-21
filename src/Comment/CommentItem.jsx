import React, { useState, lazy } from "react";
import PropTypes from 'prop-types';
import { hasValue, getFormattedDate, getFormattedTime, isAdmin } from '../common/common';
import { useHoverPopup } from '../common/useHoverPopup';
import { activateOnKey } from '../common/a11y';

import styles from './Comment.module.css';

const CommentForm = lazy(() => import('./CommentForm'));

const CommentItem = (props) => {

	const [isShowReplyForm, setIsShowReplyForm] = useState(false);

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

	const toggleReplyForm = () => {
		setIsShowReplyForm(!isShowReplyForm);
		props.openReplyForm(!isShowReplyForm);
	}

	const postReply = (comment) => {
		props.reply(comment);
		setIsShowReplyForm(false);
	}

	const isReply = hasValue(commentTimestamp);

	const wrapperClassName = [
		'div',
		styles.divCommentItem,
		isReply && styles.divCommentReply,
	].filter(Boolean).join(' ');

	const timestampText
		= isHidden && !isAdmin()
		? ""
		: getFormattedDate(timestamp) + " " + getFormattedTime(timestamp);

	const replyButton = isHidden && !isAdmin() ? ""
		: isReply ? ""
		: <div
			role="button"
			tabIndex={0}
			data-testid="reply-toggle-button"
			className={`div ${styles.divCommentReplybutton}`}
			onClick={toggleReplyForm}
			onKeyDown={activateOnKey(toggleReplyForm)}
			{...replyPopup.triggerProps}
		>
			🪃

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
				logTimestamp={logTimestamp}
				commentTimestamp={timestamp}
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

CommentItem.propTypes = {
	isHidden: PropTypes.bool,
	isAdminComment: PropTypes.bool,
	message: PropTypes.string,
	name: PropTypes.string,
	logTimestamp: PropTypes.number,
	commentTimestamp: PropTypes.number,
	timestamp: PropTypes.number,
	openReplyForm: PropTypes.func,
	reply: PropTypes.func,
};

export default CommentItem;
