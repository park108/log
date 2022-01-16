import React, { useState, useEffect } from "react";
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm } from '../common';
import * as commonFile from './commonFile';

const FileItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--fileitem");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage ,setToasterMessage] = useState("");

	// Delete file from the S3 bucket
	const deleteFileItem = () => {

		setIsDeleting(true);

		const api = commonFile.getAPI() + "/key/" + props.fileName;
		const body = { key: props.fileName }

		// Set parameter for file deleting
		const params = {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		}

		// Delete a file
		fetch(api, params).then(res => {
			log("A file is DELETED successfully.");
			props.deleted();
		}).catch(err => {
			console.error(err);
		});
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
				
				completed={() => setIsShowToaster(0)}
			/>
		</div>
	);
}

export default FileItem;