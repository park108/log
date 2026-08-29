import { useState } from "react";
import type { SyntheticEvent } from "react";
import * as common from '../common/common';
import { activateOnKey } from './a11y';
import { isDev, isProd } from './env';
import { reportError } from './errorReporter';

export const getLoginUrl = (): string | undefined => {
	if (isProd()) return import.meta.env.VITE_COGNITO_LOGIN_URL_PROD;
	if (isDev()) return import.meta.env.VITE_COGNITO_LOGIN_URL_DEV;
	return undefined;
}

export const getLogoutUrl = (): string | undefined => {
	if (isProd()) return import.meta.env.VITE_COGNITO_LOGOUT_URL_PROD;
	if (isDev()) return import.meta.env.VITE_COGNITO_LOGOUT_URL_DEV;
	return undefined;
}

const UserLogin = () => {

	// 진입 실패는 reportError 로 보고되지만 그 도달처는 개발자 콘솔이고, 배포 빌드의
	// 관측자 집합에 개발자는 없다. 사용자에게는 "눌리는데 아무 일도 안 일어남" 으로
	// 관측되므로 실패 사유를 상태로 세워 접근성 트리에 반영한다 (보고의 대체가 아니라 동반).
	const [entryFailure, setEntryFailure] = useState<string | null>(null);

	// 핸들러 시그니처를 `{ preventDefault }` 부분 타입으로 좁혀 둔다 — 호출처가
	// 넘기는 이벤트 형태에 묶이지 않는다.
	const handleLoginClick = (e: { preventDefault: () => void }): void => {
		e.preventDefault();

		if(common.isLoggedIn()) {
			common.deleteCookie("access_token");
			const url = getLogoutUrl();
			if (url) {
				setEntryFailure(null);
				window.location.href = url;
			}
			else {
				setEntryFailure("지금은 로그아웃할 수 없습니다. 잠시 후 다시 시도해 주세요.");
				reportError(new Error("logout redirect URL unresolved — VITE_COGNITO_LOGOUT_URL_* missing or blank"));
			}
		}
		else {
			const url = getLoginUrl();
			if (url) {
				setEntryFailure(null);
				window.location.href = url;
			}
			else {
				setEntryFailure("지금은 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
				reportError(new Error("login redirect URL unresolved — VITE_COGNITO_LOGIN_URL_* missing or blank"));
			}
		}
	};

	return (
		<>
			{/* **네이티브 button 으로 바꾸지 않는다 (운영자 지시, 2026-08-29).**
			    이 진입점은 눈에 띄지 않아야 한다 — 푸터의 이름처럼 보이게 두는 것이
			    의도다. button 으로 바꾸면 브라우저 기본 테두리·배경이 드러나 그 의도가
			    깨진다 (실제로 한 번 깨뜨렸다). 스타일 리셋으로 감출 수도 있으나,
			    요소 선택 자체가 의도적이라는 지시를 받았으므로 span 을 유지한다.

			    `aria-disabled` 가 `disabled` 가 아닌 것도 의도다 — `disabled` 는 초점
			    대상에서 빼버려 실패 사실에 도달하지 못하게 한다. */}
			<span
				role="button"
				data-testid="login-button"
				tabIndex={0}
				className="span span--login-text"
				// 실패가 아닐 때는 속성 자체를 렌더하지 않는다 (`aria-disabled="false"` 상시 부여 금지).
				aria-disabled={entryFailure ? "true" : undefined}
				onClick={(e: SyntheticEvent) => handleLoginClick(e)}
				onKeyDown={activateOnKey(handleLoginClick)}
			>
				{ common.isLoggedIn() ? "👨‍💻 Jongkil Park" : "Jongkil Park" }
			</span>
			{ entryFailure && (
				<span role="alert" className="span span--login-error">{ entryFailure }</span>
			) }
		</>
	);
}

export default UserLogin;
