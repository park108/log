import React, { useEffect, useRef, useState } from "react";
import type { ChartColor } from './Monitor';
import { log, hasValue, getFormattedDate, getFormattedSize } from '../common/common';
import { reportError } from '../common/errorReporter';
import { getContentItemCount } from './api';

interface RawContentItem {
	timestamp: number;
	size?: number;
	sortKey?: number;
}

interface ContentBucket {
	from: number;
	to: number;
	value: number;
	count: number;
	deleted: number;
	valueRate: number;
}

const FALLBACK_COLOR: ChartColor = { color: "black", backgroundColor: "transparent" };

interface ContentPillarProps {
	valueRate: number;
	value: string | number;
	date: string;
	index: number;
}

interface ContentItemProps {
	stackPallet?: ChartColor[];
	title?: string;
	path: string;
	unit?: string;
}

const ContentItem = (props: ContentItemProps) => {

	// 팔레트 인덱스 결손 시 중립색으로 떨어뜨린다 (차트 소실보다 낫다).
	const palletAt = (i: number): ChartColor => props.stackPallet?.[i] ?? FALLBACK_COLOR;

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	const [totalCount, setTotalCount] = useState<number | string>("...");
	const [counts, setCounts] = useState<ContentBucket[]>([]);

	const title = props.title;
	const path = props.path;

	const handleRetry = () => { setIsMount(false); };

	// REQ-20260517-093 (I1)(I2)(FR-03) / TSK-20260824-07-a — unmount 후 발화 차단 가드.
	// pending `getContentItemCount` 응답이 unmount 이후 도착하더라도 state setter 뿐 아니라
	// `log()` · `reportError()` 까지 0 hit 로 유지한다 (React 19 의 unmounted setState
	// silent-ignore 는 log/reportError 를 막지 못하므로 setter 한정 가드는 불충분).
	// 수단 = `cancelled` ref (VisitorMon.jsx 선례와 동일 이디엄).
	// 주의: 아래 `isMount` state 는 최초 로드 여부 플래그이며 본 가드와 무관하다.
	const cancelledFetchRef = useRef(false);

	useEffect(() => {

		const cancelled = cancelledFetchRef;
		cancelled.current = false;

		// 6개월 타임라인은 이 효과 안에서만 쓰인다 — 렌더 스코프에 두면 배열 identity 가
		// 매 렌더 바뀌어 deps 를 무의미하게 만든다.
		const now = new Date();
		const to = (new Date(now.getFullYear(), now.getMonth() + 1, 1)).getTime();
		const from = (new Date(now.getFullYear(), now.getMonth() - 5, 1)).getTime();
	
		const timeline = [
			from,
			(new Date(now.getFullYear(), now.getMonth() -4, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -3, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -2, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth() -1, 1)).getTime(),
			(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
			to
		];
		const fetchData = async (path: string) => {
	
			setIsLoading(true);
			setIsError(false);
	
			try {
				const res = await getContentItemCount(path, from, to);
				const data = await res.json();

				if(cancelled.current) return;
	
				if(!hasValue(data.errorType)) {
					log("[API GET] OK - Content API: " + path, "SUCCESS");
	
					setTotalCount(data.body.Count);
	
					const periodData: RawContentItem[] = data.body.Items;
					let max = 0; // Max value in array to calculate value rate
					const countList: ContentBucket[] = [];

					// 버킷을 지역 변수로 조립한 뒤 push 한다. 예전에는 push 직후
					// countList[i] 로 되짚어 갱신했는데, 인덱스 재접근은 경계 밖을
					// 조용히 통과시킬 수 있다.
					for(let i = 0; i < timeline.length - 1; i++) {

						const bucketFrom = timeline[i];
						const bucketTo = timeline[i+1];
						if(bucketFrom === undefined || bucketTo === undefined) continue;

						const bucket: ContentBucket = {
							from: bucketFrom,
							to: bucketTo,
							value: 0,
							count: 0,
							deleted: 0,
							valueRate: 0,
						};

						for(const item of periodData) {
							if(bucketFrom <= item.timestamp && item.timestamp < bucketTo) {
								++bucket.count;
								if(hasValue(item.size)) {
									bucket.value += item.size ?? 0;
								}
								else {
									++bucket.value;
								}
								if((item.sortKey ?? 0) < 0) {
									++bucket.deleted;
								}
							}
						}

						if(max < bucket.value) {
							max = bucket.value;
						}
						countList.push(bucket);
					}

					for(const item of countList) {
						item.valueRate = 0 === max ? 0 : item.value / max;
					}

					setCounts(countList);
				}
				else {
					log("[API GET] FAILED - Content API: " + path, "ERROR");
					setIsError(true);
					reportError(data);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Content API: " + path, "ERROR");
				setIsError(true);
				reportError(err);
			}
			
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData(path);
			setIsMount(true);
		}

		return () => {
			cancelled.current = true;
		};
	}, [path, isMount]);

	const Pillar = (attr: ContentPillarProps) => {

		const index = attr.index;
		const yy = attr.date.substr(2, 2);
		const mm = attr.date.substr(5, 2);
		
		const legend = 0 === index ? "'" + yy + "." + mm // '21.12 (first pillar)
			: "01" === mm ? "'" + yy + "." + mm // '22.01 (change year)
			: mm; // 02

		const pillarHeight = 60;
		const blankHeight = 0 === Number(totalCount) ? {height: "60px"} : {height: pillarHeight * (1 - attr.valueRate) + "px"};
		const valueHeight = {height: "20px"}
		const pillarStyle = {
			height: pillarHeight * attr.valueRate + "px",
			backgroundColor: palletAt(index).backgroundColor
		};

		return (
			<div className="div div--monitor-6pillars">
				<div className="div div--monitor-blank" style={blankHeight}> </div>
				<div className="div div--monitor-value" style={valueHeight}>{attr.value}</div>
				<div className="div div--monitor-pillar" style={pillarStyle}></div>
				<div className="div div--monitor-pillarlegend" >{legend}</div>
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
				<h3>{title}</h3>
				<div className="div div--monitor-pillarchart">
					{ counts.map((item, index) => (
						<Pillar
							key={item.from}
							valueRate={item.valueRate}
							value={
								("capacity" === props.unit)
								? (
									getFormattedSize(item.value)
										+ ((0 === item.count) ? ""
										: (1 === item.count) ? " (" + item.count + " file)"
										: " (" + item.count + " files)")
								)
								: item.value
							}
							date={getFormattedDate(item.from)}
							index={index}
						/>
					)) }
				</div>
			</section>
		);
	}
}


export default ContentItem;