import { useState } from "react";
import type { SyntheticEvent } from "react";
import * as common from '../common/common';
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
			<button
				type="button"
				data-testid="login-button"
				className="span span--login-text"
				// 실패가 아닐 때는 속성 자체를 렌더하지 않는다 (`aria-disabled="false"` 상시 부여 금지).
				//
				// `disabled` 가 아니라 `aria-disabled` 인 것은 의도다 — `disabled` 는 초점
				// 대상에서 빼버려 스크린리더 사용자가 실패 사실에 도달하지 못한다.
				aria-disabled={entryFailure ? "true" : undefined}
				onClick={(e: SyntheticEvent) => handleLoginClick(e)}
			>
				{ common.isLoggedIn() ? "👨‍💻 Jongkil Park" : "Jongkil Park" }
			</button>
			{ entryFailure && (
				<span role="alert" className="span span--login-error">{ entryFailure }</span>
			) }
		</>
	);
}

export default UserLogin;
