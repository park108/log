import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin } from '../common/common';

import styles from './Search.module.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const SearchInput = () => {

	const [isGetData, setIsGetData] = useState(false);

	const [queryString, setQueryString] = useState("");

	const [toaster, setToaster] = useState();
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	const navigate = useNavigate();

	const handleKeyUp = async (e) => {
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

	if(isAdmin()) {
		return (
			<li className={`li li--nav-right ${styles.liNavSearch}`}>
				<input
					id="query-string-by-enter"
					className={`input ${styles.inputSearchString} hidden--width-400px`}
					placeholder="Input search string..."
					value={ queryString }
					onKeyUp={ handleKeyUp }
					onChange={ e => setQueryString(e.target.value) }
				/>
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
				<input
					id="query-string-by-enter"
					className={`input ${styles.inputSearchString}`}
					placeholder="Input search string..."
					value={ queryString }
					onKeyUp={ handleKeyUp }
					onChange={ e => setQueryString(e.target.value) }
				/>
				{ toaster }
			</li>
		);
	}
}

export default SearchInput;