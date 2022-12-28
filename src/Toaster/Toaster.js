import React, { useEffect } from "react";
import { v4 as uuid } from 'uuid';
import PropTypes from 'prop-types';

import './Toaster.css';

const hideToaster = (id) => {
	if(null !== document.getElementById(id)) {
		document.getElementById(id).className = "div div--toaster-hide";
	}
}

const POSITION_STYLE = {
	"center": "div--toaster-center",
	"bottom": "div--toaster-bottom",
	undefined: "div--toaster-center"
};

const TYPE_STYLE = {
	"information": "div--toaster-information",
	"success": "div--toaster-success",
	"warning": "div--toaster-warning",
	"error": "div--toaster-error",
	undefined: "div--toaster-information"
};

const SHOW_STYLE = [
	"div--toaster-hide", // 0: hide
	"", // 1: show
	"div--toaster-fadeout" // 2: fadeout
];

const Toaster = (props) => {

	const id = uuid();

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	useEffect(() => {
		if(1 === show) {
			if(duration > 0) {
				setTimeout(props.completed, duration);
			}
		}
		else if(2 === show) {
			setTimeout(() => { hideToaster(id) }, 1000);
		}
	}, [show]);

	return (
		<div id={id}
			className={ "div " + POSITION_STYLE[position] + " " + TYPE_STYLE[type] + " " + SHOW_STYLE[show] }
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