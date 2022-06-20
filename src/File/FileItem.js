import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm } from '../common/common';
import { deleteFile } from './api';

const FileItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--fileitem");
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");

	const refreshFiles = props.deleted;
	const refreshTimeout = 3000;

	// Delete file from the S3 bucket
	const deleteFileItem = async() => {

		setIsDeleting(true);

		// Delete a file
		try {
			const res = await deleteFile(props.fileName);

			if(200 === res.status) {
				log("A file is DELETED successfully.");
				setTimeout(refreshFiles, refreshTimeout);
			}
			else {
				console.error(res);
			}
		}
		catch(err) {
			console.error(err);
		}
	}

	// Change file item style by delete state
	useEffect(() => {
		(isDeleting)
			? setItemClass("div div--fileitem div--fileitem-delete")
			: setItemClass("div div--fileitem");
	}, [isDeleting]);

	// Copy file URL into clipboard
	const copyToClipboard = () => {

		let tempElem = document.createElement('textarea');
		tempElem.value = props.url;  
		document.body.appendChild(tempElem);

		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		log("URL " + props.url + " copied.");

		setToasterMessage(props.fileName + " URL copied.");
		setIsShowToaster(1);
	}

	// Define confirm popup for deleting
	const abort = () => log("Deleting aborted");
	const confirmDelete = confirm("Are you sure delete '" + props.fileName+ "'?", deleteFileItem, abort);

	// Draw file item
	return (
		<div className={itemClass} role="listitem">
			<div className="div div--fileitem-fileinfo">
				<div className="div div--fileitem-filename" onClick={copyToClipboard} >
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
						<span onClick={confirmDelete} className="span span--fileitem-delete">✕</span>
					</span>
				</div>
			</div>
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"success"}
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