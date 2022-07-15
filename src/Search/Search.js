import React, { useState, lazy, Suspense } from "react";
import { log } from '../common/common';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const Search = () => {

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	if(process.env.NODE_ENV === 'production') return "";

	const search = (e) => {

		const inputKeyCode = window.event.keyCode; 

		if(13 === inputKeyCode) {

			const searchString = e.target.value;

			// TODO: Test Log... Delete before open
			log("Search String = " + e.target.value);

			if(0 === searchString.length) {
				setToasterMessage("Enter a sentence to search for")
				setIsShowToaster(1);
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
