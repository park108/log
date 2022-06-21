import React from "react";
import { v4 as uuid } from 'uuid';
import PropTypes from 'prop-types';

import './Toaster.css';

const Toaster = (props) => {

	const id = uuid();

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	const hideToaster = () => {
		if(null !== document.getElementById(id)) {
			document.getElementById(id).className = "div div--toaster-hide";
		}
	}

	// Draw toaster
	if(1 === show) {
		if(duration > 0) {
			setTimeout(props.completed, duration);
		}
	}
	else if(2 === show) {
		setTimeout(hideToaster, 1000);
	}

	const CENTER = "div--toaster-center";
	const BOTTOM = "div--toaster-bottom";

	const INFO = "div--toaster-information";
	const SUCCESS = "div--toaster-success";
	const WARNING = "div--toaster-warning";
	const ERROR = "div--toaster-error";

	const HIDE = "div--toaster-hide";
	const FADE_OUT = "div--toaster-fadeout";

	return (
		<div id={id} className={"div "
				+ (
					"center" === position ? CENTER
					: "bottom" === position ? BOTTOM
					: CENTER
				)
				+ " "
				+ (
					"information" === type ? INFO
					: "success" === type ? SUCCESS
					: "warning" === type ? WARNING
					: "error" === type ? ERROR
					: INFO
				)
				+ " "
				+ (
					0 === show ? HIDE
					: 2 === show ? FADE_OUT
					: ""
				)

				}
			role="alert"
		>
			{message}
		</div>
	);
}

Toaster.propTypes = {
	duration: PropTypes.number,
	show: PropTypes.number,
	position: PropTypes.string,
	message: PropTypes.string,
	type: PropTypes.string,
	completed: PropTypes.func,
};

export default Toaster;