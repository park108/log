import React from "react";

const FileItem = (props) => {

	const FileName = () => {
		return <span>{props.fileName}, </span>;
	}
	const LastModified = () => {
		const timestamp = props.lastModified;
		return <span>{timestamp.toString()}</span>;
	}

	return (
		<div>
			<FileName />
			<LastModified />
		</div>
	)
}

export default FileItem;