import React, { useState, Suspense, lazy } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, isAdmin } from '../common/common';
import { postLog, putLog } from './api';

import './Log.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const LogList = lazy(() => import('./LogList'));
const Search = lazy(() => import('../Search/Search'));
const LogSingle = lazy(() => import('./LogSingle'));
const Writer = lazy(() => import('./Writer'));

const Log = (props) => {

	const [isPostSuccess, setIsPostSuccess] = useState(true);
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	const navigate = useNavigate();
	const location = useLocation();
	
	// Create new log
	const createLog = async (contents, isTemporary = false) => {

		const newTimestamp = Math.floor(new Date().getTime());

		setIsPostSuccess(false);

		try {
			// Call API
			const res = await postLog(newTimestamp, contents, isTemporary);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API POST] OK - Log", "SUCCESS");

				setIsPostSuccess(true);
				setToasterMessage("The log posted.");
				setIsShowToaster(1);

				sessionStorage.removeItem("logList");
				sessionStorage.removeItem("logListLastTimestamp");

				navigate("/log/" + newTimestamp);
			}
			else {
				log("[API POST] FAILED - Log", "ERROR");
				log(res, "ERROR");
				setIsPostSuccess(false);
			}
		}
		catch(err) {
			log("[API POST] FAILED - Log", "ERROR");
			log(err, "ERROR");
			setIsPostSuccess(false);
		}
	}

	// Edit log
	const editLog = async (item, contents, isTemporary = false) => {

		setIsPostSuccess(false);

		try {
			let newItem = JSON.parse(JSON.stringify(item));
	
			const changedLogs = [{
				contents: contents,
				timestamp: Math.floor(new Date().getTime())
			}, ...newItem.logs];
	
			newItem.logs = changedLogs;

			// Call API
			const res = await putLog(newItem, isTemporary);
			const status = await res.json();

			if(200 === status.statusCode) {
				log("[API PUT] OK - Log", "SUCCESS");

				setIsPostSuccess(true);			
				setToasterMessage("The log changed.");
				setIsShowToaster(1);

				sessionStorage.removeItem("logList");
				sessionStorage.removeItem("logListLastTimestamp");
				
				navigate("/log/" + item.timestamp);
			}
			else {
				log("[API PUT] FAILED - Log", "ERROR");
				log(res, "ERROR");
				setIsPostSuccess(false);
			}
		}
		catch(err) {
			log("[API PUT] FAILED - Log", "ERROR");
			log(err, "ERROR");
			setIsPostSuccess(false);
		}
	}
	
	// Make write button
	const writeButton = isAdmin() ? (
		<Link to={{ pathname: "/log/write", state: { from: location.pathname } }}>
			<button data-testid="newlog-button" role="button" className="button button--log-newlog">+</button>
		</Link>
	) : null;

	// Draw log app.
	return (
		<main className="main main--main-contents" style={props.contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				{writeButton}
				<Routes>
					<Route path="/" element={<LogList />} />
					<Route path="/search" element={<Search />} />
					<Route path="/write" element={
						<Writer
							post={createLog}
							edit={editLog}
							isPostSuccess={isPostSuccess}
						/>
					} />
					<Route path="/:timestamp" element={<LogSingle />} />
				</Routes>
				<Toaster 
					show={isShowToaster}
					message={toasterMessage}
					position={"bottom"}
					type={"success"}
					duration={2000}
					completed={() => setIsShowToaster(2)}
				/>
			</Suspense>
		</main>
	);
}

Log.propTypes = {
	contentHeight: PropTypes.object,
};

export default Log;