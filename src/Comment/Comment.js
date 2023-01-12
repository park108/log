import React, { useState, useEffect, Suspense, lazy } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, isAdmin } from '../common/common';
import { getComments, postComment } from './api';

import './Comment.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const CommentItem = lazy(() => import('./CommentItem'));
const CommentForm = lazy(() => import('./CommentForm'));

const Comment = (props) => {

	const [reload, setReload] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [isShow, setIsShow] = useState(false);
	const [isOpenReplyForm, setIsOpenReplyForm] = useState(false);
	const [isPosting, setIsPosting] = useState(false);

	const [comments, setComments] = useState([]);
	const [buttonText, setButtonText] = useState("... comments");
	const [commentThread, setCommentThread] = useState("");
	const [commentForm, setCommentForm] = useState("");

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [toasterType, setToasterType] = useState("success");

	let logTimestamp = props.logTimestamp;

	const postNewComment = async(comment) => {

		setIsPosting(true);

		try {
			const res = await postComment(comment);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API POST] OK - Comment", "SUCCESS");
				setReload(true);
				setToasterMessage("The comment posted.");
				setToasterType("success");
				setIsShowToaster(1);
			}
			else {
				log("[API POST] FAILED - Comment", "ERROR");
				console.error(res);

				setToasterMessage("The comment posted failed.");
				setToasterType("error");
				setIsShowToaster(1);
			}
		}
		catch(err) {
			log("[API POST] FAILED - Comment", "ERROR");
			console.error(err);

			setToasterMessage("The comment posted failed for network issue.");
			setToasterType("error");
			setIsShowToaster(1);
		}

		setIsPosting(false);
	}

	useEffect(() => {
		return () => setIsLoading(false);
	}, []);

	useEffect(() => {

		const fetchData = async(timestamp) => {

			setIsLoading(true);
	
			try {
				const res = await getComments(timestamp, isAdmin());
				const newData = await res.json();
	
				if(!hasValue(newData.errorType)) {
					log("[API GET] OK - Comments", "SUCCESS");
	
					newData.body.Items.sort((a, b) => {
						return (a.sortKey < b.sortKey) ? -1 : 1
					});
					
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

		if(reload) {
			fetchData(logTimestamp);
			setReload(false);
		}

	}, [logTimestamp, reload]);

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

	useEffect(() => {

		if(isShow) {
			setCommentThread(
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
								openReplyForm={(isOpened) => {
									setIsOpenReplyForm(isOpened);
								}}
								reply={postNewComment}
							/>
						))}
					</Suspense>
				</div>
			);
		}
		else {
			setCommentThread("");
		}

	}, [isShow]);

	useEffect(() => {

		if(isShow && !isOpenReplyForm) {
			setCommentForm(
				<Suspense fallback={<div></div>}>
					<CommentForm
						logTimestamp={logTimestamp}
						post={postNewComment}
						isPosting={isPosting}
					/>
				</Suspense>
			);
		}
		else {
			setCommentForm("");
		}
	}, [isShow, isOpenReplyForm]);

	return (
		<section className="section section--logitem-comment">
			<span
				className="span span--comment-togglebutton"
				onClick={() => setIsShow(!isShow)}
			>
				{ buttonText }
			</span>

			{ commentThread }
			{ commentForm }

			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={toasterType}
				duration={2000}
				completed={() => setIsShowToaster(2)}
			/>
		</section>
	);
}

Comment.propTypes = {
	logTimestamp: PropTypes.number,
}

export default React.memo(Comment);