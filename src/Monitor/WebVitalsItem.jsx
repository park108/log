import React, { useEffect, useState } from "react";
import { log, hasValue, hoverPopup } from '../common/common';
import { getWebVitals } from './api';
import PropTypes from 'prop-types';

const HEADER_STYLE = {
	"GOOD": "span span--monitor-evaluation span--monitor-good",
	"POOR": "span span--monitor-evaluation span--monitor-poor",
	"NEEDS IMPROVEMENT": "span span--monitor-evaluation span--monitor-warn",
	"None": "span span--monitor-evaluation span--monitor-none",
	undefined: "span span--monitor-evaluation span--monitor-none"
};

const WebVitalsItem = (props) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	const [evaluationResult, setEvaluationResult] = useState({
		totalCount: 0,
		evaluation: "None",
		good: { count: 0, rate: 0, style: {} },
		needImprovement: { count: 0, rate: 0, style: {} },
		poor: { count: 0, rate: 0, style: {} }
	});

	const name = props.name;
	const description = props.description;

	useEffect(() => {

		const fetchData = async(name) => {

			setIsLoading(true);
			setIsError(false);

			try {
				const res = await getWebVitals(name);
				const fetchedData = await res.json();

				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Web Vital(" + name + "): " + fetchedData.body.Count, "SUCCESS");

					const data = fetchedData.body.Items;

					let good = 0;
					let poor = 0;
					let needImprovement = 0;
				
					for(let item of data) {
						switch(item.evaluation) {
							case "GOOD": ++good; break;
							case "POOR": ++poor; break;
							case "NEEDS IMPROVEMENT": ++needImprovement; break;
							default: break;
						}
					}

					const totalCount = good + poor + needImprovement;

					evaluationResult.good.count = good;
					evaluationResult.needImprovement.count = needImprovement;
					evaluationResult.poor.count = poor;

					evaluationResult.good.rate = 0 === good ? "" : (100 * good / totalCount).toFixed(0);
					evaluationResult.needImprovement.rate = 0 === needImprovement ? "" : (100 * needImprovement / totalCount).toFixed(0);
					evaluationResult.poor.rate = 0 === 	poor ? "" : (100 * poor / totalCount).toFixed(0);

					evaluationResult.good.style = {width: 100 * good / totalCount + "%"}
					evaluationResult.needImprovement.style = {width: 100 * needImprovement / totalCount + "%"};
					evaluationResult.poor.style = {width: 100 * poor / totalCount + "%"};

					if(75 <= evaluationResult.good.rate) {
						evaluationResult.evaluation = "GOOD";
					}
					else if(25 < evaluationResult.poor.rate) {
						evaluationResult.evaluation = "POOR";
					}
					else if(0 < totalCount) {
						evaluationResult.evaluation = "NEEDS IMPROVEMENT";
					}
					else {
						evaluationResult.evaluation = "None";
					}

					setEvaluationResult(evaluationResult);
				}
				else {
					log("[API GET] FAILED - Web Vital(" + name + ")", "ERROR");
					setIsError(true);
					console.error(fetchedData);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Web Vital(" + name + ")", "ERROR");
				setIsError(true);
				console.error(err);
			}
		
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData(name);
			setIsMount(true);
		}
	}, [isMount, name]);

	if(isLoading) {
		return (
			<section className="section section--monitor-item">
				<h3>
					{name}
					<span className="span span--monitor-metric">{ description + " (...)"}</span>
				</h3>
				<div className="div div--monitor-processinglow">
					Loading...
				</div>
			</section>
		);
	}
	else if(isError) {
		return (
			<section className="section section--monitor-item">
				<h3>
					{ name }
					<span className="span span--monitor-metric">{ description }</span>
				</h3>
				<div className="div div--monitor-processinglow">
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
				<h3>
					{ name }
					<span className="span span--monitor-metric">{ description + " (" + evaluationResult.totalCount + ")" }</span>
					<span className={ HEADER_STYLE[evaluationResult.evaluation] }>{ evaluationResult.evaluation }</span>
				</h3>
				<div
					data-testid={"status-bar-" + name}
					className="div div--monitor-statusbar"
					onMouseOver={(e) => hoverPopup(e, name)}
					onMouseMove={(e) => hoverPopup(e, name)}
					onMouseOut={(e) => hoverPopup(e, name)}
				>
					<span className="span span--monitor-bar span--monitor-good" style={ evaluationResult.good.style }>
						{ evaluationResult.good.rate}
					</span>
					<span className="span span--monitor-bar span--monitor-warn" style={ evaluationResult.needImprovement.style }>
						{ evaluationResult.needImprovement.rate }
					</span>
					<span className="span span--monitor-bar span--monitor-poor" style={ evaluationResult.poor.style }>
						{ evaluationResult.poor.rate }
					</span>
				</div>
				<div id={name} className="div div--monitor-pillardetail" style={{display: "none"}}>
					<ul className="ul ul--monitor-detailpillaritem">
						<li className="li li--monitor-detailpillaritem">{ description }</li>
						<li className="li li--monitor-detailpillaritem">
							🟢 { evaluationResult.good.count } &nbsp;&nbsp;
							🟡 { evaluationResult.needImprovement.count } &nbsp;&nbsp;
							🔴 { evaluationResult.poor.count }
						</li>
					</ul>
				</div>
			</section>
		);
	}
}

WebVitalsItem.propTypes = {
	description: PropTypes.string,
	name: PropTypes.string,
};

export default WebVitalsItem;