import React, { useState, useEffect } from "react";
import { Route, useHistory, useLocation } from 'react-router-dom';
import * as common from '../common';
import Logs from './Logs';
import Writer from './Writer';

const Log = (props) => {

	const [isPostSuccess, setIsPostSuccess] = useState(true);
	const history = useHistory();
	const location = useLocation();

	const handlePostSubmit = (contents) => {

		setIsPostSuccess(false);

		const now = Math.floor(new Date().getTime());

		// Call POST API
		fetch(common.getAPI(), {
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
			console.log("DATA POSTED to AWS!!");
			setIsPostSuccess(true);
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

		const api = common.getAPI() + "/timestamp/" + newItem.timestamp;

		// Call PUT API
		fetch(api, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(newItem)
		}).then(res => {
			console.log("DATA PUTTED to AWS!!");
			setIsPostSuccess(true);
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

			if("/log/write" === location.pathname) {
				node.style.maxWidth = "100%";
			}
			else {
				node.style.maxWidth = "800px";
			}
		}
	}, [location.pathname]);

	return (
		<div className="div div--main-contents">
			<Route exact path="/log" component={Logs} />
			<Route path="/log/write" render={(props) => <Writer 
					post={handlePostSubmit}
					edit={handleEditSubmit}
					isPostSuccess={isPostSuccess}
					{ ... props }
				/>
			} />
		</div>
	);
}

export default Log;