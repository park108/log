import React, { Suspense, lazy } from "react";
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

	common.auth();

	if("/" === window.location.pathname) {
		window.location.href = "/log";
	}

	const NoMatch = () => (
		<div className="div div--main-contents">
			<PageNotFound/>
		</div>
	);

	return (
		<Router>
			<Suspense fallback={<div></div>}>
				<Navigation />
				<Switch>
					<Route path="/log" component={Log} />
					<Route path="/file" component={File} />
					<Route path="/monitor" component={Monitor} />
					<Route component={NoMatch} />
				</Switch>
				<Footer />
			</Suspense>
		</Router>
	)
}

export default App;
