import React, { useEffect, useState, Suspense, lazy } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { hasValue, setHtmlTitle, getFormattedDate, setMetaDescription, truncateByGrapheme } from '../common/common';
import { useLog } from './hooks/useLog';
import { trimmedContents } from './api';
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
	const routeLocation = useLocation();
	const queryString = new URLSearchParams(routeLocation.search);
	const logTimestamp = useParams()["timestamp"];

	const { isLoading, isError, data: queryData, refetch } = useLog(logTimestamp);

	// `queryData` shape: `{ body: { Count, Items: [...] }, errorType? }` (useLog queryFn → res.json()).
	const hasErrorType = queryData && hasValue(queryData.errorType);
	const hasError = isError || hasErrorType;
	const found = !hasError && queryData?.body?.Count > 0;
	const notFound = !hasError && queryData?.body?.Count === 0;
	const latestData = found ? queryData.body.Items[0] : undefined;
	// **"검색 결과로" 는 검색 결과에서 왔을 때만 맞다.**
	//
	// 이 버튼은 `?search=true` 만 보고 `navigate(-1)` 했다. 그 주소는 공유되고
	// 북마크된다 — 새 탭에서 그 링크를 열면 뒤로 갈 곳이 없어 버튼이 아무 일도
	// 하지 않고, 다른 사이트에서 눌러 들어왔다면 그 사이트로 나가 버린다.
	// 어느 쪽이든 버튼의 이름이 거짓이 된다.
	//
	// 앱 안에서 이동해 온 경우에만 뒤로 갈 곳이 있다. react-router 는 최초 진입
	// 위치에 `key: "default"` 를 준다 — 그것이 "이 화면이 우리 이동의 결과가
	// 아니다" 라는 신호다 (실측: 새 탭 `key=default`, 검색에서 이동 `key=yli79imq`).
	const cameFromSearch = Boolean(queryString.get("search")) && "default" !== routeLocation.key;

	useEffect(() => {
		return () => { setMetaDescription(); }
	}, []);

	useEffect(() => {
		if (!latestData) return;
		const contents = latestData.logs[0].contents;
		const hasTitle = contents.indexOf("# ") === 0;

		// 제목 줄의 끝. 제목만 있고 줄바꿈이 없는 글이면 `indexOf` 가 -1 을 주는데,
		// 그대로 쓰면 `substr(2, -2)` 가 빈 제목을, `substr(-1)` 이 본문 대신
		// **마지막 한 글자**를 낸다 — 탭에는 " - park108.net" 만 남고 meta
		// description 은 글자 하나가 됐다. 줄바꿈이 없으면 글 끝이 제목 끝이다.
		const newlineIndex = contents.indexOf("\n");
		const titleEndIndex = newlineIndex < 0 ? contents.length : newlineIndex;
		const contentsStartIndex = hasTitle ? titleEndIndex : 0;

		// `slice(2, titleEndIndex)`. 이전 `substr(2, contentsStartIndex - 1)` 은
		// 길이를 한 글자 더 세어 제목 끝에 줄바꿈이 딸려 왔고, 그대로
		// `document.title` 에 들어가 " - park108.net" 앞에 빈칸이 하나 더 생겼다.
		const parsedTitle = hasTitle ? contents.slice(2, titleEndIndex).trim() : "";

		// `# ` 뒤가 비어 있는 글도 이름은 있어야 한다. 날짜 제목으로 떨어진다.
		const logTitle = "" !== parsedTitle
			? parsedTitle
			: "log of " + getFormattedDate(Number(logTimestamp), "date mon year");
		setHtmlTitle(logTitle);

		const contentsWithoutTitle = contents.substr(contentsStartIndex);

		// 태그를 공백 없이 지우면 문단·목록 경계가 사라져 "하나둘셋" 처럼 붙는다.
		// 목록 요약에서 같은 결함을 고칠 때 만든 변환을 그대로 쓴다 (api.ts 단일 출처).
		const parsedContents = trimmedContents(contentsWithoutTitle);
		// 글자 경계로 자른다 — `substr` 은 이모지를 반으로 쪼개 고립 서로게이트를
		// 남기고, 그것이 meta description 으로 나가면 대체 문자로 보인다.
		const summary = truncateByGrapheme(parsedContents, SUMMARY_LENGTH);
		const ellipsis = summary.length < parsedContents.length ? "..." : "";

		// 빈 요약(예: 이미지만 있는 글)을 그대로 넘기면 meta description 이 빈 값이
		// 된다 — 기본값은 인자가 undefined 일 때만 적용되기 때문이다. 사이트 기본
		// 설명을 쓰도록 undefined 를 넘긴다.
		setMetaDescription(0 === parsedContents.length ? undefined : summary + ellipsis);
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
						// **여기서 곧바로 전이한다.** 예전에는 아래 토스터의 `completed`
						// (2초 뒤)에서 전이했고, 그 2초 동안 지워진 글이 Edit·Delete 와
						// 함께 그대로 남아 있었다. 실측: 그 창에서 Delete 를 다시 누르면
						// 이미 없는 글에 DELETE 가 한 번 더 나가고(호출 2회) 그 실패가
						// "Deleting log failed." 로 떠, 방금 본 "The log is deleted." 를
						// 뒤집는다. Edit 을 누르면 지워진 글이 편집기에 실린다.
						setItemLoadingStatus("DELETED");
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
				cameFromSearch
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
					completed={() => setIsShowToasterBottom(2)}
				/>
			</Suspense>

		</div>
	);
}


export default LogSingle;
