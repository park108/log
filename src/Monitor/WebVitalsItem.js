import React, { useEffect, useState } from "react";
import { log, hoverPopup } from '../common/common';
import { getWebVitals } from './api';
import PropTypes from 'prop-types';

const WebVitalsItem = (props) => {

	const [data, setData] = useState([]);

	const title = props.title;
	const name = props.name;

	const fetchData = async(name) => {

		try {
			const res = await getWebVitals(name);
			const data = await res.json();

			if(undefined !== data.errorType) {
				console.error(data);
			}
			else {
				log("[API GET] OK - Web Vital + " + name + ": " + data.body.Count);
				setData(data.body.Items);
			}
		}
		catch(err) {
			console.error(err);
		}
	}

	// Fetch data at mount
	useEffect(() => fetchData(name), [name]);

	// Count by metrics
	let good = 0;
	let needImprovement = 0;
	let poor = 0;

	for(let item of data) {
		switch(item.evaluation) {
			case "GOOD":
				++good;
				break;
			case "POOR":
				++poor;
				break;
			case "NEEDS IMPROVEMENT":
				++needImprovement;
				break;
			default:
				break;
		}
	}

	const totalCount = good + needImprovement + poor;

	const goodStyle = {width: 100 * good / totalCount + "%"}
	const needImprovementStyle = {width: 100 * needImprovement / totalCount + "%"}
	const poorStyle = {width: 100 * poor / totalCount + "%"}

	const evaluation = (0.75 <= good / totalCount) ? "GOOD"
		: (0.25 < poor / totalCount) ? "POOR"
		: (0 < totalCount) ? "NEEDS IMPROVEMENT"
		: "None";
	
	// Make style by metrics
	const headerStyle = ("GOOD" === evaluation) ? "span span--monitor-assessment span--monitor-good"
		: ("POOR" === evaluation) ? "span span--monitor-assessment span--monitor-poor"
		: ("NEEDS IMPROVEMENT" === evaluation) ? "span span--monitor-assessment span--monitor-warn"
		: "span span--monitor-assessment span--monitor-none";

	// Draw web vital item
	return (
		<section className="section section--monitor-item">
			<h3>
				{name}
				<span className="span span--monitor-metric">{title + " (" + totalCount + ")"}</span>
				<span className={headerStyle}>{evaluation}</span>
			</h3>
			<div
				data-testid={"status-bar-" + name}
				className="div div--monitor-statusbar"
				onMouseOver={(event) => hoverPopup(event, name)}
				onMouseMove={(event) => hoverPopup(event, name)}
				onMouseOut={(event) => hoverPopup(event, name)}
			>
				<span className="span span--monitor-bar span--monitor-good" style={goodStyle}>
					{good > 0 ? (100*good/totalCount).toFixed(0): ""}
				</span>
				<span className="span span--monitor-bar span--monitor-warn" style={needImprovementStyle}>
					{needImprovement > 0 ? (100*needImprovement/totalCount).toFixed(0) : ""}
				</span>
				<span className="span span--monitor-bar span--monitor-poor" style={poorStyle}>
					{poor > 0 ? (100*poor/totalCount).toFixed(0) : ""}
				</span>
			</div>
			<div id={name} className="div div--monitor-pillardetail" style={{display: "none"}}>
				<ul className="ul ul--monitor-detailpillaritem">
					<li className="li li--monitor-detailpillaritem">{title}</li>
					<li className="li li--monitor-detailpillaritem">🟢 {good} &nbsp;&nbsp; 🟡 {needImprovement} &nbsp;&nbsp; 🔴 {poor}</li>
				</ul>
			</div>
		</section>
	);
}

WebVitalsItem.propTypes = {
	title: PropTypes.string,
	name: PropTypes.string,
};

export default WebVitalsItem;