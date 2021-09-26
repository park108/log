import React, { useState, useEffect } from "react";
import { useLocation, Redirect } from 'react-router-dom';
import * as commonFile from './commonFile';
import * as common from '../common';
import FileItem from './FileItem';
import FileDrop from './FileDrop';

const File = (props) => {

	const [files, setFiles] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loading, setLoading] = useState(null);

	const location = useLocation();

	async function fetchData() {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(commonFile.getAPI());

		res.json().then(res => {
			console.log("Files are FETCHED from AWS successfully.");
			setIsLoading(false);
			setFiles(res.body.Contents);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		if(isLoading) {
			setLoading(<div className="div div--files-loading">Loading...</div>);
		}
		else {
			setLoading(null);
		}
	}, [isLoading]);
	
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {

			if("/log/write" === location.pathname) {
				node.style.maxWidth = "100%";
			}
			else {
				node.style.maxWidth = "800px";
			}
		}
	}, [location.pathname]);

	if(!common.isAdmin()) {
		return <Redirect to="/log" />;
	}
	else {
		return (
			<div className="div div--main-contents">
				<FileDrop 
					uploaded={fetchData}
				/>
				<div className="div div--files-list">
					{files.map(data => (				
						<FileItem
							key={data.Key}
							fileName={data.Key}
							lastModified={data.LastModified}
							deleted={fetchData}
						/>
					))}
					{loading}
				</div>
			</div>
		);
	}
}

export default File;