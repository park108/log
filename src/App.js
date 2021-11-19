import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import * as common from './common';
import './App.css';

const Navigation = lazy(() => import('./Navigation'));
const Log = lazy(() => import('./Log/Log'));
const File = lazy(() => import('./File/File'));
const Monitor = lazy(() => import('./Monitor/Monitor'));
const PageNotFound = lazy(() => import('./PageNotFound'));
const Footer = lazy(() => import('./Footer'));
  
const App = () => {

	const [contentHeight, setContentHeight] = useState();

	const handleOnresize = (e) => {
		if(undefined !== e) {
			e.preventDefault();
		}
		setContentHeight({
			minHeight: (window.innerHeight - 57 - 80) + "px"
		});
	}

	useEffect(() => handleOnresize(), []);
	window.onresize = handleOnresize;

	common.auth();

	if("/" === window.location.pathname) {
		window.location.href = "/log";
	}

	const NoMatch = () => (
		<div className="div div--main-contents" style={contentHeight}>
			<PageNotFound />
		</div>
	);

	return (
		<Router>
			<Suspense fallback={<div></div>}>
				<Navigation />
				<Switch>
					<Route path="/log">
						<Log contentHeight={contentHeight} />
					</Route>
					<Route path="/file">
						 <File contentHeight={contentHeight} />
					</Route>
					<Route path="/monitor">
						<Monitor contentHeight={contentHeight} />
					</Route>
					<Route component={NoMatch} />
				</Switch>
				<Footer />
			</Suspense>
		</Router>
	)
}

export default App;
