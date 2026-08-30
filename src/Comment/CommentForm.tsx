import React, { useState, useEffect, useRef, useId, type FormEvent, type ChangeEvent } from "react";
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

	// 이 폼은 한 화면에 여러 벌 뜬다 — 답글 버튼은 댓글마다 있고, 하나를 열어도
	// 다른 것이 닫히지 않는다 (실측: 답글 폼 2개 동시 열림). `id="hidden"` 이
	// 하드코딩돼 있어 그때 같은 id 가 둘이 되고, `label[for]` 은 문서에서 처음
	// 만나는 것에 붙는다. 두 번째 폼의 "🥷 Hidden Message" 를 눌렀는데 첫 번째
	// 폼의 체크박스가 켜졌다 — 숨김으로 표시했다고 믿은 답글이 공개로 올라간다.
	const hiddenCheckboxId = useId();

	const userNameRef = useRef<HTMLInputElement | null>(null);
	const messageRef = useRef<HTMLTextAreaElement | null>(null);

	const postComment = (e: FormEvent<HTMLFormElement>): void => {

		e.preventDefault();

		// 공백만 넣은 것은 안 넣은 것이다. 길이를 날것으로 재던 동안 이름 "   " 과
		// 본문 "     " 이 검증을 통과해, 이름도 본문도 비어 보이는 댓글이 올라갔다.
		const trimmedName = userName.trim();
		const trimmedMessage = message.trim();

		if(0 === trimmedName.length) {
			alert("Please input your name.");
			userNameRef.current?.focus();
			return;
		}

		if(trimmedMessage.length < 5) {
			alert("Please comment at least 5 characters.");
			messageRef.current?.focus();
			return;
		}

		const comment: CommentSubmitPayload = {
			logTimestamp: logTimestamp,
			isAdminComment: isAdmin(),
			message: trimmedMessage,
			name: trimmedName,
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
					id={hiddenCheckboxId}
					className={`input ${styles.inputCommentHidden}`}
					onChange={ ({ target: { checked } }: ChangeEvent<HTMLInputElement>) => setIsHidden(checked) }
				/>
				<label htmlFor={hiddenCheckboxId} className={`label ${styles.labelCommentHidden}`}>
					🥷 Hidden Message
				</label>
			</div>
			<button
				type="submit"
				className={`btn btn--primary ${styles.buttonCommentSubmit}`}
				// 전송 중에는 누를 수 없다. 입력란만 잠기고 버튼은 살아 있어서,
				// 응답을 기다리다 다시 누르면 같은 댓글이 한 건 더 올라갔다.
				disabled={Boolean(props.isPosting)}
			>
				{props.isPosting
					? (hasValue(commentTimestamp) ? "Sending..." : "Posting...")
					: (hasValue(commentTimestamp) ? "Send Reply" : "Submit Comment")}
			</button>
		</form>
	);
}

export default CommentForm;
