import React, { useState, useEffect } from "react";
import { log } from '../common';
import * as commonFile from './commonFile';

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");
	const [dropzoneStyle, setDropzoneStyle] = useState("div div--filedrop-dropzone div--filedrop-ready")
	const [dropzoneText, setDropzoneText] = useState(<span>Drop files here!</span>);

	const refreshFiles = props.uploaded;

	useEffect(() => {

		for(let i = 0; i < files.length; i++) {
			uploadFile(files[i], i === files.length - 1);
		}

	}, [files]);

	useEffect(() => {

		if("READY" === isUploading) {
			setDropzoneStyle("div div--filedrop-dropzone div--filedrop-ready");
			setDropzoneText(<span>Drop files here!</span>);
		}
		else if("UPLOADING" === isUploading) {
			setDropzoneStyle("div div--filedrop-dropzone div--filedrop-uploading");
			setDropzoneText(<span>Uploading...</span>);
		}
		else if("COMPLETE" === isUploading) {
			setDropzoneStyle("div div--filedrop-dropzone div--filedrop-complete");
			setDropzoneText(<span>Upload complete.</span>);
			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, 1000);
		}
		else if("FAILED" === isUploading) {
			setDropzoneStyle("div div--filedrop-dropzone div--filedrop-uploading");
			setDropzoneText(<span>Upload failed.</span>);
			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, 1000);
		}

	}, [isUploading, refreshFiles]);

	const handleDragOver = (e) => e.preventDefault();

	const handleDragEnter = (e) => {
		e.preventDefault();
		e.target.classList.add("div--filedrop-dragenter");
	}

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.target.classList.remove("div--filedrop-dragenter");
	}

	const handleDrop = (e) => {

		e.preventDefault();
		e.target.classList.remove("div--filedrop-dragenter");
	
		let newFiles = [];

		for(let file of e.dataTransfer.files) {
			newFiles.push(file);
		}
		setFiles(newFiles);
	}

	async function uploadFile(item, isLast) {

		setIsUploading("UPLOADING");

		let name = item.name;
		let type = encodeURIComponent(item.type);
		
		// Get pre-signed URL
		const res = await fetch(commonFile.getAPI() + "/key/" + name + "/type/" + type);

		res.json().then(res => {

			log("Presigned URL FETCHED successfully.");

			let params = {
				method: "PUT",
				headers: {
					"Content-Type": item.type
				},
				body: item
			};

			// Upload a file using pre-signed URL into S3
			fetch(res.body.UploadUrl, params).then(res => {
				log("File [" + name + "] PUTTED successfully.");
				if(isLast) setIsUploading("COMPLETE");
			}).catch(err => {
				console.error(err);
				if(isLast) setIsUploading("FAILED");
			});

		}).catch(err => {
			console.error(err);
			if(isLast) setIsUploading("FAILED");
		});
	}

	return <div className={dropzoneStyle}
		onDrop={(event) => handleDrop(event)}
		onDragOver={(event) => handleDragOver(event)}
		onDragEnter={(event) => handleDragEnter(event)}
		onDragLeave={(event) => handleDragLeave(event)}
		>
		{dropzoneText}
	</div>;
}

export default FileDrop;