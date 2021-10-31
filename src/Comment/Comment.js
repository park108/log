import React, { useState } from "react";
import { isAdmin } from '../common';

import './Comment.css';

const Comment = (props) => {

	const [userComment, setUserComment] = useState("");

	// TODO: Use after make backend services
	// const timestamp = props.timestamp;

	const handleSubmit = (event) => {

		if(userComment.length < 5) {
			alert("Please comment at least 5 characters.");
		}

		event.preventDefault();
	}

	const handleChange = ({ target: { value } }) => setUserComment(value);

	// TODO: Remove after develop functions.
	if(!isAdmin()) return "";

	return <div>
		<span className="span span--comment-togglebutton">2 Comments</span>
		<div className="div div--comment-thread">
			<div className="div div--comment-admin">
				<div className="div div--comment-contents">
					<div className="div div--comment-message">
						궁금한것이 있으면 물어보세요.
					</div>
					<div className="div div--comment-timestamp">
						2021-10-24 23:45:01
					</div>
				</div>
			</div>
			<div className="div div--comment-visitor">
				<div className="div div--comment-name">Guest 1</div>
				<div className="div div--comment-contents">
					<div className="div div--comment-message">
						의자 얼마에 사셨어요?
					</div>
					<div className="div div--comment-timestamp">
						2021-10-25 12:34:56
					</div>
				</div>
			</div>
			<div className="div div--comment-admin div--comment-reply">
				<div className="div div--comment-contents">
					<div className="div div--comment-message">
						100원에 샀습니다. 링크 참고하세요.
					</div>
					<div className="div div--comment-timestamp">
						2021-10-26 23:45:01
					</div>
				</div>
			</div>
		</div>
		<form onSubmit={handleSubmit}>
			<textarea
				className="textarea textarea--comment-writer"
				placeholder="Type your comment"
				value={userComment}
				onChange={handleChange}
			/>
			<button
				className="button button--comment-submit"
				type="submit"
			>Submit</button>
		</form>
	</div>;
}

export default Comment;