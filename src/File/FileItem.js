import React, { useState, useEffect } from "react";
import Toaster from "../Toaster/Toaster";
import { log, getFormattedDate, getFormattedTime, confirm } from '../common';
import * as commonFile from './commonFile';

const FileItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--fileitem");
	const [hasFileDetail, setHasFileDetail] = useState(false);
	const [showFileDetail, setShowFileDetail] = useState(false);
	const [fileDetail, setFileDetail] = useState({});
	const [fileDetailClass, setFileDetailClass] = useState("div div--fileitem-filedetailhide");

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

	useEffect(() => {
		if(hasFileDetail && showFileDetail) {
			setFileDetailClass("div div--fileitem-filedetail");
		}
		else {
			setFileDetailClass("div div--fileitem-filedetailhide");
		}
	}, [hasFileDetail, showFileDetail]);

	const FileName = () => {
		return <div className="div div--fileitem-filename" onClick={fetchFileDetail} >
			{props.fileName}
		</div>;
	}

	const LastModified = () => {
		return <span className="span span--fileitem-lastmodified">
			{getFormattedDate(props.lastModified) + " " + getFormattedTime(props.lastModified)}
		</span>;
	}
	

	const Toolbar = () => {

		let infoSeparator = <span className="span span--fileitem-separator">|</span>;

		let deleteButton = <span onClick={confirmDelete} className="span span--fileitem-delete">Delete</span>;
		
		let copyUrlButton = <span onClick={copyToClipboard} className="span span--fileitem-copyurl">URL</span>;

		return <span className="span span--fileitem-toolbar">
			{deleteButton}
			{infoSeparator}
			{copyUrlButton}
		</span>
	}

	const copyToClipboard = () => {

		let url = commonFile.getFileUrl() + "/" + props.fileName;

		let tempElem = document.createElement('textarea');
		tempElem.value = url;  
		document.body.appendChild(tempElem);
	  
		tempElem.select();
		document.execCommand("copy");
		document.body.removeChild(tempElem);

		log("URL " + url + " copied.");

		setToasterMessage(props.fileName + " URL has been copied to your clipboard.");
		setIsShowToaster(1);
	}

	const initToaster = () => {
		setIsShowToaster(0);
	}

	const FileDetail = (data) => {

		const size = (data.size * 1).toLocaleString();
		const unit = data.unit;
		const type = data.type;

		return <div className={fileDetailClass}>
			<div className="div div--fileitem-type">{type}</div>
			<div className="div div--fileitem-size">{size} {unit}</div>
		</div>
	}

	async function fetchFileDetail() {

		if(!hasFileDetail) {

			const res = await fetch(commonFile.getAPI() + "/key/" + props.fileName);

			res.json().then(res => {			
				log("A file detail is FETCHED successfully.");
				setHasFileDetail(true);
				setFileDetail(res.body);
			}).catch(err => {
				console.error(err);
				setHasFileDetail(false);
			});
		}

		setShowFileDetail(!showFileDetail);
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
		<div className={itemClass}>
			<div className="div div--fileitem-fileinfo">
				<FileName />
				<div className="div div--fileitem-statusbar">
					<LastModified />
					<Toolbar />
				</div>
			</div>
			<FileDetail
				size={fileDetail.ContentLength}
				unit={fileDetail.AcceptRanges}
				type={fileDetail.ContentType}
			/>
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"success"}
				duration={2000}
				
				completed={initToaster}
			/>
		</div>
	)
}

export default FileItem;