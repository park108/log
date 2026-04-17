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

	useEffect(() => {

		const uploadFile = async(item, isLast)  => {
	
			setIsUploading("UPLOADING");
	
			let name = item.name;
			let type = encodeURIComponent(item.type);
			
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

	return (
		<div className={dropzoneStyle}
			data-testid="dropzone"
			onDragOver={(e) => e.preventDefault()}
			onDragEnter={(e) => {
				e.preventDefault();
				e.target.classList.add("div--filedrop-dragenter");
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				e.target.classList.remove("div--filedrop-dragenter");
			}}
			onDrop={(e) => {
				e.preventDefault();
				e.target.classList.remove("div--filedrop-dragenter");
			
				let newFiles = [];
		
				for(let file of e.dataTransfer.files) {
					newFiles.push(file);
				}
		
				setFiles(newFiles);
			}}
		>
			{dropzoneText}
		</div>
	);
}

FileDrop.propTypes = {
	callbackAfterUpload: PropTypes.func,
}

export default FileDrop;