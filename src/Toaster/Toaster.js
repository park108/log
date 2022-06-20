import React from "react";
import PropTypes from 'prop-types';

import './Toaster.css';

const Toaster = (props) => {

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	// Draw toaster
	if(duration > 0 && show > 0) {
		setTimeout(props.completed, duration);
	}

	return (
		<div className={"div "
				+ (
					undefined === position ? "div--toaster-center"
					: "center" === position ? "div--toaster-center"
					: "bottom" === position ? "div--toaster-bottom"
					: ""
				)
				+ " "
				+ (
					undefined === type ? "div--toaster-information"
					: "information" === type ? "div--toaster-information"
					: "success" === type ? "div--toaster-success"
					: "warning" === type ? "div--toaster-warning"
					: "error" === type ? "div--toaster-error"
					: ""
				) + " "
				+ (
					0 === show ? "div--toaster-hide"
					: 2 === show ? "div--toaster-fadeout"
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