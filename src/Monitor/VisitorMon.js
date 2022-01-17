import React, { useEffect, useState } from "react";
import { log, getFormattedDate, getFormattedTime, getWeekday } from "../common";
import * as commonMonitor from './commonMonitor';

const VisitorMon = (props) => {

	const [totalCount, setTotalCount] = useState("...");
	const [dailyCount, setDailyCount] = useState([]);
	const [envTotalCount, setEnvTotalCount] = useState(0);
	const [browsers, setBrowsers] = useState([]);
	const [os, setOs] = useState([]);
	const [engines, setEngines] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const stackPallet = props.stackPallet;

	async function fetchData() {

		setIsLoading(true);

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
			let max = 0;

			for(let i = 0; i < 7; i++) {

				startTimestamp = fromTimestamp + (1000 * 60 * 60 * 24 * i);
				endTimestamp = fromTimestamp + (1000 * 60 * 60 * 24 * (i + 1));

				dailyCountList.push({"date": getFormattedDate(startTimestamp) + " (" + getWeekday(startTimestamp) +")", "count": 0});

				for(let item of periodData) {
					if(startTimestamp <= item.timestamp && item.timestamp < endTimestamp ) {
						++dailyCountList[i].count;
						if(max < dailyCountList[i].count) {
							max = dailyCountList[i].count;
						}
					}
				}
			}

			for(let item of dailyCountList) {
				item.valueRate = item.count / max;
			}

			setDailyCount(dailyCountList);


			// Analyze user agent
			let browserList = [];
			let osList = [];
			let engineList = [];

			let hasBrowser = false;
			let hasOs = false
			let hasEngine = false;

			for(let item of periodData) {

				// Set browser list
				hasBrowser = false;
				for(let browser of browserList) {
					if(browser["name"] === item.browser) {
						++browser.count;
						hasBrowser = true;
						break;
					}
				}
				if(!hasBrowser) {
					browserList.push({"name": item.browser, "count": 1});
				}

				// Set os list
				hasOs = false;
				for(let os of osList) {
					if(os["name"] === item.operatingSystem) {
						++os.count;
						hasOs = true;
						break;
					}
				}
				if(!hasOs) {
					osList.push({"name": item.operatingSystem, "count": 1});
				}

				// Set rendering engine list
				hasEngine = false;
				for(let engine of engineList) {
					if(engine["name"] === item.renderingEngine) {
						++engine.count;
						hasEngine = true;
						break;
					}
				}
				if(!hasEngine) {
					engineList.push({"name": item.renderingEngine, "count": 1});
				}
			}

			const countSort = (a, b) => {
				const sortKeyA = a.count;
				const sortKeyB = b.count;
				const result
					= (sortKeyA < sortKeyB) ? -1
					: (sortKeyA > sortKeyB) ? 1
					: 0;
				return result;
			}

			browserList.sort(countSort);
			osList.sort(countSort);
			engineList.sort(countSort);

			setEnvTotalCount(periodData.length);

			setBrowsers(browserList);
			setOs(osList);
			setEngines(engineList);

			setIsLoading(false);

		}).catch(err => {
			console.error(err);
		});
	}

	// Fetch data at mount
	useEffect(() => fetchData(), []);

	// Make pillar
	const CountPillar = (attr) => {

		const index = attr.index;
		const mm = attr.date.substr(5, 2);
		const dd = attr.date.substr(8, 2);
		const ddWeek = attr.date.substr(8, 8);

		const legend = 0 === index ? mm + "." + ddWeek // 01.09 (Sun) (first pillar)
			: "01" === dd ? mm + "." + ddWeek // 02.01 (Tue) (change month)
			: ddWeek; // 15 (Sat)

		const pillarHeight = 60;
		const blankHeight = {height: pillarHeight * (1 - attr.valueRate) + "px"};
		const valueHeight = {height: "20px"}
		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[index].backgroundColor
		};

		return (
			<div className="div div--monitor-7pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>{attr.count}</div>
				<div className="div div--monitor-pillar" style={pillarStyle}></div>
				<div className="div div--monitor-pillarlegend" >{legend}</div>
			</div>
		);
	}

	// Make stacked pillar's stack
	const EnvStack = (attr) => {

		const pillarHeight = 185; 
		const stackStyle = {
			height: pillarHeight * (attr.count / envTotalCount) + "px",
			color: stackPallet[attr.totalCount - attr.index - 1].color,
			backgroundColor: stackPallet[attr.totalCount - attr.index - 1].backgroundColor
		};
		
		return (
			<div className="div div--monitor-pillar" style={stackStyle} key={attr.name}>
				<div className="div div--monitor-stackvalue">
					<span>{attr.name}, </span>
					<span>{(100 * (attr.count / envTotalCount)).toFixed(0)}</span>				
				</div>
			</div>
		);
	}

	// Make stacked pillar
	const EnvPillar = (attr) => {

		let index = 0;
		let total = attr.data.length;

		return (
			<div className="div div--monitor-3pillars">
				{attr.data.map(item => (
					<EnvStack
						key={item.name}
						name={item.name}
						count={item.count}
						totalCount={total}
						index={index++}
					/>
				))}
				<div className="div div--monitor-pillarlegend" >{attr.legend}</div>
			</div>
		);
	}

	const divLoading = <div className="div div--monitor-loading">
		Loading...
	</div>;

	// Draw visitor monitor
	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Visitors in the last 7 days</h1>
			<section className="section section--monitor-item">
				<h3>Total Count: {totalCount}</h3>
				<div className="div div--monitor-pillarchart">
				{
					isLoading ? divLoading
					: dailyCount.map(
						(data, index) => (
							<CountPillar
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
				<h3>User Environment: {envTotalCount} cases</h3>
				<div className="div div--monitor-stackchart">
					{
						isLoading ? divLoading
						: <div>
							<EnvPillar
								legend="Browser"
								length={envTotalCount}
								data={browsers}
							/>
							<EnvPillar
								legend="OS"
								length={envTotalCount}
								data={os}
							/>
							<EnvPillar
								legend="Rendering Engine"
								length={envTotalCount}
								data={engines}
							/>
						</div>
					}
				</div>
			</section>
		</article>
	);
}

export default VisitorMon;