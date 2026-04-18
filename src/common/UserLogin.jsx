import React from "react";
import * as common from '../common/common';
import { isDev, isProd } from './env';

export const getLoginUrl = () => {
	if (isProd) return import.meta.env.VITE_COGNITO_LOGIN_URL_PROD;
	if (isDev) return import.meta.env.VITE_COGNITO_LOGIN_URL_DEV;
}

export const getLogoutUrl = () => {
	if (isProd) return import.meta.env.VITE_COGNITO_LOGOUT_URL_PROD;
	if (isDev) return import.meta.env.VITE_COGNITO_LOGOUT_URL_DEV;
}

const UserLogin = () => {

	return (
		<span
			role="button"
			data-testid="login-button"
			className="span span--login-text"
			onClick={(e) => {
				e.preventDefault();

				if(common.isLoggedIn()) {
					common.deleteCookie("access_token");
					window.location.href = getLogoutUrl();
				}
				else {
					window.location.href = getLoginUrl();
				}
			}}
		>
			{ common.isLoggedIn() ? "👨‍💻 Jongkil Park" : "Jongkil Park" }
		</span>
	);
}

export default UserLogin;
