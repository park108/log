import React, { useEffect, useState } from "react";
import * as commonMonitor from './commonMonitor';
import WebVitalsItem from "./WebVitalsItem";

const WebVitalsMon = (props) => {

	const [data, setData] = useState([]);

	async function fetchData() {

		const apiUrl = commonMonitor.getAPI();

		// Call GET API
		const res = await fetch(apiUrl);
		
		res.json().then(res => {
			console.log("Web Vitals are FETCHED from AWS successfully.");
			setData(res.body.Items);
		}).catch(err => {
			console.error(err);
		});
	}

	useEffect(() => {
		fetchData();
	}, []);

	return <div className="div div--article-logitem">
		<h3>Web Vitals</h3>
		<WebVitalsItem title="LCP: Largest Contentful Paint" name="LCP" data={data} />
		<WebVitalsItem title="FID: First Input Delay" name="FID" data={data} />
		<WebVitalsItem title="CLS: Cumulative Layout Shift" name="CLS" data={data} />
		<WebVitalsItem title="FCP: First Contentful Paint" name="FCP" data={data} />
		<WebVitalsItem title="TTFB: Time to First Byte" name="TTFB" data={data} />
		<a href="https://web.dev/defining-core-web-vitals-thresholds/" rel="noreferrer" target="_blank">
			Reference: Defining the Core Web Vitals metrics thresholds by Bryan McQuade
		</a>
	</div>
}

export default WebVitalsMon;