import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { isAdmin, log } from '../common/common';

import './Search.css';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const SearchInput = () => {

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	const navigate = useNavigate();

	const search = async (inputString) => {
		log("Search String = " + inputString);

		if(0 === inputString.length) {
			setIsShowToaster(1);
			setToasterMessage("Enter the keyword to search for");
		}
		else {
			setIsMobileSearchOpen(false);
			navigate("/log/search", {
				state: {
					queryString: inputString
				}
			});
		}
	}

	const searchByEnter = async (e) => {
		const inputKeyCode = window.event.keyCode;
		const inputString = e.target.value;
		if(isAdmin()) {
			document.getElementById("query-string-by-enter").value = inputString;
			document.getElementById("query-string-by-button").value = inputString;
		}
		if(13 === inputKeyCode) {
			search(inputString);
		}
	}

	const searchByButton = async () => {
		const inputString = document.getElementById("query-string-by-button").value;
		search(inputString);
	}

	const toggleMobileSearch = () => {
		setIsMobileSearchOpen(!isMobileSearchOpen);
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
					onKeyUp={searchByEnter}
				/>
				<span className="span span--nav-searchbutton" onClick={toggleMobileSearch} >
					search
				</span>
				<div id="mobile-search">
					<input
						id="query-string-by-button"
						className="input input--search-mobile show--width-400px"
						placeholder="Input search string..."
						onKeyUp={searchByEnter}
					/>
					<button
						className="button button--search-submit show--width-400px"
						onClick={searchByButton}
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
					onKeyUp={searchByEnter}
				/>

				{ toaster }
			</li>
		);
	}
}

export default SearchInput;
