import React, { Suspense, lazy } from "react";
import { Redirect } from 'react-router-dom';
import { isAdmin } from '../common';

import './Monitor.css';

const ApiMon = lazy(() => import('./ApiMon'));
const VisitorMon = lazy(() => import('./VisitorMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));

const Monitor = (props) => {

	if(!isAdmin()) {
		return <Redirect to="/log" />;
	}

	return <div className="div div--main-contents">
		<Suspense fallback={<div></div>}>
			<VisitorMon />
		</Suspense>
		<Suspense fallback={<div></div>}>
			<WebVitalsMon />
		</Suspense>
		<Suspense fallback={<div></div>}>
			<ApiMon />
		</Suspense>
	</div>
}

export default Monitor;