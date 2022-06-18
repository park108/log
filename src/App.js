import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import * as common from './common/common';
import './App.css';

const Navigation = lazy(() => import('./common/Navigation'));
const Log = lazy(() => import('./Log/Log'));
const File = lazy(() => import('./File/File'));
const Monitor = lazy(() => import('./Monitor/Monitor'));
const PageNotFound = lazy(() => import('./common/PageNotFound'));
const Footer = lazy(() => import('./common/Footer'));
  
const App = () => {

	const [contentHeight, setContentHeight] = useState();

	// Set content height for footer space
	const handleOnresize = (e) => {
		if(undefined !== e) {
			e.preventDefault();
		}
		setContentHeight({
			minHeight: (window.innerHeight - 57 - 80) + "px"
		});
	}

	// Set reload event handler
	const handleReload = (e) => {
		e.preventDefault();
		sessionStorage.clear(); // Clear sessionStorage
	}

	// Set resized height at mount
	useEffect(() => {
		handleOnresize();
	}, []);

	window.onresize = handleOnresize;
	window.onbeforeunload = handleReload;
	common.auth();

	const pageNotFound = (
		<div className="div div--main-contents" style={contentHeight}>
			<PageNotFound />
		</div>
	);

	// Redirect default app "log"
	if("/" === window.location.pathname) {
		window.location.href = "/log";
	}

	return (
		<BrowserRouter>
			<Suspense fallback={<div></div>}>
				<Navigation />
				<Routes>
					<Route path="/log/*" element={<Log contentHeight={contentHeight} />} />
					<Route path="/file" element={<File contentHeight={contentHeight} />} />
					<Route path="/monitor" element={<Monitor contentHeight={contentHeight} />} />
					<Route path="*" element={pageNotFound} />
				</Routes>
				<Footer />
			</Suspense>
		</BrowserRouter>
	)
}

export default App;
