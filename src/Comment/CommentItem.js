import React, { useState, lazy } from "react";
import PropTypes from 'prop-types';
import { getFormattedDate, getFormattedTime, hoverPopup, isAdmin } from '../common/common';

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
			data-testid="reply-toggle-button"
			onClick={toggleReplyForm}
			onMouseOver={event => hoverPopup(event, "reply-popup-" + timestamp)}
			onMouseMove={event => hoverPopup(event, "reply-popup-" + timestamp)}
			onMouseOut={event => hoverPopup(event, "reply-popup-" + timestamp)}
		>	
			🪃

			<div data-testid={"reply-popup-" + timestamp} id={"reply-popup-" + timestamp} className="div div--logitem-linkmessage" style={{display: "none"}}>
				Reply this message
			</div>
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
	messageClassName += isAdmin() && isHidden ? " div--comment-revealhidden" : "";
	messageClassName += isAdminComment ? " div--comment-admin" : " div--comment-visitor";

	return (
		<div className={wrapperClassName}>
			<div className="div div--comment-contents">
				<div className={messageClassName}>
					{message.map((sentence, index) => (
						<p key={index}>
							{sentence}
						</p>
					))}
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