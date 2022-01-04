import React, { Suspense, lazy } from "react";

const WebVitalsItem = lazy(() => import('./WebVitalsItem'));

const WebVitalsMon = (props) => {

	return (
		<article className="article article--main-item article--monitor-item">
			<h1 >Web Vitals in the last 24 hours</h1>
			<Suspense fallback={<div></div>}>
				<WebVitalsItem title="Largest Contentful Paint" name="LCP" />
				<WebVitalsItem title="First Input Delay" name="FID" />
				<WebVitalsItem title="Cumulative Layout Shift" name="CLS" />
				<WebVitalsItem title="First Contentful Paint" name="FCP" />
				<WebVitalsItem title="Time to First Byte" name="TTFB" />
			</Suspense>
			<a
				href="https://web.dev/defining-core-web-vitals-thresholds/"
				rel="noreferrer" target="_blank"
				className="a a--monitor-referencelink"
			>
				Reference: Defining the Core Web Vitals metrics thresholds by Bryan McQuade
			</a>
		</article>
	);
}

export default WebVitalsMon;