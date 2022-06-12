import React from "react";
import { log } from './common';
  
const Search = () => {

	if (process.env.NODE_ENV === 'production') return;
	
	const search = (e) => {
		if(13 === window.event.keyCode) {
			log("Search String = " + e.target.value);
		}
	}
	return (
		<li className="li li--nav-search">
			<input
				className="input input--nav-search"
				placeholder="Search log..."
				onKeyPress={search}
			/>
		</li>
	);
}

export default Search;