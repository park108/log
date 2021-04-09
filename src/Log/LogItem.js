import React from "react";
import * as common from '../common';

const LogItem = (props) => {

	const item = props.item;

	let output = common.convertToHTML(item.logs[0].contents);

	let dateText = "";

	if(item.timestamp > 0) {

		let date = new Date(item.timestamp);

		let yyyy = date.getFullYear();
		let mm = date.getMonth() + 1;
		let dd = date.getDate();
		let hh = date.getHours();
		let min = date.getMinutes();
		let ss = date.getSeconds();

		dateText = yyyy + "-"
			+ (mm < 10 ? "0" + mm : mm) + "-"
			+ (dd < 10 ? "0" + dd : dd) + " "
			+ (hh < 10 ? "0" + hh : hh) + ":"
			+ (min < 10 ? "0" + min : min) + ":"
			+ (ss < 10 ? "0" + ss : ss);
	}

	const editLogItem = (e) => {
		console.log("EDIT = " + item.timestamp);
	}

	const deleteLogItem = (e) => {

		const deleteAPI = common.getAPI() + "/timestamp/" + item.timestamp;

		const body = {
			author: item.author,
			timestamp: item.timestamp
		}

		// Call DELETE API
		fetch(deleteAPI, {
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

	return (
		<div className="div div--article-logitem">
			<p dangerouslySetInnerHTML={{__html: output}}></p>
			{common.isAdmin() &&
			<div>
			<p className="p p--article-info">{item.author}, {dateText}</p>
			<p className="p p--article-toolbar">
				<span onClick={editLogItem} className="span span--article-toolbar">Edit</span>
				<span className="span span--article-separator">|</span>
				<span onClick={deleteLogItem} className="span span--article-toolbar">Delete</span>
			</p>
			</div>
			}
		</div>
	)
}

export default LogItem;