import React from "react";
// import { useLocation } from 'react-router-dom';
import * as common from '../common/common';

export const getLoginUrl = (redirectUri) => {
	if ('production' === process.env.NODE_ENV) {
		return "https://log.auth.ap-northeast-2.amazoncognito.com/login?client_id=5obtheulb7olv5uhnkubuldgqj&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=https://park108.net" + redirectUri;
	}
	else if ('development' === process.env.NODE_ENV) {
		return "https://log-dev.auth.ap-northeast-2.amazoncognito.com/login?client_id=h3m92a27t39sfcat302tiqtko&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=http://localhost:3000" + redirectUri;
	}
}

export const getLogoutUrl = (logoutUri) => {

	if ('production' === process.env.NODE_ENV) {
		return "https://log.auth.ap-northeast-2.amazoncognito.com/logout?client_id=5obtheulb7olv5uhnkubuldgqj&logout_uri=https://park108.net" + logoutUri;
	}
	else if ('development' === process.env.NODE_ENV) {
		return "https://log-dev.auth.ap-northeast-2.amazoncognito.com/logout?client_id=h3m92a27t39sfcat302tiqtko&logout_uri=http://localhost:3000" + logoutUri;
	}
}

const UserLogin = () => {

	// const location = useLocation();
	// console.log(location);

	return (
		<span
			role="button"
			data-testid="login-button"
			className="span span--login-text"
			onClick={(e) => {

				e.preventDefault();

				// TOOD: 현재 페이지로 리다이렉트
				if(common.isLoggedIn()) {
					common.deleteCookie("access_token");
					window.location.href = getLogoutUrl("");
				}
				else {
					window.location.href = getLoginUrl("");
				}
			}}
		>
			{ common.isLoggedIn() ? "👨‍💻 Jongkil Park" : "Jongkil Park" }
		</span>
	);
}

export default UserLogin;