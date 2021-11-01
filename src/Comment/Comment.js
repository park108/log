import React, { useState, useEffect, Suspense, lazy } from "react";
import { isAdmin, log } from '../common';

import './Comment.css';

const CommentItem = lazy(() => import('../Comment/CommentItem'));

const Comment = (props) => {

	const [comments, setComments] = useState([]);

	const [isShow, setIsShow] = useState(false);
	const [userComment, setUserComment] = useState("");
	const [userName, setUserName] = useState("");

	// TODO: Use after make backend services
	// const timestamp = props.timestamp;

	const fetchData = async() => {

		// Call GET API
		try {
			// TODO: Use after make backend services
			// const res = await fetch(commonFile.getAPI());
			// const newData = await res.json();

			// TODO: Remove after make backend services. It's dummy data.
			const newData = {
				body: {
					Contents: [
						{isAdminComment: true, isReply: false, message: "궁금한것이 있으면 무엇이든지 물어보세요?", name: "Jongkil Park", timestamp: 1635611373000},
						{isAdminComment: false, isReply: false, message: "안녕하세요. 물건에 관심이 있는데요. 얼마에 파실수 있나요?", name: "Buyer", timestamp: 1635652936000},
						{isAdminComment: true, isReply: true, message: "100원입니다.", name: "Jongkil Park", timestamp: 1635739336000},
					]
				}
			}

			log("Comments are FETCHED successfully.");
			setComments(newData.body.Contents);
		}
		catch(err) {
			console.error(err);
		}
	}

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

	const toggleComments = (event) => {
		setIsShow(!isShow);
	}

	const nameDisabled = isAdmin() ? "disabled" : "";

	useEffect(() => {
		fetchData();
		if(isAdmin()) {
			setUserName("Jongkil Park");
		}
	}, []);

	const commentThread = isShow
		? <div className="div div--comment-thread">
			<Suspense fallback={<div></div>}>
				{comments.map(data => (				
					<CommentItem
						key={data.timestamp}
						isAdminComment={data.isAdminComment}
						isReply={data.isReply}
						message={data.message}
						name={data.name}
						timestamp={data.timestamp}
					/>
				))}
			</Suspense>
		</div>
		: "";

	const commentForm = isShow
		? <div className="div div--comment-writer">
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
		: "";

	// TODO: Remove after develop functions.
	if(!isAdmin()) return "";

	return <div>
		<span
			className="span span--comment-togglebutton"
			onClick={toggleComments}
		>
			{comments.length} Comments
		</span>
		{commentThread}
		{commentForm}
	</div>;
}

export default Comment;