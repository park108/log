import React, { useState, useEffect } from "react";
import * as commonFile from './commonFile';

const FileDrop = (props) => {

	const [files, setFiles] = useState([]);
	const [dropzoneStyle, setDropzoneStyle] = useState("div div--filedrop-ready")
	const [dropzoneText, setDropzoneText] = useState(<span>Drop files here!</span>);
	const [isUploading, setIsUploading] = useState(0);

	const resfreshFiles = props.uploaded;

	useEffect(() => {

		for(let i = 0; i < files.length; i++) {
			uploadFile(files[i], i === files.length - 1);
		}

	}, [files]);

	useEffect(() => {
		if(0 === isUploading) {
			setDropzoneStyle("div div--filedrop-ready");
			setDropzoneText(<span>Drop files here!</span>);
		}
		else if(1 === isUploading) {
			setDropzoneStyle("div div--filedrop-uploading");
			setDropzoneText(<span>Uploading...</span>);
		}
		else if(2 === isUploading) {
			setDropzoneStyle("div div--filedrop-complete");
			setDropzoneText(<span>Upload complete.</span>);
			setTimeout(function() {
				resfreshFiles();
				setIsUploading(0);
			}, 1000);
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

		setIsUploading(1);

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

	return <div className={dropzoneStyle}
		onDrop={(event) => handleDrop(event)}
		onDragOver={(event) => handleDragOver(event)}
		onDragEnter={(event) => handleDragEnter(event)}
		>
		{dropzoneText}
	</div>;
}

export default FileDrop;