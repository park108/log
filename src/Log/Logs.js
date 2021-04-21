import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import * as common from '../common';
import LogItem from './LogItem';

const Logs = (props) => {

	const [logs, setLogs] = useState([]);

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
	}, [props.isPostSuccess]);

	const writeLink = common.isAdmin() ? <Link
			to={{pathname: "/log/write"
				, state: {
					from: props.location.pathname
				}}}
		>
			<button className="button button--logs-newlog">New log</button>
		</Link> : null;

	return (
		<div className="div div--logs-main">
			{writeLink}
		{logs.map(data => (
			<LogItem
				key={data.timestamp}
				author={data.author}
				timestamp={data.timestamp}
				contents={data.logs[0].contents}
				item = {data}
				delete={fetchData}
			/>
		))}
		</div>
	);
}

export default Logs;