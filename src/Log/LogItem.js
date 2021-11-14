import React, { useEffect, useState, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { log } from '../common';
import PageNotFound from "../PageNotFound";
import * as commonLog from './commonLog';

const LogDetail = lazy(() => import('./LogDetail'));
const Toaster = lazy(() => import('../Toaster/Toaster'));

const LogItem = (props) => {

	const [logItem, setLogItem] = useState({});
	const [isLoading, setIsLoading] = useState(false);

	const [hasItem, setHasItem] = useState(0); // 0: Init, 1: has item, 2: item not found

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
			log("The log is FETCHED successfully.");

			setIsLoading(false);
			log(res);

			// Page not found
			if(undefined !== res.errorType || 0 === res.body.Count) {
				setHasItem(2);
			}

			// Set log item data
			else {
				setLogItem(res.body.Items[0]);
				setHasItem(1);
			}
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

	const callbackDeleteItem = () => {
		fetchData(logTimestamp);
		
		setToasterMessage2("The log deleted.");
		setIsShowToaster2(1);
	}
	
	const logDetail = 1 === hasItem ? <LogDetail
			author={logItem.author}
			timestamp={logItem.timestamp}
			contents={logItem.logs[0].contents}
			item = {logItem}
			deleted={callbackDeleteItem}
		/>
	: 2 === hasItem ? <PageNotFound />
	: "";


	return (
		<div className="div div--logs-main" role="list">
			<Suspense fallback={<div></div>}>
				{logDetail}
				<Toaster 
					show={isShowToaster}
					message={toasterMessage}
					completed={() => setIsShowToaster(0)}
				/>
				<Toaster 
					show={isShowToaster2}
					message={toasterMessage2}
					position={"bottom"}
					type={"success"}
					duration={2000}
					
					completed={() => setIsShowToaster2(0)}
				/>
			</Suspense>
		</div>
	);
}

export default LogItem;