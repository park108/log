import React, { useState, useEffect, Suspense, lazy } from "react";
import PropTypes from 'prop-types';
import { log } from '../common/common';
import { useDeleteLog } from './hooks/useDeleteLog';
import * as parser from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import Toaster from "../Toaster/Toaster";

const LogItemInfo = lazy(() => import('../Log/LogItemInfo'));
const Comment = lazy(() => import('../Comment/Comment'));

const LogItem = (props) => {

	const deleteMutation = useDeleteLog();
	const isDeleting = deleteMutation.isPending;
	const [itemClass, setItemClass] = useState("article article--main-item");

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [toasterType, setToasterType] = useState("error");

	const author = props.author;
	const contents = props.contents;
	const timestamp = props.timestamp;
	const showComments = props.showComments;

	const deleteLogItem = () => {
		deleteMutation.mutate(
			{ author, timestamp },
			{
				onSuccess: () => {
					log("[API DELETE] OK - Log", "SUCCESS");
					props.deleted();
				},
				onError: (err) => {
					log("[API DELETE] FAILED - Log", "ERROR");
					log(err, "ERROR");
					setToasterMessage(
						err && err.message && err.message.startsWith("DELETE /log failed")
							? "Deleting log failed."
							: "Deleting log network error."
					);
					setToasterType("error");
					setIsShowToaster(1);
				},
			}
		);
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
				delete={ deleteLogItem }
			/>
			<section
				className="section section--logitem-contents"
				dangerouslySetInnerHTML={{ __html: sanitizeHtml(parser.markdownToHtml(contents)) }}
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

LogItem.propTypes = {
	item: PropTypes.object,
	author: PropTypes.string,
	contents: PropTypes.string,
	timestamp: PropTypes.number,
	temporary: PropTypes.bool,
	showComments: PropTypes.bool,
	showLink: PropTypes.bool,
	deleted: PropTypes.func,
};

export default LogItem;
