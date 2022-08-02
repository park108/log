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
	const contentHeight = props.contentHeight;
	
	// Create new log
	const createLog = async (contents) => {

		const newTimestamp = Math.floor(new Date().getTime());

		setIsPostSuccess(false);

		try {
			// Call API
			const res = await postLog(newTimestamp, contents);
			const status = await res.json();

			if(200 === status.status) {
				setIsPostSuccess(true);
				setToasterMessage("The log posted.");
				setIsShowToaster(1);

				sessionStorage.clear();
				log("A log is POSTED uccessfully.");

				navigate("/log/" + newTimestamp);
			}
			else {
				log(res, "ERROR");
				setIsPostSuccess(false);
			}
		}
		catch(err) {
			log(err, "ERROR");
			setIsPostSuccess(false);
		}
	}

	// Edit log
	const editLog = async (item, contents) => {

		setIsPostSuccess(false);

		try {
			let newItem = JSON.parse(JSON.stringify(item));
	
			const changedLogs = [{
				contents: contents,
				timestamp: Math.floor(new Date().getTime())
			}, ...newItem.logs];
	
			newItem.logs = changedLogs;

			// Call API
			const res = await putLog(newItem);
			const status = await res.json();

			if(200 === status.status) {
				setIsPostSuccess(true);			
				setToasterMessage("The log changed.");
				setIsShowToaster(1);

				sessionStorage.clear();
				log("A log is PUTTED successfully.");
				
				navigate("/log/" + item.timestamp);
			}
			else {
				log(res, "ERROR");
				setIsPostSuccess(false);
			}
		}
		catch(err) {
			log(err, "ERROR");
			setIsPostSuccess(false);
		}
	}
	
	// Make write button
	const writeButton = isAdmin() ? (
		<Link to={{
			pathname: "/log/write",
			state: { 
				from: location.pathname
			}
		}}>
			<button role="button" className="button button--log-newlog">+</button>
		</Link>
	) : null;

	// Draw log app.
	return (
		<main className="main main--contents" style={contentHeight} role="application">
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