import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link, useHistory } from 'react-router-dom';
import { log, confirm, getUrl, getFormattedDate, getFormattedTime, isAdmin } from '../common';
import * as commonLog from './commonLog';
import * as parser from '../markdownParser';

const Toaster = lazy(() => import('../Toaster/Toaster'));

const LogDetail = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--article-logitem");

	const [isShowToaster, setIsShowToaster] = useState(false);

	const history = useHistory();

	const item = props.item;
	const author = props.author;
	const contents = props.contents;
	const timestamp = props.timestamp;

	useEffect(() => {
		if(isDeleting) {
			setItemClass("div div--article-logitem div--article-delete");
		}
		else {
			setItemClass("div div--article-logitem");
		}
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
		return <p className="p p--article-main" dangerouslySetInnerHTML={{__html: outputContents}}></p>;
	}

	const copyToClipboard = () => {

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

	const initToaster = () => {
		setIsShowToaster(0);
	}

	const ArticleInfo = () => {

		let outputDate, outputTime;
	
		if(timestamp > 0) {
	
			outputDate = getFormattedDate(timestamp);
		}

		let linkButton = <span onClick={copyToClipboard} className="span span--article-toolbarmenu">Link</span>;
	
		let separator = "";
		let editButton = "";
		let deleteButton = "";

		if(isAdmin()) {
			outputTime = "," + getFormattedTime(timestamp);
			if(undefined !== item) {
				separator = <span className="span span--article-separator">|</span>;
				editButton = <Link to={{
						pathname: "/log/write",
						state: {item}
					}}>
						<span className="span span--article-toolbarmenu">Edit</span>
					</Link>;
				deleteButton = <span className="span span--article-toolbarmenu" onClick={confirmDelete}>Delete</span>;
			}
		}
		else {
			outputTime = "";
		}

		return <div className="div div--article-info">
			<h1 className="h1 h1--article-title">{outputDate} {outputTime}</h1>
			<div className="div div--article-toolbar">
				{linkButton}
				{separator}
				{editButton}
				{separator}
				{deleteButton}
			</div>
		</div>;
	}

	return (
		<div className={itemClass} role="listitem">
			<ArticleInfo />
			<ArticleMain />
			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToaster}
					message={"The Link has been copied to your clipboard."}
					position={"bottom"}
					type={"success"}
					duration={2000}
					
					completed={initToaster}
				/>
			</Suspense>
		</div>
	)
}

export default LogDetail;