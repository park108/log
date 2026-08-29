import React, { useState, useEffect, useRef } from "react";
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm, copyToClipboard } from '../common/common';
import { reportError } from '../common/errorReporter';
import { deleteFile } from './api';

interface FileItemProps {
	deleted?: () => void;
	fileName?: string;
	url?: string;
	lastModified?: number;
	size?: number;
}

type ToasterShowState = 0 | 1 | 2;
type ToasterKind = "information" | "success" | "warning" | "error";

const FileItem = (props: FileItemProps): React.ReactElement => {

	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [toasterMessage, setToasterMessage] = useState<string>("");
	const [toasterType, setToasterType] = useState<ToasterKind>("success");

	const refreshFiles = props.deleted;
	const refreshTimeout = 3000;

	// REQ-20260825-002 / TSK-20260825-04 — post-unmount 무발화 가드.
	// 이 컴포넌트의 async continuation 은 effect 가 아니라 **이벤트 핸들러** 에 있다
	// (`deleteFileItem` · `copyFileUrl`). await 이후 코드는 언마운트 뒤에도 그대로
	// 실행돼 log / reportError / state setter / 부모 콜백을 발화한다. 수단 = mount
	// 여부 ref (같은 도메인 선례 `FileUpload.tsx` 의 `cancelled` ref 와 동일 이디엄,
	// 생명주기 전체를 덮어야 하므로 이름만 `isMounted`).
	const isMounted = useRef<boolean>(true);
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
			if(null !== refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
				refreshTimerRef.current = null;
			}
		};
	}, []);

	const deleteFileItem = async () => {

		setIsDeleting(true);

		try {
			const res = await deleteFile(props.fileName as string);
			if(!isMounted.current) return;

			const status = await res.json();
			if(!isMounted.current) return;

			if(200 === status.statusCode) {
				log("[API DELETE] OK - File: " + props.fileName, "SUCCESS");
				refreshTimerRef.current = setTimeout(() => refreshFiles?.(), refreshTimeout);
			}
			else {
				log("[API DELETE] FAILED - File: " + props.fileName, "ERROR");
				setToasterMessage("Upload file failed.");
				setToasterType("error");
				setIsShowToaster(1);
				reportError(res);
			}
		}
		catch(err) {
			if(!isMounted.current) return;

			log("[API DELETE] FAILED - File: " + props.fileName, "ERROR");
			setToasterMessage("Upload file failed for network issue.");
			setToasterType("error");
			setIsShowToaster(1);
			reportError(err);
		}
	}

	const copyFileUrl = async () => {
		const ok = await copyToClipboard(props.url as string);
		if(!isMounted.current) return;

		if (ok) {
			setToasterMessage(props.fileName + " URL copied.");
			setToasterType("success");
		} else {
			setToasterMessage("Copy failed (permission denied or unavailable).");
			setToasterType("error");
		}
		setIsShowToaster(1);
	}

	const abort = () => log("Deleting aborted");
	const confirmDelete = confirm("Are you sure delete '" + (props.fileName as string) + "'?", deleteFileItem, abort);

	const className = isDeleting
		? "div div--fileitem div--fileitem-delete"
		: "div div--fileitem";

	return (
		<div className={className} data-deleting={isDeleting ? 'Y' : 'N'} role="listitem">
			<div className="div div--fileitem-fileinfo">
				<button
					type="button"
					className="button button--fileitem-filename"
					aria-label={"Copy URL of " + props.fileName}
					title="Click to copy URL"
					onClick={copyFileUrl}
				>
					{props.fileName}
				</button>
				<div className="div div--fileitem-statusbar">
					<span className="span span--fileitem-modifieddate">
						{getFormattedDate(props.lastModified as number)}
					</span>
					<span className="span span--fileitem-modifiedtime">
						{getFormattedTime(props.lastModified as number)}
					</span>
					<span className="span span--fileitem-size">
						{((props.size as number) * 1).toLocaleString()} bytes
					</span>
					<span className="span span--fileitem-toolbar">
						<button
							type="button"
							onClick={confirmDelete}
							className="button button--fileitem-delete"
							aria-label={"Delete " + props.fileName}
							title={"Delete " + props.fileName}
						>
							<span aria-hidden="true">✕</span>
						</button>
					</span>
				</div>
			</div>
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={ toasterType }
				duration={2000}				
				completed={() => setIsShowToaster(2)}
			/>
		</div>
	);
}

export default FileItem;