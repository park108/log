import React from 'react';
import ReactDOM from 'react-dom';
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

// Send visitor info to analytics endpoint.
function sendCounter() {

  let uaText = navigator.userAgent;

  // Parser reference: https://developer.mozilla.org/ko/docs/Web/HTTP/Browser_detection_using_the_user_agent
  // Browser
  let browser = uaText.indexOf("Firefox/") > -1? "Firefox"
    : uaText.indexOf("Seamonkey/") > -1 ? "Seamonkey"
    : uaText.indexOf("Chrome/") > -1 ? "Chrome"
    : uaText.indexOf("Chromium/") > -1 ? "Chromium"
    : uaText.indexOf("Safari/") > -1 ? "Safari"
    : uaText.indexOf("OPR/") > -1 ? "Opera"
    : uaText.indexOf("Opera/") > -1 ? "Opera"
    : uaText.indexOf("; MSIE ") > -1 ? "Internet Explorer"
    : "Others";


  // Rendering engine
  let renderingEngine = uaText.indexOf("Gecko/") > -1 ? "Gecko"
    : uaText.indexOf("AppleWebKit/") > -1 ? "Webkit"
    : uaText.indexOf("Opera/") > -1 ? "Presto"
    : uaText.indexOf("Trident/") > -1 ? "Trident"
    : uaText.indexOf("Chrome/") > -1 ? "Blink"
    : "Others";

  // Operating system
  let operatingSystem = uaText.indexOf("Android") > -1? "Android"
    : uaText.indexOf("iPhone OS") > -1 ? "iOS"
    : uaText.indexOf("Windows") > -1 ? "Windows"
    : uaText.indexOf("Mac OS X") > -1 ? "Mac OS X"
    : uaText.indexOf("(X11; CrOS") > -1 ? "Chrome OS"
    : uaText.indexOf("X11") > -1 ? "Linux"
    : uaText.indexOf("Symbian") > -1 ? "Symbian"
    : "Others";

  // Make posting data
  const userAgentInfo = {
    originalText: uaText,
    browser: browser,
    renderingEngine: renderingEngine,
    operatingSystem: operatingSystem
  }

  log(userAgentInfo);

  const url = commonMonitor.getAPI() + "/useragent";
  const body = JSON.stringify(userAgentInfo);

  if(navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  }

}

sendCounter();