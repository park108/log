import React, { Suspense, lazy } from "react";
import type { ChartColor } from './Monitor';

const ApiCallItem = lazy(() => import('./ApiCallItem'));

const SERVICE_LIST = [
	{title: "log", service: "log"},
	{title: "file", service: "file"},
	{title: "analytics", service: "analytics"},
];

interface ApiCallMonProps {
	stackPallet?: ChartColor[];
}

const ApiCallMon = (props: ApiCallMonProps) => {

	return (
		<article className="article article--main-item article--monitor-item">
			<h1>API Calls in the last 7 days</h1>
			<Suspense fallback={<div></div>}>
				{ SERVICE_LIST.map(item => (
					<ApiCallItem
						key={item.service}
						title={item.title}
						service={item.service}
						stackPallet={props.stackPallet}
					/>
				)) }
			</Suspense>
		</article>
	);
}


export default ApiCallMon;