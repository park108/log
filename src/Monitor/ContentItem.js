import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import { log, hasValue, getFormattedDate, getFormattedSize } from '../common/common';
import { getContentItemCount } from './api';

const ContentItem = (props) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	const [totalCount, setTotalCount] = useState("...");
	const [counts, setCounts] = useState([]);

	const title = props.title;
	const path = props.path;
	const stackPallet = props.stackPallet;
	
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

	useEffect(() => {

		const fetchData = async (path) => {
	
			setIsLoading(true);
			setIsError(false);
	
			try {
				const res = await getContentItemCount(path, from, to);
				const data = await res.json();
	
				if(!hasValue(data.errorType)) {
					log("[API GET] OK - Content API: " + path, "SUCCESS");
	
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
								if(hasValue(item.size)) {
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
						
						if(max < countList[i].value) {
							max = countList[i].value;
						}
					}
	
					for(let item of countList) {
						item.valueRate = item.value / max;
					}
	
					setCounts(countList);
				}
				else {
					log("[API GET] FAILED - Content API: " + path, "ERROR");
					setIsError(true);
					console.error(data);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Content API: " + path, "ERROR");
				setIsError(true);
				console.error(err);
			}
			
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData(path);
			setIsMount(true);
		}

	}, [path, isMount]);

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

	if(isLoading) {
		return (
			<section className="section section--monitor-item">
				<h3>{title}</h3>
				<div className="div div--monitor-processing">
					Loading...
				</div>
			</section>
		);
	}
	else if(isError) {
		return (
			<section className="section section--monitor-item">
				<h3>{title}</h3>
				<div className="div div--monitor-processing">
					<span className="span span--monitor-retrybutton" onClick={ () => { setIsMount(false) } } >
						Retry
					</span>
				</div>
			</section>
		);
	}
	else {
		return (
			<section className="section section--monitor-item">
				<h3>{title}</h3>
				<div className="div div--monitor-pillarchart">
					{ counts.map((item, index) => (
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
					)) }
				</div>
			</section>
		);
	}
}

ContentItem.propTypes = {
	stackPallet: PropTypes.array,
	title: PropTypes.string,
	path: PropTypes.string,
	unit: PropTypes.string,
};

export default ContentItem;