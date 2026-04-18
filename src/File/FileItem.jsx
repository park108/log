import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm, copyToClipboard } from '../common/common';
import { deleteFile } from './api';

const FileItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--fileitem");
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");
	const [toasterType, setToasterType] = useState("success");

	// a11y 패턴 B: Enter / Space 로 onClick 과 동일 핸들러 호출 (accessibility-spec §2.2, REQ-20260418-017 FR-07)
	const activateOnKey = (handler) => (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handler(event);
		}
	};

	const refreshFiles = props.deleted;
	const refreshTimeout = 3000;

	const deleteFileItem = async() => {

		setIsDeleting(true);

		try {
			const res = await deleteFile(props.fileName);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API DELETE] OK - File: " + props.fileName, "SUCCESS");
				setTimeout(refreshFiles, refreshTimeout);
			}
			else {
				log("[API DELETE] FAILED - File: " + props.fileName, "ERROR");
				setToasterMessage("Upload file failed.");
				setToasterType("error");
				setIsShowToaster(1);
				console.error(res);
			}
		}
		catch(err) {
			log("[API DELETE] FAILED - File: " + props.fileName, "ERROR");
			setToasterMessage("Upload file failed for network issue.");
			setToasterType("error");
			setIsShowToaster(1);
			console.error(err);
		}
	}

	useEffect(() => {
		(isDeleting)
			? setItemClass("div div--fileitem div--fileitem-delete")
			: setItemClass("div div--fileitem");
	}, [isDeleting]);

	const copyFileUrl = async () => {
		const ok = await copyToClipboard(props.url);
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
	const confirmDelete = confirm("Are you sure delete '" + props.fileName+ "'?", deleteFileItem, abort);

	return (
		<div className={itemClass} role="listitem">
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
						{getFormattedDate(props.lastModified)}
					</span>
					<span className="span span--fileitem-modifiedtime">
						{getFormattedTime(props.lastModified)}
					</span>
					<span className="span span--fileitem-size">
						{(props.size * 1).toLocaleString()} bytes
					</span>
					<span className="span span--fileitem-toolbar">
						<span
							onClick={confirmDelete}
							onKeyDown={activateOnKey(confirmDelete)}
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

FileItem.propTypes = {
	deleted: PropTypes.func,
	fileName: PropTypes.string,
	url: PropTypes.string,
	lastModified: PropTypes.number,
	size: PropTypes.number,
};

export default FileItem;