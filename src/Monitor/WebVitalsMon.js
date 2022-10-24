import React, { Suspense, lazy } from "react";

const WebVitalsItem = lazy(() => import('./WebVitalsItem'));

const WebVitalsMon = () => {

	const webVitalList = [
		{title: "Largest Contentful Paint", name: "LCP"},
		{title: "First Input Delay", name: "FID"},
		{title: "Cumulative Layout Shift", name: "CLS"},
		{title: "First Contentful Paint", name: "FCP"},
		{title: "Time to First Byte", name: "TTFB"},
	]

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>Web Vitals in the last 24 hours</h1>
			<Suspense fallback={<div></div>}>
				{webVitalList.map(item => (
					<WebVitalsItem
						key={item.name}
						title={item.title}
						name={item.name}
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