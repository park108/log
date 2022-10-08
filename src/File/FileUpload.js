import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Toaster from "../Toaster/Toaster";
import { log } from '../common/common';
import { getPreSignedUrl, putFile } from './api';

const FileUpload = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterType, setToasterType] = useState("success");
	const [toasterMessage ,setToasterMessage] = useState("");

	const refreshFiles = props.callbackAfterUpload;

	// Upload files into the S3 bucket
	const uploadFile = async(item, isLast) => {

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

			if(undefined !== preSignedUrlData.errorType) {
				console.error(preSignedUrlData);
				if(isLast) setIsUploading("FAILED");
			}
			else {
				uploadUrl = preSignedUrlData.body.UploadUrl;
				log("[API GET] OK - Presigned URL: " + uploadUrl);
				isSuccess = true;
			}
		}
		catch(err) {
			console.error(err);
			if(isLast) setIsUploading("FAILED");
		}


		// Upload file
		if(isSuccess) {

			try {
				const res = await putFile(uploadUrl, item.type, item);

				if(200 === res.status) {
					log("File [" + name + "] PUTTED successfully.");
					if(isLast) setIsUploading("COMPLETE");
				}
				else {
					console.error(res);
					if(isLast) setIsUploading("FAILED");
				}
			}
			catch(err) {
				console.error(err);
				if(isLast) setIsUploading("FAILED");
			}
		}
	}

	// Upload files by changing files state
	useEffect(() => {

		for(let i = 0; i < files.length; i++) {
			uploadFile(files[i], i === files.length - 1);
		}

	}, [files]);

	// Change by upload state
	useEffect(() => {

		const refreshTimeout = 3000;

		if("READY" === isUploading) {
			document.getElementById('file-upload-for-mobile').disabled = false;
		}
		else if("UPLOADING" === isUploading) {
			document.getElementById('file-upload-for-mobile').disabled = true;
		}
		else if("COMPLETE" === isUploading) {

			// Delete selected files in input
			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload complete.");
			setToasterType("success");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, refreshTimeout);
		}
		else {

			// Delete selected files in input
			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload failed.");
			setToasterType("error");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, refreshTimeout);
		}

	}, [isUploading, refreshFiles]);

	// Define input event handler
	const handleSelectedFiles = (e) => {

		e.preventDefault();
	
		let newFiles = [];

		for(let file of e.target.files) {
			newFiles.push(file);
		}

		setFiles(newFiles);
	}

	// Draw upload input
	return (
		<div className="div div--fileupload-input">
			<input
				id="file-upload-for-mobile"
				type="file"
				aria-label="file-upload"
				multiple
				onChange={(event) => handleSelectedFiles(event)}
			/>
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={toasterType}
				duration={2000}
				
				completed={() => setIsShowToaster(2)}
			/>
		</div>
	);	
}

FileUpload.propTypes = {
	callbackAfterUpload: PropTypes.func,
};

export default FileUpload;