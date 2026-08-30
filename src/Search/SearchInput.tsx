import React, { useState, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAdmin } from '../common/common';

import styles from './Search.module.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));

type ToasterShowState = 0 | 1 | 2;

// 검색어는 **주소에 실린다.**
//
// 예전에는 `navigate(..., { state })` 로만 넘겼다. `history.state` 는 새로고침으로
// 살아남지 못하고 링크에도 담기지 않는다 — 검색 결과 화면을 새로 고치거나 그
// 주소를 공유하면 "Type a keyword to search." 가 뜬다. 방금 한 검색이 사라진다.
//
// 주소에 실으면 새로고침·북마크·공유가 모두 성립하고, 검색 상자와 결과 화면이
// 같은 한 곳을 읽게 된다.
export const QUERY_PARAM = "q";

const SearchInput = (): React.ReactElement => {

	const [isGetData, setIsGetData] = useState<boolean>(false);

	const [queryString, setQueryString] = useState<string>("");

	const [toaster, setToaster] = useState<React.ReactNode>();
	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

	const navigate = useNavigate();
	const location = useLocation();

	// 검색 상자가 보여주는 것은 **지금 무엇을 검색 중인가** 다. 그래서 값의
	// 출처를 주소 하나로 둔다 — 검색 결과 화면이면 그 화면이 쓰는 검색어를,
	// 아니면 빈 값을.
	//
	// 이전에는 `Search.tsx` 의 "To list" 가 `getElementById(...).value = ""` 로
	// DOM 을 직접 지웠다. controlled input 이라 React 상태는 그대로 남아 두 가지가
	// 관측됐다 (실측): (1) 빈 상자에서 Enter 를 치면 **보이지 않는 옛 검색어**로
	// 검색됐고, (2) 아무 리렌더에나 옛 검색어가 상자로 되돌아왔다.
	const navigationKey = location.key;
	useEffect(() => {
		const routedQuery = new URLSearchParams(location.search).get(QUERY_PARAM);
		setQueryString(
			location.pathname.startsWith("/log/search") && null !== routedQuery
				? routedQuery
				: ""
		);
		// 주소가 바뀐 순간에만 맞춘다 — 타이핑 중에 끼어들지 않기 위해서다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [navigationKey]);

	const handleKeyUp = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
		e.preventDefault();

		if(13 === e.keyCode) {
			setIsGetData(true);
		}
	}

	useEffect(() => {

		const search = async () => {
	
			if(0 === queryString.length) {
				setIsShowToaster(1);
			}
			else {
				setIsMobileSearchOpen(false);
				navigate("/log/search?" + QUERY_PARAM + "=" + encodeURIComponent(queryString));
			}
		}

		if(isGetData) {
			search();
			setIsGetData(false);
		}

		// isGetData 플래그 트리거 — 검색 버튼이 눌린 렌더의 queryString 을 쓰는 것이 의도다.
		// `navigate` identity 는 라우트마다 바뀐다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isGetData]);

	useEffect(() => {
		setToaster(
			<Suspense fallback={<div></div>}>
				<Toaster 
					show={ isShowToaster }
					message="Enter the keyword to search for"
					position="bottom"
					type="warning"
					duration={ 2000 }
					completed={() => setIsShowToaster(2)}
				/>
			</Suspense>
		);
	}, [isShowToaster])

// 인라인 SVG — 외부 자산을 추가하지 않는다 (CSP 표면 유지). 장식이므로
// 접근성 트리에서 숨긴다: 입력의 placeholder 가 이미 역할을 말한다.
const SearchIcon = (): React.ReactElement => (
	<svg className={styles.svgSearchIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		<circle cx="11" cy="11" r="7" />
		<path d="M20 20l-3.5-3.5" />
	</svg>
);

	if(isAdmin()) {
		return (
			<li className={`li li--nav-right ${styles.liNavSearch}`}>
				<span className={`span ${styles.spanSearchField} hidden--width-400px`}>
					<SearchIcon />
					<input
						id="query-string-by-enter"
						className={`input ${styles.inputSearchString}`}
						placeholder="Input search string..."
						aria-label="Input search string..."
						value={ queryString }
						onKeyUp={ handleKeyUp }
						onChange={ e => setQueryString(e.target.value) }
					/>
				</span>
				<button
					type="button"
					className={`span ${styles.spanNavSearchbutton}`}
					onClick={() => {
						setIsMobileSearchOpen(!isMobileSearchOpen);
					}}
				>
					search
				</button>
				<div
					id="mobile-search"
					className={`div ${isMobileSearchOpen ? styles.divSearchMobile : styles.divSearchMobilehide}`}
				>
					<input
						id="query-string-by-button"
						className={`input ${styles.inputSearchMobile} show--width-400px`}
						placeholder="Input search string..."
						aria-label="Input search string..."
						value={ queryString }
						onKeyUp={ handleKeyUp }
						onChange={ e => setQueryString(e.target.value) }
					/>
					<button
						className={`button ${styles.buttonSearchSubmit} show--width-400px`}
						onClick={ () => setIsGetData(true) }
					>
						go
					</button>
				</div>
				{ toaster }
			</li>
		);
	}
	else {
		return (
			<li className={`li li--nav-right ${styles.liNavSearch}`}>
				<span className={`span ${styles.spanSearchField}`}>
					<SearchIcon />
					<input
						id="query-string-by-enter"
						className={`input ${styles.inputSearchString}`}
						placeholder="Input search string..."
						aria-label="Input search string..."
						value={ queryString }
						onKeyUp={ handleKeyUp }
						onChange={ e => setQueryString(e.target.value) }
					/>
				</span>
				{ toaster }
			</li>
		);
	}
}

export default SearchInput;