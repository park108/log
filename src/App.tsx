import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as common from './common/common';
import { isDev } from './common/env';
import ErrorBoundary from './common/ErrorBoundary';
import ErrorFallback from './common/ErrorFallback';
import Skeleton from './common/Skeleton';
import { reportError } from './common/errorReporter';
import './styles/index.css';

const Navigation = lazy(() => import('./common/Navigation'));
const Log = lazy(() => import('./Log/Log'));
const File = lazy(() => import('./File/File'));
const Monitor = lazy(() => import('./Monitor/Monitor'));
const PageNotFound = lazy(() => import('./common/PageNotFound'));
const Footer = lazy(() => import('./common/Footer'));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 60_000, retry: 1 },
	},
});

const App = () => {

	const [contentHeight, setContentHeight] = useState<React.CSSProperties | undefined>();
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	// 한 번이라도 온라인이었으면 앱 트리를 유지한다 (아래 §오프라인 알림 참조).
	const [hasMountedApp, setHasMountedApp] = useState(navigator.onLine);

	const handleOnresize = (e?: Event) => {
		if(undefined !== e) {
			e.preventDefault();
		}
		// 높이는 CSS 가 정한다 (reset.css: #root flex 컬럼 + utilities.css:
		// .main--main-contents flex:1). 상수 뺄셈은 실제 헤더·푸터 높이와
		// 어긋나 첫 화면 스크롤을 만들었다. 리스너 자체는 다른 축(fullscreen
		// 전환 등)의 재계산 훅으로 남긴다.
		setContentHeight(undefined);
	}

	useEffect(() => {
		const handler = () => handleOnresize();
		window.addEventListener('resize', handler);
		handler(); // 초기 1회 (기존 initial-size useEffect 통합)
		return () => window.removeEventListener('resize', handler);
	}, []);

	useEffect(() => {
		common.auth();
	}, []);

	useEffect(() => {

		const handleStatusChange = () => {
			setIsOnline(navigator.onLine);
			if(navigator.onLine) {
				setHasMountedApp(true);
			}
		}

		window.addEventListener("online", handleStatusChange);
		window.addEventListener("offline", handleStatusChange);

		return () => {
			window.removeEventListener('online', handleStatusChange);
			window.removeEventListener('offline', handleStatusChange);
		}

	}, []);

	const pageNotFound = (
		<main className="main main--main-contents" style={contentHeight}>
			<PageNotFound />
		</main>
	);

	// 오프라인 알림은 앱 트리를 **교체하지 않는다**. 구 구현은 삼항으로 라우터를
	// 통째로 갈아끼워, 네트워크가 한 번 깜빡이면 그 아래의 모든 상태가 언마운트와
	// 함께 사라졌다 — 실측: 글쓰기 화면에 입력한 원고가 offline 이벤트 한 번에
	// 빈 문자열이 됐고 복귀해도 돌아오지 않았다. 대신 알림을 **위에 덮고** 앱은
	// `hidden` 으로 감춘 채 마운트를 유지한다 (`hidden` 은 접근성 트리에서도
	// 제외되므로 보조기술에 이중 노출되지 않는다).
	//
	// 다만 **찬 시작**(처음부터 오프라인)에서는 앱을 마운트하지 않는다. 마운트하면
	// 곧바로 실패할 fetch 가 나가고 그 실패 알림이 복귀 시점에 쌓여 보인다.
	// 구 동작(오프라인 화면만 보여주고, 온라인이 되면 새로 마운트)이 이 경우엔 맞다.
	const offlineNotice = (
		<div className="div div--offline-contents">
			<nav className="nav nav--nav-bar">
				<ul className="ul ul--nav-tabs">
					<li className="li li--nav-title">
						<a href={common.getUrl()}>park108.net</a>
					</li>
				</ul>
			</nav>
			<main className="main main--main-contents" style={contentHeight}>
				<p className="p p--offline-message">
					You are offline now.
				</p>
				<p className="p p--offline-message">
					Please check your network connection.
				</p>
			</main>
		</div>
	);

	const app = (
		<BrowserRouter>
			<Suspense fallback={<Skeleton variant="page" />}>
				<Navigation />
				<Routes>
					<Route path="/" element={<Navigate replace to="/log"/>} />
					<Route path="/log/*" element={
						<ErrorBoundary
							fallback={(p) => <ErrorFallback {...p} />}
							onError={reportError}
						>
							<Log contentHeight={contentHeight} />
						</ErrorBoundary>
					} />
					<Route path="/file" element={
						<ErrorBoundary
							fallback={(p) => <ErrorFallback {...p} />}
							onError={reportError}
						>
							<File contentHeight={contentHeight} />
						</ErrorBoundary>
					} />
					<Route path="/monitor" element={
						<ErrorBoundary
							fallback={(p) => <ErrorFallback {...p} />}
							onError={reportError}
						>
							<Monitor contentHeight={contentHeight} />
						</ErrorBoundary>
					} />
					<Route path="*" element={pageNotFound} />
				</Routes>
				<Footer />
			</Suspense>
		</BrowserRouter>
	);

	const content = (
		<>
			{ !isOnline && offlineNotice }
			{ hasMountedApp && (
				<div className="div div--app-shell" hidden={!isOnline}>
					{app}
				</div>
			) }
		</>
	);

	return (
		<QueryClientProvider client={queryClient}>
			{content}
			{isDev() && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}

export default App;
