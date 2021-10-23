import React, { useState, useEffect } from "react";
import { Link, useHistory } from 'react-router-dom';
import Toaster from "../Toaster/Toaster";
import * as common from '../common';
import * as commonLog from './commonLog';
import * as parser from '../markdownParser';

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
			console.log("A log is DELETED from AWS successfully.");
			props.deleted();
			history.push("/log");
		}).catch(err => {
			console.error(err);
		});
	}

	const abort = () => console.log("Deleting aborted");
	const confirmDelete = common.confirm("Are you sure delete the log?", deleteLogItem, abort);

	const ArticleMain = () => {

		const outputContents = parser.markdownToHtml(contents);
		return <p className="p p--article-main" dangerouslySetInnerHTML={{__html: outputContents}}></p>;
	}

	const copyToClipboard = () => {

		let url = common.getUrl() + "log/" + timestamp;

		let tempElem = document.createElement('textarea');
		tempElem.value = url;  
		document.body.appendChild(tempElem);
	  
		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		console.log("URL " + url + " copied.");

		setIsShowToaster(1);
	}

	const initToaster = () => {
		setIsShowToaster(0);
	}

	const ArticleInfo = () => {

		let outputDate, outputTime;
	
		if(timestamp > 0) {
	
			outputDate = <span>{common.getFormattedDate(timestamp)}</span>;
			outputTime = <span>{common.getFormattedTime(timestamp)}</span>;
		}

		let separator1 = <span className="span span--article-separator">|</span>;

		let linkButton = <span onClick={copyToClipboard} className="span span--article-toolbarmenu">Link</span>;
	
		// let outputAuthor = "";
		let separator2 = "";
		let editButton = "";
		let deleteButton = "";

		if(common.isAdmin()) {
			if(undefined !== item) {
				// outputAuthor = <span>{author}</span>;
				separator2 = <span className="span span--article-separator">|</span>;
				editButton = <Link to={{
						pathname: "/log/write",
						state: {item}
					}}>
						<span className="span span--article-toolbarmenu">Edit</span>
					</Link>;
				deleteButton = <span onClick={confirmDelete} className="span span--article-toolbarmenu">Delete</span>;
			}
		}
		else {
			outputTime = "";
		}

		return <p className="p p--article-info">
			{outputDate}
			{outputTime}
			{separator1}
			{linkButton}
			<span className="span span--article-toolbar">
				{editButton}
				{separator2}
				{deleteButton}
			</span>
		</p>;
	}

	return (
		<div className={itemClass} role="listitem">
			<ArticleMain />
			<ArticleInfo />
			<Toaster 
				show={isShowToaster}
				message={"The Link has been copied to your clipboard."}
				position={"bottom"}
				type={"success"}
				duration={2000}
				
				completed={initToaster}
			/>
		</div>
	)
}

export default LogDetail;