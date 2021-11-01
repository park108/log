import React from "react";
import { getFormattedDate, getFormattedTime } from '../common';

const CommentItem = (props) => {

	const isAdminComment = props.isAdminComment;
	const isReply = props.isReply;
	const message = props.message;
	const name = props.name;
	const timestamp = props.timestamp;

	let wrapperClassName = "div";
	wrapperClassName += (isAdminComment) ? " div--comment-admin" : " div--comment-visitor";
	wrapperClassName += (isReply) ? " div--comment-reply" : "";

	const timestampText = getFormattedDate(timestamp) + " " + getFormattedTime(timestamp);

	return <div className={wrapperClassName}>
		<div className="div div--comment-contents">
			<div className="div div--comment-message">
				{message}
			</div>
			<div className="div div--comment-timestamp">
				<span>{name}, </span>
				<span>{timestampText}</span>
			</div>
		</div>
	</div>;
}

export default CommentItem;