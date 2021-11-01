import React, { useState, useEffect } from "react";
import { isAdmin, log } from '../common';

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

	const handleChangeComment = ({ target: { value } }) => setMessage(value);
	const handleChangeName = ({target: { value } }) => setUserName(value);
	const handleChangeIsHidden = ({target: { checked } }) => setIsHidden(checked);

	const handleSubmit = (event) => {

		event.preventDefault();

		if(message.length < 5) {
			alert("Please comment at least 5 characters.");
			return;
		}
		else if(0 === userName.length) {
			alert("Please input your name.");
			return;
		}

		const inputData = {
			logTimestamp: logTimestamp,
			commentTimestamp: commentTimestamp,
			name: userName,
			message: message,
			isHidden: isHidden,
		}

		log(inputData);
	}

	const nameDisabled = isAdmin() ? "disabled" : "";

	return <div className="div div--comment-form">
			<form onSubmit={handleSubmit}>
				<div className="div div--comment-input">
					<textarea
						className="textarea textarea--comment-form"
						placeholder={undefined === commentTimestamp ? "Add your comment" : "Reply the comment"}
						value={message}
						onChange={handleChangeComment}
					/>
					<input 
						type="text"
						className="input input--comment-name"
						placeholder="Type your name"
						onChange={handleChangeName}
						value={userName}
						disabled={nameDisabled}
					/>
					<input
						type="checkbox"
						id="hidden"
						onChange={handleChangeIsHidden}
					/>
					<label
						htmlFor="hidden"
						className="label label--comment-hidden"
					>
						hidden
					</label>
				</div>
				<button
					className="button button--comment-submit"
					type="submit"
				>↵</button>
			</form>
		</div>;
}

export default CommentForm;