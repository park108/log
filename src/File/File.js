import React, { useState, useEffect } from "react";
import { Redirect } from 'react-router-dom';
import * as commonFile from './commonFile';
import { log, isAdmin, isMobile, CONSTANTS } from '../common';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';
import FileUpload from "./FileUpload";

const File = (props) => {

	const [files, setFiles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");

	async function fetchData() {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(commonFile.getAPI());

		res.json().then(res => {
			log("Files are FETCHED successfully.");
			setIsLoading(false);
			setFiles(res.body.Contents);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		if(isLoading) {
			setToasterMessage("Loading files...");
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
		}
	}, [isLoading]);

	const initToaster = () => {
		setIsShowToaster(0);
	}
	
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {
			if(node.className.includes("div--toaster")) {
				node.style.maxWidth = "100%";
			}
			else {
				node.style.maxWidth = CONSTANTS.MAX_DIV_WIDTH;
			}
		}

	}, []);

	if(!isAdmin()) {
		return <Redirect to="/" />;
	}
	else {
		return (
			<div className="div div--main-contents">
				<Toaster 
					show={isShowToaster}
					message={toasterMessage}
					completed={initToaster}
				/>
				{
					// for test
					isMobile()
					? <FileUpload
						uploaded={fetchData}
					/>
					: <FileDrop 
						uploaded={fetchData}
					/>
				}
				<div className="div div--files-list">
					{files.map(data => (				
						<FileItem
							key={data.Key}
							fileName={data.Key}
							lastModified={data.LastModified}
							deleted={fetchData}
						/>
					))}
				</div>
			</div>
		);
	}
}

export default File;