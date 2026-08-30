import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './common/ErrorBoundary';
import ErrorFallback from './common/ErrorFallback';
import { reportError } from './common/errorReporter';
import * as commonMonitor from './Monitor/api';
import { userAgentParser } from './common/common';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById("root");
if (!container) throw new Error("#root 엘리먼트 부재 — 마운트 지점을 찾을 수 없다");
const root = ReactDOM.createRoot(container);
// **최상위 경계.** `App` 안의 경계들은 라우트 요소를 감싸므로 그 바깥에서 던진
// 오류 — `App` 자신의 본문, `Navigation`, `Footer`, 라우터 설정 — 는 아무도 잡지
// 않는다. 그때 React 는 트리 전체를 걷어 내고 `#root` 를 비운다. 독자가 보는
// 것은 아무 글자도 없는 흰 화면이다 (실측: 환경변수가 빠진 빌드에서 `#root` 의
// 자식이 0개, `h1`·`nav` 모두 부재).
//
// `index.html` 안에 정적 대체 화면을 두는 방법은 쓰지 않는다 — `createRoot` 가
// 첫 렌더에서 컨테이너를 비우므로 이 경우를 덮지 못하고, 기본 노출로 두면 JS 를
// 실행하지 않는 크롤러가 그 문구를 본문으로 읽는다 (CSP 가 인라인 스크립트를
// 막아 "늦게 보이기" 도 불가). 남는 경우는 **번들 자체가 오지 않는 때**이며,
// 그것은 이 경계로도 덮이지 않는 별개의 표면이다.
root.render(
	<React.StrictMode>
		<ErrorBoundary
			fallback={(p) => <ErrorFallback {...p} />}
			onError={reportError}
		>
			<App />
		</ErrorBoundary>
	</React.StrictMode>
);

function sendToAnalytics(metric: unknown) {

  const body = JSON.stringify(metric);
  const url = commonMonitor.getAPI();

  if(navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(sendToAnalytics);

// Send visitor info to analytics endpoint.
function sendCounter() {

  const body = JSON.stringify(userAgentParser());
  const url = commonMonitor.getAPI() + "/useragent";

  if(navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  }
}

sendCounter();