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

// `<main>` 에 `role="application"` 을 붙이지 않는다.
//
// 그 role 은 보조기술에게 "여기서부터는 문서가 아니라 앱이니 읽기 모드를 끄고
// 모든 키를 넘겨라" 라고 말한다. 스크린리더 사용자는 제목 이동·링크 목록·화살표
// 읽기를 잃는다. 이 화면들이 하는 일은 **글을 보여주는 것**이고, 자체 키보드
// 모델을 구현하지도 않는다 — 넘겨받은 키로 할 일이 없다.
//
// `<main>` 은 그 자체로 main 랜드마크다. 명시 role 이 그것을 덮으면 랜드마크로
// 건너뛰는 길까지 사라진다.
const Log = (props: LogProps) => {

	if(isAdmin()) {
		return (
			<main className="main main--main-contents" style={props.contentHeight}>
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
			<main className="main main--main-contents" style={props.contentHeight}>
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