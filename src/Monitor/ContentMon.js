import React, { useEffect, useState } from "react";
import { log, getFormattedDate, getFormattedSize } from '../common';
import * as commonMonitor from './commonMonitor';

const ContentMon = (props) => {
	
	const [logCount, setLogCount] = useState([]);
	const [commentCount, setCommentCount] = useState([]);
	const [fileCount, setFileCount] = useState([]);

	const [isLoadingLogs, setIsLoadingLogs] = useState(false);
	const [isLoadingComments, setIsLoadingComments] = useState(false);
	const [isLoadingFiles, setIsLoadingFiles] = useState(false);

	const stackPallet = props.stackPallet;

	async function fetchLogCount(from, to, t) {

		setIsLoadingLogs(true);

		const apiUrl = commonMonitor.getAPI() + "/content/log?fromTimestamp=" + from + "&toTimestamp=" + to;
		
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

			setIsLoadingLogs(false);
			
		}).catch(err => {
			console.error(err);
		});
	}

	async function fetchCommentCount(from, to, t) {

		setIsLoadingComments(true);

		const apiUrl = commonMonitor.getAPI() + "/content/comment?fromTimestamp=" + from + "&toTimestamp=" + to;
		
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

			setIsLoadingComments(false);
			
		}).catch(err => {
			console.error(err);
		});
	}

	async function fetchFileMetadata(from, to, t) {

		setIsLoadingFiles(true);

		const apiUrl = commonMonitor.getAPI() + "/file?fromTimestamp=" + from + "&toTimestamp=" + to;
		
		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			
			log("File count is FETCHED successfully.");
			
			let periodData = res.body.Items;

			let max = 0;
			let fileCountList = [];

			for(let i = 0; i < t.length - 1; i++) {

				fileCountList.push({"from": t[i], "to": t[i+1], "count": 0, "size": 0});

				for(let item of periodData) {
					if(t[i] <= item.timestamp && item.timestamp < t[i+1]) {
						++fileCountList[i].count;
						fileCountList[i].size += item.size;
					}
				}

				if(max < fileCountList[i].size) {
					max = fileCountList[i].size;
				}
			}

			for(let item of fileCountList) {
				item.valueRate = item.size / max;
			}

			setFileCount(fileCountList);

			setIsLoadingFiles(false);
			
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {

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

		fetchLogCount(fromTimestamp, toTimestamp, t);
		fetchCommentCount(fromTimestamp, toTimestamp, t);
		fetchFileMetadata(fromTimestamp, toTimestamp, t);
	}, []);

	const pillarHeight = 60;

	const Pillars = (attr) => {

		// const palletIndex = 6/7 < attr.valueRate ? 0
		// 	: 5/7 < attr.valueRate ? 1
		// 	: 4/7 < attr.valueRate ? 2
		// 	: 3/7 < attr.valueRate ? 3
		// 	: 2/7 < attr.valueRate ? 4
		// 	: 1/7 < attr.valueRate ? 5
		// 	: 6;

		const palletIndex = attr.index;
		
		const legend = 0 === attr.index ? "'" + attr.date.substr(2, 2) + "." + attr.date.substr(5, 2)
			: "01" === attr.date.substr(5, 2) ? "'" + attr.date.substr(2, 2) + "." + attr.date.substr(5, 2)
			: attr.date.substr(5, 2);

		const valueHeight = {height: "20px"}
		const blankHeight = {height: pillarHeight * (1 - attr.valueRate) + "px"};

		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[palletIndex].backgroundColor
		};

		return <div className="div div--monitor-6pillars">
			<div className="div div--monitor-blank" style={blankHeight}> </div>
			<div className="div div--monitor-value" style={valueHeight}>{attr.value}</div>
			<div className="div div--monitor-pillar" style={pillarStyle}></div>
			<div className="div div--monitor-pillarlegend" >{legend}</div>
		</div>
	}

	const divLoading = <div className="div div--monitor-loading">
		Loading...
	</div>;

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Contents in the last 6 months</h1>
			<section className="section section--monitor-item">
				<h3>Logs</h3>
				<div className="div div--monitor-pillarchart">
					{
						isLoadingLogs ? divLoading
						: logCount.map(
							(item, index) => (
								<Pillars
									key={item.from}
									valueRate={item.valueRate}
									value={item.count}
									date={getFormattedDate(item.from)}
									index={index}
								/>
							)
						)
					}
				</div>
			</section>
			<section className="section section--monitor-item">
				<h3>Comments</h3>
				<div className="div div--monitor-pillarchart">
					{
						isLoadingComments ? divLoading
						: commentCount.map(
							(item, index) => (
								<Pillars
									key={item.from}
									valueRate={item.valueRate}
									value={item.count}
									date={getFormattedDate(item.from)}
									index={index}
								/>
							)
						)
					}
				</div>
			</section>
			<section className="section section--monitor-item">
				<h3>Files</h3>
				<div className="div div--monitor-pillarchart">
					{
						isLoadingFiles ? divLoading
						: fileCount.map(
							(item, index) => (
								<Pillars
									key={item.from}
									valueRate={item.valueRate}
									value={
										getFormattedSize(item.size)
											+ ((0 === item.count) ? ""
											: (1 === item.count) ? " (" + item.count + " file)"
											: " (" + item.count + " files)")
									}
									date={getFormattedDate(item.from)}
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

export default ContentMon;