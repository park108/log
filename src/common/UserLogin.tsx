import { useState } from "react";
import type { SyntheticEvent } from "react";
import * as common from '../common/common';
import { isDev, isProd } from './env';
import { activateOnKey } from './a11y';
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

	// activateOnKey 는 `{ key, preventDefault }` 만 요구하는 구조적 부분 타입 (a11y.ts) —
	// React.SyntheticEvent (KeyboardEvent 포함) 또한 적합. handler 시그니처는 호출처 양쪽
	// (onClick: SyntheticEvent / onKeyDown: KeyboardEvent) 호환을 위해 부분 타입으로 좁힌다.
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
