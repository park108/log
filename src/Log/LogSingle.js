import React, { useEffect, useState, Suspense, lazy } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import PropTypes from 'prop-types';
import { log, hasValue, setHtmlTitle, getFormattedDate, setMetaDescription } from '../common/common';
import { getLog } from './api';
import * as parser from '../common/markdownParser';
import PageNotFound from "../common/PageNotFound";

const LogItem = lazy(() => import('./LogItem'));
const Toaster = lazy(() => import('../Toaster/Toaster'));

const PAGE_NOT_FOUND = "Page not found";

const getQueryStringSearch = () => {
	const query = new URLSearchParams(useLocation().search);
	const result = query.get("search");
	return result;
}

const LogSingle = (props) => {

	const [isLoading, setIsLoading] = useState(false);
	const [itemLoadingStatus, setItemLoadingStatus] = useState("NOW_LOADING");

	const [data, setData] = useState({});

	const [isShowToasterCenter, setIsShowToasterCenter] = useState(0);
	const [toasterMessageCenter, setToasterMessageCenter] = useState("");
	const [isShowToasterBottom, setIsShowToasterBottom] = useState(0);
	const [toasterMessageBottom, setToasterMessageBottom] = useState("");

	const logTimestamp = useParams()["timestamp"];

	useEffect(() => {

		const fetchData = async (timestamp) => {

			setIsLoading(true);

			try {
				const res = await getLog(timestamp);
				const fetchedData = await res.json();
				
				if(!hasValue(fetchedData.errorType)) {

					log("[API GET] OK - Log", "SUCCESS");

					if(fetchedData.body.Count > 0) {

						const latestData = fetchedData.body.Items[0];
						setData(latestData);
						
						const contents = latestData.logs[0].contents;
						const hasTitle = contents.indexOf("# ") === 0;
						const contentsStartIndex = hasTitle ? contents.indexOf("\n") : 0;
						const logTitle = hasTitle
							? contents.substr(2, contentsStartIndex - 1)
							: "log of " + getFormattedDate(logTimestamp * 1, "date mon year");
						setHtmlTitle(logTitle);
		
						const SUMMARY_LENGTH = 100;
						const contentsWithoutTitle = contents.substr(contentsStartIndex);
						const parsedContents = parser.markdownToHtml(contentsWithoutTitle).replace(/<[^>]*>?/gm, '');
						const summary = parsedContents.substr(0, SUMMARY_LENGTH);
						const contentsLength = parsedContents.length;
						const ellipsis = contentsLength > SUMMARY_LENGTH ? "..." : "";
						setMetaDescription(summary + ellipsis);

						setItemLoadingStatus("FOUND");
					}
					else {
						setItemLoadingStatus("NOT_FOUND");
						setHtmlTitle(PAGE_NOT_FOUND);
						setMetaDescription(PAGE_NOT_FOUND);
					}
				}
				else {
					log("[API GET] FAILED - Log", "ERROR");
					console.error(fetchedData);

					setItemLoadingStatus("NOT_FOUND");
					setHtmlTitle(PAGE_NOT_FOUND);
					setMetaDescription(PAGE_NOT_FOUND);
				}
			}
			catch(err) {
				log("[API GET] NETWORK ERROR - Log", "ERROR");
				log(err, "ERROR");

				setItemLoadingStatus("NOT_FOUND");
				setHtmlTitle(PAGE_NOT_FOUND);
				setMetaDescription(PAGE_NOT_FOUND);
			}
		
			setIsLoading(false);
		}

		fetchData(logTimestamp);
		
	}, [props.isPostSuccess, logTimestamp]);

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setToasterMessageCenter("Loading a log...");
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	// Cleanup
	useEffect(() => {
		return () => {
			setIsLoading(false);
			setMetaDescription();
		}
	}, []);

	// Callback delete item from LogItem
	const navigate = useNavigate();

	const afterDelete = () => {
		setToasterMessageBottom("The log deleted.");
		setIsShowToasterBottom(1);
	}
	
	const completed = () => {
		setIsShowToasterBottom(2);
		navigate("/log");
	}
	
	// Draw log item
	const logItem = ("FOUND" === itemLoadingStatus)
		? <LogItem
			author={data.author}
			timestamp={data.timestamp}
			contents={data.logs[0].contents}
			item = {data}
			temporary = {data.temporary}
			showComments={true}
			showLink={true}
			deleted={afterDelete}
		/>
		: ("NOT_FOUND" === itemLoadingStatus) ? <PageNotFound />
		: "";

	// To list button
	const toListButton = !isLoading ? (
		getQueryStringSearch() ? (
			<button className="button button--loglist-seemore" onClick={() => navigate(-1)}>
				To search result
			</button>
		) : (
			<button className="button button--loglist-seemore" onClick={() => navigate("/log")}>
				To list
			</button>
		)
	) : "";

	// Draw a single log
	return (
		<div role="list">
			<Suspense fallback={<div></div>}>
				{logItem}
			</Suspense>
			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToasterCenter}
					message={toasterMessageCenter}				
					completed={() => setIsShowToasterCenter(2)}
				/>
				<Toaster 
					show={isShowToasterBottom}
					message={toasterMessageBottom}
					position={"bottom"}
					type={"success"}
					duration={2000}
					completed={completed}
				/>
			</Suspense>

			{toListButton}
			
		</div>
	);
}

LogSingle.propTypes = {
	isPostSuccess: PropTypes.bool,
};

export default LogSingle;