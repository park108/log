import React, { useEffect, useState } from "react";
import * as common from '../common';
import LogItem from './LogItem';
import Writer from './Writer';

const Log = (props) => {

	const [logs, setLogs] = useState([]);

	async function fetchData() {

		let apiURL = common.getAPI();
		const res = await fetch(apiURL);
		
		res.json()
			.then(res => {
				console.log("DATA FETCHED from AWS!!");
				setLogs(res.body.Items);
			})
			.catch(err => {
				console.log(err);
			});
	}

	useEffect(() => {
		fetchData();
	}, []);

	const handleSubmit = (contents) => {

		const timestamp = Math.floor(new Date().getTime());

		let apiURL = common.getAPI();

		const item = {
			"contents": contents,
			"timestamp": timestamp
		}

		const res = fetch(apiURL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(item)
		})
			.then(res => {
				console.log("DATA POSTED to AWS!!");
				fetchData();
			})
			.catch(err => {
				console.log(err);
			});
	}

	return (
		<div>
			{logs.map(data => (
				<LogItem key={data.timestamp} item={data} />
			))}
			<Writer writerSubmit={handleSubmit} />
		</div>
	);
}

export default Log;