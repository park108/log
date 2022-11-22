import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { log, hasValue } from '../common/common';
import { getPreSignedUrl, putFile } from './api';

const REFRESH_TIMEOUT = 3000;

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");
	const [dropzoneStyle, setDropzoneStyle] = useState("div div--filedrop-dropzone div--filedrop-ready")
	const [dropzoneText, setDropzoneText] = useState(<span>Drop files here!</span>);

	const refreshFiles = props.callbackAfterUpload;

	// Dropped files in the area
	useEffect(() => {

		// Upload file into the S3 bucket
		const uploadFile = async(item, isLast)  => {
	
			setIsUploading("UPLOADING");
	
			let name = item.name;
			let type = encodeURIComponent(item.type);
			
			// Get pre-signed URL
			let preSignedUrlData = "";
			let uploadUrl = "";
			let isSuccess = false;
	
			try {
				const res = await getPreSignedUrl(name, type);
				preSignedUrlData = await res.json();
	
				if(!hasValue(preSignedUrlData.errorType)) {
					uploadUrl = preSignedUrlData.body.UploadUrl;
					log("[API GET] OK - Presigned URL: " + uploadUrl, "SUCCESS");
					isSuccess = true;
				}
				else {
					log("[API GET] FAILED - Presigned URL", "ERROR");
					console.error(preSignedUrlData);
					if(isLast) setIsUploading("FAILED");
				}
			}
			catch(err) {
				log("[API GET] FAILED - Presigned URL", "ERROR");
				console.error(err);
				if(isLast) setIsUploading("FAILED");
			}
	
	
			// Upload file
			if(isSuccess) {
	
				try {
					const res = await putFile(uploadUrl, item.type, item);
	
					if(200 === res.status) {
						log("[API PUT] OK - File: " + name, "SUCCESS");
						if(isLast) setIsUploading("COMPLETE");
					}
					else {
						log("[API PUT] FAILED - File: " + name, "ERROR");
						console.error(res);
						if(isLast) setIsUploading("FAILED");
					}
				}
				catch(err) {
					log("[API PUT] FAILED - File: " + name, "ERROR");
					console.error(err);
					if(isLast) setIsUploading("FAILED");
				}
			}
		}

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
			}, REFRESH_TIMEOUT);
		}
		else {
			setDropzoneStyle("div div--filedrop-dropzone div--filedrop-uploading");
			setDropzoneText(<span>Upload failed.</span>);
			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
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
			data-testid="dropzone"
			onDragOver={(e) => e.preventDefault()}
			onDragEnter={(e) => handleDragEnter(e)}
			onDragLeave={(e) => handleDragLeave(e)}
			onDrop={(e) => handleDrop(e)}
		>
			{dropzoneText}
		</div>
	);
}

FileDrop.propTypes = {
	callbackAfterUpload: PropTypes.func,
}

export default FileDrop;