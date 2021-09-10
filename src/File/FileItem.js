import React from "react";

const FileItem = (props) => {

	const FileName = () => {
		return <div className="div div--fileitem-filename">{props.fileName}</div>;
	}
	const LastModified = () => {
		const date = new Date(props.lastModified);
	
		const  yyyy = date.getFullYear();
		const  mm = date.getMonth() + 1;
		const  dd = date.getDate();
		const  hh = date.getHours();
		const  min = date.getMinutes();
		const  ss = date.getSeconds();
	
		const outputDate = yyyy + "-"
			+ (mm < 10 ? "0" + mm : mm) + "-"
			+ (dd < 10 ? "0" + dd : dd);
		const outputTime = " "
			+ (hh < 10 ? "0" + hh : hh) + ":"
			+ (min < 10 ? "0" + min : min) + ":"
			+ (ss < 10 ? "0" + ss : ss);

		const outputText = outputDate + " " + outputTime;

		return <div className="div div--fileitem-lastmodified">{outputText}</div>;
	}

	return (
		<div className="div div--fileitem">
			<FileName />
			<LastModified />
		</div>
	)
}

export default FileItem;