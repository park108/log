import React from "react";
import { log } from '../common/common';
  
const Search = () => {

	if(process.env.NODE_ENV === 'production') return "";

	const search = (e) => {
		console.log("Key Code = " + window.event.keyCode);
		if(13 === window.event.keyCode) {
			log("Search String = " + e.target.value);
		}
	}

	return (
		<li className="li li--nav-search">
			<input
				className="input input--nav-search"
				placeholder="Search log..."
				onKeyUp={search}
			/>
		</li>
	);
}

export default Search;
