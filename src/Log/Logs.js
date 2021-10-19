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

	const callbackDeleteItem = () => {
		fetchData();
		
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