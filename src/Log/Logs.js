import React, { useEffect, useState } from "react";
import * as commonLog from './commonLog';
import Toaster from "../Toaster/Toaster";
import LogDetail from './LogDetail';

const Logs = (props) => {

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	const [isShowToaster2, setIsShowToaster2] = useState(0);
	const [toasterMessage2, setToasterMessage2] = useState("");

	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	async function fetchData(timestamp) {

		setIsLoading(true);

		const apiUrl = (timestamp === undefined)
			? commonLog.getAPI()
			: commonLog.getAPI() + "?lastTimestamp=" + timestamp;

		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			console.log("Logs are FETCHED from AWS successfully.");

			// Set log array
			if(timestamp === undefined) {
				setLogs(res.body.Items);
			}
			else {
				let newLogs = logs;
				newLogs = newLogs.concat(res.body.Items);
				setLogs(newLogs);
			}

			// Last item
			if(res.body.LastEvaluatedKey === undefined) {
				setLastTimestamp(undefined);
			}
			else {
				setLastTimestamp(res.body.LastEvaluatedKey.timestamp);
			}

			setIsLoading(false);
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

	const callbackDeleteItem = () => {
		fetchData();
		
		setToasterMessage2("A log has been deleted.");
		setIsShowToaster2(1);
	}

	const initToaster2 = () => {
		setIsShowToaster(0);
	}

	const nextLogButtonClass = (isLoading)
		? "button button--logs-nextlog button-logs-nextlogloading"
		: "button button--logs-nextlog";

	const nextLogButton = (lastTimestamp === undefined)
		? ""
		: <button
			className={nextLogButtonClass}
			onClick={(e) => fetchData(lastTimestamp)}
			>
				See more
			</button>;

	return (
		<div className="div div--logs-main" role="list">

			{logs.map(data => (
				<LogDetail
					key={data.timestamp}
					author={data.author}
					timestamp={data.timestamp}
					contents={data.logs[0].contents}
					item = {data}
					deleted={callbackDeleteItem}
				/>
			))}
			
			{nextLogButton}

			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				completed={initToaster}
			/>
			<Toaster 
				show={isShowToaster2}
				message={toasterMessage2}
				position={"bottom"}
				type={"success"}
				duration={2000}
				
				completed={initToaster2}
			/>
		</div>
	);
}

export default Logs;