import React, { useState, useEffect } from "react";
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm } from '../common';
import * as commonFile from './commonFile';

const FileItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--fileitem");

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage ,setToasterMessage] = useState("");

	useEffect(() => {
		if(isDeleting) {
			setItemClass("div div--fileitem div--fileitem-delete")
		}
		else {
			setItemClass("div div--fileitem")
		}
	}, [isDeleting]);

	const copyToClipboard = () => {

		let url = commonFile.getFileUrl() + "/" + props.fileName;

		let tempElem = document.createElement('textarea');
		tempElem.value = url;  
		document.body.appendChild(tempElem);
	  
		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		log("URL " + url + " copied.");

		setToasterMessage(props.fileName + " URL copied.");
		setIsShowToaster(1);
	}

	const deleteFileItem = () => {

		setIsDeleting(true);

		const api = commonFile.getAPI() + "/key/" + props.fileName;

		const body = {
			key: props.fileName
		}

		// Call DELETE API
		fetch(api, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		}).then(res => {
			log("A file is DELETED successfully.");
			props.deleted();
		}).catch(err => {
			console.error(err);
		});
	}

	const abort = () => log("Deleting aborted");
	const confirmDelete = confirm("Are you sure delete '" + props.fileName+ "'?", deleteFileItem, abort);

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
	)
}

export default FileItem;