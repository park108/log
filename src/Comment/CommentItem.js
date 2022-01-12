import React, { useState, lazy } from "react";
import { getFormattedDate, getFormattedTime, isAdmin } from '../common';

const CommentForm = lazy(() => import('./CommentForm'));

const CommentItem = (props) => {

	const [isShowReplyForm, setIsShowReplyForm] = useState(false);

	const isHidden = props.isHidden;
	const isAdminComment = props.isAdminComment;
	const message = isHidden && !isAdmin() ? "Hidden message" : props.message;
	const name = isHidden && !isAdmin() ? "" : props.name + ", ";
	const logTimestamp = isHidden && !isAdmin() ? "" : props.logTimestamp;
	const commentTimestamp = props.commentTimestamp;
	const timestamp = isHidden && !isAdmin() ? "" : props.timestamp;

	const toggleReplyForm = () => {
		setIsShowReplyForm(!isShowReplyForm);
		props.openReplyForm(!isShowReplyForm);
	}

	const postReply = (comment) => {
		props.reply(comment);
		setIsShowReplyForm(false);
	}

	const isReply = (undefined === commentTimestamp) ? false : true;

	let wrapperClassName = "div div--comment-item";
	wrapperClassName += (isReply) ? " div--comment-reply" : "";

	const timestampText
		= isHidden && !isAdmin()
		? ""
		: getFormattedDate(timestamp) + " " + getFormattedTime(timestamp);

	const replyButton = isHidden && !isAdmin() ? ""
		: isReply ? ""
		: <div
			className="div div--comment-replybutton"
			onClick={toggleReplyForm}
		>
			↪
		</div>;
	
	const replyForm = isHidden && !isAdmin() ? ""
		: isShowReplyForm ? <CommentForm
				isReply={true}
				logTimestamp={logTimestamp}
				commentTimestamp={timestamp}
				post={postReply}
			/>
		: ""

	let messageClassName = "div div--comment-message";
	messageClassName += isHidden ? " div--comment-hidden" : "";
	messageClassName += isAdmin() ? " div--comment-adminhidden" : "";
	messageClassName += isAdminComment ? " div--comment-admin" : " div--comment-visitor";

	return (
		<div className={wrapperClassName}>
			<div className="div div--comment-contents">
				<div className={messageClassName}>
					<p>{message}</p>
				</div>
				{replyButton}
				<div className="div div--comment-timestamp">
					<span>{name}</span>
					<span>{timestampText}</span>
				</div>
			</div>
			{replyForm}
		</div>
	);
}

export default CommentItem;