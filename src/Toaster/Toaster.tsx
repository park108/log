import React, { useEffect, useRef } from "react";

import styles from './Toaster.module.css';

type ToasterPosition = "center" | "bottom";
type ToasterType = "information" | "success" | "warning" | "error";
type ToasterShow = 0 | 1 | 2;

interface ToasterProps {
	duration?: number;
	show?: ToasterShow;
	position?: ToasterPosition;
	message?: string;
	type?: ToasterType;
	completed?: () => void;
}

const POSITION_STYLE: Record<string, string | undefined> = {
	"center": styles.divToasterCenter,
	"bottom": styles.divToasterBottom,
	undefined: styles.divToasterCenter
};

const TYPE_STYLE: Record<string, string | undefined> = {
	"information": styles.divToasterInformation,
	"success": styles.divToasterSuccess,
	"warning": styles.divToasterWarning,
	"error": styles.divToasterError,
	undefined: styles.divToasterInformation
};

const SHOW_STYLE: ReadonlyArray<string | undefined> = [
	styles.divToasterHide, // 0: hide
	"", // 1: show
	styles.divToasterFadeout // 2: fadeout
];

const Toaster = (props: ToasterProps): React.ReactElement => {

	const divRef = useRef<HTMLDivElement | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const duration = props.duration;
	const show = props.show;
	const position = props.position;
	const message = props.message;
	const type = props.type;

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (1 === show) {
			if ((duration as number) > 0) {
				timerRef.current = setTimeout(props.completed as () => void, duration as number);
			}
		} else if (2 === show) {
			timerRef.current = setTimeout(() => {
				if (divRef.current) {
					divRef.current.classList.add(styles.divToasterHide as string);
				}
			}, 1000);
		}
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [show]);

	return (
		<div ref={divRef}
			className={ [POSITION_STYLE[position as string], TYPE_STYLE[type as string], SHOW_STYLE[show as number]].filter(Boolean).join(' ') }
			role="alert"
			data-position={position ?? 'center'}
			data-type={type ?? 'information'}
			data-show={typeof show === 'number' ? String(show) : 'none'}
		>
			{message}
		</div>
	);
}

export default Toaster;
