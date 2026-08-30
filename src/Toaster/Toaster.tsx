import React, { useEffect, useRef } from "react";

import styles from './Toaster.module.css';

type ToasterPosition = "center" | "bottom";
export type ToasterType = "information" | "success" | "warning" | "error";
export type ToasterShow = 0 | 1 | 2;

interface ToasterBaseProps {
	show?: ToasterShow;
	position?: ToasterPosition;
	message?: string;
	type?: ToasterType;
}

// `duration` 과 `completed` 는 짝이다 — 타이머가 부를 대상이 `completed` 다.
// 둘을 각각 선택 속성으로 두면 `duration` 만 넘긴 조합이 타입을 통과하고,
// 그때 `setTimeout(undefined, ms)` 가 던진다 (실측: "Callback must be provided
// to timer calls"). 라우트가 ErrorBoundary 로 감싸여 있으므로 페이지 전체가
// 오류 화면이 된다. 현 호출처 13곳은 모두 둘 다 넘기거나 둘 다 안 넘긴다 —
// 그 사실을 타입으로 못 박아 조합 자체를 만들 수 없게 한다.
type ToasterProps = ToasterBaseProps & (
	{ duration?: undefined; completed?: undefined }
	| { duration: number; completed: () => void }
);

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

	// 본문 첫머리에 있던 방어적 clearTimeout 은 **도달 불가**였다 (2026-08-29).
	// React 는 deps 변경 시 cleanup 을 먼저 실행하고, 그 cleanup 이 timerRef 를
	// null 로 만든다 — 마운트 시에도 null 이므로 `if (timerRef.current)` 가 참이
	// 되는 경로가 없다. 커버리지가 그 두 줄을 끝내 못 덮은 것이 그 증거다.
	// 타이머 해제 책임은 아래 cleanup 단일 지점이 진다.
	useEffect(() => {
		if (1 === show) {
			// 캐스트를 쓰지 않는다 — 타입이 짝을 보장하더라도, 실제 검사를 두어야
			// 계약이 바뀌었을 때 조용히 통과하지 않는다.
			if (undefined !== duration && duration > 0 && props.completed) {
				timerRef.current = setTimeout(props.completed, duration);
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
		// `props.completed` 는 전 호출처가 인라인 화살표로 넘긴다 — deps 에 넣으면 부모가
		// 리렌더할 때마다 타이머가 리셋돼 자동 닫힘이 영영 발화하지 않는다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
