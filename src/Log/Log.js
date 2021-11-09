import React, { useState, Suspense, lazy } from "react";
import { Switch, Route, Link, useHistory, useLocation } from 'react-router-dom';
import { log, isAdmin } from '../common';
import * as commonLog from './commonLog';

import './Log.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
const Logs = lazy(() => import('./Logs'));
const LogItem = lazy(() => import('./LogItem'));
const Writer = lazy(() => import('./Writer'));

const Log = (props) => {

	const [isPostSuccess, setIsPostSuccess] = useState(true);

	const [isShowToaster, setIsShowToaster] = useState(false);
	const [toasterMessage ,setToasterMessage] = useState("");

	const history = useHistory();
	const location = useLocation();

	const contentHeight = props.contentHeight;
	
	const handlePostSubmit = (contents) => {

		setIsPostSuccess(false);

		const now = Math.floor(new Date().getTime());

		// Call POST API
		fetch(commonLog.getAPI(), {
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
		}).then(res => {
			log("A log is POSTED uccessfully.");
			setIsPostSuccess(true);
		
			setToasterMessage("A log has been posted.");
			setIsShowToaster(1);

			history.push("/log");
		}).catch(err => {
			console.error(err);
			setIsPostSuccess(false);
		});
	}

	const handleEditSubmit = (item, contents) => {

		setIsPostSuccess(false);

		let newItem = JSON.parse(JSON.stringify(item));

		const changedLogs = [{
			contents: contents,
			timestamp: Math.floor(new Date().getTime())
		}, ...newItem.logs];

		newItem.logs = changedLogs;

		const api = commonLog.getAPI() + "/timestamp/" + newItem.timestamp;

		// Call PUT API
		fetch(api, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(newItem)
		}).then(res => {
			log("A log is PUTTED successfully.");
			setIsPostSuccess(true);
		
			setToasterMessage("A log has been changed.");
			setIsShowToaster(1);

			history.push("/log");
		}).catch(err => {
			console.error(err);
			setIsPostSuccess(false);
		});
	}

	const writeButton = isAdmin() ? <Link
		to={{
			pathname: "/log/write",
			state: { 
				from: location.pathname
			}
		}}
	>
		<button className="button button--logs-newlog">+</button>
	</Link> : null;

	return (
		<div className="div div--main-contents" style={contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				<Switch>
					<Route exact path="/log">
						{writeButton}
						<Logs />
					</Route>
					<Route path="/log/write" render={(props) => <Writer
								post={handlePostSubmit}
								edit={handleEditSubmit}
								isPostSuccess={isPostSuccess}
								{ ... props }
							/>
						}
					/>
					<Route path="/log/:timestamp">
						<LogItem />
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
		</div>
	);
}

export default Log;