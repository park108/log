import React, { useState, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import { hasValue, isAdmin } from '../common/common';

import './Comment.css';

const CommentForm = (props) => {

	const [message, setMessage] = useState("");
	const [userName, setUserName] = useState("");
	const [isHidden, setIsHidden] = useState(false);
	const [messageDisabled, setMessageDisabled] = useState("");

	const logTimestamp = props.logTimestamp;
	const commentTimestamp = props.commentTimestamp;

	useEffect(() => {
		if(isAdmin()) {
			setUserName("Jongkil Park");
		}
	}, []);

	useEffect(() => {
		if(props.isPosting) {
			setMessageDisabled("disabled");
		}
		else {
			setMessageDisabled("");
			setMessage("");
		}
	}, [props.isPosting]);

	const changeComment = ({ target: { value } }) => setMessage(value);
	const changeName = ({target: { value } }) => setUserName(value);
	const changeIsHidden = ({target: { checked } }) => setIsHidden(checked);

	const userNameRef = useRef(null);
	const messageRef = useRef(null);

	const postComment = (e) => {

		e.preventDefault();

		if(0 === userName.length) {
			alert("Please input your name.");
			userNameRef.current.focus();
			return;
		}

		if(message.length < 5) {
			alert("Please comment at least 5 characters.");
			messageRef.current.focus();
			return;
		}

		const comment = {
			logTimestamp: logTimestamp,
			isAdminComment: isAdmin(),
			message: message,
			name: userName,
			commentTimestamp: commentTimestamp,
			isHidden: isHidden,
		}

		props.post(comment);
	}

	const nameDisabled = isAdmin()||props.isPosting ? "disabled" : "";

	return (
		<form onSubmit={postComment} className="form form--comment-input">
			<input 
				ref={userNameRef}
				type="text"
				className="input input--comment-name"
				placeholder="Type your name"
				onChange={changeName}
				value={userName}
				disabled={nameDisabled}
				autoFocus
			/>
			<textarea
				ref={messageRef}
				className="textarea textarea--comment-form"
				placeholder={hasValue(commentTimestamp) ? "Write your Reply" : "Write your comment"}
				value={message}
				disabled={messageDisabled}
				onChange={changeComment}
			/>
			<div className="div div--comment-inputhidden">
				<input
					type="checkbox"
					id="hidden"
					className="input input--comment-hidden"
					onChange={changeIsHidden}
				/>
				<label htmlFor="hidden" className="label label--comment-hidden">
					🥷 Only show your message to admin
				</label>
			</div>
			<button type="submit" className="button button--comment-submit">
				{hasValue(commentTimestamp) ? "Send Reply" : "Submit Comment"}
			</button>
		</form>
	);
}

CommentForm.propTypes = {
	logTimestamp: PropTypes.number,
	commentTimestamp: PropTypes.number,
	post: PropTypes.func,
	isPosting: PropTypes.bool,
};

export default CommentForm;