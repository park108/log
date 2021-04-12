export function parseJwt (token) {

	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));

	return JSON.parse(jsonPayload);
};

export const getUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://park108.net/log";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "http://localhost:3000/log";
	}
}

export const getAPI = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/test"; // TODO: Deploy prod API gateway
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([$?*|{}^])/g, '\\$1') + "=([^;]*)"
	));

	return matches ? decodeURIComponent(matches[1]) : undefined;
}

export function setCookie(name, value, options = {}) {

	options = {
		path: '/',
		...options
	};

	if (options.expires instanceof Date) {
		options.expires = options.expires.toUTCString();
	}

	let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

	for (let optionKey in options) {
		updatedCookie += "; " + optionKey;
		let optionValue = options[optionKey];
		if (optionValue !== true) {
			updatedCookie += "=" + optionValue;
		}
	}

	document.cookie = updatedCookie;
}

export function deleteCookie(name) {
	setCookie(name, "", {
		'max-age': -1
	})
}

export function auth() {

	const token = new URLSearchParams(window.location.href).get("access_token");

	if(null != token) {

		let site = "";
		if ('production' === process.env.NODE_ENV) {
			site = "park108.net";
		}
		else if ('development' === process.env.NODE_ENV) {
			site = "localhost:3000";
		}

		setCookie("access_token", token, {
			secure: true,
			site: site
		});
	}
}

export function isLoggedIn() {

	if(undefined === getCookie("access_token")) {
		return false;
	}
	else {
		return true;
	}
}

// TODO: change user id hard coding to IAM authorization
export function isAdmin() {

	if(!isLoggedIn()) {
		return false;
	}

	const userId = parseJwt(getCookie("access_token")).username;

	if ('production' === process.env.NODE_ENV
		&& "df256e56-7c24-4b19-9172-10acc47ab8f4" === userId) {
		return true;
	}
	else if ('development' === process.env.NODE_ENV
		&& "051fd5f9-a336-4055-96e5-6e1e125ebd15" === userId) {
		return true;
	}

	return false;
}

export function convertToHTML (input) {

	return input.replace(/(\n|\r\n)/g, "<br />");
}