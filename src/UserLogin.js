import React from "react";
import * as common from './common';
import { ReactComponent as EnterButton } from './static/enter.svg';

export const getLoginUrl = () => {
	if ('production' === process.env.NODE_ENV) {
		return "https://log.auth.ap-northeast-2.amazoncognito.com/login?client_id=5obtheulb7olv5uhnkubuldgqj&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=https://park108.net";
	}
	else if ('development' === process.env.NODE_ENV) {
		return "https://log-dev.auth.ap-northeast-2.amazoncognito.com/login?client_id=h3m92a27t39sfcat302tiqtko&response_type=token&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=http://localhost:3000"
	}
}

export const getLogoutUrl = () => {

	if ('production' === process.env.NODE_ENV) {
		return "https://log.auth.ap-northeast-2.amazoncognito.com/logout?client_id=5obtheulb7olv5uhnkubuldgqj&logout_uri=https://park108.net";
	}
	else if ('development' === process.env.NODE_ENV) {
		return "https://log-dev.auth.ap-northeast-2.amazoncognito.com/logout?client_id=h3m92a27t39sfcat302tiqtko&logout_uri=http://localhost:3000";
	}
}

const UserLogin = () => {
	
	const logout = (e) => {
		common.deleteCookie("access_token");
		window.location.href = getLogoutUrl();
	}

	const login = (e) => {
		window.location.href = getLoginUrl();
	}

	let userId = "";

	if(common.isLoggedIn()) {
		userId = common.isAdmin() ? "Jongkil Park ✓" : "Jongkil Park 客";
	}

	if(common.isLoggedIn()) {
		return (
			<span className="span span--login-loggedin" onClick={logout}>{userId}</span>
		);
	}
	else {
		return (
			<span className="span span--login-loggedout" onClick={login}>
				Jongkil Park 
				<EnterButton />
			</span>
		);
	}
}

export default UserLogin;