import React, { useState, useEffect } from "react";

import './Toaster.css';

const Toaster = (props) => {

	const [className, setClassName] = useState("div div--toaster-hide");

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	useEffect(() => {

		let className = "div";

		// Class by position
		className += (undefined === position || "center" === position) ? " div--toaster-center"
			: ("bottom" === position) ? " div--toaster-bottom"
			: "";

		// Class by type
		className += (undefined === type || "information" === type) ? " div--toaster-information"
			: ("success" === type) ? " div--toaster-success"
			: ("warning" === type) ? " div--toaster-warning"
			: ("error" === type) ? " div--toaster-error"
			: "";

		// Class by show mode
		if(0 === show) {
			// 0: hide
			setClassName("div div--toaster-hide");
		}
		else if(1 === show) {
			// 1: show
			setClassName(className);
			if(duration > 0) {
				setTimeout(function() {
					setClassName(className + " div--toaster-fadeout");
					setTimeout(props.completed, 1000);
				}, duration);
			}
		}
		else if(2 === show) {
			// 2: fade-out
			setClassName(className + " div--toaster-fadeout");
			setTimeout(props.completed, 1000);
		}
	}, [show, duration, position, type, props.completed]);

	return (
		<div className={className} role="alert">
			{message}
		</div>
	);
}

export default Toaster;