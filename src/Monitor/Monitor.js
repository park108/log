import React, { useEffect } from "react";
import { useLocation } from 'react-router-dom';
import ApiMon from "./ApiMon";
import VisitorMon from "./VisitorMon";

const Monitor = (props) => {

	const location = useLocation();
	
	// Change width by location
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {

			// Writer: 100%
			if("/log/write" === location.pathname) {
				node.style.maxWidth = "100%";
			}
			// Toaster: skip
			else if(node.className.includes("div--toaster")) {
			}
			// Else: to 800px;
			else {
				node.style.maxWidth = "800px";
			}
		}
	}, [location.pathname]);

	return <div className="div div--main-contents">
		<VisitorMon />
		<ApiMon />
	</div>
}

export default Monitor;