import React, { useEffect, useRef, useState } from "react";
import { Link } from 'react-router-dom';
import { log, getFormattedDate, hasValue, setHtmlTitle } from '../common/common';
import { readSession, writeSession, removeSession } from '../common/safeStorage';
import Toaster from "../Toaster/Toaster";
import type { ToasterShow } from "../Toaster/Toaster";
import { getLogs, getNextLogs } from './api';
import type { LogItemPayload } from './api';

// 목록 항목은 최신 리비전이 평탄화돼 내려온다 — 서버가 Items[] 로 주는 형상.
interface LogListEntry extends LogItemPayload {
	contents?: string;
}

interface LogListProps {
	isPostSuccess?: boolean;
}

const LogList = (props: LogListProps) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isGetData, setIsGetData] = useState(false);
	const [isGetNextData, setIsGetNextData] = useState(false);
	const [isError, setIsError] = useState(false);

	const [logs, setLogs] = useState<LogListEntry[]>([]);
	const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(undefined);

	// 첫 조회가 끝났는지. 커서 삭제 판정에만 쓴다 (위 effect 주석 참조).
	const hasLoaded = useRef<boolean>(false);

	const [isShowToasterCenter, setIsShowToasterCenter] = useState<ToasterShow>(1);

	// REQ-20260517-093 (I1)(I2) / REQ-20260824-002 / TSK-20260824-07-c — unmount 후 발화 차단 가드.
	// 두 async effect 의 deps 가 서로 다르므로(`[isGetData]` / `[isGetNextData, lastTimestamp]`)
	// ref 를 분리한다. 하나를 공유하면 한쪽 cleanup 이 다른 쪽 in-flight 응답을 취소한다.
	const cancelledFirstFetchRef = useRef(false);
	const cancelledNextFetchRef = useRef(false);
	useEffect(() => {
		setIsGetData(true);
		setHtmlTitle("log");
	}, []);

	useEffect(() => {

		const cancelled = cancelledFirstFetchRef;
		cancelled.current = false;

		const fetchFirst = async () => {
	
			const listInSession = readSession("logList");
	
			if(hasValue(listInSession)) {
				
				setLogs(JSON.parse(listInSession ?? "[]"));
	
				const lastTimestampInSession = readSession("logListLastTimestamp");
	
				if(hasValue(lastTimestampInSession)) {
					setLastTimestamp(JSON.parse(lastTimestampInSession ?? "null"));
				}
	
				log("Get logs from session.");
	
				return;
			}

			setIsLoading(true);
			setIsError(false);
	
			try {
				const res = await getLogs();
				const fetchedData = await res.json();

				if(cancelled.current) return;
	
				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Logs", "SUCCESS");
	
					const newLogs = fetchedData.body.Items;
					const lastEvaluatedKey = fetchedData.body.LastEvaluatedKey;
		
					setLogs(newLogs);
					hasLoaded.current = true;
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Logs", "ERROR");
					log(fetchedData, "ERROR");
					setIsError(true);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Logs", "ERROR");
				log(String(err), "ERROR");
				setIsError(true);
			}

			setIsLoading(false);
		}

		if(isGetData) {
			fetchFirst();
			setIsGetData(false);
		}

		return () => {
			cancelled.current = true;
		};

	}, [isGetData]);

	useEffect(() => {

		const cancelled = cancelledNextFetchRef;
		cancelled.current = false;

		const fetchMore = async (timestamp: number) => {

			setIsLoading(true);
			setIsError(false);
	
			try {
				const res = await getNextLogs(timestamp);
				const fetchedData = await res.json();

				if(cancelled.current) return;
	
				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Next Logs", "SUCCESS");
	
					const lastEvaluatedKey = fetchedData.body.LastEvaluatedKey;
		
					// functional update — 클로저가 캡처한 stale `logs` 대신 직전 상태를 받는다.
					setLogs(prev => prev.concat(fetchedData.body.Items));
					hasLoaded.current = true;
					setLastTimestamp(hasValue(lastEvaluatedKey) ? lastEvaluatedKey.timestamp : undefined);
				}
				else {
					log("[API GET] FAILED - Next Logs", "ERROR");
					log(JSON.stringify(fetchedData), "ERROR");
					setIsError(true);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Next Logs", "ERROR");
				log(String(err), "ERROR");
				setIsError(true);
			}

			setIsLoading(false);
		}

		// 커서(lastTimestamp)가 없으면 더 가져올 페이지도 없다. 과거에는 undefined 가
		// 그대로 쿼리스트링에 실려 "?lastTimestamp=undefined" 로 나갔다.
		if(isGetNextData && lastTimestamp !== undefined) {
			fetchMore(lastTimestamp);
			setIsGetNextData(false);
		}

		return () => {
			cancelled.current = true;
		};

	}, [isGetNextData, lastTimestamp]);

	useEffect(() => {
		setIsGetData(true);
	}, [props.isPostSuccess]);

	useEffect(() => {
		if(isLoading) {
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	useEffect(() => {
		if(logs.length > 0) {
			writeSession("logList", JSON.stringify(logs));
		}
	}, [logs]);

	// 커서는 상태와 저장소에 **함께** 반영한다.
	//
	// 이전에는 값이 있을 때만 저장하고 없어질 때는 두었다. 마지막 페이지에
	// 닿으면 커서가 undefined 가 되는데 저장소에는 옛 값이 남아, 다음 방문에서
	// 그것이 복원돼 "See more" 가 되살아났다 — 눌러도 더 나올 것이 없는 버튼이다
	// (실측: 끝까지 넘긴 뒤 See more 사라짐 → 재방문 시 다시 나타남).
	useEffect(() => {
		if(hasValue(lastTimestamp)) {
			writeSession("logListLastTimestamp", JSON.stringify(lastTimestamp));
		}
		else if(hasLoaded.current) {
			// 마운트 직후의 undefined 는 "더 없음" 이 아니라 "아직 모름" 이다 —
			// 그때 지우면 캐시에서 복원할 커서를 스스로 없앤다.
			removeSession("logListLastTimestamp");
		}
	}, [lastTimestamp]);

	if(isError) {
		return (
			<section className="section section--message-box">
				<h2 className="h2 h2--message-error">
					Whoops, something went wrong on our end.
				</h2>
				<hr />
				<div className="div div--message-description">
					Try refreshing the page, or click Retry button.
				</div>
				<button className="btn btn--ghost btn--sm" onClick={ () => {
					removeSession("logList");
					removeSession("logListLastTimestamp");
					setIsGetData(true);
				} } >
					Retry
				</button>
			</section>
		);
	}
	else {

		// button--loglist-seemoreloading 은 CSS 정의가 없는 죽은 클래스였다.
		// 로딩 상태는 시스템의 :disabled 가 표현한다.
		const seeMoreButtonClass = "btn btn--secondary btn--block";
		const seeMoreButtonText = isLoading ? "Loading..." : "See more";
		const seeMoreButton = hasValue(lastTimestamp)
			? (
				<button
					data-testid="seeMoreButton"
					className={seeMoreButtonClass}
					// 로딩 중에는 누를 수 없다. `isGetNextData` 플래그는 요청을 띄운
					// **직후** 내려가므로(완료를 기다리지 않는다), 응답 전에 다시
					// 누르면 같은 커서로 요청이 또 나갔다 — 실측: 세 번 누르면 호출
					// 3회(인자 전부 같은 커서), 같은 페이지가 세 번 붙어 항목이 8개가
					// 되고 React key 도 중복됐다.
					disabled={isLoading}
					onClick={() => setIsGetNextData(true)}
				>
					{seeMoreButtonText}
				</button>
			)
			: null;

		return (
			<section className="section section--log-list" role="list">
				{logs.map(data => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{ pathname: "/log/" + data.timestamp }}>
							<div className="div--loglist-date">
								{getFormattedDate(data.timestamp)}
								{ true === data.temporary
										// 글리프는 이름이 되지 못한다 — 낭독기가 "writing hand" 로
										// 읽고 임시 저장이라는 뜻은 어디에도 없다. 보이는 쪽에도
										// 단서가 없어 title 을 함께 둔다.
										? <span
											className="span--loglist-temporary"
											role="img"
											aria-label="Temporary save"
											title="Temporary save"
										>✍️</span>
										: "" }
							</div>
							{
								true === data.temporary
									? <div className="div--loglist-temporary">{data.contents}</div>
									: <div className="div--loglist-contents">{data.contents}</div>
							}
						</Link>
					</div>
				))}

				<Toaster 
					show={isShowToasterCenter}
					message={"Loading logs..."}
				/>
					
				{seeMoreButton}

			</section>
		);
	}
}


export default LogList;