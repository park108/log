import React, { useState, useEffect, Suspense, lazy } from "react";
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

	// 알림 콜백은 훅 옵션으로 넘긴다 — `mutate(vars, { onSuccess })` 의 per-call 콜백은
	// MutationObserver 가 구독자를 가진 동안에만 발화하고, 구독은 이 컴포넌트의 passive
	// effect 가 커밋된 뒤에 생긴다. lazy 하위(Comment)가 아직 커밋되지 않은 창에서 삭제가
	// 완료되면 per-call 콜백은 조용히 버려진다 (`useDeleteLog` 주석 참조).
	const deleteMutation = useDeleteLog({
		onSuccess: () => {
			log("[API DELETE] OK - Log", "SUCCESS");
			props.deleted?.();
		},
		onError: (err: Error) => {
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
			<LogItemInfo
				item={ props.item }
				timestamp={ props.timestamp }
				temporary={ props.temporary }
				showLink={ props.showLink }
				showActions={ props.showActions }
				delete={ deleteLogItem }
			/>
			<section
				className="section section--logitem-contents"
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(parser.markdownToHtml(contents ?? "")) }}
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
