import React, { Suspense, lazy } from "react";
import { Redirect } from 'react-router-dom';
import { isAdmin } from '../common';

import './Monitor.css';

const VisitorMon = lazy(() => import('./VisitorMon'));
const ContentMon = lazy(() => import('./ContentMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));

// Red to Green
// const stackPallet = [
// 	{color: "black", backgroundColor: "rgb(243, 129, 129)"},
// 	{color: "black", backgroundColor: "rgb(248, 178, 134)"},
// 	{color: "black", backgroundColor: "rgb(252, 227, 138)"},
// 	{color: "black", backgroundColor: "rgb(243, 241, 173)"},
// 	{color: "black", backgroundColor: "rgb(234, 255, 208)"},
// 	{color: "black", backgroundColor: "rgb(190, 240, 210)"},
// 	{color: "black", backgroundColor: "rgb(149, 225, 211)"},
// ];

// Grey scale
// const stackPallet = [
// 	{color: "black", backgroundColor: "rgb(230, 230, 230)"},
// 	{color: "black", backgroundColor: "rgb(200, 200, 200)"},
// 	{color: "black", backgroundColor: "rgb(170, 170, 170)"},
// 	{color: "black", backgroundColor: "rgb(140, 140, 140)"},
// 	{color: "black", backgroundColor: "rgb(110, 110, 110)"},
// 	{color: "black", backgroundColor: "rgb(80, 80, 80)"},
// 	{color: "black", backgroundColor: "rgb(50, 50, 50)"},
// ];

// Temperature colors
const stackPallet = [
	{color: "black", backgroundColor: "#EB7373"},
	{color: "black", backgroundColor: "#F08D57"},
	{color: "black", backgroundColor: "#F5A63A"},
	{color: "black", backgroundColor: "#FFD900"},
	{color: "black", backgroundColor: "#958357"},
	{color: "black", backgroundColor: "#605883"},
	{color: "black", backgroundColor: "#2A2CAE"},
];

const Monitor = (props) => {

	const contentHeight = props.contentHeight;

	if(!isAdmin()) {
		return <Redirect to="/log" />;
	}

	return (
		<main className="main main--contents" style={contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				<ContentMon stackPallet={stackPallet} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<VisitorMon stackPallet={stackPallet} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<WebVitalsMon stackPallet={stackPallet} />
			</Suspense>
		</main>
	);
}

export default Monitor;