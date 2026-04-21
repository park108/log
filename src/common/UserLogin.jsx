import React from "react";
import * as common from '../common/common';
import { isDev, isProd } from './env';
import { activateOnKey } from './a11y';

export const getLoginUrl = () => {
	if (isProd()) return import.meta.env.VITE_COGNITO_LOGIN_URL_PROD;
	if (isDev()) return import.meta.env.VITE_COGNITO_LOGIN_URL_DEV;
}

export const getLogoutUrl = () => {
	if (isProd()) return import.meta.env.VITE_COGNITO_LOGOUT_URL_PROD;
	if (isDev()) return import.meta.env.VITE_COGNITO_LOGOUT_URL_DEV;
}

const UserLogin = () => {

	const handleLoginClick = (e) => {
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
