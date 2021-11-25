import React, { useState, useEffect } from "react";
import { Redirect } from 'react-router-dom';
import * as commonFile from './commonFile';
import { log, isAdmin, isMobile } from '../common';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';
import FileUpload from "./FileUpload";

import './File.css';

const File = (props) => {

	const [files, setFiles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");

	const contentHeight = props.contentHeight;

	const fetchData = async () => {

		setIsLoading(true);

		// Call GET API
		try {
			const res = await fetch(commonFile.getAPI());
			const newData = await res.json();

			log("Files are FETCHED successfully.");
			setFiles(newData.body.Items);

			setIsLoading(false);
		}
		catch(err) {
			console.error(err);
		}
	}

	useEffect(() => fetchData(), []);

	useEffect(() => {
		if(isLoading) {
			setToasterMessage("Loading files...");
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
		}
	}, [isLoading]);

	if(!isAdmin()) {
		return <Redirect to="/log" />;
	}
	else {
		return (
			<main className="main main--contents" style={contentHeight} role="application">
				<article className="article article--main-item">
					{
						isMobile()
							? <FileUpload uploaded={fetchData} />
							: <FileDrop uploaded={fetchData} />
					}
					<div className="div div--files-list" role="list">
						{files.map(data => (				
							<FileItem
								key={data.key}
								fileName={data.key}
								lastModified={data.timestamp}
								size={data.size}
								deleted={fetchData}
							/>
						))}
					</div>
					<Toaster 
						show={isShowToaster}
						message={toasterMessage}
						completed={() => setIsShowToaster(0)}
					/>
				</article>
			</main>
		);
	}
}

export default File;