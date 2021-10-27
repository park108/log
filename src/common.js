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
		return "https://park108.net/";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "http://localhost:3000/";
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
	
	const accessToken = new URLSearchParams(window.location.href).get("access_token");

	const idTokenStart = window.location.href.indexOf("#id_token=");
	const idTokenEnd = window.location.href.indexOf("&", idTokenStart);
	const idToken = window.location.href.substring(idTokenStart + 10, idTokenEnd);

	if(null != accessToken) {

		let site = "";
		if ('production' === process.env.NODE_ENV) {
			site = "park108.net";
		}
		else if ('development' === process.env.NODE_ENV) {
			site = "localhost:3000";
		}

		setCookie("access_token", accessToken, {
			secure: true,
			site: site
		});

		setCookie("id_token", idToken, {
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

export function decodeHTML (input) {

	return input.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function getFormattedDate(timestamp) {

	const date = new Date(timestamp);
	
	const yyyy = date.getFullYear();
	const mm = date.getMonth() + 1;
	const dd = date.getDate();
	
	const formattedDate = yyyy + "-"
		+ (mm < 10 ? "0" + mm : mm) + "-"
		+ (dd < 10 ? "0" + dd : dd);

	return formattedDate;
}

export function getFormattedTime(timestamp) {

	const time = new Date(timestamp);

	const hh = time.getHours();
	const min = time.getMinutes();
	const ss = time.getSeconds();

	const formattedTime = " "
		+ (hh < 10 ? "0" + hh : hh) + ":"
		+ (min < 10 ? "0" + min : min) + ":"
		+ (ss < 10 ? "0" + ss : ss);

	return formattedTime;
}

export const confirm = (message = "", onConfirm, onCancel) => {

	if (!onConfirm || typeof onConfirm !== "function") {
		return;
	}
	if (onCancel && typeof onCancel !== "function") {
		return;
	}

	const confirmAction = () => {
		if (window.confirm(message)) {
			onConfirm();
		} else {
			onCancel();
		}
	};

	return confirmAction;
}

export const isMobile = () => {
	let hasTouchPoint = navigator.maxTouchPoints;
	return hasTouchPoint > 0;
}

export const log = (wannaLogging) => {
	if (process.env.NODE_ENV === 'production') {
		console.log(wannaLogging);
	}
	else if (process.env.NODE_ENV === 'development') {
		console.log(wannaLogging);
	}
}