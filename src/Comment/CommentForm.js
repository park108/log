import React, { useState, useEffect } from "react";
import { isAdmin } from '../common';

import './Comment.css';

const CommentForm = (props) => {

	const [message, setMessage] = useState("");
	const [userName, setUserName] = useState("");
	const [isHidden, setIsHidden] = useState(false);

	const logTimestamp = props.logTimestamp;
	const commentTimestamp = props.commentTimestamp;

	useEffect(() => {

		if(isAdmin()) {
			setUserName("Jongkil Park");
		}
	}, []);

	const changeComment = ({ target: { value } }) => setMessage(value);
	const changeName = ({target: { value } }) => setUserName(value);
	const changeIsHidden = ({target: { checked } }) => setIsHidden(checked);

	const postComment = (event) => {

		event.preventDefault();

		if(message.length < 5) {
			alert("Please comment at least 5 characters.");
			return;
		}
		else if(0 === userName.length) {
			alert("Please input your name.");
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
		setMessage("");
	}

	const nameDisabled = isAdmin() ? "disabled" : "";

	return (
		<div className="div div--comment-form">
			<form onSubmit={postComment}>
				<div className="div div--comment-input">
					<input 
						type="text"
						className="input input--comment-name"
						placeholder="Type your name"
						onChange={changeName}
						value={userName}
						disabled={nameDisabled}
					/>
					<input
						type="checkbox"
						id="hidden"
						className="input input--comment-hidden"
						onChange={changeIsHidden}
					/>
					<label
						htmlFor="hidden"
						className="label label--comment-hidden"
					>
						hidden
					</label>
					<textarea
						className="textarea textarea--comment-form"
						placeholder={undefined === commentTimestamp
							? "Add your comment"
							: "Reply the comment"
						}
						value={message}
						onChange={changeComment}
						autoFocus
					/>
				</div>
				<button
					className="button button--comment-submit"
					type="submit"
				>↵</button>
			</form>
		</div>
	);
}

export default CommentForm;