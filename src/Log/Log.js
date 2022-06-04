import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { log, isAdmin, setTitle } from '../common/common';
import { postLog, putLog } from './api';

import './Log.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const LogList = lazy(() => import('./LogList2'));
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

		setIsPostSuccess(false);

		try {
			// Call API
			const res = await postLog(Math.floor(new Date().getTime()), contents);

			if(200 === res.status) {
				log("A log is POSTED uccessfully.");
				setIsPostSuccess(true);
				setToasterMessage("The log posted.");
				setIsShowToaster(1);
				navigate("/log");
			}
			else {
				console.error(res);
				setIsPostSuccess(false);
			}
		}
		catch(err) {
			console.error(err);
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

			if(200 === res.status) {
				log("A log is PUTTED successfully.");
				setIsPostSuccess(true);			
				setToasterMessage("The log changed.");
				setIsShowToaster(1);	
				navigate("/log");
			}
			else {
				console.error(res);
				setIsPostSuccess(false);
			}
		}
		catch(err) {
			console.error(err);
			setIsPostSuccess(false);
		}
	}

	// Set title at mount
	useEffect(() => {
		setTitle("log");
	}, []);
	
	// Make write button
	const writeButton = isAdmin()
		? <Link to={{
				pathname: "/log/write",
				state: { 
					from: location.pathname
				}
			}}>
				<button className="button button--log-newlog">+</button>
			</Link>
		: null;

	// Draw log app.
	return (
		<main className="main main--contents" style={contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				{writeButton}
				<Routes>
					<Route path="/" element={<LogList />} />
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
					completed={() => setIsShowToaster(0)}
				/>
			</Suspense>
		</main>
	);
}

Log.propTypes = {
	contentHeight: PropTypes.object,
};

export default Log;