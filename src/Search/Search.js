import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { log, getFormattedDate, hasValue, setHtmlTitle } from '../common/common';
import { getSearchList } from './api';

import './Search.css';

const Search = () => {

	const [searchedList, setSearchedList] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [totalCount, setTotalCount] = useState(0);
	const [queryString, setQueryString] = useState("");
	const [processingTime, setProcessingTime] = useState(0);
	const [loadingDots, setLoadingDots] = useState("");

	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if(hasValue(location.state)) {
			setQueryString(location.state.queryString);
		}
	}, []);

	useEffect(() => {

		const search = async (searchString) => {
	
			setIsLoading(true);
	
			const listInSession = sessionStorage.getItem("searchList");
	
			if(hasValue(listInSession)) {
	
				const queryStringInSession = sessionStorage.getItem("searchQueryString");
	
				if(hasValue(queryStringInSession) && searchString === queryStringInSession) {
	
					setSearchedList(JSON.parse(listInSession));
					setTotalCount(sessionStorage.getItem("searchTotalCount") * 1);
					setQueryString(queryStringInSession);
					setProcessingTime(sessionStorage.getItem("searchProcessingTime") * 1);
	
					setIsLoading(false);
					log("Get search list from session.");
		
					return;
				}
			}
	
			try {
				const res = await getSearchList(searchString);
				const retrieved = await res.json();
	
				if(!hasValue(retrieved.errorType)) {
					log("[API GET] OK - Search List", "SUCCESS");
	
					const result = retrieved.body;
	
					setSearchedList(result.Items);
					setTotalCount(result.TotalCount * 1);
					setQueryString(result.QueryString);
					setProcessingTime(result.ProcessingTime * 1);
	
					sessionStorage.setItem("searchList", JSON.stringify(result.Items));
					sessionStorage.setItem("searchTotalCount", result.TotalCount * 1);
					sessionStorage.setItem("searchQueryString", result.QueryString);
					sessionStorage.setItem("searchProcessingTime", result.ProcessingTime * 1);
				}
				else {
					log("[API GET] FAILED - Search List", "ERROR");
					console.error(retrieved);
				}
			}
			catch(err) {
				log("[API GET] FAILED - Search List", "ERROR");
				console.error(err);
			}
	
			setIsLoading(false);
		}

		setHtmlTitle("search results for " + queryString);

		if(queryString.length > 0 && !isLoading) {
			search(queryString);
		}
		
	}, [queryString]);

	// Add dots in loading
	useEffect(() => {
		const tick = () => {
			return setTimeout(() => setLoadingDots(loadingDots + "."), 300);
		}
		isLoading ? tick() : setLoadingDots("");
		return () => clearTimeout(tick);
	}, [loadingDots, isLoading]);

	const toListButton = (
		<button className="button button--loglist-seemore" onClick={() => {

			const searchInput1 = document.getElementById("query-string-by-enter");
			const searchInput2 = document.getElementById("query-string-by-button");

			if(hasValue(searchInput1)) {
				searchInput1.value = "";
			}

			if(hasValue(searchInput2)) {
				searchInput2.value = "";
			}
			
			navigate("/log");
		}}>
			To list
		</button>
	);
	
	if(isLoading) {

		return (
			<h1 className="h1 h1--notification-result">
				Searching &quot;{ queryString }&quot; in logs<span id="loading">{ loadingDots }</span>
			</h1>
		);
	}

	else if(0 === totalCount) {

		return (
			<section className="section section--log-list" role="list">
				<div className="div div--search-result">
					0 result for &quot;{ queryString }&quot;
					- { processingTime.toLocaleString() + " milliseconds" }
				</div>
				<h1 className="h1 h1--notification-result">
					No search results.
				</h1>
				{ toListButton }
			</section>
		);
	}
	else {

		return (
			<section className="section section--log-list" role="list">
				<div className="div div--search-result">
					{ totalCount } result{ totalCount > 1 ? "s" : "" } for &quot;<span className="span span--search-querystring">{ queryString }</span>&quot;
					- { processingTime.toLocaleString() + " milliseconds" }
				</div>
				
				{searchedList.map(data => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{
							pathname: "/log/" + data.timestamp,
							search: "search=true"
						}}>
							<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
							<div className="div--loglist-contents">{
								data.contents.split(queryString).map((parsed, index, arr) => (
									<span key={index}>
										{parsed}
										{ index == arr.length - 1
											? ""
											: <span className="span span--search-keyword">{queryString}</span>
										}
									</span>
								))
							}</div>
						</Link>
					</div>
				))}

				{ toListButton }

			</section>
		);
	}
}

export default Search;