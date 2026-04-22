import React, { useState, useEffect, useMemo, CSSProperties } from "react";
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getFiles, getNextFiles	 } from './api';
import { log, hasValue, isAdmin, isMobile, setHtmlTitle } from '../common/common';
import { reportError } from '../common/errorReporter';
import Toaster from "../Toaster/Toaster";
import FileItem from './FileItem';
import FileDrop from './FileDrop';
import FileUpload from "./FileUpload";

import './File.css';

interface FileProps {
	contentHeight?: CSSProperties;
}

interface S3FileItemData {
	key: string;
	url?: string;
	size?: number;
	bucket?: string;
	timestamp?: number;
}

interface LastEvaluatedKeyData {
	timestamp?: number;
	[k: string]: unknown;
}

interface FilesResponseBody {
	Items?: S3FileItemData[];
	LastEvaluatedKey?: LastEvaluatedKeyData;
}

interface FilesResponse {
	errorType?: string;
	body?: FilesResponseBody;
}

type ToasterShowState = 0 | 1 | 2;

const File = (props: FileProps): React.ReactElement => {

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isGetData, setIsGetData] = useState<boolean>(false);
	const [isGetNextData, setIsGetNextData] = useState<boolean>(false);

	const [files, setFiles] = useState<S3FileItemData[]>([]);
	const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(undefined);

	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(1);
	const [isShowToasterBottom, setIsShowToasterBottom] = useState<ToasterShowState>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");

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
	}, []);

	useEffect(() => {

		const fetchFirst = async (): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getFiles();
				const newData = await res.json() as FilesResponse;

				if(!hasValue(newData.errorType)) {
					log("[API GET] OK - Files", "SUCCESS");

					const newFiles = newData.body?.Items;
					const lastEvaluatedKey = newData.body?.LastEvaluatedKey;

					setFiles(hasValue(newFiles) ? (newFiles as S3FileItemData[]) : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Files", "ERROR");
					setToasterMessage("Get files failed.");
					setIsShowToasterBottom(1);
					reportError(newData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Files", "ERROR");
				setToasterMessage("Get files failed.");
				setIsShowToasterBottom(1);
				reportError(err);
			}
	
			setIsLoading(false);
		}

		if(isGetData) {
			fetchFirst();
			setIsGetData(false);
		}

	}, [isGetData]);

	useEffect(() => {

		const fetchMore = async (timestamp: number | undefined): Promise<void> => {

			setIsLoading(true);

			try {
				const res = await getNextFiles(timestamp as number);
				const nextData = await res.json() as FilesResponse;

				if(!hasValue(nextData.errorType)) {
					log("[API GET] OK - Next Files", "SUCCESS");

					const newFiles = files.concat(nextData.body?.Items ?? []);
					const lastEvaluatedKey = nextData.body?.LastEvaluatedKey;

					setFiles(hasValue(nextData.body?.Items) ? newFiles : []);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey!.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Next Files", "ERROR");
					setToasterMessage("Get more files failed.");
					setIsShowToasterBottom(1);
					reportError(nextData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Next Files", "ERROR");
				setToasterMessage("Get more files failed for network issue.");
				setIsShowToasterBottom(1);
				reportError(err);
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

	const isMobileEnv = useMemo(() => isMobile(), []);
	const fileUploadUI = isMobileEnv
		? <FileUpload callbackAfterUpload={() => setIsGetData(true)} />
		: <FileDrop callbackAfterUpload={() => setIsGetData(true)} />;

	const seeMoreButtonClass = isLoading
		? "button button--file-seemore button--file-seemoreloading"
		: "button button--file-seemore";
	const seeMoreButtonText = isLoading ? "Loading..." : "See more";
	const seeMoreButton = hasValue(lastTimestamp)
		? (
			<button
				data-testid="seeMoreButton"
				className={seeMoreButtonClass}
				onClick={() => setIsGetNextData(true)}
			>
				{seeMoreButtonText}
			</button>
		)
		: null;

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