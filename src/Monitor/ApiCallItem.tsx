import React, { useEffect, useRef, useState } from "react";
import type { ChartColor } from './Monitor';
import { log, hasValue, getFormattedDate, getFormattedTime, getWeekday } from '../common/common';
import { useHoverPopup } from '../common/useHoverPopup';
import { reportError } from '../common/errorReporter';
import { getApiCallStats } from './api';

// 인자는 **비율**이다 (0~1). 백분율 정수를 넘기면 0% 를 뺀 전 구간이 마지막
// 색으로 떨어진다 — 실측: 10% 도 100% 와 같은 색이었다. 그래서 이름과 주석에
// 단위를 못 박는다.
const getSuccessRateIndex = (successRateFraction: number): number => {
	const rate = successRateFraction;
	return rate < 0.6 ? 0
		: rate < 0.7 ? 1
		: rate < 0.8 ? 2
		: rate < 0.9 ? 3
		: rate < 0.95 ? 4
		: rate < 0.98 ? 5
		: 6;
}

// 서버 응답 항목 (JSON) — 소비하는 필드만 선언한다.
interface RawApiCallItem {
	timestamp: number;
	total: number;
	succeed: number;
	failed: number;
	date?: string;
	time?: string;
}

interface ApiCallStat {
	date: string;
	count: string;
	succeed: string;
	failed: string;
	valueRate: number;
	successRate: number;
}

interface PillarProps extends ApiCallStat {
	index: number;
}

const FALLBACK_COLOR: ChartColor = { color: "black", backgroundColor: "transparent" };

// 팔레트 인덱스 접근은 noUncheckedIndexedAccess 하에서 undefined 를 낼 수 있다.
// 색은 표시 전용이라 결손 시 중립색으로 떨어뜨린다 — 차트가 사라지는 것보다 낫다.
// 모듈 수준 순수 함수로 두어 effect 의존성 목록에 들어가지 않게 한다.
const palletAt = (pallet: ChartColor[] | undefined, i: number): ChartColor =>
	pallet?.[i] ?? FALLBACK_COLOR;

interface ApiCallItemProps {
	stackPallet?: ChartColor[];
	title?: string;
	service: string;
}

const ApiCallItem = (props: ApiCallItemProps) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	const [totalCount, setTotalCount] = useState<number | string>("...");
	const [countList, setCountList] = useState<ApiCallStat[]>([]);

	const [rate, setRate] = useState(0);
	const [rateColor, setRateColor] = useState<React.CSSProperties>({});

	const title = props.title;
	const service = props.service;
	const stackPallet = props.stackPallet;

	const handleRetry = () => { setIsMount(false); };

	// REQ-20260517-093 (I1)(I2)(FR-03) / TSK-20260824-07-a — unmount 후 발화 차단 가드.
	// pending `getApiCallStats` 응답이 unmount 이후 도착하더라도 state setter 뿐 아니라
	// `log()` · `reportError()` 까지 0 hit 로 유지한다 (React 19 의 unmounted setState
	// silent-ignore 는 log/reportError 를 막지 못하므로 setter 한정 가드는 불충분).
	// 수단 = `cancelled` ref (VisitorMon.jsx 선례와 동일 이디엄).
	// 주의: 아래 `isMount` state 는 최초 로드 여부 플래그이며 본 가드와 무관하다.
	const cancelledFetchRef = useRef(false);

	useEffect(() => {

		const cancelled = cancelledFetchRef;
		cancelled.current = false;

		const fetchData = async (service: string) => {
	
			setIsLoading(true);
			setIsError(false);
	
			const today = new Date();
			const toTimestamp = (new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)).getTime();
			const fromTimestamp = toTimestamp - (1000 * 60 * 60 * 24 * 7);
	
			try {
				const res = await getApiCallStats(service, fromTimestamp, toTimestamp);
				const data = await res.json();

				if(cancelled.current) return;
	
				if(!hasValue(data.errorType)) {
					log("[API GET] OK - API call stats: " + service + ", Processing time is " + (data.body.ProcessingTime).toLocaleString() + " ms", "SUCCESS");
					
					if(undefined === data.body.totalCount ) {
						throw "totalCount is undefined";
					}
					setTotalCount(data.body.totalCount);
	
					const periodData = data.body.Items;
					const maxCount = Math.max.apply(Math, periodData.map((item: RawApiCallItem) => { return item.total; }));
	
					const statList: ApiCallStat[] = [];
					let successCount = 0;
		
					for(const item of periodData as RawApiCallItem[]) {
						item.date = getFormattedDate(item.timestamp);
						item.time = getFormattedTime(item.timestamp);
		
						statList.push(
							{
								"date": getFormattedDate(item.timestamp) + " (" + getWeekday(item.timestamp) +")",
								"count": (1 * item.total).toLocaleString(),
								"succeed": (1 * item.succeed).toLocaleString(),
								"failed": (1 * item.failed).toLocaleString(),
								"valueRate": 1 * item.total / maxCount,
								"successRate":  0 === item.total ? 0 : 1 * item.succeed / item.total
							}
						);
	
						successCount += item.succeed;
					}
					setCountList(statList);

					// 종합 성공률. 색 판정에는 **비율**을, 표시에는 백분율을 쓴다.
					//
					// 백분율을 색 판정에 넘기고 있었다. 임계값이 0.6·0.7·… 이라
					// 1% 이상이면 무엇이든 마지막 색으로 떨어졌다 — 실측: 성공률
					// 10% 인 구간의 **막대는 붉은데 종합 수치만 초록**이었다.
					// 경고해야 할 신호가 영영 뜨지 않았다.
					const total = Number(data.body.totalCount);
					const hasCalls = Number.isFinite(total) && 0 < total;
					const successRate = hasCalls ? successCount / total : 0;

					setRate(hasCalls ? Math.round(100 * successRate) : 0);
					// 호출이 없으면 실패도 없다 — 없는 실패에 경고 색을 씌우지 않는다.
					setRateColor({
						color: palletAt(stackPallet, getSuccessRateIndex(hasCalls ? successRate : 1)).color,
					});
				}
				else {
					log("[API GET] FAILED - API call stats: " + service, "ERROR");
					setIsError(true);
					reportError(data);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - API call stats: " + service, "ERROR");
				setIsError(true);
				reportError(err);
			}
			
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData(service);
			setIsMount(true);
		}

		return () => {
			cancelled.current = true;
		};
	}, [service, isMount, stackPallet]);

	const Pillar = (attr: PillarProps) => {

		const index = attr.index;
		const detailId = "api-call-item-" + service + "-" + attr.index;
		const mm = attr.date.substr(5, 2);
		const dd = attr.date.substr(8, 2);
		const ddWeek = attr.date.substr(8, 8);

		const legend = 0 === index ? mm + "." + ddWeek // 01.09 (Sun) (first pillar)
			: "01" === dd ? mm + "." + ddWeek // 02.01 (Tue) (change month)
			: ddWeek; // 15 (Sat)

		const pillarHeight = 60;
		const blankHeight = 0 === Number(totalCount) ? {height: "60px"} : {height: pillarHeight * (1 - attr.valueRate) + "px"};
		const valueHeight = {height: "20px"}
		const successRateColor = getSuccessRateIndex(attr.successRate);

		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: palletAt(stackPallet, successRateColor).backgroundColor
		};

		const textColor = "0" === attr.count ? {
			color: "black"
		} : {
			color: palletAt(stackPallet, successRateColor).color
		}

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// Pillar 인스턴스마다 독립 훅 호출 → useId() 로 고유 id 자동 할당
		// (기존 `api-call-item-{service}-{index}` 수동 id 충돌 우려 제거).
		const popup = useHoverPopup();

		return (
			<div className="div div--monitor-7pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>
					{attr.count}
					(
					<span style={textColor}>
						{Math.round(100 * (attr.successRate)) + "%"}
					</span>
					)
				</div>
				<div
					data-testid={detailId}
					className="div div--monitor-pillar"
					style={pillarStyle}
					tabIndex={0}
					{...popup.triggerProps}
				>
				</div>
				<div className="div div--monitor-pillarlegend">{legend}</div>
				{ popup.isVisible && (
					<div className="div div--monitor-pillardetail" {...popup.contentProps}>
						<ul className="ul ul--monitor-detailpillaritem">
							<li className="li li--monitor-detailpillaritem">{attr.date.substr(0,10)}</li>
							<li className="li li--monitor-detailpillaritem">🟢 {attr.succeed} &nbsp;&nbsp; 🔴 {attr.failed}</li>
						</ul>
					</div>
				) }
			</div>
		);
	}

	if(isLoading) {
		return (
			<section className="section section--monitor-item">
				<h3>{title}</h3>
				<div className="div div--monitor-processing">
					Loading...
				</div>
			</section>
		);
	}
	else if(isError) {
		return (
			<section className="section section--monitor-item">
				<h3>{title}</h3>
				<div className="div div--monitor-processing">
					<button
						type="button"
						className="button button--monitor-retrybutton"
						onClick={handleRetry}
					>
						Retry
					</button>
				</div>
			</section>
		);
	}
	else {
		return (
			<section className="section section--monitor-item">
				<h3>
					{title}: {totalCount.toLocaleString()} 
					(<span style={rateColor}>{"..." === totalCount || 0 === Number(totalCount) ? 0 : rate}%</span>)
				</h3>
				<div className="div div--monitor-pillarchart">
				{ countList.map((data, index) => (
					<Pillar
						key={data.date}
						date={data.date}
						count={data.count}
						succeed={data.succeed}
						failed={data.failed}
						valueRate={data.valueRate}
						successRate={data.successRate}
						index={index}
					/>
				)) }
				</div>
			</section>
		);
	}
}


export default ApiCallItem;