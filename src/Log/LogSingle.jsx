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

	const [logItem, setLogItem] = useState();
	const [toListButton, setToListButton] = useState();

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

	useEffect(() => {
		if(isLoading) {
			setIsShowToasterCenter(1);
			setToListButton("");
		}
		else {
			setIsShowToasterCenter(2);

			const isSearchResult = queryString.get("search");

			if(isSearchResult) {
				setToListButton(
					<button className="button button--loglist-seemore" onClick={() => navigate(-1)}>
						To search result
					</button>
				);
			}
			else {
				setToListButton(
					<button className="button button--loglist-seemore" onClick={() => navigate("/log")}>
						To list
					</button>
				);
			}
		}
	}, [isLoading]);

	useEffect(() => {
		if("DELETED" === itemLoadingStatus) {
			setLogItem(
				<h1 className="h1 h1--notification-result">
					Deleted
				</h1>
			);
			return;
		}

		if (hasError || notFound) {
			setLogItem(<PageNotFound />);
		}
		else if (found && latestData) {
			setLogItem(
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
			setLogItem("");
		}

	}, [itemLoadingStatus, hasError, notFound, found, latestData]);

	return (
		<div role="list">

			{ logItem }
			{ toListButton }

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
