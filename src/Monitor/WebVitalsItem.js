import React, { useEffect, useState } from "react";
import { log } from '../common';
import * as commonMonitor from './commonMonitor';

const WebVitalsItem = (props) => {

	const title = props.title;
	const name = props.name;

	const [data, setData] = useState([]);

	async function fetchData(name) {

		const apiUrl = commonMonitor.getAPI() + "?name=" + name;

		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			log("Web Vital " + name + " is FETCHED successfully.: " + res.body.Count);
			setData(res.body.Items);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData(name);
	}, [name]);

	let good = 0;
	let needImprovement = 0;
	let poor = 0;

	for(let item of data) {
		
		if(name === item.name) {
			if("GOOD" === item.evaluation) ++good;
			else if("POOR" === item.evaluation) ++poor;
			else if("NEEDS IMPROVEMENT" === item.evaluation) ++needImprovement;
		}
	}

	const totalCount = good + needImprovement + poor;

	const goodStyle = {width: 100 * good / totalCount + "%"}
	const needImprovementStyle = {width: 100 * needImprovement / totalCount + "%"}
	const poorStyle = {width: 100 * poor / totalCount + "%"}

	const evaluation = (0.75 <= good / totalCount) ? "GOOD"
		: ((0.25 < poor / totalCount)? "POOR"
			: ((0 < totalCount)? "NEEDS IMPROVEMENT"
				: "Calculating..."
			)
		);
	
		const headerStyle = ("GOOD" === evaluation) ? "span span--monitor-good"
			: (("POOR" === evaluation) ? "span span--monitor-poor"
				: (("NEEDS IMPROVEMENT" === evaluation) ? "span span--monitor-warn"
					: "span span--monitor-none"
				)
			);

	return <div className="div div--monitor-item">
		<div className="div div--monitor-subtitle">
			<span className="span span--monitor-metric">{title}</span>
			<span className={headerStyle}>{evaluation}</span>
		</div>
		<div className="div div--monitor-statusbar">
			<span className="span span--monitor-bar span--monitor-good" style={goodStyle}>{good > 0 ? (100*good/totalCount).toFixed(0): ""}</span>
			<span className="span span--monitor-bar span--monitor-warn" style={needImprovementStyle}>{needImprovement > 0 ? (100*needImprovement/totalCount).toFixed(0) : ""}</span>
			<span className="span span--monitor-bar span--monitor-poor" style={poorStyle}>{poor > 0 ? (100*poor/totalCount).toFixed(0) : ""}</span>
		</div>
	</div>
}

export default WebVitalsItem;