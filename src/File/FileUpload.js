import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Toaster from "../Toaster/Toaster";
import { log, hasValue } from '../common/common';
import { getPreSignedUrl, putFile } from './api';

const REFRESH_TIMEOUT = 3000;

const FileUpload = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");
	
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterType, setToasterType] = useState("success");
	const [toasterMessage ,setToasterMessage] = useState("");

	const refreshFiles = props.callbackAfterUpload;

	useEffect(() => {

		const uploadFile = async(item, isLast) => {
	
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
					log("[API GET] OK - Presigned URL: " + uploadUrl, "SUCCESS");
					uploadUrl = preSignedUrlData.body.UploadUrl;
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
			document.getElementById('file-upload-for-mobile').disabled = false;
		}
		else if("UPLOADING" === isUploading) {
			document.getElementById('file-upload-for-mobile').disabled = true;
		}
		else if("COMPLETE" === isUploading) {

			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload complete.");
			setToasterType("success");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
		}
		else {

			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload failed.");
			setToasterType("error");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
		}

	}, [isUploading, refreshFiles]);

	return (
		<div className="div div--fileupload-input">
			<input
				id="file-upload-for-mobile"
				type="file"
				aria-label="file-upload"
				multiple
				onChange={( e) => {
					e.preventDefault();
				
					let newFiles = [];
			
					for(let file of e.target.files) {
						newFiles.push(file);
					}
			
					setFiles(newFiles);
				} }
			/>
			<Toaster 
				show={ isShowToaster }
				message={ toasterMessage }
				position={ "bottom" }
				type={ toasterType }
				duration={ 2000 }
				
				completed={() => setIsShowToaster(2)}
			/>
		</div>
	);	
}

FileUpload.propTypes = {
	callbackAfterUpload: PropTypes.func,
};

export default FileUpload;