import React, { useState, useEffect, useMemo } from "react";
import PropTypes from 'prop-types';
import { log, hasValue } from '../common/common';
import { getPreSignedUrl, putFile } from './api';

const REFRESH_TIMEOUT = 3000;

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");
	const [isDragOver, setIsDragOver] = useState(false);

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
		if("COMPLETE" === isUploading || "FAILED" === isUploading) {
			const timer = setTimeout(() => {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
			return () => clearTimeout(timer);
		}
	}, [isUploading, refreshFiles]);

	const dropzoneText = useMemo(() => {
		if("UPLOADING" === isUploading) return <span>Uploading...</span>;
		if("COMPLETE" === isUploading) return <span>Upload complete.</span>;
		if("FAILED" === isUploading) return <span>Upload failed.</span>;
		return <span>Drop files here!</span>;
	}, [isUploading]);

	const dropzoneStyle = useMemo(() => {
		const base = "div div--filedrop-dropzone";
		if("UPLOADING" === isUploading) return `${base} div--filedrop-uploading`;
		if("COMPLETE" === isUploading) return `${base} div--filedrop-complete`;
		if("FAILED" === isUploading) return `${base} div--filedrop-uploading`;
		return `${base} div--filedrop-ready`;
	}, [isUploading]);

	const className = isDragOver
		? `${dropzoneStyle} div--filedrop-dragenter`
		: dropzoneStyle;

	return (
		<div className={className}
			data-testid="dropzone"
			data-dragover={isDragOver ? 'Y' : 'N'}
			onDragOver={(e) => e.preventDefault()}
			onDragEnter={(e) => {
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				setIsDragOver(false);
			}}
			onDrop={(e) => {
				e.preventDefault();
				setIsDragOver(false);

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
