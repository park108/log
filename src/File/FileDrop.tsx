import React, { useState, useEffect, useMemo, useRef } from "react";
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

	// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-b — unmount 후 발화 차단 가드.
	// pending `getPreSignedUrl` / `putFile` 응답이 unmount 이후 도착해도 `setIsUploading`
	// 뿐 아니라 `log()` · `reportError()` 까지 0 hit 로 유지한다 (React 19 의 unmounted
	// setState silent-ignore 는 log/reportError 를 막지 못하므로 setter 한정 가드는 불충분).
	// 수단 = `cancelled` ref — 같은 도메인 선례 `FileUpload.tsx` 와 동일 이디엄.
	const cancelledUploadRef = useRef<boolean>(false);

	useEffect(() => {

		const cancelled = cancelledUploadRef;
		cancelled.current = false;

		const uploadFile = async (item: File): Promise<boolean> => {

			const name = item.name;
			const type = encodeURIComponent(item.type);

			let preSignedUrlData: PreSignedUrlResponse | string = "";
			let uploadUrl = "";
			let isSuccess = false;

			try {
				const res = await getPreSignedUrl(name, type);
				preSignedUrlData = await res.json() as PreSignedUrlResponse;

				if(cancelled.current) return false;

				if(!hasValue((preSignedUrlData as PreSignedUrlResponse).errorType)) {
					uploadUrl = (preSignedUrlData as PreSignedUrlResponse).body!.UploadUrl as string;
					log("[API GET] OK - Presigned URL: " + uploadUrl, "SUCCESS");
					isSuccess = true;
				}
				else {
					log("[API GET] FAILED - Presigned URL", "ERROR");
					reportError(preSignedUrlData);
					return false;
				}
			}
			catch(err) {
				if(cancelled.current) return false;
				log("[API GET] FAILED - Presigned URL", "ERROR");
				reportError(err);
				return false;
			}

			if(isSuccess) {

				try {
					const res = await putFile(uploadUrl, item.type, item);

					if(cancelled.current) return false;

					if(200 === res.status) {
						log("[API PUT] OK - File: " + name, "SUCCESS");
						return true;
					}
					else {
						log("[API PUT] FAILED - File: " + name, "ERROR");
						reportError(res);
						return false;
					}
				}
				catch(err) {
					if(cancelled.current) return false;
					log("[API PUT] FAILED - File: " + name, "ERROR");
					reportError(err);
					return false;
				}
			}

			return false;
		}

		// 결과는 **전 파일이 끝난 뒤 한 번** 판정한다. 예전에는 인덱스상 마지막
		// 파일만 상태를 세팅해, 앞 파일이 실패해도 마지막이 성공하면 "Upload
		// complete." 가 떴다 — 부분 실패가 성공으로 보고됐다. 게다가 업로드는
		// 동시 실행이라(await 없는 루프) 완료 순서가 인덱스 순이 아니므로
		// "마지막" 지정 자체가 타이밍상 신뢰할 수 없었다.
		if(files.length > 0) {
			setIsUploading("UPLOADING");
			void (async () => {
				const results = await Promise.all(files.map((f) => uploadFile(f)));
				if(cancelled.current) return;
				setIsUploading(results.every(Boolean) ? "COMPLETE" : "FAILED");
			})();
		}

		return (): void => {
			cancelled.current = true;
		};

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

export default FileDrop;
