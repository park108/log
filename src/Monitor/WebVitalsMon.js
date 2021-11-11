import React, { Suspense, lazy } from "react";

const WebVitalsItem = lazy(() => import('./WebVitalsItem'));

const WebVitalsMon = (props) => {

	return <article className="article article--main-item">
		<h1 className="h1 h1--monitor-title">Web Vitals in the last 24 hours</h1>
		<Suspense fallback={<div></div>}>
			<WebVitalsItem title="LCP: Largest Contentful Paint" name="LCP" />
			<WebVitalsItem title="FID: First Input Delay" name="FID" />
			<WebVitalsItem title="CLS: Cumulative Layout Shift" name="CLS" />
			<WebVitalsItem title="FCP: First Contentful Paint" name="FCP" />
			<WebVitalsItem title="TTFB: Time to First Byte" name="TTFB" />
		</Suspense>
		<a href="https://web.dev/defining-core-web-vitals-thresholds/" rel="noreferrer" target="_blank">
			Reference: Defining the Core Web Vitals metrics thresholds by Bryan McQuade
		</a>
	</article>
}

export default WebVitalsMon;