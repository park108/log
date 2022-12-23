import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin } from '../common/common';

import './Search.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const SearchInput = () => {

	const [queryString, setQueryString] = useState("");
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	const navigate = useNavigate();

	const search = async () => {

		if(0 === queryString.length) {
			setIsShowToaster(1);
			setToasterMessage("Enter the keyword to search for");
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

	const fireSearch = async (e) => {
		e.preventDefault();
		if(13 === e.keyCode) {
			search(queryString);
		}
	}

	useEffect(() => {
		if(isAdmin()) {
			const mobileSearch = document.getElementById("mobile-search");
			if(isMobileSearchOpen) {
				mobileSearch.setAttribute("class", "div div--search-mobile");
			}
			else {
				mobileSearch.setAttribute("class", "div div--search-mobilehide");
			}
		}
	}, [isMobileSearchOpen]);

	const toaster = (
		<Suspense fallback={<div></div>}>
			<Toaster 
				show={isShowToaster}
				message={toasterMessage}
				position={"bottom"}
				type={"warning"}
				duration={2000}
				completed={() => setIsShowToaster(2)}
			/>
		</Suspense>
	);
	
	if(isAdmin()) {
		return (
			<li className="li li--nav-right li--nav-search">
				<input
					id="query-string-by-enter"
					className="input input--search-string hidden--width-400px"
					placeholder="Input search string..."
					value={queryString}
					onKeyUp={fireSearch}
					onChange={e => setQueryString(e.target.value)}
				/>
				<span className="span span--nav-searchbutton" onClick={() => {
					setIsMobileSearchOpen(!isMobileSearchOpen);
				}} >
					search
				</span>
				<div id="mobile-search">
					<input
						id="query-string-by-button"
						className="input input--search-mobile show--width-400px"
						placeholder="Input search string..."
						value={queryString}
						onKeyUp={fireSearch}
						onChange={e => setQueryString(e.target.value)}
					/>
					<button
						className="button button--search-submit show--width-400px"
						onClick={async () => { search(); }}
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
			<li className="li li--nav-right li--nav-search">
				<input
					id="query-string-by-enter"
					className="input input--search-string"
					placeholder="Input search string..."
					value={queryString}
					onKeyUp={fireSearch}
					onChange={e => setQueryString(e.target.value)}
				/>

				{ toaster }
			</li>
		);
	}
}

export default SearchInput;