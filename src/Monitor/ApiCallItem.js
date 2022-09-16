import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import { log, getFormattedDate, getFormattedTime, getWeekday } from '../common/common';
import { getApiCallStats } from './api';

const getSuccessRateIndex = (rate) => {
	return rate < 0.6 ? 0
		: rate < 0.7 ? 1
		: rate < 0.8 ? 2
		: rate < 0.9 ? 3
		: rate < 0.95 ? 4
		: rate < 0.98 ? 5
		: 6;
}

const ApiCallItem = (props) => {

	const title = props.title;
	const service = props.service;
	const stackPallet = props.stackPallet;

	const [totalCount, setTotalCount] = useState("...");
	const [successCount, setSuccessCount] = useState(0);
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
			
				log(service + " API call stats are FETCHED successfully. Processing time is " + (data.body.ProcessingTime).toLocaleString() + " ms");
				
				if(undefined === data.body.totalCount) {
					throw "totalCount is undefined";
				}
				setTotalCount(data.body.totalCount);

				const periodData = data.body.Items;
				const maxCount = Math.max.apply(Math, periodData.map(item => { return item.total; }));

				let statList = [];
				let successCount = 0;
	
				for(let item of periodData) {
					item.date = getFormattedDate(item.timestamp);
					item.time = getFormattedTime(item.timestamp);
	
					statList.push(
						{
							"date": getFormattedDate(item.timestamp) + " (" + getWeekday(item.timestamp) +")",
							"count": (1 * item.total).toLocaleString(),
							"succeed": (1 * item.succeed).toLocaleString(),
							"failed": (1 * item.failed).toLocaleString(),
							"valueRate": 1 * item.total / maxCount,
							"successRate":  0 === item.total ? 0 : 1 * item.succeed / item.total
						}
					);

					successCount += item.succeed;
				}
				setSuccessCount(successCount);
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
		const detailId = "api-call-item-" + service + "-" + attr.index;
		const mm = attr.date.substr(5, 2);
		const dd = attr.date.substr(8, 2);
		const ddWeek = attr.date.substr(8, 8);

		const legend = 0 === index ? mm + "." + ddWeek // 01.09 (Sun) (first pillar)
			: "01" === dd ? mm + "." + ddWeek // 02.01 (Tue) (change month)
			: ddWeek; // 15 (Sat)

		const pillarHeight = 60;
		const blankHeight = 0 === totalCount ? {height: "60px"} : {height: pillarHeight * (1 - attr.valueRate) + "px"};
		const valueHeight = {height: "20px"}
		const successRateColor = getSuccessRateIndex(attr.successRate);

		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: stackPallet[successRateColor].backgroundColor
		};

		const textColor = "0" === attr.count ? {
			color: "black"
		} : {
			color: stackPallet[successRateColor].color
		}

		const hoverDetails = (e) => {

			const pillarDetail = document.getElementById(detailId);
			const classNames = pillarDetail.getAttribute("class");

			if("mouseover" === e.type) {
				if("div div--monitor-pillardetail" !== classNames) {
					pillarDetail.setAttribute("class", "div div--monitor-pillardetail");
				}
			}
			else if("mousemove" === e.type) {
				const left  = e.clientX  + 5 + "px";
				const top  = e.clientY  + 5 + "px";
				pillarDetail.style.left = left;
				pillarDetail.style.top = top;
			}
			else {
				if("div div--monitor-pillardetailhide" !== classNames) {
					pillarDetail.setAttribute("class", "div div--monitor-pillardetailhide");
				}
			}
		}

		return (
			<div className="div div--monitor-7pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>
					{attr.count}
					(
					<span style={textColor}>
						{Math.round(100 * (attr.successRate)) + "%"}
					</span>
					)
				</div>
				<div data-testid={detailId} className="div div--monitor-pillar" style={pillarStyle} onMouseOver={hoverDetails} onMouseMove={hoverDetails} onMouseOut={hoverDetails} ></div>
				<div className="div div--monitor-pillarlegend" >{legend}</div>
				<div id={detailId} className="div div--monitor-pillardetailhide">
					<ul className="ul ul--monitor-detailpillaritem">
						<li className="li li--monitor-detailpillaritem">{attr.date.substr(0,10)}</li>
						<li className="li li--monitor-detailpillaritem">🟢 {attr.succeed} &nbsp;&nbsp; 🔴 {attr.failed}</li>
					</ul>
				</div>
			</div>
		);
	}

	const rate = Math.round(100 * (successCount / totalCount));
	const rateColor = {
		color: stackPallet[getSuccessRateIndex(rate)].color
	}

	// Draw pillar chart
	return (
		<section className="section section--monitor-item">
			<h3>
				{title}: {totalCount.toLocaleString()} 
				(<span style={rateColor}>{"..." === totalCount || 0 === totalCount ? 0 : rate}%</span>)
			</h3>
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
							succeed={data.succeed}
							failed={data.failed}
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