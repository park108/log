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

	useEffect(() => {
		if(hasValue(lastTimestamp)) {
			writeSession("logListLastTimestamp", JSON.stringify(lastTimestamp));
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
								{ true === data.temporary ? <span className="span--loglist-temporary">✍️</span> : "" }
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