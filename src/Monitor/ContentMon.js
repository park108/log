import React, { useEffect, useState } from "react";
import { log, getFormattedDate } from '../common';
import * as commonMonitor from './commonMonitor';

const ContentMon = (props) => {

	const [logCount, setLogCount] = useState([]);
	const [commentCount, setCommentCount] = useState([]);

	const stackPallet = props.stackPallet;

	async function fetchLogCount() {

		const now = new Date();
		const toTimestamp = (new Date(now.getFullYear(), now.getMonth() + 1, 1)).getTime();
		const fromTimestamp = (new Date(now.getFullYear(), now.getMonth() - 5, 1)).getTime();

		// Make timestamp for 6 months
		const t = [
			fromTimestamp,
			(new Date(now.getFullYear(), now.getMonth() -4, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -3, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -2, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -1, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
			toTimestamp
		];

		const apiUrl = commonMonitor.getAPI() + "/content/log?fromTimestamp=" + fromTimestamp + "&toTimestamp=" + toTimestamp;
		
		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			
			log("Log count is FETCHED successfully.");
			
			let periodData = res.body.Items;

			let max = 0;
			let logCountList = [];

			for(let i = 0; i < t.length - 1; i++) {

				logCountList.push({"from": t[i], "to": t[i+1], "count": 0, "deleted": 0});

				for(let item of periodData) {
					if(t[i] <= item.timestamp && item.timestamp < t[i+1]) {
						++logCountList[i].count;
						if(item.sortKey < 0) {
							++logCountList[i].deleted;
						}
					}
				}

				if(max < logCountList[i].count) {
					max = logCountList[i].count;
				}
			}

			for(let item of logCountList) {
				item.valueRate = item.count / max;
			}

			setLogCount(logCountList);
			
		}).catch(err => {
			console.error(err);
		});
	}

	async function fetchCommentCount() {

		const now = new Date();
		const toTimestamp = (new Date(now.getFullYear(), now.getMonth() + 1, 1)).getTime();
		const fromTimestamp = (new Date(now.getFullYear(), now.getMonth() - 5, 1)).getTime();

		// Make timestamp for 6 months
		const t = [
			fromTimestamp,
			(new Date(now.getFullYear(), now.getMonth() -4, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -3, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -2, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -1, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
			toTimestamp
		];

		const apiUrl = commonMonitor.getAPI() + "/content/comment?fromTimestamp=" + fromTimestamp + "&toTimestamp=" + toTimestamp;
		
		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			
			log("Comment count is FETCHED successfully.");
			
			let periodData = res.body.Items;

			let max = 0;
			let commentCountList = [];

			for(let i = 0; i < t.length - 1; i++) {

				commentCountList.push({"from": t[i], "to": t[i+1], "count": 0, "deleted": 0});

				for(let item of periodData) {
					if(t[i] <= item.timestamp && item.timestamp < t[i+1]) {
						++commentCountList[i].count;
					}
				}

				if(max < commentCountList[i].count) {
					max = commentCountList[i].count;
				}
			}

			for(let item of commentCountList) {
				item.valueRate = item.count / max;
			}

			setCommentCount(commentCountList);
			
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchLogCount();
		fetchCommentCount();
	}, []);

	const pillarHeight = 80;

	const Pillars = (attr) => {

		const palletIndex = 6/7 < attr.valueRate ? 0
			: 5/7 < attr.valueRate ? 1
			: 4/7 < attr.valueRate ? 2
			: 3/7 < attr.valueRate ? 3
			: 2/7 < attr.valueRate ? 4
			: 1/7 < attr.valueRate ? 5
			: 6;
		
		const legend = 0 === attr.index ? "'" + attr.date.substr(2, 2) + "." + attr.date.substr(5, 2)
			: "01" === attr.date.substr(5, 2) ? "'" + attr.date.substr(2, 2) + "." + attr.date.substr(5, 2)
			: attr.date.substr(5, 2);

		const blankHeight = {height: pillarHeight * (1 - attr.valueRate) + "px"};

		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[palletIndex].backgroundColor
		};

		return <div className="div div--monitor-6pillars">
			<span style={blankHeight}>{attr.count}</span>
			<div className="div div--monitor-pillar" style={pillarStyle}></div>
			<div className="div div--monitor-pillarlegend" >{legend}</div>
		</div>
	}

	let logsPillarIndex = 0;
	let commentsPillarIndex = 0;

	return <section className="section section--main-item">
		<h4>Contents in the last 6 months</h4>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Logs</span>
			</div>
			<div className="div div--monitor-pillarchart">
				{logCount.map(item =>(
					<Pillars
						key={item.from}
						valueRate={item.valueRate}
						count={item.count}
						date={getFormattedDate(item.from)}
						index={logsPillarIndex++}
					/>
				))}
			</div>
		</div>
		<div className="div div--monitor-item">
			<div className="div div--monitor-subtitle">
				<span className="span span--monitor-metric">Comments</span>
			</div>
			<div className="div div--monitor-pillarchart">
				{commentCount.map(item =>(
					<Pillars
						key={item.from}
						valueRate={item.valueRate}
						count={item.count}
						date={getFormattedDate(item.from)}
						index={commentsPillarIndex++}
					/>
				))}
			</div>
		</div>
	</section>
}

export default ContentMon;