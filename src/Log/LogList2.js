import React, { useEffect, useState, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, getFormattedDate } from '../common/common';
import { getLogs, getNextLogs } from './api';
import { markdownToHtml } from '../common/markdownParser';

const LogList = (props) => {

	const itemPerPage = 10;

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [seeMoreButtonText, setSeeMoreButtonText] = useState("See more");
	const [seeMoreButtonClass, setSeeMoreButtonClass] = useState("button button--loglist-seemore");
	const [isShowToasterCenter, setIsShowToasterCenter] = useState(0);
	const [toasterMessageCenter, setToasterMessageCenter] = useState("");
	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const Toaster = lazy(() => import('../Toaster/Toaster'));

	const ellipsis = " ...";

	// Get log list from API gateway
	const fetchFirst = async () => {

		setIsLoading(true);

		// Get log list from session
		const listInSession = sessionStorage.getItem("logList");
		if("undefined" !== listInSession && null !== listInSession) {
			setLogs(JSON.parse(listInSession));

			const lastTimestampInSession = sessionStorage.getItem("logListLastTimestamp");
			if("undefined" !== lastTimestampInSession && null !== lastTimestampInSession) {
				setLastTimestamp(JSON.parse(lastTimestampInSession));
			}

			log("Get logs from session.");

			setIsLoading(false);
			return;
		}

		try {
			// Call API
			const res = await getLogs(itemPerPage);
			const fetchedData = await res.json();

			if(undefined !== fetchedData.errorType) {
				console.error(fetchedData);
			}
			else {
				// Make data for log list
				log("Logs are FETCHED successfully.");

				const newLogs = fetchedData.body.Items;

				let trimmedContents = ""; 
				let contentsLength = 0;
				let logList = [];

				if(undefined !== newLogs) {

					for(const item of newLogs) {

						trimmedContents = markdownToHtml(item.logs[0].contents).replace(/(<([^>]+)>)/gi, '');
						contentsLength = trimmedContents.length;
						trimmedContents = contentsLength > 50 ? trimmedContents.substr(0, 50) + ellipsis : trimmedContents;

						logList.push({
							"timestamp": item.timestamp,
							"date": getFormattedDate(item.timestamp),
							"contents": trimmedContents
						});
					}
				}

				// Set log list
				setLogs(logList);

				// Last item
				setLastTimestamp(undefined === fetchedData.body.LastEvaluatedKey
					? undefined
					: fetchedData.body.LastEvaluatedKey.timestamp
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
			const res = await getNextLogs(timestamp, itemPerPage);



			const fetchedData = await res.json();

			if(undefined !== fetchedData.errorType) {
				console.error(fetchedData);
			}
			else {
				// Make data for log list
				log("Next logs are FETCHED successfully.");

				const newLogs = fetchedData.body.Items;

				let trimmedContents = ""; 
				let contentsLength = 0;
				let logList = [...logs]; // Copy to new array object

				if(undefined !== newLogs) {

					for(const item of newLogs) {

						trimmedContents = markdownToHtml(item.logs[0].contents).replace(/(<([^>]+)>)/gi, '');
						contentsLength = trimmedContents.length;
						trimmedContents = contentsLength > 50 ? trimmedContents.substr(0, 50) + ellipsis : trimmedContents;

						logList.push({
							"timestamp": item.timestamp,
							"date": getFormattedDate(item.timestamp),
							"contents": trimmedContents
						});
					}
				}

				// Set log list
				setLogs(logList);

				// Last item
				setLastTimestamp(undefined === fetchedData.body.LastEvaluatedKey
					? undefined
					: fetchedData.body.LastEvaluatedKey.timestamp
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

	// Set list in local stroage
	useEffect(() => {
		sessionStorage.setItem("logList", JSON.stringify(logs));
	}, [logs]);

	// Set lastTimestamp in local stroage
	useEffect(() => {
		sessionStorage.setItem("logListLastTimestamp", JSON.stringify(lastTimestamp));
	}, [lastTimestamp]);

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
					<div className="div--loglist-item" key={data.timestamp}>
						<Link to={{
							pathname: "/log/" + data.timestamp
						}}>
							<div className="div--loglist-date">{data.date}</div>
							<div className="div--loglist-contents">{data.contents}</div>
						</Link>
					</div>
				))}
			</Suspense>
				
			{seeMoreButton}

			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToasterCenter}
					message={toasterMessageCenter}
					completed={() => setIsShowToasterCenter(0)}
				/>
			</Suspense>
		</div>
	);
}

LogList.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogList;