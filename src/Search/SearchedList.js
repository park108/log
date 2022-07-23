import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { log, getFormattedDate, hasValue } from '../common/common';

import './Search.css';

const SearchedList = () => {

	const [searchedList, setSearchedList] = useState([]);
	const [totalCount, setTotalCount] = useState(0);
	const [queryString, setQueryString] = useState("");

	const navigate = useNavigate();

	// Set data at mount
	useEffect(() => {

		// Get log list from session
		const resultInSession = sessionStorage.getItem("searchResult");

		if(hasValue(resultInSession)) {

			const searchResult = JSON.parse(resultInSession);

			setSearchedList(searchResult.Items);
			setTotalCount(searchResult.TotalCount * 1);
			setQueryString(searchResult.QueryString);

			log("Get searched list from session.");
		}

	}, []);

	const toListButton = (
		<button className="button button--loglist-seemore" onClick={() => navigate("/log")}>
			To list
		</button>
	);

	if(0 === totalCount) {
		return (
			<section className="section section--log-list" role="list">
				<h1 className="h1 h1--error-notfound">
					No Search Result.
				</h1>

				{toListButton}
			</section>
		);
	}

	return (
		<section className="section section--log-list" role="list">
			<div className="div div--search-result">
				{ totalCount } result{ totalCount > 1 ? "s" : "" } for &quot;{ queryString }&quot;
			</div>
			
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

			{toListButton}

		</section>
	);
}

export default SearchedList;