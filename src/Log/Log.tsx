import React, { Suspense, lazy } from "react";
import { Routes, Route, Link } from 'react-router-dom';
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

	if(isAdmin()) {
		return (
			<main className="main main--main-contents" style={props.contentHeight} role="application">
				{/* `<a>` 안에 `<button>` 을 넣으면 인터랙티브 요소 중첩이라 유효하지 않은
				    HTML 이고 보조기술에서 동작이 예측 불가다. 링크 하나로 합친다 —
				    이 요소가 하는 일은 실제로 이동이므로 role 도 link 가 맞다.
				    글리프 `+` 는 이름이 되지 못하므로 aria-label 로 이름을 준다. */}
				<Link
					to="/log/write"
					data-testid="newlog-button"
					className="btn btn--primary btn--fab button--log-newlog"
					aria-label="Write a new log"
					title="Write a new log"
				>
					<span aria-hidden="true">+</span>
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