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

// **계측 실패가 제품을 막지 않는다.**
//
// `commonMonitor.getAPI()` 는 계측 주소가 정의돼 있지 않으면 던진다. 그런데
// `sendCounter()` 는 모듈 최상위에서 실행되므로 그 예외가 **부팅 경로 한가운데로**
// 올라온다 — 방문자 수를 세지 못하는 것과 앱이 뜨지 못하는 것은 비교할 일이 아니다.
// `safeStorage` 가 저장소 실패를 "캐시 없음" 으로 흡수하는 것과 같은 원칙이다.
//
// 호출 순서는 바꾸지 않는다 (주소 도출 → `sendBeacon` 유무 확인). 기존 계약
// fixture 가 그 순서를 관측한다 (`index.test.tsx` B1~B4).
const sendBeaconSafely = (deriveUrl: () => string, body: string): void => {
  try {
    const url = deriveUrl();
    if(navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    }
  }
  catch {
    // 계측은 없어도 되는 것이다. 던지면 그때부터 없어도 되는 것이 아니게 된다.
  }
}

function sendToAnalytics(metric: unknown) {

  sendBeaconSafely(() => commonMonitor.getAPI(), JSON.stringify(metric));
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(sendToAnalytics);

// Send visitor info to analytics endpoint.
function sendCounter() {

  sendBeaconSafely(() => commonMonitor.getAPI() + "/useragent", JSON.stringify(userAgentParser()));
}

sendCounter();