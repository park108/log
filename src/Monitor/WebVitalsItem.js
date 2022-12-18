import React, { useEffect, useState } from "react";
import { log, hasValue, hoverPopup } from '../common/common';
import { getWebVitals } from './api';
import PropTypes from 'prop-types';

const WebVitalsItem = (props) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	const [data, setData] = useState([]);

	const name = props.name;
	const description = props.description;

	useEffect(() => {

		const fetchData = async(name) => {

			setIsLoading(true);
			setIsError(false);

			try {
				const res = await getWebVitals(name);
				const fetchedData = await res.json();

				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Web Vital(" + name + "): " + fetchedData.body.Count, "SUCCESS");
					setData(fetchedData.body.Items);
				}
				else {
					log("[API GET] FAILED - Web Vital(" + name + ")", "ERROR");
					setIsError(true);
					console.error(fetchedData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Web Vital(" + name + ")", "ERROR");
				setIsError(true);
				console.error(err);
			}
		
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData(name);
			setIsMount(true);
		}
	}, [isMount, name]);

	let good = 0;
	let needImprovement = 0;
	let poor = 0;

	for(let item of data) {
		switch(item.evaluation) {
			case "GOOD": ++good; break;
			case "POOR": ++poor; break;
			case "NEEDS IMPROVEMENT": ++needImprovement; break;
			default: break;
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
	
	const headerStyle = ("GOOD" === evaluation) ? "span span--monitor-evaluation span--monitor-good"
		: ("POOR" === evaluation) ? "span span--monitor-evaluation span--monitor-poor"
		: ("NEEDS IMPROVEMENT" === evaluation) ? "span span--monitor-evaluation span--monitor-warn"
		: "span span--monitor-evaluation span--monitor-none";


	if(isLoading) {
		return (
			<section className="section section--monitor-item">
				<h3>
					{name}
					<span className="span span--monitor-metric">{ description + " (...)"}</span>
				</h3>
				<div className="div div--monitor-processinglow">
					Loading...
				</div>
			</section>
		);
	}
	else if(isError) {
		return (
			<section className="section section--monitor-item">
				<h3>
					{name}
					<span className="span span--monitor-metric">{ description }</span>
				</h3>
				<div className="div div--monitor-processinglow">
					<span className="span span--monitor-retrybutton" onClick={ () => { setIsMount(false) } } >
						Retry
					</span>
				</div>
			</section>
		);
	}
	else {
		return (
			<section className="section section--monitor-item">
				<h3>
					{name}
					<span className="span span--monitor-metric">{description + " (" + totalCount + ")"}</span>
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
						<li className="li li--monitor-detailpillaritem">{description}</li>
						<li className="li li--monitor-detailpillaritem">🟢 {good} &nbsp;&nbsp; 🟡 {needImprovement} &nbsp;&nbsp; 🔴 {poor}</li>
					</ul>
				</div>
			</section>
		);
	}
}

WebVitalsItem.propTypes = {
	description: PropTypes.string,
	name: PropTypes.string,
};

export default WebVitalsItem;