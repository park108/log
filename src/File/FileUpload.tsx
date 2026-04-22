import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Toaster from "../Toaster/Toaster";
import { log, hasValue } from '../common/common';
import { reportError } from '../common/errorReporter';
import { getPreSignedUrl, putFile } from './api';

const REFRESH_TIMEOUT = 3000;

interface FileUploadProps {
	callbackAfterUpload: () => void;
}

type UploadState = "READY" | "UPLOADING" | "COMPLETE" | "FAILED";
type ToasterShowState = 0 | 1 | 2;
type ToasterKind = "information" | "success" | "warning" | "error";

interface PreSignedUrlResponse {
	errorType?: string;
	body?: {
		UploadUrl?: string;
	};
}

const FileUpload = (props: FileUploadProps): React.ReactElement => {

	const [files, setFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState<UploadState>("READY");

	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [toasterType, setToasterType] = useState<ToasterKind>("success");
	const [toasterMessage, setToasterMessage] = useState<string>("");

	const refreshFiles = props.callbackAfterUpload;

	useEffect(() => {

		const uploadFile = async (item: File, isLast: boolean): Promise<void> => {

			setIsUploading("UPLOADING");

			const name = item.name;
			const type = encodeURIComponent(item.type);

			let preSignedUrlData: PreSignedUrlResponse | string = "";
			let uploadUrl = "";
			let isSuccess = false;
	
			try {
				const res = await getPreSignedUrl(name, type);
				preSignedUrlData = await res.json() as PreSignedUrlResponse;

				if(!hasValue((preSignedUrlData as PreSignedUrlResponse).errorType)) {
					log("[API GET] OK - Presigned URL: " + uploadUrl, "SUCCESS");
					uploadUrl = (preSignedUrlData as PreSignedUrlResponse).body!.UploadUrl as string;
					isSuccess = true;
				}
				else {
					log("[API GET] FAILED - Presigned URL", "ERROR");
					reportError(preSignedUrlData);
					if(isLast) setIsUploading("FAILED");
				}
			}
			catch(err) {
				log("[API GET] FAILED - Presigned URL", "ERROR");
				reportError(err);
				if(isLast) setIsUploading("FAILED");
			}
	
			if(isSuccess) {
	
				try {
					const res = await putFile(uploadUrl, item.type, item);
	
					if(200 === res.status) {
						log("[API PUT] OK - File: " + name, "SUCCESS");
						if(isLast) setIsUploading("COMPLETE");
					}
					else {
						log("[API PUT] FAILED - File: " + name, "ERROR");
						reportError(res);
						if(isLast) setIsUploading("FAILED");
					}
				}
				catch(err) {
					log("[API PUT] FAILED - File: " + name, "ERROR");
					reportError(err);
					if(isLast) setIsUploading("FAILED");
				}
			}
		}

		for(let i = 0; i < files.length; i++) {
			uploadFile(files[i], i === files.length - 1);
		}

	}, [files]);

	useEffect(() => {

		if("READY" === isUploading) {
			(document.getElementById('file-upload-for-mobile') as HTMLInputElement).disabled = false;
		}
		else if("UPLOADING" === isUploading) {
			(document.getElementById('file-upload-for-mobile') as HTMLInputElement).disabled = true;
		}
		else if("COMPLETE" === isUploading) {

			(document.getElementById('file-upload-for-mobile') as HTMLInputElement).value = "";

			setToasterMessage("Upload complete.");
			setToasterType("success");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
		}
		else {

			(document.getElementById('file-upload-for-mobile') as HTMLInputElement).value = "";

			setToasterMessage("Upload failed.");
			setToasterType("error");
			setIsShowToaster(1);
			setFiles([]);

			setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
		}

	}, [isUploading, refreshFiles]);

	return (
		<div className="div div--fileupload-input">
			<input
				id="file-upload-for-mobile"
				type="file"
				aria-label="file-upload"
				multiple
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
					e.preventDefault();

					const newFiles: File[] = [];

					for(const file of (e.target.files as FileList)) {
						newFiles.push(file);
					}

					setFiles(newFiles);
				} }
			/>
			<Toaster 
				show={ isShowToaster }
				message={ toasterMessage }
				position={ "bottom" }
				type={ toasterType }
				duration={ 2000 }
				
				completed={() => setIsShowToaster(2)}
			/>
		</div>
	);	
}

FileUpload.propTypes = {
	callbackAfterUpload: PropTypes.func,
};

export default FileUpload;