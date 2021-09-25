import React, { useState, useEffect } from "react";
import * as common from '../common';
import * as commonFile from './commonFile';
import confirm from './confirm';

const FileItem = (props) => {

	const [isDeleting, setIsDeleting] = useState(false);
	const [itemClass, setItemClass] = useState("div div--fileitem");
	const [hasFileDetail, setHasFileDetail] = useState(false);
	const [showFileDetail, setShowFileDetail] = useState(false);
	const [fileDetail, setFileDetail] = useState({});
	const [fileDetailClass, setFileDetailClass] = useState("div div--fileitem-filedetailhide");

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
			{common.getFormattedDate(props.lastModified) + " " + common.getFormattedTime(props.lastModified)}
		</span>;
	}

	const Toolbar = () => {
		return <span className="span span--fileitem-delete" onClick={confirmDelete} >Delete</span>
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
				console.log("A file detail is FETCHED from AWS successfully.");
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
			console.log("A file is DELETED from AWS successfully.");
			props.deleted();
		}).catch(err => {
			console.error(err);
		});
	}

	const abort = () => console.log("Deleting aborted");

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
		</div>
	)
}

export default FileItem;