import React, { useState, useEffect, useRef } from "react";
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, getFormattedSize, hasValue, confirm, copyToClipboard } from '../common/common';
import { reportError } from '../common/errorReporter';
import { deleteFile } from './api';
import { decodeFileName } from './decodeFileName';

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

	// 저장된 S3 키는 이중 인코딩돼 있을 수 있다 (한글 이름 실측). 사람이 보는
	// 자리에는 되돌린 이름을, **API 와 로그에는 원본 키**를 쓴다 — 표시용 이름으로
	// 삭제를 걸면 있지도 않은 키를 지우려 든다.
	const displayName = decodeFileName(props.fileName ?? "");

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

		// `url` 은 선택적 prop 이다. 없으면 copyToClipboard 의 기본값(빈 문자열)이
		// 들어가 **빈 값을 복사하고 true 를 돌려준다** — 사용자는 "URL copied" 를
		// 보지만 클립보드는 비어 있다. 거짓 성공을 알리지 않도록 먼저 가른다.
		if(!hasValue(props.url)) {
			setToasterMessage("URL is not available for " + displayName + ".");
			setToasterType("error");
			setIsShowToaster(1);
			return;
		}

		const ok = await copyToClipboard(props.url as string);
		if(!isMounted.current) return;

		if (ok) {
			setToasterMessage(displayName + " URL copied.");
			setToasterType("success");
		} else {
			setToasterMessage("Copy failed (permission denied or unavailable).");
			setToasterType("error");
		}
		setIsShowToaster(1);
	}

	const abort = () => log("Deleting aborted");
	const confirmDelete = confirm("Are you sure delete '" + displayName + "'?", deleteFileItem, abort);

	const className = isDeleting
		? "div div--fileitem div--fileitem-delete"
		: "div div--fileitem";

	return (
		<div className={className} data-deleting={isDeleting ? 'Y' : 'N'} role="listitem">
			<div className="div div--fileitem-fileinfo">
				<button
					type="button"
					className="button button--fileitem-filename"
					aria-label={"Copy URL of " + displayName}
					title="Click to copy URL"
					onClick={copyFileUrl}
				>
					{displayName}
				</button>
				<div className="div div--fileitem-statusbar">
					{/* `lastModified` 도 선택적 prop 이다. 없으면 Date(NaN) 이 되어
					    `NaN-NaN-NaN` · `NaN:NaN:NaN` 이 화면에 그려진다 — size 와 같은
					    부류의 조용한 오표기다. 유한한 수일 때만 그린다. */}
					{Number.isFinite(props.lastModified) && (
						<>
							<span className="span span--fileitem-modifieddate">
								{getFormattedDate(props.lastModified as number)}
							</span>
							<span className="span span--fileitem-modifiedtime">
								{getFormattedTime(props.lastModified as number)}
							</span>
						</>
					)}
					{/* 원시 바이트 수는 읽기 어렵다 — 164,016,161 bytes 보다 164.02 MB 다.
					    같은 저장소의 getFormattedSize 를 쓴다 (Monitor 가 이미 쓰는 것).
					    정확한 값은 title 로 남겨 필요할 때 확인할 수 있게 한다.

					    `size` 는 선택적 prop 이다. 구 구현은 `(undefined) * 1` 로 NaN 을
					    만들어 **"NaN bytes"** 를 렌더하고 있었다 — 조용한 오표기다.
					    유한한 수일 때만 그린다. */}
					{Number.isFinite(props.size) && (
						<span
							className="span span--fileitem-size"
							title={(props.size as number).toLocaleString() + " bytes"}
						>
							{getFormattedSize(props.size as number)}
						</span>
					)}
					<span className="span span--fileitem-toolbar">
						<button
							type="button"
							onClick={confirmDelete}
							className="button button--fileitem-delete"
							aria-label={"Delete " + displayName}
							title={"Delete " + displayName}
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