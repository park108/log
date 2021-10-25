import React, { useState, useEffect, Suspense, lazy } from "react";
import { Switch, Route, Link, useHistory, useLocation } from 'react-router-dom';
import { log, isAdmin, CONSTANTS } from '../common';
import * as commonLog from './commonLog';

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
	
	// Change width by location
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {

			// Writer: 100%
			if("/log/write" === location.pathname ||
				node.className.includes("div--toaster")) {

				node.style.maxWidth = "100%";
			}
			// Else: to 800px;
			else {
				node.style.maxWidth = CONSTANTS.MAX_DIV_WIDTH;
			}
		}
	}, [location.pathname]);

	const initToaster = () => {
		setIsShowToaster(0);
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
		<div className="div div--main-contents" role="application">
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
					
					completed={initToaster}
				/>
			</Suspense>
		</div>
	);
}

export default Log;