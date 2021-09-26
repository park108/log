import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import * as common from '../common';
import * as commonLog from './commonLog';
import * as parser from '../markdownParser';

const LogItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--article-logitem");

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
		}).catch(err => {
			console.error(err);
		});
	}

	const ArticleMain = () => {

		const outputContents = parser.markdownToHtml(contents);
		return <p className="p p--article-main" dangerouslySetInnerHTML={{__html: outputContents}}></p>;
	}

	const ArticleInfo = () => {

		let outputDate, outputTime;
	
		if(timestamp > 0) {
	
			outputDate = <span>{common.getFormattedDate(timestamp)}</span>;
			outputTime = <span>{common.getFormattedTime(timestamp)}</span>;
		}
	
		// let outputAuthor = "";
		let infoSeparator = "";
		let editButton = "";
		let deleteButton = "";
	
		if(common.isAdmin()) {
			if(undefined !== item) {
				// outputAuthor = <span>{author}</span>;
				infoSeparator = <span className="span span--article-separator">|</span>;
				editButton = <Link to={{
						pathname: "/log/write",
						state: {item}
					}}>
						<span className="span span--article-toolbarmenu">Edit</span>
					</Link>;
				deleteButton = <span onClick={deleteLogItem} className="span span--article-toolbarmenu">Delete</span>;
			}
		}
		else {
			outputTime = "";
		}

		return <p className="p p--article-info">
			{outputDate}
			{outputTime}
			{/* {infoSeparator}
			{outputAuthor} */}
			<span className="span span--article-toolbar">
				{editButton}
				{infoSeparator}
				{deleteButton}
			</span>
		</p>;
	}

	return (
		<div className={itemClass}>
			<ArticleMain />
			<ArticleInfo />
		</div>
	)
}

export default LogItem;