import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { log } from '../common/common';
import { useDeleteLog } from './hooks/useDeleteLog';
import * as parser from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import Toaster from "../Toaster/Toaster";
import type { ToasterShow, ToasterType } from "../Toaster/Toaster";
import type { LogItemPayload } from './api';

const LogItemInfo = lazy(() => import('../Log/LogItemInfo'));
const Comment = lazy(() => import('../Comment/Comment'));

interface LogItemProps {
	item?: LogItemPayload;
	author: string;
	contents?: string;
	timestamp: number;
	temporary?: boolean;
	showComments?: boolean;
	showLink?: boolean;
	/** 편집·삭제 조작부를 그릴지. 변경 이력은 지난 판본이므로 끈다. */
	showActions?: boolean;
	deleted?: () => void;
}

const LogItem = (props: LogItemProps) => {

	const [itemClass, setItemClass] = useState("article article--main-item");

	const [isShowToaster, setIsShowToaster] = useState<ToasterShow>(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [toasterType, setToasterType] = useState<ToasterType>("error");

	// 재진입 차단. 버튼 비활성만으로는 부족하다 — `isPending` 이 화면에 반영되는
	// 것은 한 틱 뒤이고, 그 틈에 들어온 두 번째 확인이 요청을 하나 더 낸다
	// (실측: 세 번 누르면 요청 3건 → 비활성만 두면 2건 → ref 까지 두면 1건).
	// 첫 요청이 성사된 뒤 도착한 두 번째 응답은 실패로 오므로, 글은 지워졌는데
	// 화면에는 "Deleting log failed." 가 떴다.
	// 같은 도메인 선례 `Comment.tsx` 의 `isPostingRef` 와 동일 이디엄이다.
	const isDeletingRef = useRef<boolean>(false);

	// 알림 콜백은 훅 옵션으로 넘긴다 — `mutate(vars, { onSuccess })` 의 per-call 콜백은
	// MutationObserver 가 구독자를 가진 동안에만 발화하고, 구독은 이 컴포넌트의 passive
	// effect 가 커밋된 뒤에 생긴다. lazy 하위(Comment)가 아직 커밋되지 않은 창에서 삭제가
	// 완료되면 per-call 콜백은 조용히 버려진다 (`useDeleteLog` 주석 참조).
	const deleteMutation = useDeleteLog({
		onSuccess: () => {
			isDeletingRef.current = false;
			log("[API DELETE] OK - Log", "SUCCESS");
			props.deleted?.();
		},
		onError: (err: Error) => {
			isDeletingRef.current = false;
			log("[API DELETE] FAILED - Log", "ERROR");
			log(String(err), "ERROR");
			setToasterMessage(
				err && err.message && err.message.startsWith("DELETE /log failed")
					? "Deleting log failed."
					: "Deleting log network error."
			);
			setToasterType("error");
			setIsShowToaster(1);
		},
	});
	const isDeleting = deleteMutation.isPending;

	const author = props.author;
	const contents = props.contents;
	const timestamp = props.timestamp;
	const showComments = props.showComments;

	const deleteLogItem = () => {
		if(isDeletingRef.current) return;
		isDeletingRef.current = true;
		deleteMutation.mutate({ author, timestamp });
	}

	useEffect(() => {
		if(isDeleting) {
			setItemClass("article article--main-item article--logitem-delete");
		}
		else {
			setItemClass("article article--main-item");
		}
	}, [isDeleting]);

	// 본문은 `contents` 에만 의존한다. 그런데 이 컴포넌트는 자기 상태(삭제 진행
	// 표시·토스터)가 바뀔 때마다 다시 그려지고, 그때마다 마크다운 파싱과 sanitize 를
	// 처음부터 다시 했다. 실측: 글 하나를 여는 동안 파싱이 **3회** 돌았고, 14KB 글의
	// 파싱+정제는 1회 43ms 다 (jsdom). 보여주기만 하는 데 그 세 배를 쓴다.
	//
	// 바로 아래 `comments` 와 `Writer` 의 `historyItems` 가 같은 이디엄을 쓴다.
	const bodyHtml = React.useMemo(
		() => sanitizeHtml(parser.markdownToHtml(contents ?? "")),
		[contents],
	);

	const comments = React.useMemo(() => {
		if(showComments) {
			return (
				<Suspense fallback={<div></div>}>
					<Comment logTimestamp={timestamp} />
				</Suspense>
			);
		}
		else {
			return "";
		}
	}, [showComments, timestamp]);

	return (
		<article className={ itemClass } role="listitem">
			{/* 자기 Suspense 경계를 준다. `LogItemInfo` 는 lazy 인데 경계가 이 컴포넌트
			    **밖** 에 있어서, 그 청크가 도착할 때까지 LogItem 의 렌더가 통째로
			    폐기·재시도됐다. 그 재시도마다 본문 마크다운이 처음부터 다시 파싱된다
			    (실측: 글 하나를 여는 동안 파싱 3회). `useMemo` 는 커밋 전 폐기를
			    건너뛰지 못하므로 memo 로는 막을 수 없다.
			    곁들여 본문이 먼저 보인다 — 조작부를 기다리지 않는다. */}
			<Suspense fallback={<div></div>}>
				<LogItemInfo
					item={ props.item }
					timestamp={ props.timestamp }
					temporary={ props.temporary }
					showLink={ props.showLink }
					showActions={ props.showActions }
					delete={ deleteLogItem }
					isDeleting={ isDeleting }
				/>
			</Suspense>
			<section
				className="section section--logitem-contents"
				dangerouslySetInnerHTML={{ __html: bodyHtml }}
			/>
			{ comments }
			<Toaster
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={toasterType}
				duration={2000}
				completed={() => setIsShowToaster(2)}
			/>
		</article>
	);
}

export default LogItem;
