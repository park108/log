import React, { Suspense, lazy } from "react";

const WebVitalsItem = lazy(() => import('./WebVitalsItem'));

const WebVitalsMon = (props) => {

	return <section className="section section--main-item">
		<h4>Web Vitals in the last 24 hours</h4>
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
	</section>
}

export default WebVitalsMon;