import React, { useEffect, useRef, useState } from "react";
import type { ChartColor } from './Monitor';
import { log, hasValue, getFormattedDate, getFormattedTime, getWeekday } from "../common/common";
import { useHoverPopup } from "../common/useHoverPopup";
import { reportError } from "../common/errorReporter";
import { getVisitors } from "./api";

interface RawVisitorItem {
	timestamp: number;
	date?: string;
	time?: string;
	browser?: string;
	// 서버가 보내는 이름은 `operatingSystem` 이다 (캡처된 픽스처 기준). 이 선언이
	// `os` 였던 동안 아래 집계 루프는 타입이 없어 통과했다 — 선언은 없는 필드를
	// 가리키고 실제 필드는 선언되지 않은 상태였다. 루프에 타입을 붙여 그 어긋남이
	// 조용히 지나가지 않게 한다.
	operatingSystem?: string;
	renderingEngine?: string;
}

interface DailyCount {
	date: string;
	count: number;
	valueRate: number;
}

interface EnvCount {
	name: string;
	count: number;
}

const FALLBACK_COLOR: ChartColor = { color: "black", backgroundColor: "transparent" };

interface CountPillarProps extends DailyCount {
	index: number;
}

interface EnvStackProps {
	name: string;
	count: number;
	totalCount: number;
	index: number;
	legend: string;
}

interface EnvPillarProps {
	legend: string;
	length: number;
	data: EnvCount[];
}

interface VisitorMonProps {
	stackPallet?: ChartColor[];
}

const VisitorMon = (props: VisitorMonProps) => {

	// 팔레트 인덱스 결손 시 중립색으로 떨어뜨린다.
	const palletAt = (i: number): ChartColor => props.stackPallet?.[i] ?? FALLBACK_COLOR;

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	const [totalCount, setTotalCount] = useState<number | string>("...");
	const [dailyCount, setDailyCount] = useState<DailyCount[]>([]);
	const [envTotalCount, setEnvTotalCount] = useState(0);

	const [browsers, setBrowsers] = useState<EnvCount[]>([]);
	const [os, setOs] = useState<EnvCount[]>([]);
	const [engines, setEngines] = useState<EnvCount[]>([]);


	const handleRetry = () => { setIsMount(false); };

	// REQ-20260517-093 (I3)(FR-03) — unmount-safety 채널 박제 (TSK-20260518-04).
	// React 19 unmounted setState silent-ignore + REQ-091 console.error fail-fast 정합 위해
	// pending `getVisitors` fetch 가 unmount 후 응답을 받더라도 effect 본문의 setter
	// (`setIsLoading` · `setIsError` · `setTotalCount` · `setDailyCount` · `setEnvTotalCount` ·
	// `setBrowsers` · `setOs` · `setEngines`) 발화를 0 hit 로 박제한다.
	// 수단 = `cancelled` ref (수단 중립 (b) 채택 — Image / File 도메인과 동일 패턴).
	const cancelledFetchRef = useRef(false);

	useEffect(() => {

		const cancelled = cancelledFetchRef;
		cancelled.current = false;

		const fetchData = async() => {

			setIsLoading(true);
			setIsError(false);

			const today = new Date();
			const toTimestamp = (new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)).getTime();
			const fromTimestamp = toTimestamp - (1000 * 60 * 60 * 24 * 7);

			try {
				const res = await getVisitors(fromTimestamp, toTimestamp);
				const data = await res.json();

				if(cancelled.current) return;

				if(!hasValue(data.errorType)) {
					log("[API GET] OK - Visitor information", "SUCCESS");

					setTotalCount(data.body.totalCount);

					let periodData = data.body.periodData.Items;
		
					// 세 필드는 선택적이다 — 옛 기록이나 서버 변경으로 빠질 수 있다.
					// 그대로 담으면 차트에 `undefined` 라는 항목이 생긴다. UA 파서가
					// 모르는 값에 쓰는 것과 같은 이름으로 접는다.
					const named = (value: string | undefined): string => value ?? "Others";

					for(const item of periodData as RawVisitorItem[]) {
						item.date = getFormattedDate(item.timestamp);
						item.time = getFormattedTime(item.timestamp);
					}

					const dailyCountList: DailyCount[] = [];
					let startTimestamp = 0;
					let endTimestamp = 0;
					let max = 0;

					// 버킷을 지역 변수로 조립한 뒤 push 한다 (push 후 인덱스 재접근 제거).
					for(let i = 0; i < 7; i++) {

						startTimestamp = fromTimestamp + (1000 * 60 * 60 * 24 * i);
						endTimestamp = fromTimestamp + (1000 * 60 * 60 * 24 * (i + 1));

						const bucket: DailyCount = {
							date: getFormattedDate(startTimestamp) + " (" + getWeekday(startTimestamp) +")",
							count: 0,
							valueRate: 0,
						};

						for(const item of periodData as RawVisitorItem[]) {
							if(startTimestamp <= item.timestamp && item.timestamp < endTimestamp ) {
								++bucket.count;
								if(max < bucket.count) {
									max = bucket.count;
								}
							}
						}
						dailyCountList.push(bucket);
					}

					for(const item of dailyCountList) {
						item.valueRate = 0 === max ? 0 : item.count / max;
					}
		
					setDailyCount(dailyCountList);
		
					const browserList: EnvCount[] = [];
					const osList: EnvCount[] = [];
					const engineList: EnvCount[] = [];
		
					let hasBrowser = false;
					let hasOs = false
					let hasEngine = false;
		
					for(const item of periodData as RawVisitorItem[]) {
		
						hasBrowser = false;
						for(let browser of browserList) {
							if(browser["name"] === named(item.browser)) {
								++browser.count;
								hasBrowser = true;
								break;
							}
						}
						if(!hasBrowser) {
							browserList.push({"name": named(item.browser), "count": 1});
						}
		
						hasOs = false;
						for(let os of osList) {
							if(os["name"] === named(item.operatingSystem)) {
								++os.count;
								hasOs = true;
								break;
							}
						}
						if(!hasOs) {
							osList.push({"name": named(item.operatingSystem), "count": 1});
						}
		
						hasEngine = false;
						for(let engine of engineList) {
							if(engine["name"] === named(item.renderingEngine)) {
								++engine.count;
								hasEngine = true;
								break;
							}
						}
						if(!hasEngine) {
							engineList.push({"name": named(item.renderingEngine), "count": 1});
						}
					}
		
					const countSort = (a: EnvCount, b: EnvCount) => {
						const sortKeyA = a.count;
						const sortKeyB = b.count;
						const result
							= (sortKeyA < sortKeyB) ? -1
							: (sortKeyA > sortKeyB) ? 1
							: 0;
						return result;
					}
		
					browserList.sort(countSort);
					osList.sort(countSort);
					engineList.sort(countSort);
		
					setEnvTotalCount(periodData.length);
		
					setBrowsers(browserList);
					setOs(osList);
					setEngines(engineList);
				}
				else {
					log("[API GET] FAILED - Visitor information", "ERROR");
					setIsError(true);
					reportError(data);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Visitor information", "ERROR");
				setIsError(true);
				reportError(err);
			}

			if(cancelled.current) return;
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData();
			setIsMount(true);
		}

		return () => {
			cancelled.current = true;
		};
	}, [isMount]);

	const CountPillar = (attr: CountPillarProps) => {

		const index = attr.index;
		const mm = attr.date.substr(5, 2);
		const dd = attr.date.substr(8, 2);
		const ddWeek = attr.date.substr(8, 8);

		const legend = 0 === index ? mm + "." + ddWeek // 01.09 (Sun) (first pillar)
			: "01" === dd ? mm + "." + ddWeek // 02.01 (Tue) (change month)
			: ddWeek; // 15 (Sat)

		const pillarHeight = 60;
		const blankHeight = {height: pillarHeight * (1 - attr.valueRate) + "px"};
		const valueHeight = {height: "20px"}
		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: palletAt(index).backgroundColor
		};

		return (
			<div className="div div--monitor-7pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>{attr.count}</div>
				<div className="div div--monitor-pillar" style={pillarStyle}></div>
				<div className="div div--monitor-pillarlegend" >{legend}</div>
			</div>
		);
	}

	const EnvStack = (attr: EnvStackProps) => {

		const pillarHeight = 185;
		const detailId = ("visitor-env-" + attr.legend + "-" + attr.index).replace(/\s/g, '');
		const stackStyle = {
			height: pillarHeight * (attr.count / envTotalCount) + "px",
			color: palletAt(attr.totalCount - attr.index - 1).color,
			backgroundColor: palletAt(attr.totalCount - attr.index - 1).backgroundColor
		};

		const rate = (100 * (attr.count / envTotalCount)).toFixed(0);

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// EnvStack 인스턴스마다 독립 훅 호출 → focus/Escape 및 useId() 기반 고유성 확보.
		const popup = useHoverPopup();

		return (
			<div
				data-testid={detailId}
				className="div div--monitor-pillar"
				style={stackStyle}
				key={attr.name}
				tabIndex={0}
				{...popup.triggerProps}
			>
				<div className="div div--monitor-stackvalue">
					<span>{attr.name}, </span>
					{/* `rate` 는 백분율이다. 단위를 빼면 옆 제목의 "N cases" 와 섞여
					    건수로 읽힌다 — 바로 아래 팝업은 "85(62%)" 로 붙여 쓴다.
					    좁은 막대라 넘칠까 실측했다: 가장 긴 이름("Samsung Internet")을
					    375px 에서 재도 컨테이너 안에 3.2px 여유로 들어간다. */}
					<span>{rate}%</span>
				</div>
				{ popup.isVisible && (
					<div className="div div--monitor-pillardetail" {...popup.contentProps}>
						<ul className="ul ul--monitor-detailpillaritem">
							<li className="li li--monitor-detailpillaritem">{attr.name} &nbsp;&nbsp; {attr.count}({rate}%)</li>
						</ul>
					</div>
				) }
			</div>
		);
	}

	const EnvPillar = (attr: EnvPillarProps) => {

		let index = 0;
		let total = attr.data.length;

		return (
			<div className="div div--monitor-3pillars">
				{attr.data.map((item: EnvCount) => (
					<EnvStack
						key={item.name}
						name={item.name}
						count={item.count}
						totalCount={total}
						index={index++}
						legend={attr.legend}
					/>
				))}
				<div className="div div--monitor-pillarlegend" >{attr.legend}</div>
			</div>
		);
	}


	if(isLoading) {
		return (
			<article className="article article--main-item article--monitor-item">
				<h1>Visitors in the last 7 days</h1>
				<section className="section section--monitor-item">
				<h3>Total Count: ...</h3>
					<div className="div div--monitor-processing">
						Loading...
					</div>
				</section>
				<section className="section section--monitor-item">
					<h3>User Environment: ... cases</h3>
					<div className="div div--monitor-processing">
						Loading...
					</div>
				</section>
			</article>
		);
	}
	else if(isError) {
		return (
			<article className="article article--main-item article--monitor-item">
				<h1>Visitors in the last 7 days</h1>
				<section className="section section--monitor-item">
					<h3>Total Count: ...</h3>
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
				<section className="section section--monitor-item">
					<h3>User Environment: ... cases</h3>
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
			</article>
		);
	}
	else {
		return (
			<article className="article article--main-item article--monitor-item">
				<h1>Visitors in the last 7 days</h1>
				<section className="section section--monitor-item">
					<h3>Total Count: {totalCount}</h3>
					<div className="div div--monitor-pillarchart">
					{ dailyCount.map((data, index) => (
						<CountPillar
							key={data.date}
							date={data.date}
							count={data.count}
							valueRate={data.valueRate}
							index={index}
						/>
					)) }
					</div>
				</section>
				<section className="section section--monitor-item">
					<h3>User Environment: {envTotalCount} cases</h3>
					<div className="div div--monitor-stackchart">
						<EnvPillar legend="Browser" length={envTotalCount} data={browsers} />
						<EnvPillar legend="OS" length={envTotalCount} data={os} />
						<EnvPillar legend="Rendering Engine" length={envTotalCount} data={engines} />
					</div>
				</section>
			</article>
		);
	}
}


export default VisitorMon;