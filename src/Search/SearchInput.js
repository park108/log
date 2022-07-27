import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { log } from '../common/common';

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
		document.getElementById("queryString1").value = inputString;
		document.getElementById("queryString2").value = inputString;
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

		const mobileSearch = document.getElementById("mobileSearch");

		if(isMobileSearchOpen) {
			mobileSearch.setAttribute("class", "div div--nav-mobilesearch show--width-400px");
		}
		else {
			mobileSearch.setAttribute("class", "div div--nav-mobilesearchhide show--width-400px");
		}
	}, [isMobileSearchOpen]);

	return (
		<li className="li li--nav-search">
			<input
				id="queryString1"
				className="input input--nav-search hidden--width-400px"
				placeholder="Search log..."
				onKeyUp={searchByEnter}
			/>
			<span
				className="span span--nav-searchbutton show--width-400px"
				onClick={toggleMobileSearch}
			>
				🔍
			</span>
			<div
				id="mobileSearch"
				className="div div--nav-mobilesearch show--width-400px"
			>
				<input
					id="queryString2"
					className="input input--nav-mobilesearch"
					placeholder="Search log..."
					onKeyUp={searchByEnter}
				/>
				<button
					className="button button--nav-mobilesearch"
					onClick={searchByButton}
				>
					🔥
				</button>
			</div>
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
