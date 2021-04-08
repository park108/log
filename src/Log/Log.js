import React, { useEffect, useState } from "react";
import * as common from '../common';
import LogItem from './LogItem';
import Writer from './Writer';

const Log = (props) => {

	const [logs, setLogs] = useState([]);
	const [isPostSuccess, setIsPostSuccess] = useState(true);

	async function fetchData() {

		// Call GET API
		const res = await fetch(common.getAPI());
		
		res.json().then(res => {
			console.log("DATA FETCHED from AWS!!");
			setLogs(res.body.Items);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, []);

	const handleSubmit = (contents) => {

		setIsPostSuccess(false);

		// Call POST API
		fetch(common.getAPI(), {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"contents": contents,
				"timestamp": Math.floor(new Date().getTime())
			})
		}).then(res => {
			console.log("DATA POSTED to AWS!!");
			fetchData();
			setIsPostSuccess(true);
		}).catch(err => {
			console.error(err);
			setIsPostSuccess(false);
		});
	}

	return (
		<div>
			{logs.map(data => (
				<LogItem key={data.timestamp} item={data} />
			))}
			<Writer writerSubmit={handleSubmit} isPostSuccess={isPostSuccess} />
		</div>
	);
}

export default Log;