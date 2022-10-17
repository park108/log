import React, { useState, useEffect, Suspense, lazy } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, isAdmin } from '../common/common';
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

		setIsLoading(true);

		// Call GET API
		try {
			const res = await getComments(timestamp, isAdmin());
			const newData = await res.json();

			if(!hasValue(newData.errorType)) {
				log("[API GET] OK - Comments", "SUCCESS");

				// Sort by sortKey
				newData.body.Items.sort((a, b) => {
					return (a.sortKey < b.sortKey) ? -1 : 1
				});
				
				// Set comment list
				setComments(newData.body.Items);
			}
			else {
				log("[API GET] FAILED - Comments", "ERROR");
				console.error(newData);
			}
		}
		catch(err) {
			log("[API GET] FAILED - Comments", "ERROR");
			console.error(err);
		}

		setIsLoading(false);
		setIsPosting(false);
	}

	const postNewComment = async(comment) => {

		setIsPosting(true);

		try {
			const res = await postComment(comment);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API POST] OK - Comment", "SUCCESS");
				fetchData(comment.logTimestamp);
			}
			else {
				log("[API POST] FAILED - Comment", "ERROR");
				console.error(res);
				setIsPosting(false);
			}
		}
		catch(err) {
			log("[API POST] FAILED - Comment", "ERROR");
			console.error(err);
			setIsPosting(false);
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
			if(0 === count) setButtonText("Add a comment");
			else if(1 === count) setButtonText("1 comment");
			else setButtonText(count + " comments");
		}
	}, [isLoading]);

	// Cleanup
	useEffect(() => {
		return () => setIsLoading(false);
	}, []);

	const toggleShowComments = () => setIsShow(!isShow)

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
							reply={postNewComment}
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
					post={postNewComment}
					isPosting={isPosting}
				/>
			</Suspense>
		) : "";

	return (
		<section className="section section--logitem-comment">
			<span
				className="span span--comment-togglebutton"
				onClick={toggleShowComments}
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