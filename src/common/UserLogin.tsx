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

	const handleLoginClick = (e: SyntheticEvent) => {
		e.preventDefault();

		if(common.isLoggedIn()) {
			common.deleteCookie("access_token");
			window.location.href = getLogoutUrl();
		}
		else {
			window.location.href = getLoginUrl();
		}
	};

	return (
		<span
			role="button"
			data-testid="login-button"
			tabIndex={0}
			className="span span--login-text"
			onClick={handleLoginClick}
			onKeyDown={activateOnKey(handleLoginClick)}
		>
			{ common.isLoggedIn() ? "👨‍💻 Jongkil Park" : "Jongkil Park" }
		</span>
	);
}

export default UserLogin;
