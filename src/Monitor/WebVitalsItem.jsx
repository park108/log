import React, { useEffect, useRef, useState } from "react";
import { log, hasValue } from '../common/common';
import { useHoverPopup } from '../common/useHoverPopup';
import { activateOnKey } from '../common/a11y';
import { reportError } from '../common/errorReporter';
import { getWebVitals } from './api';
import PropTypes from 'prop-types';

const HEADER_STYLE = {
	"GOOD": "span span--monitor-evaluation span--monitor-evaluation-good",
	"POOR": "span span--monitor-evaluation span--monitor-evaluation-poor",
	"NEEDS IMPROVEMENT": "span span--monitor-evaluation span--monitor-evaluation-warn",
	"None": "span span--monitor-evaluation span--monitor-none",
	undefined: "span span--monitor-evaluation span--monitor-none"
};

// REQ-20260825-001 / monitor §동작 (G-1)(G-3)
// 파생 state 는 in-place 변이 대신 **새 객체 조립 → 교체** 로만 갱신한다.
// in-place 변이는 갱신 경로가 잊은 필드(과거: `totalCount`)를 초기값으로 은폐해
// 헤더가 영구 `(0)` 을 표시하는 결함을 만들었다. 매 호출 새 객체를 반환하며
// 공유 상수 객체를 export 하지 않는다 (공유 참조 = 같은 부류의 문제).
export const createInitialEvaluationResult = () => ({
	totalCount: 0,
	evaluation: "None",
	good: { count: 0, rate: 0, style: {} },
	needImprovement: { count: 0, rate: 0, style: {} },
	poor: { count: 0, rate: 0, style: {} }
});

// 현행 표기 보존: count 가 0 이면 "" , 아니면 백분율 정수 문자열.
const toRate = (count, totalCount) => 0 === count ? "" : (100 * count / totalCount).toFixed(0);
// 0 경계 가드 — `totalCount === 0` 이면 `0/0 → NaN` 이라 DOM 에 `width: "NaN%"` 가
// 실린다. 0건은 예외가 아니라 설계된 정상 상태이므로(항목이 세 분류에 하나도 들지
// 않으면 evaluation="None" 으로 명시 취급) 인정된 정상 입력이 무효 출력을 내지 않게
// `"0%"` 로 접는다. 브라우저는 무효 CSS 를 버려 화면에 안 보이지만 DOM 은 값을 실제로
// 보유하고 스냅샷·시각 회귀·접근성 도구는 그것을 그대로 읽는다.
// 분기 변수가 `toRate` 와 다른 것은 정상이다 — `toRate` 는 표기상 `count` 로 분기하지만
// `NaN` 을 만드는 것은 **분모**다. 비-0 경로의 산술은 그대로 둔다 (반올림 도입 금지).
const toStyle = (count, totalCount) => (
	Number.isFinite(totalCount) && 0 !== totalCount
		? { width: 100 * count / totalCount + "%" }
		: { width: "0%" }
);

// 순수 함수 — 기존 state 를 읽지 않고 응답 Items(또는 falsy) 만으로 전 필드를 조립한다.
export const buildEvaluationResult = (items) => {

	let good = 0;
	let poor = 0;
	let needImprovement = 0;

	for(const item of (items || [])) {
		switch(item.evaluation) {
			case "GOOD": ++good; break;
			case "POOR": ++poor; break;
			case "NEEDS IMPROVEMENT": ++needImprovement; break;
			default: break;
		}
	}

	// "BAD DATA" 등 평가 밖 항목은 세지 않는다 — 응답 항목 수 != 평가 항목 수.
	const totalCount = good + poor + needImprovement;

	const goodRate = toRate(good, totalCount);
	const needImprovementRate = toRate(needImprovement, totalCount);
	const poorRate = toRate(poor, totalCount);

	// 분기 순서·경계는 현행 그대로 (문자열 rate 의 강제변환 의미 포함).
	let evaluation;
	if(75 <= goodRate) {
		evaluation = "GOOD";
	}
	else if(25 < poorRate) {
		evaluation = "POOR";
	}
	else if(0 < totalCount) {
		evaluation = "NEEDS IMPROVEMENT";
	}
	else {
		evaluation = "None";
	}

	return {
		totalCount,
		evaluation,
		good: { count: good, rate: goodRate, style: toStyle(good, totalCount) },
		needImprovement: { count: needImprovement, rate: needImprovementRate, style: toStyle(needImprovement, totalCount) },
		poor: { count: poor, rate: poorRate, style: toStyle(poor, totalCount) }
	};
};

const WebVitalsItem = (props) => {

	const [isLoading, setIsLoading] = useState(false);
	const [isMount, setIsMount] = useState(false);
	const [isError, setIsError] = useState(false);

	// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
	// 기존 hoverPopup(event, name) 명령형 호출 대체.
	// useId() 기반 고유 id → 다중 WebVitalsItem 인스턴스 간 ID 충돌 회피.
	const popup = useHoverPopup();

	const [evaluationResult, setEvaluationResult] = useState(createInitialEvaluationResult());

	const name = props.name;
	const description = props.description;

	// REQ-20260517-093 (I1)(I2)(FR-03) / TSK-20260824-07-a — unmount 후 발화 차단 가드.
	// pending `getWebVitals` 응답이 unmount 이후 도착하더라도 state setter 뿐 아니라
	// `log()` · `reportError()` 까지 0 hit 로 유지한다 (React 19 의 unmounted setState
	// silent-ignore 는 log/reportError 를 막지 못하므로 setter 한정 가드는 불충분).
	// 수단 = `cancelled` ref (VisitorMon.jsx 선례와 동일 이디엄).
	// 주의: 아래 `isMount` state 는 최초 로드 여부 플래그이며 본 가드와 무관하다.
	const cancelledFetchRef = useRef(false);

	useEffect(() => {

		const cancelled = cancelledFetchRef;
		cancelled.current = false;

		const fetchData = async(name) => {

			setIsLoading(true);
			setIsError(false);

			try {
				const res = await getWebVitals(name);
				const fetchedData = await res.json();

				if(cancelled.current) return;

				if(!hasValue(fetchedData.errorType)) {
					log("[API GET] OK - Web Vital(" + name + "): " + fetchedData.body.Count, "SUCCESS");

					setEvaluationResult(buildEvaluationResult(fetchedData.body.Items));
				}
				else {
					log("[API GET] FAILED - Web Vital(" + name + ")", "ERROR");
					setIsError(true);
					reportError(fetchedData);
				}
			}
			catch(err) {
				if(cancelled.current) return;
				log("[API GET] FAILED - Web Vital(" + name + ")", "ERROR");
				setIsError(true);
				reportError(err);
			}
		
			setIsLoading(false);
		}

		if(!isMount) {
			fetchData(name);
			setIsMount(true);
		}

		return () => {
			cancelled.current = true;
		};
	// deps 에서 `evaluationResult` 를 제외한다 — 새 참조를 set 하므로 자기 참조 deps 는
	// Object.is bail-out 을 잃고 무한 재fetch 가 된다 (§동작 G-4).
	}, [isMount, name]);

	if(isLoading) {
		return (
			<section className="section section--monitor-item">
				<h3>
					{name}
					<span className="span span--monitor-metric">{ description + " (...)"}</span>
				</h3>
				<div className="div div--monitor-processinglow">
					Loading...
				</div>
			</section>
		);
	}
	else if(isError) {
		return (
			<section className="section section--monitor-item">
				<h3>
					{ name }
					<span className="span span--monitor-metric">{ description }</span>
				</h3>
				<div className="div div--monitor-processinglow">
					<span
						className="span span--monitor-retrybutton"
						role="button"
						tabIndex={0}
						onClick={ () => { setIsMount(false) } }
						onKeyDown={activateOnKey(() => setIsMount(false))}
					>
						Retry
					</span>
				</div>
			</section>
		);
	}
	else {
		return (
			<section className="section section--monitor-item">
				<h3>
					{ name }
					<span className="span span--monitor-metric">{ description + " (" + evaluationResult.totalCount + ")" }</span>
					<span className={ HEADER_STYLE[evaluationResult.evaluation] }>{ evaluationResult.evaluation }</span>
				</h3>
				<div
					data-testid={"status-bar-" + name}
					className="div div--monitor-statusbar"
					tabIndex={0}
					{...popup.triggerProps}
				>
					<span className="span span--monitor-bar span--monitor-good" style={ evaluationResult.good.style }>
						{ evaluationResult.good.rate}
					</span>
					<span className="span span--monitor-bar span--monitor-warn" style={ evaluationResult.needImprovement.style }>
						{ evaluationResult.needImprovement.rate }
					</span>
					<span className="span span--monitor-bar span--monitor-poor" style={ evaluationResult.poor.style }>
						{ evaluationResult.poor.rate }
					</span>
				</div>
				{ popup.isVisible && (
					<div className="div div--monitor-pillardetail" {...popup.contentProps}>
						<ul className="ul ul--monitor-detailpillaritem">
							<li className="li li--monitor-detailpillaritem">{ description }</li>
							<li className="li li--monitor-detailpillaritem">
								🟢 { evaluationResult.good.count } &nbsp;&nbsp;
								🟡 { evaluationResult.needImprovement.count } &nbsp;&nbsp;
								🔴 { evaluationResult.poor.count }
							</li>
						</ul>
					</div>
				) }
			</section>
		);
	}
}

WebVitalsItem.propTypes = {
	description: PropTypes.string,
	name: PropTypes.string,
};

export default WebVitalsItem;