import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import * as common from '../common';
import LogItem from './LogItem';

const Logs = (props) => {

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loading, setLoading] = useState(null);

	async function fetchData() {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(common.getAPI());
		
		res.json().then(res => {
			console.log("DATA FETCHED from AWS!!");
			setIsLoading(false);
			setLogs(res.body.Items);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, [props.isPostSuccess]);

	useEffect(() => {
		if(isLoading) {
			setLoading(<div className="div div--logs-loading">Loading...</div>);
		}
		else {
			setLoading(null);
		}
	}, [isLoading]);

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
			{loading}
		</div>
	);
}

export default Logs;