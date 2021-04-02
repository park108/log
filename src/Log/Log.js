import React, { useEffect, useState } from "react";
import * as common from '../common';
import LogItem from './LogItem';
import Writer from './Writer';

const Log = (props) => {

	const [logs, setLogs] = useState([]);

	async function fetchData() {
		const res = await fetch(common.getAPI());
		res.json()
			.then(res => {
				console.log("DATA FETCHED from AWS!!");
				setLogs(res.Items);
			})
			.catch(err => {
				console.log(err);
			});
	}

	useEffect(() => {
		fetchData();
	}, []);

	const handleSubmit = (contents) => {

		let timestamp = Math.floor(new Date().getTime());

		let log = {
			"id": logs.length,
			"contents": contents,
			"timestamp": timestamp,
			"author": "Jongkil Park"
		};

		// TODO: Create API
		setLogs([...logs, log]);
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