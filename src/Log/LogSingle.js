import React, { useEffect, useState, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { log } from '../common';
import { getLog } from './api';
import PageNotFound from "../PageNotFound";

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

	const fetchData = async (timestamp) => {

		setIsLoading(true);

		try {
			// Call API
			const res = await getLog(timestamp);
			const fetchedData = await res.json();
			
			if(undefined !== fetchedData.errorType) {
				console.error(res);
				setHasItem("NO"); // Page not found
			}
			else {
				log("The log is FETCHED successfully.");

				// Page not found
				if(0 === fetchedData.body.Count) {
					setHasItem("NO");
				}

				// Set log item data
				else {
					setData(fetchedData.body.Items[0]);
					setHasItem("YES");
				}

				setIsLoading(false);
			}
		}
		catch(err) {
			console.error(err);
		}
	}

	// Fetch data at mount
	useEffect(() => {
		fetchData(logTimestamp);
	}, [props.isPostSuccess, logTimestamp]);	

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setToasterMessageCenter("Loading a log...");
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	// Callback delete item from LogItem
	const afterDelete = () => {
		fetchData(logTimestamp);
		setToasterMessageBottom("The log deleted.");
		setIsShowToasterBottom(1);
	}
	
	// Draw log item
	const logItem = ("YES" === hasItem)
		? <LogItem
			author={data.author}
			timestamp={data.timestamp}
			contents={data.logs[0].contents}
			item = {data}
			showComments={true}
			showLink={true}
			deleted={afterDelete}
		/>
		: ("NO" === hasItem) ? <PageNotFound />
		: "";


	// Draw a single log
	return (
		<div role="list">
			<Suspense fallback={<div></div>}>
				{logItem}
			</Suspense>
			<Suspense fallback={<div></div>}>
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
			</Suspense>
		</div>
	);
}

export default LogSingle;