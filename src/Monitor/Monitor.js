import React, { Suspense, lazy } from "react";
import { Redirect } from 'react-router-dom';
import { isAdmin } from '../common';

import './Monitor.css';

const VisitorMon = lazy(() => import('./VisitorMon'));
const ContentMon = lazy(() => import('./ContentMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));

const stackPallet = [
	{color: "black", backgroundColor: "rgb(243, 129, 129)"},
	{color: "black", backgroundColor: "rgb(248, 178, 134)"},
	{color: "black", backgroundColor: "rgb(252, 227, 138)"},
	{color: "black", backgroundColor: "rgb(243, 241, 173)"},
	{color: "black", backgroundColor: "rgb(234, 255, 208)"},
	{color: "black", backgroundColor: "rgb(190, 240, 210)"},
	{color: "black", backgroundColor: "rgb(149, 225, 211)"},
];

const Monitor = (props) => {

	if(!isAdmin()) {
		return <Redirect to="/log" />;
	}

	return <div className="div div--main-contents" role="application">
		<Suspense fallback={<div></div>}>
			<ContentMon stackPallet={stackPallet} />
		</Suspense>
		<Suspense fallback={<div></div>}>
			<VisitorMon stackPallet={stackPallet} />
		</Suspense>
		<Suspense fallback={<div></div>}>
			<WebVitalsMon stackPallet={stackPallet} />
		</Suspense>
	</div>
}

export default Monitor;