import React, { useState, useEffect, useRef } from "react";
import Toaster from "../Toaster/Toaster";
import { uploadFile } from './uploadFile';

const REFRESH_TIMEOUT = 3000;

interface FileUploadProps {
	callbackAfterUpload: () => void;
}

type UploadState = "READY" | "UPLOADING" | "COMPLETE" | "FAILED";
type ToasterShowState = 0 | 1 | 2;
type ToasterKind = "information" | "success" | "warning" | "error";

const FileUpload = (props: FileUploadProps): React.ReactElement => {

	const [files, setFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState<UploadState>("READY");

	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [toasterType, setToasterType] = useState<ToasterKind>("success");
	const [toasterMessage, setToasterMessage] = useState<string>("");

	const refreshFiles = props.callbackAfterUpload;

	// REQ-093 (I2)(FR-02) — unmount-safety 채널 박제 (TSK-27).
	// React 19 의 unmounted setState silent-ignore 와 REQ-091 console.error fail-fast 정합 위해
	// pending `getPreSignedUrl` / `putFile` 가 unmount 후 응답을 받더라도 `setIsUploading`
	// (UPLOADING / FAILED / COMPLETE) 발화를 0 hit 로 박제한다. 수단 = `cancelled` ref (수단 중립 (b) 채택).
	const cancelledUploadRef = useRef<boolean>(false);

	useEffect(() => {

		const cancelled = cancelledUploadRef;
		cancelled.current = false;

		const uploadOne = (f: File): Promise<boolean> => uploadFile(f, () => cancelled.current);

		// 결과는 **전 파일이 끝난 뒤 한 번** 판정한다. 예전에는 인덱스상 마지막
		// 파일만 상태를 세팅해, 앞 파일이 실패해도 마지막이 성공하면 "Upload
		// complete." 가 떴다 — 부분 실패가 성공으로 보고됐다. 게다가 업로드는
		// 동시 실행이라(await 없는 루프) 완료 순서가 인덱스 순이 아니므로
		// "마지막" 지정 자체가 타이밍상 신뢰할 수 없었다.
		if(files.length > 0) {
			setIsUploading("UPLOADING");
			void (async () => {
				const results = await Promise.all(files.map(uploadOne));
				if(cancelled.current) return;
				setIsUploading(results.every(Boolean) ? "COMPLETE" : "FAILED");
			})();
		}

		return (): void => {
			cancelled.current = true;
		};

	}, [files]);

	useEffect(() => {

		let refreshHandle: ReturnType<typeof setTimeout> | undefined;

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

			refreshHandle = setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
		}
		else if("FAILED" === isUploading) {

			(document.getElementById('file-upload-for-mobile') as HTMLInputElement).value = "";

			setToasterMessage("Upload failed.");
			setToasterType("error");
			setIsShowToaster(1);
			setFiles([]);

			refreshHandle = setTimeout(function() {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
		}

		return () => {
			if(refreshHandle !== undefined) {
				clearTimeout(refreshHandle);
			}
		};

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

export default FileUpload;