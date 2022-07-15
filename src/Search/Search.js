import React, { useState, lazy, Suspense } from "react";
import { log } from '../common/common';
import { getSearchList } from './api';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const Search = () => {

	// const [searchList, setSearchList] = useState([]);
	const [searchString, setSearchString] = useState("");
	// const [lastTimestamp, setLastTimestamp] = useState(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	if(process.env.NODE_ENV === 'production') return "";

	// Get image list from API Gateway
	const fetchFirst = async () => {

		setIsLoading(true);

		try {
			const res = await getSearchList(searchString);
			const retrieved = await res.json();

			if(undefined !== retrieved.errorType) {
				console.error(retrieved);
			}
			else {

				log("Search list FETCHED successfully.");
				// const newList = retrieved.body.Items;
				// const lastEvaluatedKey = retrieved.body.LastEvaluatedKey;

				// setSearchList(undefined === newList ? [] : newList);
				// setLastTimestamp(undefined === lastEvaluatedKey ? undefined : lastEvaluatedKey.timestamp);
			}
		}
		catch(err) {
			console.error(err);
		}

		setIsLoading(false);
	}

	const search = (e) => {

		const inputKeyCode = window.event.keyCode; 

		if(13 === inputKeyCode && !isLoading) {

			const inputString = e.target.value;

			// TODO: Test Log... Delete before open
			log("Search String = " + inputString);

			if(0 === inputString.length) {
				setToasterMessage("Enter a sentence to search for");
				setIsShowToaster(1);
			}
			else {
				setSearchString(inputString);
				fetchFirst();
			}
		}
	}

	return (
		<li className="li li--nav-search">
			<input
				className="input input--nav-search"
				placeholder="Search log..."
				onKeyUp={search}
			/>
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

export default Search;
