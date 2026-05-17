import React, { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { hasValue, isAdmin } from '../common/common';

import styles from './Comment.module.css';

interface CommentSubmitPayload {
	logTimestamp?: number;
	isAdminComment: boolean;
	message: string;
	name: string;
	commentTimestamp?: number;
	isHidden: boolean;
}

interface CommentFormProps {
	logTimestamp?: number;
	commentTimestamp?: number;
	post: (comment: CommentSubmitPayload) => void;
	isPosting?: boolean;
	isReply?: boolean;
}

const CommentForm = (props: CommentFormProps): React.ReactElement => {

	const [message, setMessage] = useState<string>("");
	const [userName, setUserName] = useState<string>("");
	const [isHidden, setIsHidden] = useState<boolean>(false);
	const [messageDisabled, setMessageDisabled] = useState<string>("");

	const logTimestamp = props.logTimestamp;
	const commentTimestamp = props.commentTimestamp;

	const userNameRef = useRef<HTMLInputElement | null>(null);
	const messageRef = useRef<HTMLTextAreaElement | null>(null);

	const postComment = (e: FormEvent<HTMLFormElement>): void => {

		e.preventDefault();

		if(0 === userName.length) {
			alert("Please input your name.");
			userNameRef.current?.focus();
			return;
		}

		if(message.length < 5) {
			alert("Please comment at least 5 characters.");
			messageRef.current?.focus();
			return;
		}

		const comment: CommentSubmitPayload = {
			logTimestamp: logTimestamp,
			isAdminComment: isAdmin(),
			message: message,
			name: userName,
			commentTimestamp: commentTimestamp,
			isHidden: isHidden,
		}

		props.post(comment);
	}

	useEffect(() => {
		if(isAdmin()) {
			setUserName("Jongkil Park");
		}
	}, []);

	useEffect(() => {
		if(props.isPosting) {
			setMessageDisabled("disabled");
		}
		else {
			setMessageDisabled("");
			setMessage("");
		}
	}, [props.isPosting]);

	return (
		<form onSubmit={postComment} className={`form ${styles.formCommentInput}`}>
			<input
				ref={userNameRef}
				type="text"
				className={`input ${styles.inputCommentName}`}
				placeholder="Type your name"
				onChange={ ({ target: { value } }: ChangeEvent<HTMLInputElement>) => setUserName(value) }
				value={userName}
				disabled={ Boolean(isAdmin() || props.isPosting) }
				autoFocus
			/>
			<textarea
				ref={messageRef}
				className={`textarea ${styles.textareaCommentForm}`}
				placeholder={hasValue(commentTimestamp) ? "Write your Reply" : "Write your comment"}
				value={message}
				disabled={messageDisabled === "disabled"}
				onChange={ ({ target: { value } }: ChangeEvent<HTMLTextAreaElement>) => setMessage(value) }
			/>
			<div className={`div ${styles.divCommentInputhidden}`}>
				<input
					type="checkbox"
					id="hidden"
					className={`input ${styles.inputCommentHidden}`}
					onChange={ ({ target: { checked } }: ChangeEvent<HTMLInputElement>) => setIsHidden(checked) }
				/>
				<label htmlFor="hidden" className={`label ${styles.labelCommentHidden}`}>
					🥷 Hidden Message
				</label>
			</div>
			<button type="submit" className={`button ${styles.buttonCommentSubmit}`}>
				{hasValue(commentTimestamp) ? "Send Reply" : "Submit Comment"}
			</button>
		</form>
	);
}

export default CommentForm;
