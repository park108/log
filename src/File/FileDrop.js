import React, { useState, useEffect } from "react";
import { log } from '../common';
import * as commonFile from './commonFile';

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");
	const [dropzoneStyle, setDropzoneStyle] = useState("div div--filedrop-dropzone div--filedrop-ready")
	const [dropzoneText, setDropzoneText] = useState(<span>Drop files here!</span>);

	const refreshFiles = props.uploaded;

	// Upload file into the S3 bucket
	async function uploadFile(item, isLast) {

		setIsUploading("UPLOADING");

		let name = item.name;
		let type = encodeURIComponent(item.type);
		
		// Get pre-signed URL
		const res = await fetch(commonFile.getAPI() + "/key/" + name + "/type/" + type);

		res.json().then(res => {

			log("Presigned URL FETCHED successfully.");

			// Set parameter for file uploading
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

	// Dropped files in the area
	useEffect(() => {

		for(let i = 0; i < files.length; i++) {
			uploadFile(files[i], i === files.length - 1);
		}

	}, [files]);

	// Change dropzone style by upload state
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

	// Define drag event hanlders
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

	// Draw dropzone
	return (
		<div className={dropzoneStyle}
			onDragOver={(e) => e.preventDefault()}
			onDragEnter={(e) => handleDragEnter(e)}
			onDragLeave={(e) => handleDragLeave(e)}
			onDrop={(e) => handleDrop(e)}
		>
			{dropzoneText}
		</div>
	);
}

export default FileDrop;