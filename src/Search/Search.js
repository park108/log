import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { log, isMobile } from '../common/common';
import { getSearchList } from './api';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const Search = () => {

	const [searchedList, setSearchedList] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSeached, setIsSearched] = useState(false);
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");
	const [isShowToasterCenter, setIsShowToasterCenter] = useState(1);

	// Get image list from API Gateway
	const fetchFirst = async (searchString) => {

		setIsLoading(true);

		try {
			const res = await getSearchList(searchString);
			const retrieved = await res.json();
			log(retrieved);

			if(undefined !== retrieved.errorType) {
				console.error(retrieved);
			}
			else {
				const list = retrieved.body;
				setSearchedList(list);
				log("Search list FETCHED successfully.");
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	const search = async (e) => {

		const inputKeyCode = window.event.keyCode; 

		if(13 === inputKeyCode && !isLoading) {

			const inputString = e.target.value;

			// TODO: Test Log... Delete before open
			log("Search String = " + inputString);
			setIsSearched(true);

			if(0 === inputString.length) {
				setToasterMessage("Enter a sentence to search for");
				setIsShowToaster(1);
			}
			else {
				await fetchFirst(inputString);
			}
		}
	}

	const navigate = useNavigate();

	useEffect(() => {

		if(isSeached) {

			sessionStorage.removeItem("searchResult");

			if(0 < searchedList.TotalCount) {

				sessionStorage.setItem("searchResult", JSON.stringify(searchedList));
			}

			navigate("/log/search");
		}
		
	}, [searchedList]);

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	if(isMobile()) return "";

	return (
		<li className="li li--nav-search">
			<input
				className="input input--nav-search"
				placeholder="Search log..."
				onKeyUp={search}
			/>
			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToasterCenter}
					message={"Searching logs..."}
				/>
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

export default Search;
