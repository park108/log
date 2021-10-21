import React, { useState, useEffect } from "react";

const Toaster = (props) => {

	const [className, setClassName] = useState("div div--toaster-hide");

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	useEffect(() => {

		let className = "div ";

		// Class by position
		if(undefined === position || "center" === position) {
			className += "div--toaster-center ";
		}
		else if("bottom" === position) {
			className += "div--toaster-bottom ";
		}

		// Class by type
		if(undefined === type || "information" === type) {
			className += "div--toaster-information ";
		}
		else if("success" === type) {
			className += "div--toaster-success ";
		}
		else if("warning" === type) {
			className += "div--toaster-warning ";
		}
		else if("error" === type) {
			className += "div--toaster-error ";
		}

		// Class by show mode
		if(0 === show) {
			// 0: hide
			setClassName("div div--toaster-hide ");
		}
		else if(1 === show) {
			// 1: show
			setClassName(className);
			if(duration > 0) {
				setTimeout(function() {
					setClassName(className + "div--toaster-fadeout ");
					setTimeout(props.completed, 500);
				}, duration);
			}
		}
		else if(2 === show) {
			// 2: fade-out
			setClassName(className + "div--toaster-fadeout ");
			setTimeout(props.completed, 500);
		}
	}, [show, duration, position, type, props.completed]);

	return <div className={className}>
		{message}
	</div>;
}

export default Toaster;