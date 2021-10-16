import React, { useState, useEffect } from "react";
import { Switch, Route, Link, useHistory, useLocation } from 'react-router-dom';
import * as common from '../common';
import * as commonLog from './commonLog';
import Toaster from "../Toaster/Toaster";
import Logs from './Logs';
import Writer from './Writer';

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
			console.log("A log is POSTED to AWS successfully.");
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
			console.log("A log is PUTTED to AWS successfully.");
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
				node.style.maxWidth = common.CONSTANTS.MAX_DIV_WIDTH;
			}
		}
	}, [location.pathname]);

	const initToaster = () => {
		setIsShowToaster(0);
	}

	const writeLink = common.isAdmin() ? <Link
		to={{
			pathname: "/log/write",
			state: { 
				from: location.pathname
			}
		}}
	>
		<button className="button button--logs-newlog">New log</button>
	</Link> : null;

	return (
		<div className="div div--main-contents" role="application">			
			<Switch>
				<Route exact path="/log">
					{writeLink}
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
			</Switch>
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"success"}
				duration={2000}
				
				completed={initToaster}
			/>
		</div>
	);
}

export default Log;