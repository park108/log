import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getFiles, getNextFiles	 } from './api';
import { log, hasValue, isAdmin, isMobile, setHtmlTitle } from '../common/common';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';
import FileUpload from "./FileUpload";

import './File.css';

const File = (props) => {

	const [files, setFiles] = useState([]);
	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const [isLoading, setIsLoading] = useState(false);
	const [isGetData, setIsGetData] = useState(false);
	const [isGetNextData, setIsGetNextData] = useState(false);

	const [fileUploadUI, setFileUploadUI] = useState();
	const [seeMoreButton, setSeeMoreButton] = useState();

	const [isShowToaster, setIsShowToaster] = useState(1);
	const [isShowToasterBottom, setIsShowToasterBottom] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	const navigate = useNavigate();

	useEffect(() => {

		if(!isAdmin()) {
			const redirectPage = "/log";
			log("Redirect to " + redirectPage);
			navigate(redirectPage);
			return;
		}

		setIsGetData(true);
		setHtmlTitle("file");

		if(isMobile()) {
			setFileUploadUI(<FileUpload callbackAfterUpload={() => setIsGetData(true)} />);
		}
		else {
			setFileUploadUI(<FileDrop callbackAfterUpload={() => setIsGetData(true)} />);
		}
	}, []);

	useEffect(() => {

		const fetchFirst = async () => {
	
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
					setToasterMessage("Get files failed.");
					setIsShowToasterBottom(1);
					console.error(newData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Files", "ERROR");
				setToasterMessage("Get files failed.");
				setIsShowToasterBottom(1);
				console.error(err);
			}
	
			setIsLoading(false);
		}

		if(isGetData) {
			fetchFirst();
			setIsGetData(false);
		}

	}, [isGetData]);

	useEffect(() => {

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
					setToasterMessage("Get more files failed.");
					setIsShowToasterBottom(1);
					console.error(nextData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Next Files", "ERROR");
				setToasterMessage("Get more files failed for network issue.");
				setIsShowToasterBottom(1);
				console.error(err);
			}
	
			setIsLoading(false);
		}

		if(isGetNextData) {
			fetchMore(lastTimestamp);
			setIsGetNextData(false);
		}

	}, [isGetNextData, lastTimestamp]);

	useEffect(() => {
		if(isLoading) {
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
		}
	}, [isLoading]);

	useEffect(() => {

		const seeMoreButtonClass = isLoading
			? "button button--file-seemore button--file-seemoreloading"
			: "button button--file-seemore";
		
		const seeMoreButtonText = isLoading
			? "Loading..."
			: "See more";

		if(!hasValue(lastTimestamp)) {
			setSeeMoreButton("");
		}
		else {
			setSeeMoreButton(
				<button
					data-testid="seeMoreButton"
					className={seeMoreButtonClass}
					onClick={() => setIsGetNextData(true)}
				>
					{seeMoreButtonText}
				</button>
			);
		}
	}, [lastTimestamp, isLoading]);

	// Draw file app.
	return (
		<main className="main main--main-contents" style={props.contentHeight} role="application">
			<article className="article article--main-item">

				{ fileUploadUI }

				<div className="div div--files-list" role="list">
					{ files.map( data => (				
						<FileItem
							key={data.key}
							fileName={data.key}
							lastModified={data.timestamp}
							size={data.size}
							url={data.url}
							deleted={() => setIsGetData(true)}
						/>
					)) }
				</div>

				{ seeMoreButton }
			</article>
				
			<Toaster 
				show={ isShowToaster }
				message={ "Loading files..." }
			/>

			<Toaster 
				show={ isShowToasterBottom }
				message={ toasterMessage }
				position={ "bottom" }
				type={ "error" }
				duration={ 2000 }
				
				completed={ () => setIsShowToasterBottom(2) }
			/>
		</main>
	);
}

File.propTypes = {
	contentHeight: PropTypes.object,
}

export default File;