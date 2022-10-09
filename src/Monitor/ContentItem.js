import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import { log, getFormattedDate, getFormattedSize } from '../common/common';
import { getContentItemCount } from './api';

const ContentItem = (props) => {

	const title = props.title;
	const path = props.path;
	const stackPallet = props.stackPallet;

	const [totalCount, setTotalCount] = useState("...");
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

		try {

			const res = await getContentItemCount(path, from, to);
			const data = await res.json();

			if(undefined !== data.errorType) {
				log("[API GET] FAILED - Content API: " + path);
				console.error(data);
			}
			else {
				log("[API GET] OK - Content API: " + path);

				setTotalCount(data.body.Count);

				let periodData = data.body.Items;
				let max = 0; // Max value in array to calculate value rate
				let countList = [];

				for(let i = 0; i < timeline.length - 1; i++) {

					countList.push({
						"from": timeline[i],
						"to": timeline[i+1],
						"value": 0,
						"count": 0,
						"deleted": 0
					});
	
					for(let item of periodData) {
						if(timeline[i] <= item.timestamp && item.timestamp < timeline[i+1]) {
							++countList[i].count;
							if(undefined !== item.size) {
								countList[i].value += item.size;
							}
							else {
								++countList[i].value;
							}
							if(item.sortKey < 0) {
								++countList[i].deleted;
							}
						}
					}
					
					// Update max value
					if(max < countList[i].value) {
						max = countList[i].value;
					}
				}

				// Calculate value rate by max value
				for(let item of countList) {
					item.valueRate = item.value / max;
				}

				setCounts(countList);
			}
		}
		catch(err) {
			console.error(err);
		}
		
		setIsLoading(false);
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
		const blankHeight = 0 === totalCount ? {height: "60px"} : {height: pillarHeight * (1 - attr.valueRate) + "px"};
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
								value={
									("capacity" === props.unit)
									? (
										getFormattedSize(item.value)
											+ ((0 === item.count) ? ""
											: (1 === item.count) ? " (" + item.count + " file)"
											: " (" + item.count + " files)")
									)
									: item.value
								}
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

ContentItem.propTypes = {
	stackPallet: PropTypes.array,
	title: PropTypes.string,
	path: PropTypes.string,
	unit: PropTypes.string,
};

export default ContentItem;