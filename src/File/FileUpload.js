import React, { useState, useEffect } from "react";
import Toaster from "../Toaster/Toaster";
import { log } from '../common';
import * as commonFile from './commonFile';

const FileUpload = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState("READY");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterType, setToasterType] = useState("success");
	const [toasterMessage ,setToasterMessage] = useState("");

	const refreshFiles = props.uploaded;

	useEffect(() => {

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

			// Delete selected files in input
			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload complete.");
			setToasterType("success");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, 1000);
		}
		else if("FAILED" === isUploading) {

			// Delete selected files in input
			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload failed.");
			setToasterType("error");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, 1000);
		}

	}, [isUploading, refreshFiles]);

	const handleSelectedFiles = (e) => {

		e.preventDefault();
	
		let newFiles = [];

		for(let file of e.target.files) {
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
				
				completed={() => setIsShowToaster(0)}
			/>
		</div>
	);	
}

export default FileUpload;