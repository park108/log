import React, { useEffect, useState, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { log } from '../common';
import PageNotFound from "../PageNotFound";
import * as commonLog from './commonLog';

const LogItem = lazy(() => import('./LogItem'));
const Toaster = lazy(() => import('../Toaster/Toaster'));

const LogSingle = (props) => {

	const [data, setData] = useState({});
	const [isLoading, setIsLoading] = useState(false);

	const [hasItem, setHasItem] = useState("NOW_LOADING");

	const [isShowToasterCenter, setIsShowToasterCenter] = useState(0);
	const [toasterMessageCenter, setToasterMessageCenter] = useState("");

	const [isShowToasterBottom, setIsShowToasterBottom] = useState(0);
	const [toasterMessageBottom, setToasterMessageBottom] = useState("");

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
				setHasItem("NO");
			}

			// Set log item data
			else {
				setData(res.body.Items[0]);
				setHasItem("YES");
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
			setToasterMessageCenter("Loading a log...");
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	const callbackDeleteItem = () => {
		fetchData(logTimestamp);
		
		setToasterMessageBottom("The log deleted.");
		setIsShowToasterBottom(1);
	}
	
	const logItem = ("YES" === hasItem)
	? <LogItem
		author={data.author}
		timestamp={data.timestamp}
		contents={data.logs[0].contents}
		item = {data}
		showComments={true}
		deleted={callbackDeleteItem}
	/>
	: ("NO" === hasItem) ? <PageNotFound />
	: "";


	return (
		<div role="list">
			<Suspense fallback={<div></div>}>
				{logItem}
			</Suspense>
			<Toaster 
				show={isShowToasterCenter}
				message={toasterMessageCenter}
				
				completed={() => setIsShowToasterCenter(0)}
			/>
			<Toaster 
				show={isShowToasterBottom}
				message={toasterMessageBottom}
				position={"bottom"}
				type={"success"}
				duration={2000}
				
				completed={() => setIsShowToasterBottom(0)}
			/>
		</div>
	);
}

export default LogSingle;