import React, { useEffect, useState } from "react";
import { log, getFormattedDate, getFormattedTime } from "../common";
import * as commonMonitor from './commonMonitor';

const VisitorMon = (props) => {

	const [totalCount, setTotalCount] = useState("...");
	const [dailyCount, setDailyCount] = useState([]);
	const [userAgents, setUserAgents] = useState([]);

	async function fetchData() {

		const today = new Date();
		const toTimestamp = (new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)).getTime();
		const fromTimestamp = toTimestamp - (1000 * 60 * 60 * 24 * 7);

		const apiUrl = commonMonitor.getAPI() + "/useragent?fromTimestamp=" + fromTimestamp + "&toTimestamp=" + toTimestamp;

		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			log("Visitor information is FETCHED successfully.");
			
			setTotalCount(res.body.totalCount);

			let periodData = res.body.periodData.Items;

			for(let item of periodData) {
				item.date = getFormattedDate(item.timestamp);
				item.time = getFormattedTime(item.timestamp);
			}

			let dailyCountList = [];
			let startTimestamp = 0;
			let endTimestamp = 0;

			for(let i = 0; i < 7; i++) {

				startTimestamp = fromTimestamp + (1000 * 60 * 60 * 24 * i);
				endTimestamp = fromTimestamp + (1000 * 60 * 60 * 24 * (i + 1));

				dailyCountList.push({"date": getFormattedDate(startTimestamp), "count": 0});

				for(let item of periodData) {
					if(startTimestamp <= item.timestamp && item.timestamp < endTimestamp ) {
						++dailyCountList[i].count;
					}
				}
			}

			setUserAgents(periodData);
			setDailyCount(dailyCountList);

		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, []);

	return <div className="div div--article-logitem">
		<h4>Visitors</h4>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Count = {totalCount}</span>

				{dailyCount.map(data => (
					<div key={data.date}>
						<span>date={data.date}, </span>
						<span>count={data.count}</span>
					</div>
				))}
			</div>
		</div>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">User Environment</span>

				{userAgents.map(data => (
					<div key={data.timestamp}>
						<span>date={data.date}, </span>
						<span>time={data.time}, </span>
						<span>browser={data.browser}, </span>
						<span>operatingSystem={data.operatingSystem}, </span>
						<span>renderingEngine={data.renderingEngine}</span>
					</div>
				))}
			</div>
		</div>
	</div>
}

export default VisitorMon;

