import React, { useState, useEffect, Suspense, lazy } from "react";
import { isAdmin } from '../common';

import './Comment.css';

const CommentItem = lazy(() => import('../Comment/CommentItem'));

const Comment = (props) => {

	const [userComment, setUserComment] = useState("");
	const [userName, setUserName] = useState("");

	// TODO: Use after make backend services
	// const timestamp = props.timestamp;

	const handleSubmit = (event) => {

		if(userComment.length < 5) {
			alert("Please comment at least 5 characters.");
		}
		else if(0 === userName.length) {
			alert("Please input your name.");
		}

		event.preventDefault();
	}

	const handleChangeComment = ({ target: { value } }) => setUserComment(value);
	const handleChangeName = ({target: { value } }) => setUserName(value);

	const nameDisabled = isAdmin() ? "disabled" : "";

	useEffect(() => {
		if(isAdmin()) {
			setUserName("Jongkil Park");
		}
	}, []);

	// TODO: Remove after develop functions.
	if(!isAdmin()) return "";

	return <div>
		<span className="span span--comment-togglebutton">3 Comments</span>
		<div className="div div--comment-thread">
			<Suspense fallback={<div></div>}>
				<CommentItem
					isAdminComment={true}
					isReply={false}
					message={"궁금한것이 있으면 물어보세요."}
					name={"Jongkil Park"}
					timestamp={"2021-10-24 23:45:01"}
				/>
				<CommentItem
					isAdminComment={false}
					isReply={false}
					message={"의자 얼마에 사셨어요?"}
					name={"Guest 1"}
					timestamp={"2021-10-25 12:34:56"}
				/>
				<CommentItem
					isAdminComment={true}
					isReply={true}
					message={"100원에 샀습니다. 링크 참고하세요."}
					name={"Jongkil Park"}
					timestamp={"2021-10-26 23:45:01"}
				/>
			</Suspense>
		</div>
		<div className="div div--comment-writer">
			<form onSubmit={handleSubmit}>
				<div className="div div--comment-input">
					<textarea
						className="textarea textarea--comment-writer"
						placeholder="Type your comment"
						value={userComment}
						onChange={handleChangeComment}
					/>
					<input 
						className="input input--comment-name"
						placeholder="Type your name"
						onChange={handleChangeName}
						type="text"
						value={userName}
						disabled={nameDisabled}
					/>
				</div>
				<button
					className="button button--comment-submit"
					type="submit"
				>Submit</button>
			</form>
		</div>
	</div>;
}

export default Comment;