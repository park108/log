import React, { useEffect, useState } from "react";
import { log, getFormattedDate } from '../common';
import * as commonMonitor from './commonMonitor';

const ContentItem = (props) => {

	const title = props.title;
	const path = props.path;
	const stackPallet = props.stackPallet;

	const [counts, setCounts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	// Get content counts from API Gateway
	const fetchCounts = async (path) => {

		setIsLoading(true);

		// Make timestamp for 6 months
		const now = new Date();
		const to = (new Date(now.getFullYear(), now.getMonth() + 1, 1)).getTime();
		const from = (new Date(now.getFullYear(), now.getMonth() - 5, 1)).getTime();

		const timeline = [
			from,
			(new Date(now.getFullYear(), now.getMonth() -4, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -3, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -2, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -1, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
			to
		];

		const apiUrl = commonMonitor.getAPI() + "/" + path + "?fromTimestamp=" + from + "&toTimestamp=" + to;

		try {

			const res = await fetch(apiUrl);
			const data = await res.json();

			if(undefined !== data.errorType) {
				console.error(res);
			}
			else {
			
				log("Content API " + path + " is FETCHED successfully.");

				let periodData = data.body.Items;
				let max = 0; // Max value in array to calculate value rate
				let countList = [];

				for(let i = 0; i < timeline.length - 1; i++) {

					countList.push({
						"from": timeline[i],
						"to": timeline[i+1],
						"count": 0,
						"deleted": 0
					});
	
					for(let item of periodData) {
						if(timeline[i] <= item.timestamp && item.timestamp < timeline[i+1]) {
							++countList[i].count;
							if(item.sortKey < 0) {
								++countList[i].deleted;
							}
						}
					}
					
					// Update max value
					if(max < countList[i].count) {
						max = countList[i].count;
					}
				}

				// Calculate value rate by max value
				for(let item of countList) {
					item.valueRate = item.count / max;
				}

				setCounts(countList);
				setIsLoading(false);
			}
		}
		catch(err) {
			console.error(err);
		}
	}

	// Fetch counts at mount
	useEffect(() => {

		fetchCounts(path)

	}, [path]);

	// Make pillar 
	const Pillar = (attr) => {

		const index = attr.index;
		const yy = attr.date.substr(2, 2);
		const mm = attr.date.substr(5, 2);
		
		const legend = 0 === index ? "'" + yy + "." + mm // '21.12 (first pillar)
			: "01" === mm ? "'" + yy + "." + mm // '22.01 (change year)
			: mm; // 02

		const pillarHeight = 60;
		const blankHeight = {height: pillarHeight * (1 - attr.valueRate) + "px"};
		const valueHeight = {height: "20px"}
		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[index].backgroundColor
		};

		return (
			<div className="div div--monitor-6pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>{attr.value}</div>
				<div className="div div--monitor-pillar" style={pillarStyle}></div>
				<div className="div div--monitor-pillarlegend" >{legend}</div>
			</div>
		);
	}

	// Draw pillar chart
	return (
		<section className="section section--monitor-item">
			<h3>{title}</h3>
			<div className="div div--monitor-pillarchart">
				{
					isLoading ? (
						<div className="div div--monitor-loading">
							Loading...
						</div>
					)
					: counts.map(
						(item, index) => (
							<Pillar
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
	);
}

export default ContentItem;