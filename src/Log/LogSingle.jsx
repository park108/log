import React, { useEffect, useState, Suspense, lazy } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import PropTypes from 'prop-types';
import { hasValue, setHtmlTitle, getFormattedDate, setMetaDescription } from '../common/common';
import { useLog } from './hooks/useLog';
import * as parser from '../common/markdownParser';
import PageNotFound from "../common/PageNotFound";

const LogItem = lazy(() => import('./LogItem'));
const Toaster = lazy(() => import('../Toaster/Toaster'));

const SUMMARY_LENGTH = 100;
const PAGE_NOT_FOUND = "Page not found";

const LogSingle = () => {

	const [itemLoadingStatus, setItemLoadingStatus] = useState("NOW_LOADING"); // DELETED 전이용 최소 유지

	const [isShowToasterCenter, setIsShowToasterCenter] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [isShowToasterBottom, setIsShowToasterBottom] = useState(0);

	const navigate = useNavigate();
	const queryString = new URLSearchParams(useLocation().search);
	const logTimestamp = useParams()["timestamp"];

	const { isLoading, isError, data: queryData } = useLog(logTimestamp);

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
			: "log of " + getFormattedDate(logTimestamp * 1, "date mon year");
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
	else if (hasError || notFound) {
		logItem = <PageNotFound />;
	}
	else if (found && latestData) {
		logItem = (
			<Suspense fallback={<div></div>}>
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
						<button className="button button--loglist-seemore" onClick={() => navigate(-1)}>
							To search result
						</button>
					)
					: (
						<button className="button button--loglist-seemore" onClick={() => navigate("/log")}>
							To list
						</button>
					)
			)}

			<Suspense fallback={<div></div>}>
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

LogSingle.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogSingle;
