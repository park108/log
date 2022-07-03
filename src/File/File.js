import React, { useState, useEffect } from "react";
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getFiles, getNextFiles } from './api';
import { log, isAdmin, isMobile, setHtmlTitle } from '../common/common';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';
import FileUpload from "./FileUpload";

import './File.css';

const File = (props) => {

	const [files, setFiles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [seeMoreButtonText, setSeeMoreButtonText] = useState("See more");
	const [seeMoreButtonClass, setSeeMoreButtonClass] = useState("button button--loglist-seemore");
	const [lastTimestamp, setLastTimestamp] = useState(undefined);
	const [isShowToaster, setIsShowToaster] = useState(1);

	const contentHeight = props.contentHeight;

	// Get uploaded file list from API Gateway
	const fetchData = async () => {

		setIsLoading(true);

		try {
			const res = await getFiles();
			const newData = await res.json();

			if(undefined !== newData.errorType) {
				console.error(newData);
			}
			else {

				log("Files are FETCHED successfully.");
				const newFiles = newData.body.Items;
				const lastEvaluatedKey = newData.body.LastEvaluatedKey;

				setFiles(undefined === newFiles ? [] : newFiles);
				setLastTimestamp(undefined === lastEvaluatedKey ? undefined : lastEvaluatedKey.timestamp);
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	// Get next file list from API Gateway
	const fetchMore = async (timestamp) => {

		setIsLoading(true);

		try {
			const res = await getNextFiles(timestamp);
			const nextData = await res.json();

			if(undefined !== nextData.errorType) {
				console.error(nextData);
			}
			else {
				log("Next files are FETCHED successfully.");
				const newFiles = files.concat(nextData.body.Items);
				const lastEvaluatedKey = nextData.body.LastEvaluatedKey;
	
				setFiles(undefined === nextData.body.Items ? [] : newFiles);	
				setLastTimestamp(undefined === lastEvaluatedKey ? undefined : lastEvaluatedKey.timestamp);
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	// Fetch data at mount
	useEffect(() => {
		setHtmlTitle("file");
		fetchData();
	}, []);

	// Change by upload state
	useEffect(() => {
		if(isLoading) {
			setSeeMoreButtonText("Loading...");
			setSeeMoreButtonClass("button button--file-seemore button--file-seemoreloading");
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
			setSeeMoreButtonText("See more");
			setSeeMoreButtonClass("button button--file-seemore");
		}
	}, [isLoading]);

	// Select file upload UI
	const fileUploadUI = isMobile() 
		? <FileUpload uploaded={fetchData} />
		: <FileDrop uploaded={fetchData} />;

	// Make See More button
	const seeMoreButton = (lastTimestamp === undefined)
		? ""
		: (
			<button
				data-testid="seeMoreButton"
				className={seeMoreButtonClass}
				onClick={() => fetchMore(lastTimestamp)}
			>
				{seeMoreButtonText}
			</button>
		);
	
	
	// If not admin, redirect initial page
	if(!isAdmin()) {
		return <Navigate to="/log" />;
	}

	// Draw file app.
	return (
		<main className="main main--contents" style={contentHeight} role="application">
			<article className="article article--main-item">

				{fileUploadUI}

				<div className="div div--files-list" role="list">
					{
						files.map(
							data => (				
								<FileItem
									key={data.key}
									fileName={data.key}
									lastModified={data.timestamp}
									size={data.size}
									url={data.url}
									deleted={fetchData}
								/>
							)
						)
					}
				</div>

				{seeMoreButton}
			</article>
				
			<Toaster 
				show={isShowToaster}
				message={"Loading files..."}
				completed={() => setIsShowToaster(2)}
			/>
		</main>
	);
}

File.propTypes = {
	contentHeight: PropTypes.object,
}

export default File;