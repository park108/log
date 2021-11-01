import React, { useState, lazy } from "react";
import { getFormattedDate, getFormattedTime } from '../common';

const CommentForm = lazy(() => import('./CommentForm'));

const CommentItem = (props) => {

	const [isShowReplyForm, setIsShowReplyForm] = useState(false);

	const isAdminComment = props.isAdminComment;
	const message = props.message;
	const name = props.name;
	const logTimestamp = props.logTimestamp;
	const commentTimestamp = props.commentTimestamp;
	const timestamp = props.timestamp;

	const toggleReplyForm = () => {
		setIsShowReplyForm(!isShowReplyForm);
	}

	const isReply = (undefined === commentTimestamp) ? false : true;

	let wrapperClassName = "div";
	wrapperClassName += (isAdminComment) ? " div--comment-admin" : " div--comment-visitor";
	wrapperClassName += (isReply) ? " div--comment-reply" : "";

	const timestampText = getFormattedDate(timestamp) + " " + getFormattedTime(timestamp);

	const replyButton = isReply
		? ""
		: <div
			className="div div--comment-replybutton"
			onClick={toggleReplyForm}
		>
			↩
		</div>;
	
	const replyForm = isShowReplyForm
		? <CommentForm
			isReply = {true}
			logTimestamp = {logTimestamp}
			commentTimestamp = {timestamp}
		/>
		: ""

	return <div className={wrapperClassName}>
		<div className="div div--comment-contents">
			<div className="div div--comment-message">
				<p>{message}</p>
			</div>
			{replyButton}
			<div className="div div--comment-timestamp">
				<span>{name}, </span>
				<span>{timestampText}</span>
			</div>
		</div>
		{replyForm}
	</div>;
}

export default CommentItem;