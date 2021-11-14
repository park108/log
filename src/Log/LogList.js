import React, { useEffect, useState, Suspense, lazy } from "react";
import { log } from '../common';
import * as commonLog from './commonLog';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const LogItem = lazy(() => import('./LogItem'));

const LogList = (props) => {

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [seeMoreButtonText, setSeeMoreButtonText] = useState("See more");
	const [seeMoreButtonClass, setSeeMoreButtonClass] = useState("button button--loglist-seemore");

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	const [isShowToaster2, setIsShowToaster2] = useState(0);
	const [toasterMessage2, setToasterMessage2] = useState("");

	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const fetchFirst = async () => {

		setIsLoading(true);

		const apiUrl = commonLog.getAPI();

		// Call GET API
		try {
			const res = await fetch(apiUrl);
			const newData = await res.json();

			if(undefined !== newData.errorType) {
				console.error(res);
			}
			else {
				log("Logs are FETCHED successfully.");
				let newLog = newData.body.Items;

				// Set log array
				setLogs((undefined === newData.body.Items)
					? []
					: newLog
				);

				// Last item
				setLastTimestamp((undefined === newData.body.LastEvaluatedKey)
					? undefined
					: newData.body.LastEvaluatedKey.timestamp
				);
			}
			setIsLoading(false);
		}
		catch(err) {
			console.error(err);
		}
	}

	const fetchMore = async (timestamp) => {

		setIsLoading(true);

		const apiUrl = commonLog.getAPI() + "?lastTimestamp=" + timestamp;

		// Call GET API
		try {
			const res = await fetch(apiUrl);
			const nextData = await res.json();

			if(undefined !== res.errorType) {
				console.error(res);
			}
			else {
				log("Next logs are FETCHED successfully.");
				let newLog = logs.concat(nextData.body.Items);
	
				// Set log array
				setLogs((undefined === nextData.body.Items)
					? []
					: newLog
				);
	
				// Last item
				setLastTimestamp((undefined === nextData.body.LastEvaluatedKey)
					? undefined
					: nextData.body.LastEvaluatedKey.timestamp
				);
			}

			setIsLoading(false);
		}
		catch(err) {
			console.error(err);
		}
	}

	useEffect(() => fetchFirst(), [props.isPostSucces]);

	useEffect(() => {
		if(isLoading) {
			setToasterMessage("Loading logs...");
			setSeeMoreButtonText("Loading...");
			setSeeMoreButtonClass("button button--loglist-seemore button--loglist-seemoreloading");
			setIsShowToaster(1);
		}
		else {
			setIsShowToaster(2);
			setSeeMoreButtonText("See more");
			setSeeMoreButtonClass("button button--loglist-seemore");
		}
	}, [isLoading]);

	const callbackDeleteItem = () => {
		fetchFirst();
		
		setToasterMessage2("The log deleted.");
		setIsShowToaster2(1);
	}

	const seeMoreButton = (lastTimestamp === undefined)
		? ""
		: <button
			className={seeMoreButtonClass}
			onClick={(e) => fetchMore(lastTimestamp)}
			>
				{seeMoreButtonText}
			</button>;

	return (
		<div role="list">
			<Suspense fallback={<div></div>}>

				{logs.map(data => (
					<LogItem
						key={data.timestamp}
						author={data.author}
						timestamp={data.timestamp}
						contents={data.logs[0].contents}
						item = {data}
						deleted={callbackDeleteItem}
					/>
				))}
				
				{seeMoreButton}

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
					
					completed={() => setIsShowToaster(0)}
				/>
			</Suspense>
		</div>
	);
}

export default LogList;