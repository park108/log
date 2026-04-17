import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, getFormattedDate, hasValue, setHtmlTitle } from '../common/common';
import Toaster from "../Toaster/Toaster";
import { getLogs, getNextLogs } from './api';

const LogList = (props) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isGetData, setIsGetData] = useState(false);
	const [isGetNextData, setIsGetNextData] = useState(false);
	const [isError, setIsError] = useState(false);

	const [logs, setLogs] = useState([]);
	const [lastTimestamp, setLastTimestamp] = useState(undefined);

	const [seeMoreButton, setSeeMoreButton] = useState();

	const [isShowToasterCenter, setIsShowToasterCenter] = useState(1);

	useEffect(() => {
		setIsGetData(true);
		setHtmlTitle("log");
	}, []);

	useEffect(() => {

		const fetchFirst = async () => {
	
			const listInSession = sessionStorage.getItem("logList");
	
			if(hasValue(listInSession)) {
				
				setLogs(JSON.parse(listInSession));
	
				const lastTimestampInSession = sessionStorage.getItem("logListLastTimestamp");
	
				if(hasValue(lastTimestampInSession)) {
					setLastTimestamp(JSON.parse(lastTimestampInSession));
				}
	
				log("Get logs from session.");
	
				return;
			}

			setIsLoading(true);
			setIsError(false);
	
			try {
				const res = await getLogs();
				const fetchedData = await res.json();
	
				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Logs", "SUCCESS");
	
					const newLogs = fetchedData.body.Items;
					const lastEvaluatedKey = fetchedData.body.LastEvaluatedKey;
		
					setLogs(newLogs);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Logs", "ERROR");
					log(fetchedData, "ERROR");
					setIsError(true);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Logs", "ERROR");
				log(err, "ERROR");
				setIsError(true);
			}

			setIsLoading(false);
		}

		if(isGetData) {
			fetchFirst();
			setIsGetData(false);
		}

	}, [isGetData]);

	useEffect(() => {

		const fetchMore = async (timestamp) => {

			setIsLoading(true);
			setIsError(false);
	
			try {
				const res = await getNextLogs(timestamp);
				const fetchedData = await res.json();
	
				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Next Logs", "SUCCESS");
	
					const newLogs = logs.concat(fetchedData.body.Items);
					const lastEvaluatedKey = fetchedData.body.LastEvaluatedKey;
		
					setLogs(newLogs);
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Next Logs", "ERROR");
					log(JSON.stringify(fetchedData), "ERROR");
					setIsError(true);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Next Logs", "ERROR");
				log(err, "ERROR");
				setIsError(true);
			}

			setIsLoading(false);
		}

		if(isGetNextData) {
			fetchMore(lastTimestamp);
			setIsGetNextData(false);
		}

	}, [isGetNextData]);

	useEffect(() => {
		setIsGetData(true);
	}, [props.isPostSuccess]);

	useEffect(() => {
		if(isLoading) {
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	useEffect(() => {

		const seeMoreButtonClass = isLoading
			? "button button--loglist-seemore button--loglist-seemoreloading"
			: "button button--loglist-seemore";
		
		const seeMoreButtonText = isLoading
			? "Loading..."
			: "See more";

		if(!hasValue(lastTimestamp)) {
			setSeeMoreButton("");
		}
		else {
			setSeeMoreButton(
				<button
					data-testid="seeMoreButton"
					className={seeMoreButtonClass}
					onClick={() => setIsGetNextData(true)}
				>
					{seeMoreButtonText}
				</button>
			);
		}
	}, [lastTimestamp, isLoading]);

	useEffect(() => {
		if(logs.length > 0) {
			sessionStorage.setItem("logList", JSON.stringify(logs));
		}
	}, [logs]);

	useEffect(() => {
		if(hasValue(lastTimestamp)) {
			sessionStorage.setItem("logListLastTimestamp", JSON.stringify(lastTimestamp));
		}
	}, [lastTimestamp]);

	if(isError) {
		return (
			<section className="section section--message-box">
				<h2 className="h2 h2--message-error">
					Whoops, something went wrong on our end.
				</h2>
				<hr />
				<div className="div div--message-description">
					Try refreshing the page, or click Retry button.
				</div>
				<button className="button button--message-retrybutton" onClick={ () => {
					sessionStorage.removeItem("logList");
					sessionStorage.removeItem("logListLastTimestamp");
					setIsGetData(true);
				} } >
					Retry
				</button>
			</section>
		);
	}
	else {
		return (
			<section className="section section--log-list" role="list">
				{logs.map(data => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{ pathname: "/log/" + data.timestamp }}>
							<div className="div--loglist-date">
								{getFormattedDate(data.timestamp)}
								{ true === data.temporary ? <span className="span--loglist-temporary">✍️</span> : "" }
							</div>
							{
								true === data.temporary
									? <div className="div--loglist-temporary">{data.contents}</div>
									: <div className="div--loglist-contents">{data.contents}</div>
							}
						</Link>
					</div>
				))}

				<Toaster 
					show={isShowToasterCenter}
					message={"Loading logs..."}
				/>
					
				{seeMoreButton}

			</section>
		);
	}
}

LogList.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogList;