import React, { useState, useEffect } from "react";

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);

	useEffect(() => {
		uploadFiles();
	}, [files]);

	const handleDrop = (e) => {
		e.preventDefault();

		let newFiles = [];

		for(let file of e.dataTransfer.files) {
			newFiles.push(file);
		}
		setFiles(newFiles);
	}

	const handleDragOver = (e) => {
		e.preventDefault();
	}

	const handleDragEnter = (e) => {
		e.preventDefault();
	}

	const uploadFiles = () => {
		// TODO: Upload files into S3 through API Gateway
	}

	return <div className="div div--filedrop-dropzone"
		onDrop={(event) => handleDrop(event)}
		onDragOver={(event) => handleDragOver(event)}
		onDragEnter={(event) => handleDragEnter(event)}
		>
		<input
			type="file"
			id="fileUpload"
			style={{display:"none"}}
			multiple={ true }
		/>
		Drop files here!
		{files.map((file) => {
			return <div className="div div--filedrop-filename" key={file.name} >{file.name}</div>
		})}
	</div>;
}

export default FileDrop;