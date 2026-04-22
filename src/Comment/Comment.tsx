import React, { useState, useEffect, Suspense, lazy, type ReactNode } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, isAdmin } from '../common/common';
import { activateOnKey } from '../common/a11y';
import { reportError } from '../common/errorReporter';
import { getComments, postComment } from './api';

import styles from './Comment.module.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const CommentItem = lazy(() => import('./CommentItem'));
const CommentForm = lazy(() => import('./CommentForm'));

interface CommentItemData {
	sortKey: string;
	timestamp: number;
	commentTimestamp?: number;
	logTimestamp: number;
	message: string;
	name: string;
	isHidden: boolean;
	isAdminComment: boolean;
}

interface CommentPostPayload {
	logTimestamp: number;
	isAdminComment: boolean;
	message: string;
	name: string;
	commentTimestamp?: number;
	isHidden: boolean;
}

interface CommentProps {
	logTimestamp?: number;
}

type ToasterShow = 0 | 1 | 2;
type ToasterType = "information" | "success" | "warning" | "error";

const Comment = (props: CommentProps): React.ReactElement => {

	const [reload, setReload] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isShow, setIsShow] = useState<boolean>(false);
	const [isOpenReplyForm, setIsOpenReplyForm] = useState<boolean>(false);
	const [isPosting, setIsPosting] = useState<boolean>(false);

	const [comments, setComments] = useState<CommentItemData[]>([]);
	const [buttonText, setButtonText] = useState<string>("... comments");
	const [commentThread, setCommentThread] = useState<ReactNode>("");
	const [commentForm, setCommentForm] = useState<ReactNode>("");

	const [isShowToaster, setIsShowToaster] = useState<ToasterShow>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");
	const [toasterType, setToasterType] = useState<ToasterType>("success");

	let logTimestamp = props.logTimestamp;

	const postNewComment = async (comment: CommentPostPayload): Promise<void> => {

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
				reportError(res);

				setToasterMessage("The comment posted failed.");
				setToasterType("error");
				setIsShowToaster(1);
			}
		}
		catch(err) {
			log("[API POST] FAILED - Comment", "ERROR");
			reportError(err);

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

		const fetchData = async (timestamp: number | undefined): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getComments(timestamp as number, isAdmin());
				const newData = await res.json();

				if(!hasValue(newData.errorType)) {
					log("[API GET] OK - Comments", "SUCCESS");

					newData.body.Items.sort((a: CommentItemData, b: CommentItemData) => {
						return (a.sortKey < b.sortKey) ? -1 : 1
					});

					setComments(newData.body.Items);
				}
				else {
					log("[API GET] FAILED - Comments", "ERROR");
					reportError(newData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Comments", "ERROR");
				reportError(err);
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
	}, [isLoading, comments]);

	useEffect(() => {

		if(isShow) {
			setCommentThread(
				<div className={`div ${styles.divCommentThread}`}>
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
								openReplyForm={(isOpened: boolean) => {
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

	const toggleShow = (): void => setIsShow(!isShow);

	return (
		<section className={`section ${styles.sectionLogitemComment}`}>
			<span
				role="button"
				tabIndex={0}
				data-testid="comment-toggle-button"
				className={`span ${styles.spanCommentTogglebutton}`}
				onClick={toggleShow}
				onKeyDown={activateOnKey(toggleShow)}
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
