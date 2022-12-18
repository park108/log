import React, { useState, useEffect, Suspense, lazy } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, } from '../common/common';
import { deleteLog } from './api';
import * as parser from '../common/markdownParser';

const LogItemInfo = lazy(() => import('../Log/LogItemInfo'));
const Comment = lazy(() => import('../Comment/Comment'));

const LogItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("article article--main-item");

	const author = props.author;
	const contents = props.contents;
	const timestamp = props.timestamp;
	const showComments = props.showComments;

	useEffect(() => {
		return () => setIsDeleting(false);
	}, []);

	const deleteLogItem = async () => {

		setIsDeleting(true);

		try {
			const res = await deleteLog(author, timestamp);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API DELETE] OK - Log", "SUCCESS");

				let currentList = sessionStorage.getItem("logList");
	
				if(hasValue(currentList)) {
					currentList = JSON.parse(currentList);
					const newList = currentList.filter(item => {return item.timestamp !== timestamp});
					sessionStorage.setItem("logList", JSON.stringify(newList));
				}
	
				props.deleted();
			}
			else {
				log("[API DELETE] FAILED - Log", "ERROR");
				log(res, "ERROR");
	
				setIsDeleting(false);
			}
		}
		catch(err) {
			log("[API DELETE] FAILED - Log", "ERROR");
			log(err, "ERROR");
	
			setIsDeleting(false);
		}
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
				dangerouslySetInnerHTML={{__html: parser.markdownToHtml(contents)}}
			/>
			{ comments }
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