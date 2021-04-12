import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import * as common from '../common';

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

	const outputContents = common.convertToHTML(contents);

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

	let outputAuthor = "";
	let infoSeparator = "";
	let editButton = "";
	let deleteButton = "";

	if(common.isAdmin()) {
		if(undefined !== item) {
			outputAuthor = <span>{author}</span>;
			infoSeparator = <span className="span span--article-separator">|</span>;
			editButton = <Link to={{
					pathname: "/log/write",
					state: {item}
				}}>
					<span className="span span--article-toolbar">Edit</span>
				</Link>;
			deleteButton = <span onClick={deleteLogItem} className="span span--article-toolbar">Delete</span>;
		}
	}
	else {
		outputTime = "";
	}

	return (
		<div className={itemClass}>
			<p className="p p--article-info">
				{outputDate}
				{outputTime}
				{infoSeparator}
				{outputAuthor}
			</p>
			<p dangerouslySetInnerHTML={{__html: outputContents}}></p>
			<p className="p p--article-toolbar">
				{editButton}
				{infoSeparator}
				{deleteButton}
			</p>
		</div>
	)
}

export default LogItem;