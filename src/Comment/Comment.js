import React, { useState, useEffect, Suspense, lazy } from "react";
import { log, isAdmin } from '../common';
import * as commonComment from './commonComment';

import './Comment.css';

const CommentItem = lazy(() => import('./CommentItem'));
const CommentForm = lazy(() => import('./CommentForm'));

const Comment = (props) => {

	const [comments, setComments] = useState([]);
	const [isShow, setIsShow] = useState(false);

	const logTimestamp = props.logTimestamp;

	const fetchData = async(timestamp) => {

		const admin = isAdmin();

		// Call GET API
		try {
			const apiUrl = commonComment.getAPI() + "?logTimestamp=" + timestamp + "&isAdmin=" + admin;
			const res = await fetch(apiUrl);
			const newData = await res.json();

			// Sort by sortKey
			newData.body.Items.sort((a, b) => {
				const sortKeyA = a.sortKey;
				const sortKeyB = b.sortKey;
				const result
					= (sortKeyA < sortKeyB) ? -1
					: (sortKeyA > sortKeyB) ? 1
					: 0;
				return result;
			});

			log("Comments are FETCHED successfully.");

			setComments(newData.body.Items);
		}
		catch(err) {
			console.error(err);
		}
	}

	const handlePostSubmit = (comment) => {

		fetch(commonComment.getAPI(), {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(comment)
		}).then(res => {
			log("A comment is POSTED uccessfully.");
			fetchData(comment.logTimestamp);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => fetchData(logTimestamp), [logTimestamp]);

	const toggleComments = (event) => setIsShow(!isShow)

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
						isHidden={data.isHidden}
						reply={handlePostSubmit}
					/>
				))}
			</Suspense>
		</div>
		: "";

	const commentForm = isShow
		? <CommentForm
			logTimestamp={logTimestamp}
			post={handlePostSubmit}
		/>
		: "";

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