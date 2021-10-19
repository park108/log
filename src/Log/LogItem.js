import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

	let logTimestamp = useParams()["timestamp"];

	async function fetchData(timestamp) {

		setIsLoading(true);

		// Call GET API
		const res = await fetch(commonLog.getAPI() + "/timestamp/" + timestamp);
		
		res.json().then(res => {
			console.log("The log is FETCHED from AWS successfully.");
			setIsLoading(false);
			setLogs(res.body.Items);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData(logTimestamp);
	}, [props.isPostSuccess, logTimestamp]);	

	useEffect(() => {
		if(isLoading) {
			setToasterMessage("Loading a log...");
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
		fetchData(logTimestamp);
		
		setToasterMessage2("A log has been deleted.");
		setIsShowToaster2(1);
	}

	const initToaster2 = () => {
		setIsShowToaster(0);
	}

	return (
		<div className="div div--logs-main" role="list">
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
		</div>
	);
}

export default Logs;