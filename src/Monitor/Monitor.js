import React, { useEffect } from "react";
import ApiMon from "./ApiMon";
import VisitorMon from "./VisitorMon";
import * as common from '../common';

const Monitor = (props) => {
	
	useEffect(() => {

		// Change width
		const div = document.getElementsByTagName("div");

		for(let node of div) {
			if(node.className.includes("div--toaster")) {
				node.style.maxWidth = "100%";
			}
			else {
				node.style.maxWidth = common.CONSTANTS.MAX_DIV_WIDTH;
			}
		}

	}, []);

	return <div className="div div--main-contents">
		<VisitorMon />
		<ApiMon />
	</div>
}

export default Monitor;