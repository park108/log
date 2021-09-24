import React, { useState, useEffect } from "react";
import * as commonFile from './commonFile';

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);
	const [isUploading, setIsUploading] = useState(0);
	const [uploading, setUploading] = useState(null);

	const resfreshFiles = props.uploaded;

	useEffect(() => {

		for(let i = 0; i < files.length; i++) {
			uploadFile(files[i], i === files.length - 1);
		}

	}, [files]);

	useEffect(() => {
		if(1 === isUploading) {
			setUploading(<div>Uploading...</div>);
		}
		else if(2 === isUploading) {
			setUploading(null);
			resfreshFiles();
			setIsUploading(0);
		}
	}, [isUploading, resfreshFiles]);

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

	async function uploadFile(item, isLast) {

		setIsUploading(true);

		let name = item.name;
		let type = encodeURIComponent(item.type);
		
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

			fetch(res.body.UploadUrl, params).then(res => {

				console.log("File [" + name + "] PUTTED into AWS S3 successfully.");
				if(isLast) {
					setIsUploading(2);
				}

			}).catch(err => {

				console.log(err);
				if(isLast) {
					setIsUploading(2);
				}
			});

		}).catch(err => {
			console.log(err);
			if(isLast) {
				setIsUploading(2);
			}
		});
	}

	return <div className="div div--filedrop-dropzone"
		onDrop={(event) => handleDrop(event)}
		onDragOver={(event) => handleDragOver(event)}
		onDragEnter={(event) => handleDragEnter(event)}
		>
		Drop files here!
		{uploading}
	</div>;
}

export default FileDrop;