import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
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
	const [isOnline, setIsOnline] = useState(navigator.onLine);

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

	// Change status by network connection
	useEffect(() => {

		const handleStatusChange = () => {
			setIsOnline(navigator.onLine);
		}

		window.addEventListener("online", handleStatusChange);
		window.addEventListener("offline", handleStatusChange);

		return () => {
			window.removeEventListener('online', handleStatusChange);
			window.removeEventListener('offline', handleStatusChange);
		}

	}, [isOnline]);

	window.onresize = handleOnresize;
	window.onbeforeunload = handleReload;
	common.auth();

	const pageNotFound = (
		<div className="div div--main-contents" style={contentHeight}>
			<PageNotFound />
		</div>
	);

	if(!isOnline) {
		return (
			<nav className="nav nav--nav-bar">
				<ul className="ul ul--nav-tabs">
					<li className="li li--nav-title">
						<a href={common.getUrl()}>park108.net</a>
					</li>
				</ul>
				<div className="div div--main-contents" style={contentHeight}>
					<p className="p">
						You are offline now.
					</p>
					<p className="p">
						Please check your network connection.
					</p>
				</div>
			</nav>
		)
	}
	else {
		return (
			<BrowserRouter>
				<Suspense fallback={<div></div>}>
					<Navigation />
					<Routes>
						<Route path="/" element={<Navigate replace to="/log"/>} />
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
}

export default App;
