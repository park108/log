import React, { useEffect } from "react";
import PropTypes from 'prop-types';

import styles from './Toaster.module.css';

const hideToaster = (id) => {
	const el = document.getElementById(id);
	if(null !== el) {
		el.className = styles.divToasterHide;
	}
}

const POSITION_STYLE = {
	"center": styles.divToasterCenter,
	"bottom": styles.divToasterBottom,
	undefined: styles.divToasterCenter
};

const TYPE_STYLE = {
	"information": styles.divToasterInformation,
	"success": styles.divToasterSuccess,
	"warning": styles.divToasterWarning,
	"error": styles.divToasterError,
	undefined: styles.divToasterInformation
};

const SHOW_STYLE = [
	styles.divToasterHide, // 0: hide
	"", // 1: show
	styles.divToasterFadeout // 2: fadeout
];

const Toaster = (props) => {

	const id = crypto.randomUUID();

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
			className={ [POSITION_STYLE[position], TYPE_STYLE[type], SHOW_STYLE[show]].filter(Boolean).join(' ') }
			role="alert"
			data-position={position ?? 'center'}
			data-type={type ?? 'information'}
			data-show={typeof show === 'number' ? String(show) : 'none'}
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
