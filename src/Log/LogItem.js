import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link, useHistory } from 'react-router-dom';
import { log, confirm, getUrl, getFormattedDate, getFormattedTime, isAdmin } from '../common';
import { ReactComponent as LinkButton } from '../static/link.svg';
import * as commonLog from './commonLog';
import * as parser from '../markdownParser';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const Comment = lazy(() => import('../Comment/Comment'));

const LogItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--main-item");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [isShowVersionHistory, setIsShowVersionHistory] = useState(false);
	const [isShowCopyToClipboardMessage, setIsShowCopyToClipboardMessage] = useState(false);

	const history = useHistory();

	const item = props.item;
	const author = props.author;
	const contents = props.contents;
	const timestamp = props.timestamp;
	const showComments = props.showComments;
	const showLink = props.showLink;

	useEffect(() => {
		(isDeleting)
			? setItemClass("article article--main-item article--logitem-delete")
			: setItemClass("article article--main-item");
	}, [isDeleting]);

	const deleteLogItem = () => {

		setIsDeleting(true);

		const api = commonLog.getAPI() + "/timestamp/" + timestamp;

		const body = {
			author: author,
			timestamp: timestamp
		}

		// Call DELETE API
		fetch(api, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		}).then(res => {
			log("A log is DELETED successfully.");
			props.deleted();
			history.push("/log");
		}).catch(err => {
			console.error(err);
		});
	}

	const abort = () => log("Deleting aborted");
	const confirmDelete = confirm("Are you sure delete the log?", deleteLogItem, abort);

	const ArticleMain = () => {

		const outputContents = parser.markdownToHtml(contents);

		return <section
			className="section section--logitem-contents"
			dangerouslySetInnerHTML={{__html: outputContents}}
		>
		</section>;
	}

	const copyToClipboard = (e) => {

		e.preventDefault();

		let url = getUrl() + "log/" + timestamp;

		let tempElem = document.createElement('textarea');
		tempElem.value = url;  
		document.body.appendChild(tempElem);
	  
		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		log("URL " + url + " copied.");

		setIsShowToaster(1);
	}

	const VersionHistory = () => {

		if(!isShowVersionHistory) return "";

		let length = item.logs.length;

		if(1 === length) return "";

		return (
			<div
				className="div div--logitem-versionhistory"
			>
				{
					item.logs.map(
						(data, index) => (
							<div>
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

	const CopyToClipboardMessage = () => {

		const messageBox = isShowCopyToClipboardMessage ? (
				<div className="div--logitem-linkmessage">
					Click to Clipboard
				</div>
			)
			: "";

		return messageBox;
	}

	const ArticleInfo = () => {

		const linkUrl = getUrl() + "log/" + timestamp;
		const linkIcon = showLink
			? (
				<span
					onClick={copyToClipboard}
					onMouseOver={() => setIsShowCopyToClipboardMessage(true)}
					onMouseOut={() => setIsShowCopyToClipboardMessage(false)}
					className="span span--logitem-toolbaricon"
				>
					<LinkButton />
					<span className="hidden--width-640px">
						<a href={linkUrl} onClick={copyToClipboard} className="a a--logitem-loglink">
							{linkUrl}
						</a>
					</span>
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

			if(undefined !== item) {

				separator = <span className="span span--logitem-separator">|</span>;

				version = (
					<span
						className="span span--logitem-version"
						onClick={(e) => setIsShowVersionHistory(!isShowVersionHistory)}
					>
						{"v." + item.logs.length}
					</span>
				);

				editButton = (
					<Link to={{
						pathname: "/log/write",
						state: {item}
					}}>
						<span className="span span--logitem-toolbarmenu">Edit</span>
					</Link>
				);

				deleteButton = <span className="span span--logitem-toolbarmenu" onClick={confirmDelete}>Delete</span>;
			}
		}

		return (
			<section className="section section--logitem-info">
				<h1 className="h1 h1--logitem-title">
					{getFormattedDate(timestamp)}
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

	return (
		<article className={itemClass} role="listitem">
			<CopyToClipboardMessage />
			<ArticleInfo />
			<VersionHistory />
			<ArticleMain />
			{
				showComments ? (
						<Suspense fallback={<div></div>}>
							<Comment
								logTimestamp={timestamp}
							/>
						</Suspense>
					)
					: undefined
			}
			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToaster}
					message={"The link URL copied."}
					position={"bottom"}
					type={"success"}
					duration={2000}
					
					completed={() => setIsShowToaster(0)}
				/>
			</Suspense>
		</article>
	);
}

export default LogItem;