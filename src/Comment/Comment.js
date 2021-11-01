import React, { useState, useEffect, Suspense, lazy } from "react";
import { isAdmin, log } from '../common';

import './Comment.css';

const CommentItem = lazy(() => import('./CommentItem'));
const CommentForm = lazy(() => import('./CommentForm'));

const Comment = (props) => {

	const [comments, setComments] = useState([]);
	const [isShow, setIsShow] = useState(false);

	const logTimestamp = props.logTimestamp;

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
						{isAdminComment: true, message: "궁금한것이 있으면 무엇이든지 물어보세요? 더 안됨?", name: "Jongkil Park", commentTimestamp: undefined, timestamp: 1635611373000, sortKey: "1635611373000-0000000000000"},
						{isAdminComment: false, message: "안녕하세요. 물건에 관심이 있는데요. 얼마에 파실수 있나요? 좀 더 길게 이야기를 해 보는것이 어떨까요? 폭을 결정하기 위해서입니다.", name: "Buyer", commentTimestamp: undefined, timestamp: 1635652936000, sortKey: "1635652936000-0000000000000"},
						{isAdminComment: true, message: "100원입니다.", name: "Jongkil Park", commentTimestamp: 1635652936000, timestamp: 1635739336000, sortKey: "1635652936000-1635739336000"},
					]
				}
			}

			// Sort by sortKey
			newData.body.Contents.sort(function(a, b) {

				const sortKeyA = a.sortKey;
				const sortKeyB = b.sortKey;

				const result = (sortKeyA < sortKeyB) ? -1
					: (sortKeyA > sortKeyB) ? 1
					: 0;

				return result;
			});

			log("Comments are FETCHED successfully.");
			setComments(newData.body.Contents);
		}
		catch(err) {
			console.error(err);
		}
	}

	useEffect(() => fetchData(), []);

	const toggleComments = (event) => {
		setIsShow(!isShow);
	}

	const commentThread = isShow
		? <div className="div div--comment-thread">
			<Suspense fallback={<div></div>}>
				{comments.map(data => (				
					<CommentItem
						key={data.timestamp}
						isAdminComment={data.isAdminComment}
						message={data.message}
						name={data.name}
						logTimestamp={logTimestamp}
						commentTimestamp={data.commentTimestamp}
						timestamp={data.timestamp}
					/>
				))}
			</Suspense>
		</div>
		: "";

	const commentForm = isShow
		? <CommentForm
			logTimestamp = {logTimestamp}
		/>
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