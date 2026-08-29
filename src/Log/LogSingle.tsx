import React, { useEffect, useState, Suspense, lazy } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { hasValue, setHtmlTitle, getFormattedDate, setMetaDescription } from '../common/common';
import { useLog } from './hooks/useLog';
import * as parser from '../common/markdownParser';
import PageNotFound from "../common/PageNotFound";
import Skeleton from "../common/Skeleton";
import type { ToasterShow } from "../Toaster/Toaster";

const LogItem = lazy(() => import('./LogItem'));
const Toaster = lazy(() => import('../Toaster/Toaster'));

const SUMMARY_LENGTH = 100;
const PAGE_NOT_FOUND = "Page not found";

const LogSingle = () => {

	const [itemLoadingStatus, setItemLoadingStatus] = useState("NOW_LOADING"); // DELETED 전이용 최소 유지

	const [isShowToasterCenter, setIsShowToasterCenter] = useState<ToasterShow>(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [isShowToasterBottom, setIsShowToasterBottom] = useState<ToasterShow>(0);

	const navigate = useNavigate();
	const queryString = new URLSearchParams(useLocation().search);
	const logTimestamp = useParams()["timestamp"];

	const { isLoading, isError, data: queryData, refetch } = useLog(logTimestamp);

	// `queryData` shape: `{ body: { Count, Items: [...] }, errorType? }` (useLog queryFn → res.json()).
	const hasErrorType = queryData && hasValue(queryData.errorType);
	const hasError = isError || hasErrorType;
	const found = !hasError && queryData?.body?.Count > 0;
	const notFound = !hasError && queryData?.body?.Count === 0;
	const latestData = found ? queryData.body.Items[0] : undefined;
	const isSearchResult = queryString.get("search");

	useEffect(() => {
		return () => { setMetaDescription(); }
	}, []);

	useEffect(() => {
		if (!latestData) return;
		const contents = latestData.logs[0].contents;
		const hasTitle = contents.indexOf("# ") === 0;
		const contentsStartIndex = hasTitle ? contents.indexOf("\n") : 0;
		const logTitle = hasTitle
			? contents.substr(2, contentsStartIndex - 1)
			: "log of " + getFormattedDate(Number(logTimestamp), "date mon year");
		setHtmlTitle(logTitle);

		const contentsWithoutTitle = contents.substr(contentsStartIndex);
		const parsedContents = parser.markdownToHtml(contentsWithoutTitle).replace(/<[^>]*>?/gm, '');
		const summary = parsedContents.substr(0, SUMMARY_LENGTH);
		const contentsLength = parsedContents.length;
		const ellipsis = contentsLength > SUMMARY_LENGTH ? "..." : "";
		setMetaDescription(summary + ellipsis);
	}, [latestData, logTimestamp]);

	useEffect(() => {
		if (hasError || notFound) {
			setHtmlTitle(PAGE_NOT_FOUND);
			setMetaDescription(PAGE_NOT_FOUND);
		}
	}, [hasError, notFound]);

	// Toaster center show-state: preserved from prior useEffect([isLoading]).
	// JSX-in-state 제거 (REQ-20260419-024 FR-02) 후에도 Toaster show prop 전이는 유지.
	useEffect(() => {
		setIsShowToasterCenter(isLoading ? 1 : 2);
	}, [isLoading]);

	// REQ-20260419-024 FR-01: logItem 파생 변수 (4 분기 — spec §3.2 선호 순 2).
	let logItem;
	if (itemLoadingStatus === "DELETED") {
		logItem = (
			<h1 className="h1 h1--notification-result">
				Deleted
			</h1>
		);
	}
	// 조회 실패와 "글 없음" 은 서로 다른 사실이다. 둘을 한 갈래로 묶어 두면
	// 네트워크 실패가 "이 글은 존재하지 않는다" 로 표시돼 사용자는 링크가 죽은
	// 것으로 판단하고 재시도하지 않는다. 목록 화면(LogList)은 같은 상황에서
	// 재시도를 주는데 단건 화면만 이 표면이 없었다.
	else if (hasError) {
		logItem = (
			<section className="section section--message-box">
				<h2 className="h2 h2--message-error">
					Whoops, something went wrong on our end.
				</h2>
				<hr />
				<div className="div div--message-description">
					Try refreshing the page, or click Retry button.
				</div>
				<button
					className="btn btn--ghost btn--sm"
					data-testid="log-single-retry-button"
					onClick={() => refetch()}
				>
					Retry
				</button>
			</section>
		);
	}
	else if (notFound) {
		logItem = <PageNotFound />;
	}
	else if (found && latestData) {
		logItem = (
			<Suspense fallback={<Skeleton variant="detail" />}>
				<LogItem
					author={latestData.author}
					timestamp={latestData.timestamp}
					contents={latestData.logs[0].contents}
					item = {latestData}
					temporary = {latestData.temporary}
					showComments={true}
					showLink={true}
					deleted={() => {
						setToasterMessage("The log is deleted.");
						setIsShowToasterBottom(1);
					}}
				/>
			</Suspense>
		);
	}
	else {
		logItem = "";
	}

	return (
		<div role="list">

			{ logItem }

			{/* REQ-20260419-024 FR-02: toListButton 인라인 조건부 (spec §3.2 선호 순 1, Search.jsx 1250e42 선례). */}
			{!isLoading && (
				isSearchResult
					? (
						<button className="btn btn--secondary btn--block" onClick={() => navigate(-1)}>
							To search result
						</button>
					)
					: (
						<button className="btn btn--secondary btn--block" onClick={() => navigate("/log")}>
							To list
						</button>
					)
			)}

			<Suspense fallback={<Skeleton variant="detail" />}>
				<Toaster
					show={isShowToasterCenter}
					message="Loading a log..."
				/>
				<Toaster
					show={ isShowToasterBottom }
					message={ toasterMessage }
					position="bottom"
					type="success"
					duration={ 2000 }
					completed={() => {
						setIsShowToasterBottom(2);
						setItemLoadingStatus("DELETED");
					}}
				/>
			</Suspense>

		</div>
	);
}


export default LogSingle;
