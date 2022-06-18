import React, { useEffect, useState, Suspense, lazy } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, getFormattedDate, hasValue } from '../common/common';
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

		if(hasValue(listInSession)) {
			
			setLogs(JSON.parse(listInSession));

			const lastTimestampInSession = sessionStorage.getItem("logListLastTimestamp");

			if(hasValue(lastTimestampInSession)) {
				setLastTimestamp(JSON.parse(lastTimestampInSession));
			}

			setIsLoading(false);
			log("Get logs from session.");

			return;
		}

		// Call API
		try {
			const res = await getLogs(itemPerPage);
			const fetchedData = await res.json();

			if(hasValue(fetchedData.errorType)) {
				log(fetchedData, "ERROR");
				setIsLoading(false);
				return;
			}

			const newLogs = fetchedData.body.Items;
			const lastEvaluatedKey = fetchedData.body.LastEvaluatedKey;

			setLogs(newLogs);
			setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);

			setIsLoading(false);
			log("Logs are FETCHED successfully.");
		}
		catch(err) {
			log(err, "ERROR");
		}
	}

	// Get next log list from API gateway
	const fetchMore = async (lastTimestamp) => {

		try {
			// Call API
			setIsLoading(true);
			const res = await getNextLogs(lastTimestamp, itemPerPage);
			const fetchedData = await res.json();

			if(hasValue(fetchedData.errorType)) {
				log(fetchedData, "ERROR");
				setIsLoading(false);
				return;
			}

			const newLogs = logs.concat(fetchedData.body.Items);
			const lastEvaluatedKey = fetchedData.body.LastEvaluatedKey;

			setLogs(newLogs);
			setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);

			setIsLoading(false);
			log("Next logs are FETCHED successfully.");
		}
		catch(err) {
			log(err, "ERROR");
		}
	}

	// Fetch data at mount
	useEffect(() => fetchFirst(), [props.isPostSuccess]);

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setToasterMessageCenter("Loading logs...");
			setIsShowToasterCenter(1);

			setSeeMoreButtonText("Loading...");
			setSeeMoreButtonClass("button button--loglist-seemore button--loglist-seemoreloading");
		}
		else {
			setIsShowToasterCenter(2);

			setSeeMoreButtonText("See more");
			setSeeMoreButtonClass("button button--loglist-seemore");
		}
	}, [isLoading]);

	// Set fetched data in local stroage
	useEffect(() => sessionStorage.setItem("logList", JSON.stringify(logs)), [logs]);
	useEffect(() => sessionStorage.setItem("logListLastTimestamp", JSON.stringify(lastTimestamp)), [lastTimestamp]);

	// Cleanup
	useEffect(() => {
		return () => setIsLoading(false);
	}, []);

	// See more button
	const seeMoreButton = hasValue(lastTimestamp) ? (
		<button className={seeMoreButtonClass} onClick={() => fetchMore(lastTimestamp)}>
			{seeMoreButtonText}
		</button>
	) : "";

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

			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToasterCenter}
					message={toasterMessageCenter}
					completed={() => setIsShowToasterCenter(0)}
				/>
			</Suspense>
				
			{seeMoreButton}

		</section>
	);
}

LogList.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogList;