import React, { useState, useEffect } from "react";

import './Toaster.css';

const Toaster = (props) => {

	const [className, setClassName] = useState("div div--toaster-hide");

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	// Set toaster style
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
		// 0: hide
		if(0 === show) {
			setClassName("div div--toaster-hide");
		}
		
		// 1: show
		else if(1 === show) {

			setClassName(className);

			if(duration > 0) {
				setTimeout(function() {
					setClassName(className + " div--toaster-fadeout");
					setTimeout(props.completed, 1000);
				}, duration);
			}
		}

		// 2: fade-out
		else if(2 === show) {
			setClassName(className + " div--toaster-fadeout");
			setTimeout(props.completed, 1000);
		}
		
	}, [show, duration, position, type, props.completed]);

	// Draw toaster
	return (
		<div className={className} role="alert">
			{message}
		</div>
	);
}

export default Toaster;