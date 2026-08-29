import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { log, getFormattedDate, hasValue, setHtmlTitle } from '../common/common';
import { reportError } from '../common/errorReporter';
import { useSearchList } from './hooks/useSearchList';

import styles from './Search.module.css';

// 질의어 하이라이트.
//
// 이전 구현은 `contents.split(queryString)` 이었다. 두 가지가 조용히 어긋났다.
// (1) 대소문자 — `github` 로 검색하면 본문의 `Github` 를 못 잡아 결과는 나오는데
//     강조가 하나도 안 뜬다. (2) 원문 보존 — 매치 자리에 본문이 아니라 질의어를
//     그려 넣어 원래 표기가 사라진다.
//
// 정규식으로 바꾸되 **메타문자 이스케이프가 필수**다. 이스케이프 없이
// `new RegExp(queryString)` 을 만들면 `(` 하나만 검색해도 예외로 화면이 죽는다.
// split 은 리터럴이라 그 위험이 없었으므로, 이 교체가 새 위험을 들여온다.
// 결과 요약 문구. 두 분기(0건 / N건)가 서로 다른 규칙을 쓰고 있었다 —
// 성공 분기는 `result{s}` 로 복수를 처리하는데 0건 분기는 "0 result" 로
// 고정이었고, 처리 시간은 양쪽 다 "1 milliseconds" 를 냈다. 한 곳에서 만든다.
const plural = (n: number, word: string): string =>
	// 천 단위 구분은 유지한다 — 처리 시간이 네 자리를 넘는 경우가 있다.
	n.toLocaleString() + " " + word + (1 === n ? "" : "s");

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const highlightKeyword = (
	contents: string,
	queryString: string,
	keywordClassName: string,
): React.ReactNode => {

	// 빈 질의어로 split 하면 글자마다 조각이 생긴다.
	if(!hasValue(queryString)) return contents;

	const parts = contents.split(new RegExp("(" + escapeRegExp(queryString) + ")", "gi"));
	const needle = queryString.toLowerCase();

	return parts.map((part, index) => (
		part.toLowerCase() === needle && "" !== part
			? <span key={index} className={keywordClassName}>{part}</span>
			: <span key={index}>{part}</span>
	));
};

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
		// `location.state` 를 deps 에 둔다 — 검색 결과 페이지에서 재검색하면 SearchInput 이
		// 같은 경로로 새 state 를 실어 navigate 하므로, 마운트 1회로는 질의가 갱신되지 않는다.
	}, [location.state]);

	useEffect(() => {
		setHtmlTitle("search results for " + queryString);
	}, [queryString]);

	const { data, isLoading, isError, error, refetch } = useSearchList(queryString, {
		enabled: queryString.length > 0,
	}) as {
		data: SearchListResponse | undefined;
		isLoading: boolean;
		isError: boolean;
		error: Error | null;
		refetch: () => void;
	};

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
		<button className="btn btn--secondary btn--block" onClick={() => {

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
	// 조회 실패는 "결과 0건" 과 구별되어야 한다. 이 분기가 없던 동안 네트워크
	// 실패와 서버 errorType 응답이 모두 "No search results." 로 표시돼, 사용자는
	// 요청이 실패한 것을 검색어가 없는 것으로 읽었다. 실패는 내부적으로 관측되고
	// 있었으나(reportError) 화면에는 도달하지 않았다.
	else if(isError || hasValue(data?.errorType)) {

		return (
			<section className="section section--log-list" role="list">
				<h1 className="h1 h1--notification-result">
					{ isError ? "Search failed for network issue." : "Search failed." }
				</h1>
				<button
					className="btn btn--secondary btn--block"
					data-testid="search-retry-button"
					onClick={() => refetch()}
				>
					Retry
				</button>
				{ toListButton }
			</section>
		);
	}
	else if(0 === totalCount) {

		return (
			<section className="section section--log-list" role="list">
				<div className={`div ${styles.divSearchResult}`}>
					{ plural(0, "result") } for &quot;<span className={`span ${styles.spanSearchQuerystring}`}>{ queryString }</span>&quot;
					- { plural(processingTime, "millisecond") }
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
					{ plural(totalCount, "result") } for &quot;<span className={`span ${styles.spanSearchQuerystring}`}>{ queryString }</span>&quot;
					- { plural(processingTime, "millisecond") }
				</div>

				{searchedList.map((data: SearchItem) => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{
							pathname: "/log/" + data.timestamp,
							search: "search=true"
						}}>
							<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
							<div className="div--loglist-contents">{
								highlightKeyword(data.contents, queryString, `span ${styles.spanSearchKeyword}`)
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
