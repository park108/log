import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as commonMonitor from './Monitor/commonMonitor';
import { log } from './common';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

function sendToAnalytics(metric) {

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

function sendCounter() {
  log(navigator.userAgent);
}

sendCounter();