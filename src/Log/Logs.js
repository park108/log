import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import * as common from '../common';
import * as commonLog from './commonLog';
import Toaster from "../Toaster/Toaster";
import LogItem from './LogItem';

const Logs = (props) => {

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage ,setToasterMessage] = useState("");

	async function fetchData() {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(commonLog.getAPI());
		
		res.json().then(res => {
			console.log("Logs are FETCHED from AWS successfully.");
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
			setToasterMessage("Loading logs...");
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
		}
	}, [isLoading]);

	const initToaster = () => {
		setIsShowToaster(0);
	}

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
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				completed={initToaster}
			/>
			{writeLink}
			{logs.map(data => (
				<LogItem
					key={data.timestamp}
					author={data.author}
					timestamp={data.timestamp}
					contents={data.logs[0].contents}
					item = {data}
					deleted={fetchData}
				/>
			))}
		</div>
	);
}

export default Logs;