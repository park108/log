import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as commonMonitor from './Monitor/api';
import { userAgentParser } from './common/common';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById("root");
if (!container) throw new Error("#root 엘리먼트 부재 — 마운트 지점을 찾을 수 없다");
const root = ReactDOM.createRoot(container);
root.render(
	<React.StrictMode>
		<App />
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