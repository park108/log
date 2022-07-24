import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { log, getFormattedDate, hasValue } from '../common/common';
import { getSearchList } from './api';

const Toaster = lazy(() => import('../Toaster/Toaster'));

import './Search.css';

const Search = () => {

	const [searchedList, setSearchedList] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [totalCount, setTotalCount] = useState(0);
	const [queryString, setQueryString] = useState("");
	const [processingTime, setProcessingTime] = useState(0);
	const [isShowToasterCenter, setIsShowToasterCenter] = useState(1);

	const location = useLocation();
	const navigate = useNavigate();

	// Search from API Gateway
	const search = async (searchString) => {

		setIsLoading(true);

		try {
			const res = await getSearchList(searchString);
			const retrieved = await res.json();
			log(retrieved);

			if(undefined !== retrieved.errorType) {
				console.error(retrieved);
			}
			else {
				const result = retrieved.body;

				setSearchedList(result.Items);
				setTotalCount(result.TotalCount * 1);
				setQueryString(result.QueryString);
				setProcessingTime(result.ProcessingTime * 1);

				log("Search list FETCHED successfully.");
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	// Get query string from state
	useEffect(() => {
		if(hasValue(location.state)) {
			setQueryString(location.state.queryString);
		}
	});

	// Fetch when input query string
	useEffect(() => {
		if(queryString.length > 0 && !isLoading) {
			log("QUERY = " + queryString);
			search(queryString);
		}
	}, [queryString]);

	// Change by loading state
	useEffect(() => {
		if(isLoading) {
			setIsShowToasterCenter(1);
		}
		else {
			setIsShowToasterCenter(2);
		}
	}, [isLoading]);

	const toListButton = (
		<button className="button button--loglist-seemore" onClick={() => navigate("/log")}>
			To list
		</button>
	);

	const searchStatus = isLoading ? (
			<div className="div div--search-result">
				...
			</div>
		) : (
			<div className="div div--search-result">
				{ totalCount } result{ totalCount > 1 ? "s" : "" } for &quot;{ queryString }&quot;
				- { processingTime.toLocaleString() + " milliseconds" }
			</div>
		);

	return (
		<section className="section section--log-list" role="list">

			{ searchStatus }
			
			{searchedList.map(data => (
				<div className="div--loglist-item" key={data.timestamp} role="listitem">
					<Link to={{
						pathname: "/log/" + data.timestamp
					}}>
						<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
						<div className="div--loglist-contents">{data.contents}</div>
					</Link>
				</div>
			))}

			{ toListButton }

			<Suspense fallback={<div></div>}>
				<Toaster 
					show={isShowToasterCenter}
					message={"Searching logs..."}
				/>
			</Suspense>

		</section>
	);
}

export default Search;