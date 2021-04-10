import React from "react";
import * as common from '../common';

const LogItem = (props) => {

	const editLogItem = () => {

		// Go to Edit URL
	}

	const deleteLogItem = () => {

		const api = common.getAPI() + "/timestamp/" + item.timestamp;

		const body = {
			author: item.author,
			timestamp: item.timestamp
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

	const item = props.item;

	const outputContents = common.convertToHTML(item.logs[0].contents);

	let outputDate = "";
	let outputTime = "";

	if(item.timestamp > 0) {

		let date = new Date(item.timestamp);

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
	if(common.isAdmin()) {
		outputAuthor = <span>{item.author}</span>;
		infoSeparator = <span className="span span--article-separator">|</span>;
	}
	else {
		outputTime = "";
	}

	return (
		<div className="div div--article-logitem">
			<p dangerouslySetInnerHTML={{__html: outputContents}}></p>
			<p className="p p--article-info">
				{outputAuthor}
				{infoSeparator}
				{outputDate}
				{outputTime}
			</p>
			{common.isAdmin() &&
			<p className="p p--article-toolbar">
				<span onClick={editLogItem} className="span span--article-toolbar">Edit</span>
				<span className="span span--article-separator">|</span>
				<span onClick={deleteLogItem} className="span span--article-toolbar">Delete</span>
			</p>
			}
		</div>
	)
}

export default LogItem;