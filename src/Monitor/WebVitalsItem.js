import React from "react";

const WebVitalsItem = (props) => {

	const title = props.title;
	const name = props.name;
	const data = props.data;

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
		: ((0.25 <= good / totalCount)? "NEEDS IMPROVEMENT"
			: ((0 < totalCount)? "POOR"
				: "NO EVALUATION METRIC"
			)
		);
	
		const headerStyle = ("GOOD" === evaluation) ? "h--monitor-good"
			: (("POOR" === evaluation) ? "h--monitor-poor"
				: (("NEEDS IMPROVEMENT" === evaluation) ? "h--monitor-warn"
					: "h--monitor-none"
				)
			);

	return <div className="div div--monitor-item">
		<h4 className={headerStyle}>{title} = {evaluation}</h4>
		<div className="div div--monitor-statusbar">
			<span className="span span--monitor-bar span--monitor-good" style={goodStyle}>{good > 0 ? good : ""}</span>
			<span className="span span--monitor-bar span--monitor-warn" style={needImprovementStyle}>{needImprovement > 0 ? needImprovement : ""}</span>
			<span className="span span--monitor-bar span--monitor-poor" style={poorStyle}>{poor > 0 ? poor : ""}</span>
		</div>
	</div>
}

export default WebVitalsItem;