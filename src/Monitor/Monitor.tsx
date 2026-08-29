import React, { Suspense, useEffect, lazy } from "react";
import { useNavigate } from 'react-router-dom';
import { log, isAdmin, setFullscreen, setHtmlTitle } from '../common/common';

import './Monitor.css';

const VisitorMon = lazy(() => import('./VisitorMon'));
const ContentMon = lazy(() => import('./ContentMon'));
const WebVitalsMon = lazy(() => import('./WebVitalsMon'));
const ApiCallMon = lazy(() => import('./ApiCallMon'));

export interface ChartColor {
	color: string;
	backgroundColor: string;
}

interface ChartPallet {
	pallet: string;
	colors: ChartColor[];
}

const CHART_PALLETS: ChartPallet[] = [
	{
		pallet: "Red to Green",
		colors: [
			{color: "#B8292B", backgroundColor: "#F8696B"},
			{color: "#BB5534", backgroundColor: "#FB9574"},
			{color: "#BD803C", backgroundColor: "#FDC07C"},
			{color: "#BFAB44", backgroundColor: "#FFEB84"},
			{color: "#9B9C41", backgroundColor: "#CBDC81"},
			{color: "#578D3E", backgroundColor: "#97CD7E"},
			{color: "#237E3B", backgroundColor: "#63BE7B"},
		],
	},
	{
		pallet: "Olive",
		colors: [
			{color: "black", backgroundColor: "#CAD2C5"},
			{color: "black", backgroundColor: "#A7BEA9"},
			{color: "black", backgroundColor: "#84A98C"},
			{color: "black", backgroundColor: "#6B917E"},
			{color: "black", backgroundColor: "#52796F"},
			{color: "black", backgroundColor: "#354F52"},
			{color: "black", backgroundColor: "#2F3E46"},
		]
	}
];

// 인덱스 접근은 noUncheckedIndexedAccess 하에서 undefined 를 만든다. 사용처가
// 고정된 두 팔레트뿐이므로 이름을 붙여 결손 가능성을 구조적으로 제거한다.
const PALLET_RED_TO_GREEN = CHART_PALLETS[0]?.colors ?? [];
const PALLET_OLIVE = CHART_PALLETS[1]?.colors ?? [];

interface MonitorProps {
	contentHeight?: React.CSSProperties;
}

const Monitor = (props: MonitorProps) => {

	const navigate = useNavigate();
	
	useEffect(() => {

		if(!isAdmin()) {
			const redirectPage = "/log";
			log("Redirect to " + redirectPage);
			navigate(redirectPage);
			return;
		}

		setHtmlTitle("monitor");
		setFullscreen(true);

		return () => {setFullscreen(false)}
		// 마운트 1회 admin 게이트 + fullscreen 토글. `navigate` identity 는 라우트 변경마다
		// 바뀌므로 deps 에 넣으면 이동할 때마다 cleanup 이 fullscreen 을 꺼버린다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<main className="main main--main-contents" style={props.contentHeight} role="application">
			<Suspense fallback={<div></div>}>
				<ContentMon stackPallet={PALLET_OLIVE} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<ApiCallMon stackPallet={PALLET_RED_TO_GREEN} />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<WebVitalsMon />
			</Suspense>
			<Suspense fallback={<div></div>}>
				<VisitorMon stackPallet={PALLET_OLIVE} />
			</Suspense>
		</main>
	);
}


export default Monitor;