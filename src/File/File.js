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

	const [seeMoreButtonText, setSeeMoreButtonText] = useState("See more");
	const [seeMoreButtonClass, setSeeMoreButtonClass] = useState("button button--loglist-seemore");

	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const contentHeight = props.contentHeight;

	const fetchData = async () => {

		setIsLoading(true);

		// Call GET API
		try {
			const res = await fetch(commonFile.getAPI());
			const newData = await res.json();

			if(undefined !== newData.errorType) {
				console.error(res);
			}
			else {

				log("Files are FETCHED successfully.");
				const newFiles = newData.body.Items;
				const lastEvaluatedKey = newData.body.LastEvaluatedKey;

				// Set file array
				setFiles(undefined === newFiles ? [] : newFiles);

				// Set last item
				setLastTimestamp(undefined === lastEvaluatedKey ? undefined : lastEvaluatedKey.timestamp);
			}

			setIsLoading(false);
		}
		catch(err) {
			console.error(err);
		}
	}

	const fetchMore = async (timestamp) => {
		setIsLoading(true);

		const apiUrl = commonFile.getAPI() + "?lastTimestamp=" + timestamp;

		// Call GET API
		try {
			const res = await fetch(apiUrl);
			const nextData = await res.json();

			if(undefined !== res.errorType) {
				console.error(res);
			}
			else {
				log("Next files are FETCHED successfully.");
				const newFiles = files.concat(nextData.body.Items);
	
				// Set file array
				setFiles(undefined === nextData.body.Items ? [] : newFiles);
	
				// Last item
				setLastTimestamp(undefined === nextData.body.LastEvaluatedKey
					? undefined
					: nextData.body.LastEvaluatedKey.timestamp
				);

			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	useEffect(() => fetchData(), []);

	useEffect(() => {
		if(isLoading) {
			setToasterMessage("Loading files...");
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

	const fileUploadUI = isMobile() 
		? <FileUpload uploaded={fetchData} />
		: <FileDrop uploaded={fetchData} />;

	const seeMoreButton = (lastTimestamp === undefined)
		? ""
		: <button
			className={seeMoreButtonClass}
			onClick={(e) => fetchMore(lastTimestamp)}
			>
				{seeMoreButtonText}
			</button>;
	

	if(!isAdmin()) {
		return <Redirect to="/log" />;
	}

	return (
		<main className="main main--contents" style={contentHeight} role="application">
			<article className="article article--main-item">

				{fileUploadUI}

				<div className="div div--files-list" role="list">
					{files.map(data => (				
						<FileItem
							key={data.key}
							fileName={data.key}
							lastModified={data.timestamp}
							size={data.size}
							url={data.url}
							deleted={fetchData}
						/>
					))}
				</div>

				{seeMoreButton}
			</article>
				
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				completed={() => setIsShowToaster(0)}
			/>
		</main>
	);
}

export default File;