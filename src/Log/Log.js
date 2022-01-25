import React, { useState, useEffect, Suspense, lazy } from "react";
import { Switch, Route, Link, useHistory, useLocation } from 'react-router-dom';
import { log, isAdmin, setTitle } from '../common';
import * as commonLog from './commonLog';

import './Log.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const LogList = lazy(() => import('./LogList'));
const LogSingle = lazy(() => import('./LogSingle'));
const Writer = lazy(() => import('./Writer'));

const Log = (props) => {

	const [isPostSuccess, setIsPostSuccess] = useState(true);
	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage, setToasterMessage] = useState("");

	const history = useHistory();
	const location = useLocation();
	const contentHeight = props.contentHeight;
	
	// Post log
	const postLog = (contents) => {

		setIsPostSuccess(false);

		try {
			const now = Math.floor(new Date().getTime());

			const params = {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					"timestamp": now,
					"logs": [{
						"contents": contents,
						"timestamp": now
					}]
				})
			};

			// Call API
			const res = fetch(commonLog.getAPI(), params);

			if(200 === res.status) {
				log("A log is POSTED uccessfully.");
				setIsPostSuccess(true);			
				setToasterMessage("The log posted.");
				setIsShowToaster(1);	
				history.push("/log");
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
	const editLog = (item, contents) => {

		setIsPostSuccess(false);

		try {
			let newItem = JSON.parse(JSON.stringify(item));
	
			const changedLogs = [{
				contents: contents,
				timestamp: Math.floor(new Date().getTime())
			}, ...newItem.logs];
	
			newItem.logs = changedLogs;

			const params = {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(newItem)
			}
	
			const api = commonLog.getAPI() + "/timestamp/" + newItem.timestamp;

			// Call API
			const res = fetch(api, params);

			if(200 === res.status) {
				log("A log is PUTTED successfully.");
				setIsPostSuccess(true);			
				setToasterMessage("The log changed.");
				setIsShowToaster(1);	
				history.push("/log");
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
				<Switch>
					<Route exact path="/log">
						{writeButton}
						<LogList />
					</Route>
					<Route
						path="/log/write"
						render={
							(props) => <Writer
								post={postLog}
								edit={editLog}
								isPostSuccess={isPostSuccess}
								{ ... props }
							/>
						}
					/>
					<Route path="/log/:timestamp">
						<LogSingle />
					</Route>
				</Switch>
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

export default Log;