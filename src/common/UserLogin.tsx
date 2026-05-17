import type { SyntheticEvent } from "react";
import * as common from '../common/common';
import { isDev, isProd } from './env';
import { activateOnKey } from './a11y';

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

	// activateOnKey 는 `{ key, preventDefault }` 만 요구하는 구조적 부분 타입 (a11y.ts) —
	// React.SyntheticEvent (KeyboardEvent 포함) 또한 적합. handler 시그니처는 호출처 양쪽
	// (onClick: SyntheticEvent / onKeyDown: KeyboardEvent) 호환을 위해 부분 타입으로 좁힌다.
	const handleLoginClick = (e: { preventDefault: () => void }): void => {
		e.preventDefault();

		if(common.isLoggedIn()) {
			common.deleteCookie("access_token");
			const url = getLogoutUrl();
			if (url) window.location.href = url;
		}
		else {
			const url = getLoginUrl();
			if (url) window.location.href = url;
		}
	};

	return (
		<span
			role="button"
			data-testid="login-button"
			tabIndex={0}
			className="span span--login-text"
			onClick={(e: SyntheticEvent) => handleLoginClick(e)}
			onKeyDown={activateOnKey(handleLoginClick)}
		>
			{ common.isLoggedIn() ? "👨‍💻 Jongkil Park" : "Jongkil Park" }
		</span>
	);
}

export default UserLogin;
