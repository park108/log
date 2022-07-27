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
			setToasterMessage("Enter a sentence to search for");
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
			document.getElementById("queryString1").value = inputString;
			document.getElementById("queryString2").value = inputString;
		}
		if(13 === inputKeyCode) {
			search(inputString);
		}
	}

	const searchByButton = async () => {
		const inputString = document.getElementById("queryString2").value;
		search(inputString);
	}

	const toggleMobileSearch = () => {
		setIsMobileSearchOpen(!isMobileSearchOpen);
	}

	// Fetch when input query string
	useEffect(() => {
		if(isAdmin()) {
			const mobileSearch = document.getElementById("mobileSearch");
			if(isMobileSearchOpen) {
				mobileSearch.setAttribute("class", "div div--search-mobile");
			}
			else {
				mobileSearch.setAttribute("class", "div div--search-mobilehide");
			}
		}
	}, [isMobileSearchOpen]);

	const placeHolder = "Search logs..."

	const queryStringInput = isAdmin() ? (
		<input
			id="queryString1"
			className="input input--search-string hidden--width-400px"
			placeholder={placeHolder}
			onKeyUp={searchByEnter}
		/>
	) : (
		<input
			id="queryString1"
			className="input input--search-string"
			placeholder={placeHolder}
			onKeyUp={searchByEnter}
		/>
	);

	const mobileSearchToggleButton = isAdmin() ? (
		<span className="span span--nav-searchbutton" onClick={toggleMobileSearch} >search</span>
	) : "";

	const mobileSearch = isAdmin() ? (
		<div id="mobileSearch">
			<input
				id="queryString2"
				className="input input--search-mobile show--width-400px"
				placeholder={placeHolder}
				onKeyUp={searchByEnter}
			/>
			<button
				className="button button--search-submit show--width-400px"
				onClick={searchByButton}
			>
				go
			</button>
		</div>
	) : "";

	return (
		<li className="li li--nav-right li--nav-search">

			{ queryStringInput }

			{ mobileSearchToggleButton }	

			{ mobileSearch }

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
		</li>
	);
}

export default SearchInput;
