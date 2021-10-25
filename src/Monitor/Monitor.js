import React, { useEffect, Suspense, lazy } from "react";
import { CONSTANTS } from '../common';

const ApiMon = lazy(() => import('./ApiMon'));
const VisitorMon = lazy(() => import('./VisitorMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));

const Monitor = (props) => {
	
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {
			if(node.className.includes("div--toaster")) {
				node.style.maxWidth = "100%";
			}
			else {
				node.style.maxWidth = CONSTANTS.MAX_DIV_WIDTH;
			}
		}

	}, []);

	return <div className="div div--main-contents">
		<Suspense fallback={<div></div>}>
			<WebVitalsMon />
		</Suspense>
		<Suspense fallback={<div></div>}>
			<VisitorMon />
		</Suspense>
		<Suspense fallback={<div></div>}>
			<ApiMon />
		</Suspense>
	</div>
}

export default Monitor;