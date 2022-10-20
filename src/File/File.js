import React, { useState, useEffect } from "react";
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getFiles, getNextFiles } from './api';
import { log, hasValue, isAdmin, isMobile, setHtmlTitle } from '../common/common';
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

	// Get uploaded file list from API Gateway
	const fetchData = async () => {

		setIsLoading(true);

		try {
			const res = await getFiles();
			const newData = await res.json();

			if(!hasValue(newData.errorType)) {
				log("[API GET] OK - Files", "SUCCESS");

				const newFiles = newData.body.Items;
				const lastEvaluatedKey = newData.body.LastEvaluatedKey;

				setFiles(hasValue(newFiles) ? newFiles : []);
				setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
			}
			else {
				log("[API GET] FAILED - Files", "ERROR");
				console.error(newData);
			}
		}
		catch(err) {
			log("[API GET] FAILED - Files", "ERROR");
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

			if(!hasValue(nextData.errorType)) {
				log("[API GET] OK - Next Files", "SUCCESS");
				
				const newFiles = files.concat(nextData.body.Items);
				const lastEvaluatedKey = nextData.body.LastEvaluatedKey;
	
				setFiles(hasValue(nextData.body.Items) ? newFiles : []);
				setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
			}
			else {
				log("[API GET] FAILED - Next Files", "ERROR");
				console.error(nextData);
			}
		}
		catch(err) {
			log("[API GET] FAILED - Next Files", "ERROR");
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
		? <FileUpload callbackAfterUpload={fetchData} />
		: <FileDrop callbackAfterUpload={fetchData} />;

	// Make See More button
	const seeMoreButton = (!hasValue(lastTimestamp))
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
		<main className="main main--main-contents" style={props.contentHeight} role="application">
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
			/>
		</main>
	);
}

File.propTypes = {
	contentHeight: PropTypes.object,
}

export default File;