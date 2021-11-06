import React from "react";

const ContentMon = (props) => {

	const stackPallet = props.stackPallet;

	const Pillars = (attr) => {

		const palletIndex = 0 === attr.index ? 0
			: 1 === attr.index ? 1
			: 2 === attr.index ? 2
			: 3 === attr.index ? 4
			: 6;
		
		const legend = 0 === attr.index ? "'" + attr.date.substr(2, 2) + "." + attr.date.substr(5, 2)
			: "01" === attr.date.substr(5, 2) ? "`" + attr.date.substr(2, 2) + "." + attr.date.substr(5, 2)
			: attr.date.substr(5, 2);

		const blankHeight = {height: 100 * (1 - attr.valueRate) + "px"};

		const pillarStyle = {
			height: 100 * attr.valueRate + "px",
			backgroundColor: stackPallet[palletIndex].backgroundColor
		};

		return <div className="div div--monitor-5pillars">
			<span style={blankHeight}>{attr.count}</span>
			<div className="div div--monitor-pillar" style={pillarStyle}></div>
			<div className="div div--monitor-pillarlegend" >{legend}</div>
		</div>
	}

	let logsPillarIndex = 0;
	let commentsPillarIndex = 0;

	return <div className="div div--article-logitem">
		<h4>Contents in 5 months</h4>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Logs</span>
			</div>
			<div className="div div--monitor-chart">
				<Pillars
					valueRate={0.2}
					index={logsPillarIndex++}
					count={1}
					date={"2021-07-01"}
				/>
				<Pillars
					valueRate={0.4}
					index={logsPillarIndex++}
					count={2}
					date={"2021-08-01"}
				/>
				<Pillars
					valueRate={0.6}
					index={logsPillarIndex++}
					count={3}
					date={"2021-09-01"}
				/>
				<Pillars
					valueRate={0.8}
					index={logsPillarIndex++}
					count={4}
					date={"2021-10-01"}
				/>
				<Pillars
					valueRate={1}
					index={logsPillarIndex++}
					count={5}
					date={"2021-11-01"}
				/>
			</div>
		</div>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Comments</span>
			</div>
			<div className="div div--monitor-chart">
				<Pillars
					valueRate={0.2}
					index={commentsPillarIndex++}
					count={1}
					date={"2021-07-01"}
				/>
				<Pillars
					valueRate={0.4}
					index={commentsPillarIndex++}
					count={2}
					date={"2021-08-01"}
				/>
				<Pillars
					valueRate={0.6}
					index={commentsPillarIndex++}
					count={3}
					date={"2021-09-01"}
				/>
				<Pillars
					valueRate={0.8}
					index={commentsPillarIndex++}
					count={4}
					date={"2021-10-01"}
				/>
				<Pillars
					valueRate={1}
					index={commentsPillarIndex++}
					count={5}
					date={"2021-11-01"}
				/>
			</div>
		</div>
	</div>
}

export default ContentMon;