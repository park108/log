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

		const now = Math.floor(new Date().getTime());

		// Call POST API
		fetch(common.getAPI(), {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"timestamp": now,
				"isDeleted": " ",
				"logs": [{
					"contents": contents,
					"timestamp": now
				}]
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
			<Writer
				submit={handleSubmit}
				isPostSuccess={isPostSuccess}
			/>
			{logs.map(data => (
				<LogItem
					key={data.timestamp}
					item={data}
					delete={fetchData}
				/>
			))}
		</div>
	);
}

export default Log;