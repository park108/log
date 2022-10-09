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
	const [isPosting, setIsPosting] = useState(false);

	const logTimestamp = props.logTimestamp;

	const fetchData = async(timestamp) => {

		const admin = isAdmin();

		// Call GET API
		try {
			setIsLoading(true);
			const res = await getComments(timestamp, admin);
			const newData = await res.json();

			// Sort by sortKey
			newData.body.Items.sort((a, b) => {
				return (a.sortKey < b.sortKey) ? -1 : 1
			});

			log("[API GET] OK - Comments");

			// Set comment list
			setComments(newData.body.Items);
		}
		catch(err) {
			log("[API GET] FAILED - Comments");
			console.error(err);
		}

		setIsLoading(false);
		setIsPosting(false);
	}

	const newComment = async(comment) => {

		try {
			setIsPosting(true);
			const res = await postComment(comment);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API POST] OK - Comment");
				fetchData(comment.logTimestamp);
			}
			else {
				log("[API POST] FAILED - Comment");
				console.error(res);
			}
		}
		catch(err) {
			log("[API POST] FAILED - Comment");
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
		? (
			<Suspense fallback={<div></div>}>
				<CommentForm
					logTimestamp={logTimestamp}
					post={newComment}
					isPosting={isPosting}
				/>
			</Suspense>
		) : "";

	return (
		<section className="section section--logitem-comment">
			<span
				className="span span--comment-togglebutton"
				onClick={toggleComments}
			>
				{buttonText}
			</span>
			{commentThread}
			{commentForm}
		</section>
	);
}

Comment.propTypes = {
	logTimestamp: PropTypes.number,
}

export default React.memo(Comment);