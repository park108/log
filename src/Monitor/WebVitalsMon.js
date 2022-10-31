import React, { Suspense, lazy } from "react";

const WebVitalsItem = lazy(() => import('./WebVitalsItem'));

const webVitalList = [
	{name: "LCP", description: "Largest Contentful Paint"},
	{name: "FID", description: "First Input Delay"},
	{name: "CLS", description: "Cumulative Layout Shift"},
	{name: "FCP", description: "First Contentful Paint"},
	{name: "TTFB", description: "Time to First Byte"},
]

const WebVitalsMon = () => {

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Web Vitals in the last 24 hours</h1>
			<Suspense fallback={<div></div>}>
				{webVitalList.map(item => (
					<WebVitalsItem
						key={item.name}
						name={item.name}
						description={item.description}
					/>
				))}
			</Suspense>
			<a
				href="https://web.dev/defining-core-web-vitals-thresholds/"
				rel="noreferrer noopener" target="_blank"
				className="a a--monitor-referencelink"
			>
				Reference: Defining the Core Web Vitals metrics thresholds by Bryan McQuade
			</a>
		</article>
	);
}

export default WebVitalsMon;