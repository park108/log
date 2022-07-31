export const setHtmlTitle = (title) => {
	if(process.env.NODE_ENV === 'production') {
		document.title = title + " - park108.net";
	}
	else if(process.env.NODE_ENV === 'development') {
		document.title = "[DEV] " + title + " - park108.net";
	}
}

export const hasValue = (obj) => {
	return (undefined !== obj
		&& null !== obj
		&& "undefined" !== obj
		&& "null" !== obj
	);
}

export const log = (logText, type = "INFO") => {
	if (process.env.NODE_ENV === 'production') {
		// Nothing to do
	}
	else if (process.env.NODE_ENV === 'development') {
		switch(type) {
			case "INFO": console.log(logText); break;
			case "ERROR": console.error(logText); break;
			default: console.log(logText);
		}
	}
}

export function parseJwt (token) {

	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));

	return JSON.parse(jsonPayload);
}

export const getUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://www.park108.net/";
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
	return hasValue(getCookie("access_token"));
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

export function convertToHTML(input) {
	return input.replace(/(\n|\r\n)/g, "<br />");
}

export function decodeHTML(input) {
	return input.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function getFormattedDate(timestamp, format = "yyyy-mm-dd") {

	const date = new Date(timestamp);
	
	const yyyy = date.getFullYear();
	const mm = date.getMonth() + 1;
	const dd = date.getDate();

	if("date mon year" === format) {
		const month = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		return dd + " " + month[mm] + " '" + (yyyy % 100);
	}
	else {
	
		const formattedDate = yyyy + "-"
			+ (mm < 10 ? "0" + mm : mm) + "-"
			+ (dd < 10 ? "0" + dd : dd);

		return formattedDate;
	}
}

export function getFormattedTime(timestamp) {

	const time = new Date(timestamp);

	const hh = time.getHours();
	const min = time.getMinutes();
	const ss = time.getSeconds();

	const formattedTime = (hh < 10 ? "0" + hh : hh) + ":"
		+ (min < 10 ? "0" + min : min) + ":"
		+ (ss < 10 ? "0" + ss : ss);

	return formattedTime;
}

export function getFormattedSize(size) {

	let unit = "";
	let scaled = size;

	if(0 === scaled) {
		unit = "";
	}
	else if(1000 > scaled) {
		unit = "bytes";
	}
	
	if(1000 <= scaled) {
		scaled = (scaled / 1000).toFixed(2);
		unit = "KB";
	}

	if(1000 <= scaled) {
		scaled = (scaled / 1000).toFixed(2);
		unit = "MB";
	}

	if(1000 <= scaled) {
		scaled = (scaled / 1000).toFixed(2);
		unit = "GB";
	}

	if(1000 <= scaled) {
		scaled = (scaled / 1000).toFixed(2);
		unit = "TB";
	}

	if(1000 <= scaled) {
		scaled = (scaled / 1000).toFixed(1);
		unit = "PB";
	}

	return Number(scaled).toLocaleString() + " " + unit;
}

export function getWeekday(timestamp) {

	const time = new Date(timestamp);

	const weekNo = time.getDay();

	return 0 === weekNo ? "Sun"
		: 1 === weekNo ? "Mon"
		: 2 === weekNo ? "Tue"
		: 3 === weekNo ? "Wed"
		: 4 === weekNo ? "Thu"
		: 5 === weekNo ? "Fri"
		: "Sat";
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

export const setFullscreen = (isFullscreen) => {

	let root = document.getElementById("root");
	console.log(root);

	if(undefined !== root && null !== root) {
		if(isFullscreen) {
			root.setAttribute("class", "div fullscreen");
		}
		else {
			root.setAttribute("class", "div");
		}
	}
}

export const userAgentParser = () => {

	let uaText = navigator.userAgent;
  
	// Parser reference
	// 1. https://developer.mozilla.org/ko/docs/Web/HTTP/Browser_detection_using_the_user_agent
	// 2. https://developers.whatismybrowser.com/useragents/explore
	// Browser
	let browser = uaText.indexOf("Firefox/") > -1 ? "Firefox"
		: uaText.indexOf("Seamonkey/") > -1 ? "Seamonkey"
		: uaText.indexOf("KAKAOTALK") > -1 ? "Kakaotalk"
		: uaText.indexOf("Chrome/") > -1 ? "Chrome"
		: uaText.indexOf("CriOS/") > -1 ? "Chrome"	  
		: uaText.indexOf("Chromium/") > -1 ? "Chromium"
		: uaText.indexOf("Safari/") > -1 ? "Safari"
		: uaText.indexOf("OPR/") > -1 ? "Opera"
		: uaText.indexOf("Opera/") > -1 ? "Opera"
		: uaText.indexOf("; MSIE ") > -1 ? "Internet Explorer"
		: "Others";
  
  
	// Rendering engine
	let renderingEngine = uaText.indexOf("Gecko/") > -1 ? "Gecko"
		: uaText.indexOf("AppleWebKit/") > -1 ? "Webkit"
		: uaText.indexOf("Opera/") > -1 ? "Presto"
		: uaText.indexOf("Trident/") > -1 ? "Trident"
		: uaText.indexOf("Chrome/") > -1 ? "Blink"
		: "Others";
  
	// Operating system
	let operatingSystem = uaText.indexOf("Android") > -1 ? "Android"
		: uaText.indexOf("iPhone OS") > -1 ? "iOS"
		: uaText.indexOf("Windows") > -1 ? "Windows"
		: uaText.indexOf("Mac OS X") > -1 ? "Mac OS X"
		: uaText.indexOf("(X11; CrOS") > -1 ? "Chrome OS"
		: uaText.indexOf("X11") > -1 ? "Linux"
		: uaText.indexOf("Symbian") > -1 ? "Symbian"
		: "Others";
  
	// Make posting data
	const userAgentInfo = {
		url: getUrl(),
		originalText: uaText,
		browser: browser,
		renderingEngine: renderingEngine,
		operatingSystem: operatingSystem
	}

	return userAgentInfo;
}