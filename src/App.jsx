import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as common from './common/common';
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

	const [contentHeight, setContentHeight] = useState();
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	const handleOnresize = (e) => {
		if(undefined !== e) {
			e.preventDefault();
		}
		setContentHeight({
			minHeight: (window.innerHeight - 57 - 80) + "px"
		});
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
		}

		window.addEventListener("online", handleStatusChange);
		window.addEventListener("offline", handleStatusChange);

		return () => {
			window.removeEventListener('online', handleStatusChange);
			window.removeEventListener('offline', handleStatusChange);
		}

	}, [isOnline]);

	const pageNotFound = (
		<main className="main main--main-contents" style={contentHeight}>
			<PageNotFound />
		</main>
	);

	const content = !isOnline ? (
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
	) : (
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

	return (
		<QueryClientProvider client={queryClient}>
			{content}
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}

export default App;
