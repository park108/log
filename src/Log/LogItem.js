import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import * as common from '../common';
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

		const api = common.getAPI() + "/timestamp/" + timestamp;

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
			console.log("DATA DELETED from AWS!!");
			props.delete();
		}).catch(err => {
			console.error(err);
		});
	}

	const ArticleMain = () => {

		const outputContents = parser.markdownToHtml(contents);
		return <p className="p p--article-main" dangerouslySetInnerHTML={{__html: outputContents}}></p>;
	}

	const ArticleInfo = () => {
	
		let outputDate = "";
		let outputTime = "";
	
		if(timestamp > 0) {
	
			let date = new Date(timestamp);
	
			let yyyy = date.getFullYear();
			let mm = date.getMonth() + 1;
			let dd = date.getDate();
			let hh = date.getHours();
			let min = date.getMinutes();
			let ss = date.getSeconds();
	
			outputDate = yyyy + "-"
				+ (mm < 10 ? "0" + mm : mm) + "-"
				+ (dd < 10 ? "0" + dd : dd);
			outputTime = " "
				+ (hh < 10 ? "0" + hh : hh) + ":"
				+ (min < 10 ? "0" + min : min) + ":"
				+ (ss < 10 ? "0" + ss : ss);
	
	
			outputDate = <span>{outputDate}</span>;
			outputTime = <span>{outputTime}</span>;
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