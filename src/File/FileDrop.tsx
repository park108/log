import React, { useState, useEffect, useMemo } from "react";
import PropTypes from 'prop-types';
import { log, hasValue } from '../common/common';
import { reportError } from '../common/errorReporter';
import { getPreSignedUrl, putFile } from './api';

const REFRESH_TIMEOUT = 3000;

interface FileDropProps {
	callbackAfterUpload: () => void;
}

type UploadState = "READY" | "UPLOADING" | "COMPLETE" | "FAILED";

interface PreSignedUrlResponse {
	errorType?: string;
	body?: {
		UploadUrl?: string;
	};
}

const FileDrop = (props: FileDropProps): React.ReactElement => {

	const [files, setFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState<UploadState>("READY");
	const [isDragOver, setIsDragOver] = useState<boolean>(false);

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
					uploadUrl = (preSignedUrlData as PreSignedUrlResponse).body!.UploadUrl as string;
					log("[API GET] OK - Presigned URL: " + uploadUrl, "SUCCESS");
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
			uploadFile(files[i] as File, i === files.length - 1);
		}

	}, [files]);

	useEffect(() => {
		if("COMPLETE" === isUploading || "FAILED" === isUploading) {
			const timer = setTimeout(() => {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
			return () => clearTimeout(timer);
		}
	}, [isUploading, refreshFiles]);

	const dropzoneText = useMemo(() => {
		if("UPLOADING" === isUploading) return <span>Uploading...</span>;
		if("COMPLETE" === isUploading) return <span>Upload complete.</span>;
		if("FAILED" === isUploading) return <span>Upload failed.</span>;
		return <span>Drop files here!</span>;
	}, [isUploading]);

	const dropzoneStyle = useMemo(() => {
		const base = "div div--filedrop-dropzone";
		if("UPLOADING" === isUploading || "FAILED" === isUploading) return `${base} div--filedrop-uploading`;
		if("COMPLETE" === isUploading) return `${base} div--filedrop-complete`;
		return `${base} div--filedrop-ready`;
	}, [isUploading]);

	const className = isDragOver
		? `${dropzoneStyle} div--filedrop-dragenter`
		: dropzoneStyle;

	return (
		<div className={className}
			data-testid="dropzone"
			data-dragover={isDragOver ? 'Y' : 'N'}
			onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
			onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				setIsDragOver(false);
			}}
			onDrop={(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				setIsDragOver(false);

				const newFiles: File[] = [];

				for(const file of e.dataTransfer.files) {
					newFiles.push(file);
				}

				setFiles(newFiles);
			}}
		>
			{dropzoneText}
		</div>
	);
}

FileDrop.propTypes = {
	callbackAfterUpload: PropTypes.func,
}

export default FileDrop;
