import React, { Suspense, lazy } from "react";
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { isAdmin } from '../common/common';

import './Log.css';

const LogList = lazy(() => import('./LogList'));
const Search = lazy(() => import('../Search/Search'));
const LogSingle = lazy(() => import('./LogSingle'));
const Writer = lazy(() => import('./Writer'));

interface LogProps {
	contentHeight?: React.CSSProperties;
}

const Log = (props: LogProps) => {

	const location = useLocation();

	if(isAdmin()) {
		return (
			<main className="main main--main-contents" style={props.contentHeight} role="application">
				<Link to="/log/write" state={{ from: location.pathname }}>
					<button data-testid="newlog-button" role="button" className="button button--log-newlog">+</button>
				</Link>
				<Suspense fallback={<div></div>}>
					<Routes>
						<Route path="/" element={<LogList />} />
						<Route path="/search" element={<Search />} />
						<Route path="/write" element={<Writer />} />
						<Route path="/:timestamp" element={<LogSingle />} />
					</Routes>
				</Suspense>
			</main>
		);
	}
	else {
		return (
			<main className="main main--main-contents" style={props.contentHeight} role="application">
				<Suspense fallback={<div></div>}>
					<Routes>
						<Route path="/" element={<LogList />} />
						<Route path="/search" element={<Search />} />
						<Route path="/:timestamp" element={<LogSingle />} />
					</Routes>
				</Suspense>
			</main>
		);
	}
}

export default Log;