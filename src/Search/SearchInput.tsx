import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin } from '../common/common';

import styles from './Search.module.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));

type ToasterShowState = 0 | 1 | 2;

const SearchInput = (): React.ReactElement => {

	const [isGetData, setIsGetData] = useState<boolean>(false);

	const [queryString, setQueryString] = useState<string>("");

	const [toaster, setToaster] = useState<React.ReactNode>();
	const [isShowToaster, setIsShowToaster] = useState<ToasterShowState>(0);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

	const navigate = useNavigate();

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
				navigate("/log/search", {
					state: {
						queryString: queryString
					}
				});
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