import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { log, getFormattedDate, hasValue, setHtmlTitle } from '../common/common';
import { reportError } from '../common/errorReporter';
import { useSearchList } from './hooks/useSearchList';

import styles from './Search.module.css';

interface SearchItem {
	timestamp: number;
	contents: string;
	author: string;
}

interface SearchListBody {
	QueryString?: string;
	TotalCount?: number;
	ProcessingTime?: number;
	Items?: SearchItem[];
}

interface SearchListResponse {
	errorType?: string;
	body?: SearchListBody;
}

interface SearchLocationState {
	queryString: string;
}

const Search = (): React.ReactElement => {

	const [queryString, setQueryString] = useState<string>("");
	const [loadingDots, setLoadingDots] = useState<string>("");

	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if(hasValue(location.state)) {
			setQueryString((location.state as SearchLocationState).queryString);
		}
	}, []);

	useEffect(() => {
		setHtmlTitle("search results for " + queryString);
	}, [queryString]);

	const { data, isLoading, isError, error } = useSearchList(queryString, {
		enabled: queryString.length > 0,
	}) as { data: SearchListResponse | undefined; isLoading: boolean; isError: boolean; error: Error | null };

	const body = data?.body;
	const searchedList: SearchItem[] = body?.Items ?? [];
	const totalCount = (body?.TotalCount ?? 0) * 1;
	const processingTime = (body?.ProcessingTime ?? 0) * 1;

	// Preserve NFR-05 log contracts: log success/failure side-effects when
	// query state transitions. Avoids deprecated TanStack Query v5 onSuccess/onError
	// by aggregating side-effects in an effect bound to fetchStatus / isError.
	useEffect(() => {
		if (!data) return;
		if (hasValue(data?.errorType)) {
			log("[API GET] FAILED - Search List", "ERROR");
			reportError(data);
		} else {
			log("[API GET] OK - Search List", "SUCCESS");
		}
	}, [data]);

	useEffect(() => {
		if (!isError) return;
		log("[API GET] FAILED - Search List", "ERROR");
		reportError(error);
	}, [isError, error]);

	useEffect(() => {
		if (!isLoading) {
			setLoadingDots("");
			return;
		}
		const id = setInterval(
			() => setLoadingDots((prev: string) => prev.length >= 3 ? "" : prev + "."),
			300
		);
		return () => clearInterval(id);
	}, [isLoading]);

	const toListButton = (
		<button className="button button--loglist-seemore" onClick={() => {

			const searchInput1 = document.getElementById("query-string-by-enter") as HTMLInputElement | null;
			const searchInput2 = document.getElementById("query-string-by-button") as HTMLInputElement | null;

			if(hasValue(searchInput1)) {
				(searchInput1 as HTMLInputElement).value = "";
			}

			if(hasValue(searchInput2)) {
				(searchInput2 as HTMLInputElement).value = "";
			}

			navigate("/log");
		}}>
			To list
		</button>
	);

	if(isLoading) {

		return (
			<h1 className="h1 h1--notification-result">
				Searching &quot;{ queryString }&quot; in logs<span id="loading">{ loadingDots }</span>
			</h1>
		);
	}
	else if(0 === totalCount) {

		return (
			<section className="section section--log-list" role="list">
				<div className={`div ${styles.divSearchResult}`}>
					0 result for &quot;{ queryString }&quot;
					- { processingTime.toLocaleString() + " milliseconds" }
				</div>
				<h1 className="h1 h1--notification-result">
					No search results.
				</h1>
				{ toListButton }
			</section>
		);
	}
	else {

		return (
			<section className="section section--log-list" role="list">
				<div className={`div ${styles.divSearchResult}`}>
					{ totalCount } result{ totalCount > 1 ? "s" : "" } for &quot;<span className={`span ${styles.spanSearchQuerystring}`}>{ queryString }</span>&quot;
					- { processingTime.toLocaleString() + " milliseconds" }
				</div>

				{searchedList.map((data: SearchItem) => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{
							pathname: "/log/" + data.timestamp,
							search: "search=true"
						}}>
							<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
							<div className="div--loglist-contents">{
								data.contents.split(queryString).map((parsed: string, index: number, arr: string[]) => (
									<span key={index}>
										{parsed}
										{ index == arr.length - 1
											? ""
											: <span className={`span ${styles.spanSearchKeyword}`}>{queryString}</span>
										}
									</span>
								))
							}</div>
						</Link>
					</div>
				))}

				{ toListButton }

			</section>
		);
	}
}

export default Search;
