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
			const res = await getNextLogs(timestamp, itemPerPage);
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
							<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
							<div className="div--loglist-contents">
								{
									markdownToHtml(data.logs[0].contents)
										.replace(/(<([^>]+)>)/gi, '')
										.substr(0, 50)
								}
								...
							</div>
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