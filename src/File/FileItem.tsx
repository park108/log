import React, { useState } from "react";
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm, copyToClipboard } from '../common/common';
import { activateOnKey } from '../common/a11y';
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

	const deleteFileItem = async () => {

		setIsDeleting(true);

		try {
			const res = await deleteFile(props.fileName as string);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API DELETE] OK - File: " + props.fileName, "SUCCESS");
				setTimeout(() => refreshFiles?.(), refreshTimeout);
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
			log("[API DELETE] FAILED - File: " + props.fileName, "ERROR");
			setToasterMessage("Upload file failed for network issue.");
			setToasterType("error");
			setIsShowToaster(1);
			reportError(err);
		}
	}

	const copyFileUrl = async () => {
		const ok = await copyToClipboard(props.url as string);
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
				<div
					className="div div--fileitem-filename"
					role="button"
					tabIndex={0}
					onClick={copyFileUrl}
					onKeyDown={activateOnKey(copyFileUrl)}
				>
					{props.fileName}
				</div>
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
						<span
							onClick={confirmDelete}
							onKeyDown={activateOnKey(confirmDelete as () => void)}
							className="span span--fileitem-delete"
							role="button"
							tabIndex={0}
						>
							✕
						</span>
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