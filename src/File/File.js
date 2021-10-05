import React, { useState, useEffect } from "react";
import { useLocation, Redirect } from 'react-router-dom';
import * as commonFile from './commonFile';
import * as common from '../common';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';

const File = (props) => {

	const [files, setFiles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");

	const location = useLocation();

	async function fetchData() {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(commonFile.getAPI());

		res.json().then(res => {
			console.log("Files are FETCHED from AWS successfully.");
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
			node.style.maxWidth = "800px";
		}
	}, [location.pathname]);

	if(!common.isAdmin()) {
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
				<FileDrop 
					uploaded={fetchData}
				/>
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