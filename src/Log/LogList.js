import React, { useEffect, useState, Suspense, lazy } from "react";
import PropTypes from 'prop-types';
import { log } from '../common/common';
import { getLogs, getNextLogs } from './api';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const LogItem = lazy(() => import('./LogItem'));

const LogList = (props) => {

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [seeMoreButtonText, setSeeMoreButtonText] = useState("See more");
	const [seeMoreButtonClass, setSeeMoreButtonClass] = useState("button button--loglist-seemore");
	const [isShowToasterCenter, setIsShowToasterCenter] = useState(0);
	const [toasterMessageCenter, setToasterMessageCenter] = useState("");
	const [isShowToasterBottom, setIsShowToasterBottom] = useState(0);
	const [toasterMessageBottom, setToasterMessageBottom] = useState("");
	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	// Get log list from API gateway
	const fetchFirst = async () => {

		setIsLoading(true);

		try {
			// Call API
			const res = await getLogs(1);
			const newData = await res.json();

			if(undefined !== newData.errorType) {
				console.error(newData);
			}
			else {
				log("Logs are FETCHED successfully.");
				let newLog = newData.body.Items;

				// Set log array
				setLogs(undefined === newData.body.Items
					? []
					: newLog
				);

				// Last item
				setLastTimestamp(undefined === newData.body.LastEvaluatedKey
					? undefined
					: newData.body.LastEvaluatedKey.timestamp
				);
			}
		}
		catch(err) {
			console.error(err);
		}
		
		setIsLoading(false);
	}

	// Get next log list from API gateway
	const fetchMore = async (timestamp) => {

		setIsLoading(true);

		try {
			// Call API
			const res = await getNextLogs(timestamp);
			const nextData = await res.json();

			if(undefined !== nextData.errorType) {
				console.error(nextData);
			}
			else {
				log("Next logs are FETCHED successfully.");
				let newLog = logs.concat(nextData.body.Items);
	
				// Set log array
				setLogs(undefined === nextData.body.Items
					? []
					: newLog
				);
	
				// Last item
				setLastTimestamp(undefined === nextData.body.LastEvaluatedKey
					? undefined
					: nextData.body.LastEvaluatedKey.timestamp
				);
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	// Fetch data at mount
	useEffect(() => fetchFirst(), [props.isPostSuccess]);

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setToasterMessageCenter("Loading logs...");
			setSeeMoreButtonText("Loading...");
			setSeeMoreButtonClass("button button--loglist-seemore button--loglist-seemoreloading");
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
			setSeeMoreButtonText("See more");
			setSeeMoreButtonClass("button button--loglist-seemore");
		}
	}, [isLoading]);

	// Callback delete item from LogItem
	const afterDelete = () => {
		fetchFirst();	
		setToasterMessageBottom("The log deleted.");
		setIsShowToasterBottom(1);
	}

	// See more button
	const seeMoreButton = (lastTimestamp === undefined)
		? ""
		: <button
			className={seeMoreButtonClass}
			onClick={() => fetchMore(lastTimestamp)}
			>
				{seeMoreButtonText}
			</button>;

	// Draw log list
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
						showComments={true}
						showLink={true}
						deleted={afterDelete}
					/>
				))}
			</Suspense>
				
			{seeMoreButton}

			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToasterCenter}
					message={toasterMessageCenter}
					completed={() => setIsShowToasterCenter(2)}
				/>
				<Toaster 
					show={isShowToasterBottom}
					message={toasterMessageBottom}
					position={"bottom"}
					type={"success"}
					duration={2000}				
					completed={() => setIsShowToasterCenter(2)}
				/>
			</Suspense>
		</div>
	);
}

LogList.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogList;