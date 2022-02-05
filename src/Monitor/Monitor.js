import React, { Suspense, useEffect, lazy } from "react";
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { isAdmin, setFullscreen, setTitle } from '../common';

import './Monitor.css';

const VisitorMon = lazy(() => import('./VisitorMon'));
const ContentMon = lazy(() => import('./ContentMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));
const ApiCallMon = lazy(() => import('./ApiCallMon'));

const chartPallets = [
	{
		pallet: "Red to Green",
		colors: [
			{color: "black", backgroundColor: "rgb(243, 129, 129)"},
			{color: "black", backgroundColor: "rgb(248, 178, 134)"},
			{color: "black", backgroundColor: "rgb(252, 227, 138)"},
			{color: "black", backgroundColor: "rgb(243, 241, 173)"},
			{color: "black", backgroundColor: "rgb(234, 255, 208)"},
			{color: "black", backgroundColor: "rgb(190, 240, 210)"},
			{color: "black", backgroundColor: "rgb(149, 225, 211)"},
		]
	},
	{
		pallet: "Olive",
		colors: [
			{color: "black", backgroundColor: "#CAD2C5"},
			{color: "black", backgroundColor: "#A7BEA9"},
			{color: "black", backgroundColor: "#84A98C"},
			{color: "black", backgroundColor: "#6B917E"},
			{color: "black", backgroundColor: "#52796F"},
			{color: "black", backgroundColor: "#354F52"},
			{color: "black", backgroundColor: "#2F3E46"},
		]
	},
	{
		pallet: "Grey scale",
		colors: [
			{color: "black", backgroundColor: "rgb(230, 230, 230)"},
			{color: "black", backgroundColor: "rgb(200, 200, 200)"},
			{color: "black", backgroundColor: "rgb(170, 170, 170)"},
			{color: "black", backgroundColor: "rgb(140, 140, 140)"},
			{color: "black", backgroundColor: "rgb(110, 110, 110)"},
			{color: "black", backgroundColor: "rgb(80, 80, 80)"},
			{color: "black", backgroundColor: "rgb(50, 50, 50)"},
		]
	},
	{
		pallet: "Temperature colors",
		colors: [
			{color: "black", backgroundColor: "#EB7373"},
			{color: "black", backgroundColor: "#F08D57"},
			{color: "black", backgroundColor: "#F5A63A"},
			{color: "black", backgroundColor: "#FFD900"},
			{color: "black", backgroundColor: "#958357"},
			{color: "black", backgroundColor: "#605883"},
			{color: "black", backgroundColor: "#2A2CAE"},
		]
	},
	{
		pallet: "Yellow to Purple",
		colors: [
			{color: "black", backgroundColor: "#FFECB3"},
			{color: "black", backgroundColor: "#FAC6A8"},
			{color: "black", backgroundColor: "#F49F9C"},
			{color: "black", backgroundColor: "#E85285"},
			{color: "black", backgroundColor: "#A93790"},
			{color: "black", backgroundColor: "#8A2995"},
			{color: "black", backgroundColor: "#6A1B9A"},
		]
	},
];

const Monitor = (props) => {

	const contentHeight = props.contentHeight;
	
	// Change width
	useEffect(() => {
		setTitle("monitor");
		setFullscreen(true); // Enable fullscreen mode at mounted
		return () => {setFullscreen(false)} // Disable fullscreen mode at unmounted
	}, []);

	// If not admin, redirect initial page
	if(!isAdmin()) {
		return <Navigate to="/log" />;
	}

	// Draw monitor app.
	return (
		<main className="main main--contents" style={contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				<ContentMon stackPallet={chartPallets[1].colors} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<ApiCallMon stackPallet={chartPallets[2].colors} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<WebVitalsMon />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<VisitorMon stackPallet={chartPallets[1].colors} />
			</Suspense>
		</main>
	);
}

Monitor.propTypes = {
	contentHeight: PropTypes.object,
};

export default Monitor;