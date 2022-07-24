import React, { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { log, isMobile } from '../common/common';

const Toaster = lazy(() => import('../Toaster/Toaster'));
  
const SearchInput = () => {

	const [isShowToaster, setIsShowToaster] = useState(0);
	const [toasterMessage, setToasterMessage] = useState("");

	const navigate = useNavigate();

	const search = async (e) => {

		const inputKeyCode = window.event.keyCode; 

		if(13 === inputKeyCode) {

			const inputString = e.target.value;

			if(0 === inputString.length) {
				setIsShowToaster(1);
				setToasterMessage("Enter a sentence to search for");
			}
			else {
				log("Search String = " + inputString);
				navigate("/log/search", {
					state: {
						queryString: inputString
					}
				});
			}
		}
	}

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
