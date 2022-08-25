import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import { log, getFormattedDate, getFormattedTime, getWeekday } from '../common/common';
import { getApiCallStats } from './api';

const ApiCallItem = (props) => {

	const title = props.title;
	const service = props.service;
	const stackPallet = props.stackPallet;

	const [totalCount, setTotalCount] = useState("...");
	const [countList, setCountList] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	// Get api call stats from API Gateway
	const fetchData = async (service) => {

		setIsLoading(true);

		// Make timestamp for 7 days
		const today = new Date();
		const toTimestamp = (new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)).getTime();
		const fromTimestamp = toTimestamp - (1000 * 60 * 60 * 24 * 7);

		try {

			const res = await getApiCallStats(service, fromTimestamp, toTimestamp);
			const data = await res.json();

			if(undefined !== data.errorType) {
				console.error(data);
			}
			else {
			
				log(service + " API call stats are FETCHED successfully.");
				log(data);
			
				setTotalCount(data.body.totalCount);

				const periodData = data.body.Items;
				const maxCount = Math.max.apply(Math, periodData.map(item => { return item.total; }));

				let statList = [];
	
				for(let item of periodData) {
					item.date = getFormattedDate(item.timestamp);
					item.time = getFormattedTime(item.timestamp);
	
					statList.push(
						{
							"date": getFormattedDate(item.timestamp) + " (" + getWeekday(item.timestamp) +")",
							"count": (1 * item.total).toLocaleString(),
							"valueRate": 1 * item.total / maxCount,
							"successRate": 1 * item.succeed / item.total
						}
					);
				}
	
				setCountList(statList);
			}
		}
		catch(err) {
			console.error(err);
		}
		
		setIsLoading(false);
	}

	// Fetch counts at mount
	useEffect(() => {

		fetchData(service)

	}, [service]);

	// Make pillar 
	const Pillar = (attr) => {

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
		const successRateColor = attr.successRate < 0.6 ? 0
			: attr.successRate < 0.7 ? 1
			: attr.successRate < 0.8 ? 2
			: attr.successRate < 0.9 ? 3
			: attr.successRate < 0.95 ? 4
			: attr.successRate < 0.98 ? 5
			: 6;

		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[successRateColor].backgroundColor
		};

		const textColor = {
			color: stackPallet[successRateColor].color
		}

		return (
			<div className="div div--monitor-7pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>
					{attr.count}
					(
					<span style={textColor}>
						{Math.floor(100 * (attr.successRate)) + "%"}
					</span>
					)
				</div>
				<div className="div div--monitor-pillar" style={pillarStyle}></div>
				<div className="div div--monitor-pillarlegend" >{legend}</div>
			</div>
		);
	}

	// Draw pillar chart
	return (
		<section className="section section--monitor-item">
			<h3>{title}: {totalCount.toLocaleString()}</h3>
			<div className="div div--monitor-pillarchart">
			{
				isLoading ? (
					<div className="div div--monitor-loading">
						Loading...
					</div>
				)
				: countList.map(
					(data, index) => (
						<Pillar
							key={data.date}
							date={data.date}
							count={data.count}
							valueRate={data.valueRate}
							successRate={data.successRate}
							index={index}
						/>
					)
				)
			}
			</div>
		</section>
	);
}

ApiCallItem.propTypes = {
	stackPallet: PropTypes.array,
	title: PropTypes.string,
	service: PropTypes.string,
	unit: PropTypes.string,
};

export default ApiCallItem;