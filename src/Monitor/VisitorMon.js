import React from "react";

const VisitorMon = (props) => {

	const dummyData1 = [
		{ "date": "2021-10-10","count": 10},
		{ "date": "2021-10-11","count": 9},
		{ "date": "2021-10-12","count": 7},
		{ "date": "2021-10-13","count": 12},
		{ "date": "2021-10-14","count": 4},
		{ "date": "2021-10-15","count": 5},
		{ "date": "2021-10-16","count": 8},
	]

	const dummyData2 = [
		{ "device": "macOS","count": 8},
		{ "device": "windows","count": 10},
		{ "device": "android","count": 5},
		{ "device": "iOS","count": 4},
	]

	return <div className="div div--article-logitem">
		<h3>Visitors</h3>
		<div className="div div--monitor-item">
			<h4>Count</h4>
			{dummyData1.map(item => (
				<div key={item.date} >
					{item.date} : {item.count}
				</div>
			))}
			<div id="chart1"></div>
		</div>
		<div className="div div--monitor-item">
			<h4>Environment</h4>
			{dummyData2.map(item => (
				<div key={item.device} >
					{item.device} : {item.count}
				</div>
			))}
		</div>
	</div>
}

export default VisitorMon;

