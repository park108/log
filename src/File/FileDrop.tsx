import React, { useState, useEffect, useMemo, useRef } from "react";
import { getFormattedSize } from '../common/common';
import { uploadFile } from './uploadFile';

const REFRESH_TIMEOUT = 3000;

interface FileDropProps {
	callbackAfterUpload: () => void;
}

type UploadState = "READY" | "UPLOADING" | "COMPLETE" | "FAILED";

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

	// 드래그 진입/이탈 **깊이**. `dragleave` 는 포인터가 자식 위로 옮겨갈 때도
	// 발화한다 — 드롭존 안에 안내 문구 `<span>` 이 있으므로, 사용자가 정확히
	// 목표 위로 가는 순간 강조가 꺼졌다 (실측: 진입 Y → 자식 위 N).
	// 진입에서 늘리고 이탈에서 줄여, 0 이 될 때만 강조를 푼다.
	const dragDepthRef = useRef<number>(0);

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
		if("COMPLETE" === isUploading || "FAILED" === isUploading) {
			const timer = setTimeout(() => {
				setIsUploading("READY");
				refreshFiles();
			}, REFRESH_TIMEOUT);
			return () => clearTimeout(timer);
		}
	}, [isUploading, refreshFiles]);

	// 업로드 중에는 "Uploading..." 만 떴다. 큰 파일(수백 MB)이면 몇 분 동안 그
	// 한 줄만 보여, 올라가고 있는지 멈춘 것인지 구별할 수 없다. 무엇을 얼마나
	// 올리는지 함께 적는다 — 시간이 걸리는 이유가 보인다.
	//
	// 진행률(%)은 fetch 로는 얻을 수 없다 (XMLHttpRequest 의 upload.onprogress 가
	// 필요하다). 업로드 경로 전체를 바꾸는 일이라 별건으로 둔다.
	const uploadingLabel = useMemo(() => {
		if(0 === files.length) return "Uploading...";

		const totalBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
		const size = getFormattedSize(totalBytes);
		const what = 1 === files.length ? files[0]!.name : files.length + " files";

		return "Uploading " + what + " (" + size + ")...";
	}, [files]);

	const dropzoneText = useMemo(() => {
		if("UPLOADING" === isUploading) return <span>{ uploadingLabel }</span>;
		if("COMPLETE" === isUploading) return <span>Upload complete.</span>;
		if("FAILED" === isUploading) return <span>Upload failed.</span>;
		return <span>Drop files here!</span>;
	}, [isUploading, uploadingLabel]);

	const dropzoneStyle = useMemo(() => {
		const base = "div div--filedrop-dropzone";
		// UPLOADING 과 FAILED 를 한 클래스로 묶으면 정상 업로드 중에도 에러 배색이
		// 뜬다 — 진행을 실패처럼 보이게 하는 오표기라 상태를 분리한다.
		if("UPLOADING" === isUploading) return `${base} div--filedrop-uploading`;
		if("FAILED" === isUploading) return `${base} div--filedrop-failed`;
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
				dragDepthRef.current += 1;
				setIsDragOver(true);
			}}
			onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
				if(0 === dragDepthRef.current) setIsDragOver(false);
			}}
			onDrop={(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				dragDepthRef.current = 0;
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
