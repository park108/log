import React, { useState, useEffect, useRef, Suspense, lazy, type ReactNode } from "react";
import { log, hasValue, isAdmin } from '../common/common';
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

	// **성공한 전송의 세대 번호.** 성공했을 때만 올린다.
	//
	// 폼과 답글 폼은 전송 결과를 모른다. 그래서 `isPosting` 이 내려가는 것을
	// 완료 신호로 쓰고 있었는데 그 신호는 실패해도 내려간다 — 실측: 전송이
	// 실패하면 본문이 비워졌고(`""`), 답글 폼은 결과를 보기도 전에 닫혔다.
	// 성공만 가리키는 신호를 하나 두어 두 곳이 함께 쓴다.
	const [postedGeneration, setPostedGeneration] = useState<number>(0);

	const [comments, setComments] = useState<CommentItemData[]>([]);
	const [buttonText, setButtonText] = useState<string>("... comments");
	const [commentThread, setCommentThread] = useState<ReactNode>("");
	const [commentForm, setCommentForm] = useState<ReactNode>("");

	const [isShowToaster, setIsShowToaster] = useState<ToasterShow>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");
	const [toasterType, setToasterType] = useState<ToasterType>("success");

	let logTimestamp = props.logTimestamp;

	// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-b — unmount 후 발화 차단 가드.
	// pending `getComments` / `postComment` 응답이 unmount 이후 도착해도 state setter 뿐 아니라
	// `log()` · `reportError()` 까지 0 hit 로 유지한다 (React 19 의 unmounted setState
	// silent-ignore 는 log/reportError 를 막지 못하므로 setter 한정 가드는 불충분).
	// 수단 = `cancelled` ref (도메인 이웃 `FileUpload.tsx` 와 동일 이디엄).
	// `postNewComment` 는 effect 가 아니라 submit 핸들러지만 `await postComment(...)`
	// 이후 같은 발화를 하므로 마운트 수명 ref 를 별도로 둔다 — 전송 직후 이탈 경로.
	const cancelledFetchRef = useRef<boolean>(false);
	const cancelledPostRef = useRef<boolean>(false);

	// 전송 중 재진입을 막는다. 제출 버튼은 `isPosting` 으로 비활성되지만 그것만으로는
	// 부족하다 — 답글 폼에는 `isPosting` 이 내려가지 않고, 상태 반영은 한 틱 뒤다.
	// 실측: 전송이 끝나기 전에 세 번 누르면 댓글이 세 건 올라갔다.
	const isPostingRef = useRef<boolean>(false);

	const postNewComment = async (comment: CommentPostPayload): Promise<void> => {

		if(isPostingRef.current) return;
		isPostingRef.current = true;

		setIsPosting(true);

		try {
			const res = await postComment(comment);
			const status = await res.json();

			if(cancelledPostRef.current) return;

			if(200 === status.statusCode) {
				log("[API POST] OK - Comment", "SUCCESS");
				setPostedGeneration(previous => previous + 1);
				setReload(true);
				setToasterMessage("The comment posted.");
				setToasterType("success");
				setIsShowToaster(1);
			}
			else {
				log("[API POST] FAILED - Comment", "ERROR");
				reportError(res);

				// 같은 파일이 조회 실패를 "Failed to load comments." 로 적는다. 전송
				// 실패만 "The comment posted failed." 라는 다른 형태였고 그것은 문장이
				// 아니다 — 실패를 알리는 자리라 읽히는 것이 특히 중요하다.
				setToasterMessage("Failed to post the comment.");
				setToasterType("error");
				setIsShowToaster(1);
			}
		}
		catch(err) {
			if(cancelledPostRef.current) return;
			log("[API POST] FAILED - Comment", "ERROR");
			reportError(err);

			setToasterMessage("Failed to post the comment for network issue.");
			setToasterType("error");
			setIsShowToaster(1);
		}
		finally {
			isPostingRef.current = false;
		}

		setIsPosting(false);
	}

	useEffect(() => {
		const cancelled = cancelledPostRef;
		cancelled.current = false;
		return () => {
			cancelled.current = true;
			setIsLoading(false);
		};
	}, []);

	useEffect(() => {

		const cancelled = cancelledFetchRef;
		cancelled.current = false;

		const fetchData = async (timestamp: number | undefined): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getComments(timestamp as number, isAdmin());
				const newData = await res.json();

				if(cancelled.current) return;

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

					setToasterMessage("Failed to load comments.");
					setToasterType("error");
					setIsShowToaster(1);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Comments", "ERROR");
				reportError(err);

				setToasterMessage("Failed to load comments for network issue.");
				setToasterType("error");
				setIsShowToaster(1);
			}

			setIsLoading(false);
			setIsPosting(false);
		}

		if(reload) {
			fetchData(logTimestamp);
			setReload(false);
		}

		return () => {
			cancelled.current = true;
		};

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
								postedGeneration={postedGeneration}
								openReplyForm={(isOpened: boolean) => {
									setIsOpenReplyForm(isOpened);
								}}
								reply={postNewComment as (comment: { logTimestamp?: number; isAdminComment: boolean; message: string; name: string; commentTimestamp?: number; isHidden: boolean }) => void}
							/>
						))}
					</Suspense>
				</div>
			);
		}
		else {
			setCommentThread("");
		}

	}, [isShow, comments, logTimestamp, postedGeneration]);

	useEffect(() => {

		if(isShow && !isOpenReplyForm) {
			setCommentForm(
				<Suspense fallback={<div></div>}>
					<CommentForm
						logTimestamp={logTimestamp}
						post={postNewComment as (comment: { logTimestamp?: number; isAdminComment: boolean; message: string; name: string; commentTimestamp?: number; isHidden: boolean }) => void}
						isPosting={isPosting}
						postedGeneration={postedGeneration}
					/>
				</Suspense>
			);
		}
		else {
			setCommentForm("");
		}
	}, [isShow, isOpenReplyForm, isPosting, logTimestamp, postedGeneration]);

	const toggleShow = (): void => setIsShow(!isShow);

	return (
		<section className={`section ${styles.sectionLogitemComment}`}>
			<button
				type="button"
				data-testid="comment-toggle-button"
				className={`span ${styles.spanCommentTogglebutton}`}
				aria-expanded={isShow}
				onClick={toggleShow}
			>
				{ buttonText }
			</button>

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

export default React.memo(Comment);
