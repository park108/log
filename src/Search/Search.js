import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { log, getFormattedDate, hasValue } from '../common/common';
import { getSearchList } from './api';

import './Search.css';

const Search = () => {

	const [searchedList, setSearchedList] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [totalCount, setTotalCount] = useState(0);
	const [queryString, setQueryString] = useState("");
	const [processingTime, setProcessingTime] = useState(0);

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

	const toListButton = (
		<button className="button button--loglist-seemore" onClick={() => navigate("/log")}>
			To list
		</button>
	);
	
	if(isLoading) {

		return (
			<h1 className="h1 h1--notification-result">
				Searching logs...
			</h1>
		);
	}

	else if(0 === totalCount) {
		return (
			<section className="section section--log-list" role="list">
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
					{ totalCount } result{ totalCount > 1 ? "s" : "" } 
					for &quot;{ queryString }&quot;
					- { processingTime.toLocaleString() + " milliseconds" }
				</div>
				
				{searchedList.map(data => (
					<div className="div--loglist-item" key={data.timestamp} role="listitem">
						<Link to={{ pathname: "/log/" + data.timestamp }}>
							<div className="div--loglist-date">{getFormattedDate(data.timestamp)}</div>
							<div className="div--loglist-contents">{data.contents}</div>
						</Link>
					</div>
				))}

				{ toListButton }

			</section>
		);
	}
}

export default Search;