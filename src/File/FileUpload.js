import React, { useState, useEffect } from "react";
import Toaster from "../Toaster/Toaster";
import * as commonFile from './commonFile';

const FileUpload = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState(0);

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

		// 0: Ready
		if(0 === isUploading) {
			document.getElementById('file-upload-for-mobile').disabled = false;
		}

		// 1: Uploading
		else if(1 === isUploading) {
			document.getElementById('file-upload-for-mobile').disabled = true;
		}

		// 2: Complete
		else if(2 === isUploading) {

			// Delete selected files in input
			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload complete.");
			setToasterType("success");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading(0);
				refreshFiles();
			}, 1000);
		}

		// 3: Failed
		else if(3 === isUploading) {

			// Delete selected files in input
			document.getElementById('file-upload-for-mobile').value = "";
		
			setToasterMessage("Upload failed.");
			setToasterType("error");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading(0);
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

		setIsUploading(1);

		let name = item.name;
		let type = encodeURIComponent(item.type);
		
		// Get pre-signed URL
		const res = await fetch(commonFile.getAPI() + "/key/" + name + "/type/" + type);

		res.json().then(res => {

			console.log("Presigned URL FETCHED from AWS successfully.");

			let params = {
				method: "PUT",
				headers: {
					"Content-Type": item.type
				},
				body: item
			};

			// Upload a file using pre-signed URL into S3
			fetch(res.body.UploadUrl, params).then(res => {
				console.log("File [" + name + "] PUTTED into AWS S3 successfully.");
				if(isLast) setIsUploading(2);

			}).catch(err => {
				console.error(err);
				if(isLast) setIsUploading(3);
			});

		}).catch(err => {
			console.error(err);
			if(isLast) setIsUploading(3);
		});
	}

	const initToaster = () => {
		setIsShowToaster(0);
	}

	return <div className="div div--fileupload-input">
		<input
			id="file-upload-for-mobile"
			type="file"
			accept="image/*"
			multiple
			onChange={(event) => handleSelectedFiles(event)}
		/>
		<Toaster 
			show={isShowToaster}
			message={toasterMessage}
			position={"bottom"}
			type={toasterType}
			duration={2000}
			
			completed={initToaster}
		/>
	</div>;
}

export default FileUpload;