import React, { useEffect, useState } from "react";

const ApiCallMon = (props) => {

	const [logCalls, setLogCalls] = useState([]);
	const [fileCalls, setFileCalls] = useState([]);
	const [analyticsCalls, setAnalyticsCalls] = useState([]);

	const stackPallet = props.stackPallet;

	useEffect(() => {

		// Dummy data
		setLogCalls([
			{"date": "2022-01-01", "count": 20, "valueRate": 1},
			{"date": "2022-01-02", "count": 18, "valueRate": 0.9},
			{"date": "2022-01-03", "count": 16, "valueRate": 0.8},
			{"date": "2022-01-04", "count": 14, "valueRate": 0.7},
			{"date": "2022-01-05", "count": 12, "valueRate": 0.6},
			{"date": "2022-01-06", "count": 10, "valueRate": 0.5},
			{"date": "2022-01-07", "count": 8, "valueRate": 0.4},
		]);

		setFileCalls([
			{"date": "2022-01-01", "count": 8, "valueRate": 0.4},
			{"date": "2022-01-02", "count": 10, "valueRate": 0.5},
			{"date": "2022-01-03", "count": 12, "valueRate": 0.6},
			{"date": "2022-01-04", "count": 14, "valueRate": 0.7},
			{"date": "2022-01-05", "count": 16, "valueRate": 0.8},
			{"date": "2022-01-06", "count": 18, "valueRate": 0.9},
			{"date": "2022-01-07", "count": 20, "valueRate": 1},
		]);

		setAnalyticsCalls([
			{"date": "2022-01-01", "count": 20, "valueRate": 1},
			{"date": "2022-01-02", "count": 18, "valueRate": 0.9},
			{"date": "2022-01-03", "count": 16, "valueRate": 0.8},
			{"date": "2022-01-04", "count": 14, "valueRate": 0.7},
			{"date": "2022-01-05", "count": 12, "valueRate": 0.6},
			{"date": "2022-01-06", "count": 10, "valueRate": 0.5},
			{"date": "2022-01-07", "count": 8, "valueRate": 0.4},
		]);
	}, []);


	const pillarHeight = 60;

	const Pillars = (attr) => {

		const palletIndex = attr.index;

		const legend = 0 === attr.index ? attr.date.substr(5, 2) + "." + attr.date.substr(8, 8)
			: "01" === attr.date.substr(8, 2) ? attr.date.substr(5, 2) + "." + attr.date.substr(8, 8)
			: attr.date.substr(8, 8);

		const valueHeight = {height: "20px"}
		const blankHeight = {height: pillarHeight * (1 - attr.valueRate) + "px"};

		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[palletIndex].backgroundColor
		};

		return <div className="div div--monitor-7pillars" key={attr.date}>
			<div className="div div--monitor-blank" style={blankHeight}> </div>
			<div className="div div--monitor-value" style={valueHeight}>{attr.count}</div>
			<div className="div div--monitor-pillar" style={pillarStyle}></div>
			<div className="div div--monitor-pillarlegend" >{legend}</div>
		</div>
	}

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>API Calls in the last 7 days</h1>
			<section className="section section--monitor-item">
				<h3>log/comment</h3>
				<div className="div div--monitor-pillarchart">
					{
						logCalls.map(
							(data, index) => (
								<Pillars
									key={data.date}
									date={data.date}
									count={data.count}
									valueRate={data.valueRate}
									index={index}
								/>
							)
						)
					}
				</div>
			</section>
			<section className="section section--monitor-item">
				<h3>file/image</h3>
				<div className="div div--monitor-pillarchart">
					{
						fileCalls.map(
							(data, index) => (
								<Pillars
									key={data.date}
									date={data.date}
									count={data.count}
									valueRate={data.valueRate}
									index={index}
								/>
							)
						)
					}
				</div>
			</section>
			<section className="section section--monitor-item">
				<h3>analytics</h3>
				<div className="div div--monitor-pillarchart">
					{
						analyticsCalls.map(
							(data, index) => (
								<Pillars
									key={data.date}
									date={data.date}
									count={data.count}
									valueRate={data.valueRate}
									index={index}
								/>
							)
						)
					}
				</div>
			</section>
		</article>
	);
}

export default ApiCallMon;