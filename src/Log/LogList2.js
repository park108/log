import React, { useEffect, useState, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, getFormattedDate } from '../common/common';
import { getLogs, getNextLogs } from './api';

const LogList = (props) => {

	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [seeMoreButtonText, setSeeMoreButtonText] = useState("See more");
	const [seeMoreButtonClass, setSeeMoreButtonClass] = useState("button button--loglist-seemore");
	const [isShowToasterCenter, setIsShowToasterCenter] = useState(0);
	const [toasterMessageCenter, setToasterMessageCenter] = useState("");
	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const Toaster = lazy(() => import('../Toaster/Toaster'));

	const itemPerPage = 10;

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
			setIsLoading(false);

			if(undefined !== fetchedData.errorType) {
				console.error(fetchedData);
			}
			else {
				// Make data for log list
				log("Logs are FETCHED successfully.");
				const newLogs = fetchedData.body.Items;

				// Set log list
				setLogs(newLogs);

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
	}

	// Get next log list from API gateway
	const fetchMore = async (lastTimestamp) => {

		try {
			// Call API
			setIsLoading(true);
			const res = await getNextLogs(lastTimestamp, itemPerPage);
			const fetchedData = await res.json();
			setIsLoading(false);

			if(undefined !== fetchedData.errorType) {
				console.error(fetchedData);
			}
			else {
				// Make data for log list
				log("Next logs are FETCHED successfully.");
				const newLogs = logs.concat(fetchedData.body.Items);

				// Set log list
				setLogs(newLogs);

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

	// Cleanup
	useEffect(() => {
		return () => setIsLoading(false);
	}, []);

	// See more button
	const seeMoreButton = (lastTimestamp === undefined)
		? ""
		: <button className={seeMoreButtonClass} onClick={() => fetchMore(lastTimestamp)}>
			{seeMoreButtonText}
		</button>;

	// Draw log list
	return (
		<section className="section section--log-list" role="list">
			<Suspense fallback={<div></div>}>
				{logs.map(data => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{
							pathname: "/log/" + data.timestamp
						}}>
							<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
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
		</section>
	);
}

LogList.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogList;