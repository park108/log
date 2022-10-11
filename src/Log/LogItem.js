import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, confirm, getUrl, getFormattedDate, getFormattedTime, isAdmin, hasValue, hoverPopup, copyToClipboard } from '../common/common';
import { ReactComponent as LinkButton } from '../static/link.svg';
import { deleteLog } from './api';
import * as parser from '../common/markdownParser';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const Comment = lazy(() => import('../Comment/Comment'));

const LogItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("article article--main-item");
	const [isShowToaster, setIsShowToaster] = useState(0);

	const item = props.item;
	const author = props.author;
	const contents = props.contents;
	const timestamp = props.timestamp;
	const temporary = props.temporary;
	const showComments = props.showComments;
	const showLink = props.showLink;

	// Delete log
	const deleteLogItem = async () => {

		setIsDeleting(true);

		try {
			// Call API
			const res = await deleteLog(author, timestamp);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API DELETE] OK - Log", "SUCCESS");

				// Delete item in session list
				let currentList = sessionStorage.getItem("logList");
	
				if(hasValue(currentList)) {
					currentList = JSON.parse(currentList);
					const newList = currentList.filter(item => {return item.timestamp !== timestamp});
					sessionStorage.setItem("logList", JSON.stringify(newList));
				}
	
				setIsDeleting(false);
	
				props.deleted();
			}
			else {
				log("[API DELETE] FAILED - Log", "ERROR");
				log(res, "ERROR");
			}
		}
		catch(err) {
			log("[API DELETE] FAILED - Log", "ERROR");
			log(err, "ERROR");
		}
	}

	// Change style by delete item
	useEffect(() => {
		(isDeleting)
			? setItemClass("article article--main-item article--logitem-delete")
			: setItemClass("article article--main-item");
	}, [isDeleting]);

	// Cleanup
	useEffect(() => {
		return () => setIsDeleting(false);
	}, []);

	// Confirm alert to delete
	const abort = () => log("Deleting aborted");
	const confirmDelete = confirm("Are you sure delete the log?", deleteLogItem, abort);

	// Article parsed by Markdown
	const Article = () => {

		const outputContents = parser.markdownToHtml(contents);

		return (
			<section
				className="section section--logitem-contents"
				dangerouslySetInnerHTML={{__html: outputContents}}
			>
			</section>
		);
	}

	// URL copy
	const copyURL = (e) => {
		e.preventDefault();
		let url = getUrl() + "log/" + timestamp;
		copyToClipboard(url);
		setIsShowToaster(1);
	}

	// Info header for item
	const LogItemInfo = () => {

		const linkUrl = getUrl() + "log/" + timestamp;
		
		const hoverPopupId = "click-to-clipboard-box";

		const linkIcon = showLink
			? (
				<span
					data-testid="link-copy-button"
					onClick={copyURL}
					className="span span--logitem-toolbaricon"
				>
					<LinkButton />
					<span className="hidden--width-640px">
						<a
							role="button"
							href={linkUrl}
							className="a a--logitem-loglink"
							onMouseOver={(event) => hoverPopup(event, hoverPopupId)}
							onMouseMove={(event) => hoverPopup(event, hoverPopupId)}
							onMouseOut={(event) => hoverPopup(event, hoverPopupId)}
						>
							{linkUrl}
						</a>
					</span>
					<div id={hoverPopupId} className="div div--logitem-linkmessage" style={{display: "none"}}>
						Click to Clipboard
					</div>
				</span>
			)
			: undefined;
				
		let outputTime = "";
		let separator = "";
		let editButton = "";
		let deleteButton = "";
		let version = "";

		if(isAdmin()) {

			outputTime = getFormattedTime(timestamp);

			// Version history
			const VersionHistory = () => {

				let length = item.logs.length;

				if(1 === length) return "";

				return (
					<div id="version-history" className="div div--logitem-versionhistory" style={{display: "none"}}>
						{
							item.logs.map(
								(data, index) => (
									<div key={index}>
										<span className="span span--logitem-historyverision">
											{"v." + (length - index)}
										</span>
										{
											" " + getFormattedDate(data.timestamp)
											+ " " + getFormattedTime(data.timestamp)
										}
									</div>
								)
							)
						}
					</div>
				);
			}

			if(hasValue(item)) {

				const versionHistoryId = "version-history";

				separator = <span className="span span--logitem-separator">|</span>;

				if(1 === item.logs.length) {
					version = (
						<span
							role="button"
							data-testid="versions-button"
							className="span span--logitem-version"
						>
							{"v." + item.logs.length}
							<VersionHistory />
						</span>
					);

				}
				else {
					version = (
						<span
							role="button"
							data-testid="versions-button"
							className="span span--logitem-version"
							onMouseOver={(event) => hoverPopup(event, versionHistoryId)}
							onMouseMove={(event) => hoverPopup(event, versionHistoryId)}
							onMouseOut={(event) => hoverPopup(event, versionHistoryId)}
						>
							{"v." + item.logs.length}
							<VersionHistory />
						</span>
					);
				}

				editButton = (
					<Link to="/log/write" state={{from: item}}>
						<span
							role="button"
							data-testid="edit-button"
							className="span span--logitem-toolbarmenu"
						>
							Edit
						</span>
					</Link>
				);

				deleteButton = (
					<span
						role="button"
						data-testid="delete-button"
						className="span span--logitem-toolbarmenu"
						onClick={confirmDelete}
					>
						Delete
					</span>
				);
			}
		}

		return (
			<section className="section section--logitem-info">
				<h1 className="h1 h1--logitem-title">
					{temporary ? "✍️" : ""} {getFormattedDate(timestamp)}
				</h1>
				<span className="span span--logitem-toolbarblank"></span>
				{linkIcon}
				<div className="div div--logitem-toolbar">
					<span className="hidden--width-350px">
						{outputTime}
						{separator}
					</span>
					<span className="hidden--width-400px">
						{version}
						{separator}
					</span>
					{editButton}
					{separator}
					{deleteButton}
				</div>
			</section>
		);
	}

	// Comments
	const comments = React.useMemo(() => {
		return (
			showComments ? (
				<Suspense fallback={<div></div>}>
					<Comment
						logTimestamp={timestamp}
					/>
				</Suspense>
			)
			: ""
		);
	}, [showComments, timestamp]);

	// Draw log item
	return (
		<article className={itemClass} role="listitem">
			<LogItemInfo />
			<Article />
			{ comments }
			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToaster}
					message={"The link URL copied."}
					position={"bottom"}
					type={"success"}
					duration={2000}
					completed={() => setIsShowToaster(2)}
				/>
			</Suspense>
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