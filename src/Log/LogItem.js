import React from "react";
import Converter from './Converter';

const LogItem = ({item}) => {

	let output = Converter(item.contents);

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

	return (
		<div className="div div--article-logitem">
			<p dangerouslySetInnerHTML={{__html: output}}></p>
			<p>{item.author}, {dateText}</p>
		</div>
	)
}

export default LogItem;