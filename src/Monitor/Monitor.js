import React, { Suspense, useEffect, lazy } from "react";
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { isAdmin, setFullscreen, setHtmlTitle } from '../common/common';

import './Monitor.css';

const VisitorMon = lazy(() => import('./VisitorMon'));
const ContentMon = lazy(() => import('./ContentMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));
const ApiCallMon = lazy(() => import('./ApiCallMon'));

const chartPallets = [
	{
		pallet: "Red to Green",
		colors: [
			{color: "#B8292B", backgroundColor: "#F8696B"},
			{color: "#BB5534", backgroundColor: "#FB9574"},
			{color: "#BD803C", backgroundColor: "#FDC07C"},
			{color: "#BFAB44", backgroundColor: "#FFEB84"},
			{color: "#9B9C41", backgroundColor: "#CBDC81"},
			{color: "#578D3E", backgroundColor: "#97CD7E"},
			{color: "#237E3B", backgroundColor: "#63BE7B"},
		],
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
	}
];

const Monitor = (props) => {
	
	// Change width
	useEffect(() => {
		setHtmlTitle("monitor");
		setFullscreen(true); // Enable fullscreen mode at mounted
		return () => {setFullscreen(false)} // Disable fullscreen mode at unmounted
	}, []);

	// If not admin, redirect initial page
	if(!isAdmin()) {
		return <Navigate to="/log" />;
	}

	// Draw monitor app.
	return (
		<main className="main main--main-contents" style={props.contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				<ContentMon stackPallet={chartPallets[1].colors} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<ApiCallMon stackPallet={chartPallets[0].colors} />
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