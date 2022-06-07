import React, { useState, useEffect, Suspense, lazy } from "react";
import PropTypes from 'prop-types';
import { log, isAdmin } from '../common/common';
import { getComments, postComment } from './api';

import './Comment.css';

const CommentItem = lazy(() => import('./CommentItem'));
const CommentForm = lazy(() => import('./CommentForm'));

const Comment = (props) => {

	const [comments, setComments] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [buttonText, setButtonText] = useState("... comments");
	const [isShow, setIsShow] = useState(false);
	const [isOpenReplyForm, setIsOpenReplyForm] = useState(false);

	const logTimestamp = props.logTimestamp;

	const fetchData = async(timestamp) => {

		const admin = isAdmin();

		// Call GET API
		try {
			setIsLoading(true);
			const res = await getComments(timestamp, admin);
			const newData = await res.json();
			setIsLoading(false);

			// Sort by sortKey
			newData.body.Items.sort((a, b) => {
				return (a.sortKey < b.sortKey) ? -1 : 1
			});

			log("Comments are FETCHED successfully.");

			// Set comment list
			setComments(newData.body.Items);
		}
		catch(err) {
			console.error(err);
		}
	}

	const newComment = async(comment) => {

		try {
			const res = await postComment(comment);

			if(200 === res.status) {
				log("A comment is POSTED successfully.");
				fetchData(comment.logTimestamp);
			}
			else {
				console.error(res);
			}
		}
		catch(err) {
			console.error(err);
		}
	}

	const openReplyForm = (isOpened) => {
		setIsOpenReplyForm(isOpened);
	}

	useEffect(() => fetchData(logTimestamp), [logTimestamp]);

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setButtonText("... comments");
		}
		else {
			const count = comments.length;
			1 < count ? setButtonText(count + " comments")
				: 1 === count ?	setButtonText("1 comment")
				: setButtonText("Add a comment");
		}
	}, [isLoading]);

	// Cleanup
	useEffect(() => {
		return () => setIsLoading(false);
	}, []);

	const toggleComments = () => setIsShow(!isShow)

	const commentThread = isShow
		? (
			<div className="div div--comment-thread">
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
							openReplyForm={openReplyForm}
							reply={newComment}
						/>
					))}
				</Suspense>
			</div>
		)
		: "";

	const commentForm = isShow && !isOpenReplyForm
		? <CommentForm
			logTimestamp={logTimestamp}
			post={newComment}
		/>
		: "";

	const commentDivisionLine = isShow && !isOpenReplyForm ? <hr /> : "";

	return (
		<section className="section section--logitem-comment">
			<span
				className="span span--comment-togglebutton"
				onClick={toggleComments}
			>
				{buttonText}
			</span>
			{commentThread}
			{commentDivisionLine}
			{commentForm}
		</section>
	);
}

Comment.propTypes = {
	logTimestamp: PropTypes.number,
}

export default React.memo(Comment);