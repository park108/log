import { isDev, isProd } from './env';

export const setHtmlTitle = (title) => {
	if(isProd()) {
		document.title = title + " - park108.net";
	}
	else if(isDev()) {
		document.title = "[DEV] " + title + " - park108.net";
	}
}

const DEFAULT_META_DESCRIPTION = "park108.net is a personal journal of Jongkil Park the developer";

export const setMetaDescription = (desc = DEFAULT_META_DESCRIPTION) => {
	const meta = document.getElementsByTagName('meta');
	if(meta.description !== undefined) {
		meta.description.content = desc;
	}
}

export const hasValue = (obj) => {
	return (undefined !== obj
		&& null !== obj
		&& "undefined" !== obj
		&& "null" !== obj
		&& "" !== obj
		&& 0 !== obj
	);
}

export const log = (logText, type = "INFO") => {
	if (isDev()) {

		const now = Math.floor(new Date().getTime());
		const timestampFormat = getFormattedDate(now) + " " + getFormattedTime(now) + " ";

		switch(type) {
			case "ERROR": console.log(timestampFormat + "%c" + logText, "color: red"); break;
			case "SUCCESS": console.log(timestampFormat + "%c" + logText, "color: green"); break;
			default: console.log(timestampFormat + logText);
		}
	}
}

export function parseJwt (token) {

	// Input guard (REQ-20260418-032 FR-01): non-string / empty / malformed → null sentinel.
	if (!token || typeof token !== 'string') return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const base64Url = parts[1];
	if (!base64Url) return null;

	try {
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
			return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
		}).join(''));

		return JSON.parse(jsonPayload);
	} catch {
		// atob / decodeURIComponent / JSON.parse 실패 흡수 — 호출부는 null 판정.
		return null;
	}
}

export const getUrl = () => {
	if (isProd()) {
		return "https://www.park108.net/";
	}
	else if (isDev()) {
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

	// REQ-20260421-032 FR-01/06: Cognito Hosted UI implicit flow (`response_type=token`) 는
	// 모든 토큰을 URL hash fragment 단일 구역에 `&` 로 연결해 반환한다.
	// (예: `https://<host>/#access_token=<v>&id_token=<v>&expires_in=<n>&token_type=Bearer`)
	// 따라서 hash fragment 를 `URLSearchParams` 로 우선 파싱하고, 부재 시 query string 으로 fallback.
	// 수동 `indexOf` / `substring` 파싱은 제거 (trailing 파라미터 부재 시 전체 href 를 id_token 값으로
	// 오인하는 기존 회귀 방지).
	const u = new URL(window.location.href);
	const hashParams = new URLSearchParams(
		u.hash.startsWith('#') ? u.hash.slice(1) : u.hash,
	);

	const accessToken = hashParams.get("access_token") ?? u.searchParams.get("access_token");
	const idToken = hashParams.get("id_token") ?? u.searchParams.get("id_token");

	if (accessToken !== null && accessToken !== undefined) {

		// RFC 6265bis (REQ-20260421-025 FR-01): SameSite 속성은 Strict | Lax | None 중 하나만 유효.
		// Cognito Hosted UI redirect 후 top-level navigation 경로에서 쿠키가 전송되어야 하므로 "Lax" 고정.
		// setCookie 는 options key 를 그대로 cookie string 에 직렬화하므로 표준 속성명 대문자 "SameSite" 로 주입.
		// 직렬화 결과: "access_token=<v>; path=/; secure; SameSite=Lax; maxAge=3600" (브라우저 인식 속성명 정합).
		setCookie("access_token", accessToken, {
			secure: true,
			SameSite: "Lax",
			maxAge: 3600,
		});

		// id_token 이 null 이면 id_token 쿠키를 세팅하지 않는다 (안전 fallthrough).
		// 기존 `substring` 구현은 `idTokenStart === -1` 에도 전체 href 를 반환하는 버그가 있었다.
		if (idToken !== null && idToken !== undefined) {
			setCookie("id_token", idToken, {
				secure: true,
				SameSite: "Lax",
				maxAge: 3600,
			});
		}
	}
}

export function isLoggedIn() {
	return hasValue(getCookie("access_token"));
}

// TODO: change user id hard coding to IAM authorization (REQ-20260421-017 임시 조치: VITE_ADMIN_USER_ID_* env 외부화 — 차후 IAM 권한화 마일스톤에서 제거 예정)
export function isAdmin() {

	if (isDev()) log(`isAdmin: cookie=${isLoggedIn()} env=${isProd() ? 'prod' : isDev() ? 'dev' : 'none'}`, "DEBUG");

	if(!isLoggedIn()) {
		return false;
	}

	// Fail-safe (REQ-20260418-032 FR-02): parseJwt 는 손상 토큰에 대해 null 을 반환한다.
	// 그 경우 비-admin 으로 귀결시켜 App 마운트 시 throw 전파를 차단한다.
	const payload = parseJwt(getCookie("access_token"));
	if (!payload) return false;
	const userId = payload.username;

	if (isProd()
		&& (import.meta.env.VITE_ADMIN_USER_ID_PROD || '') === userId) {
		return true;
	}
	else if (isDev()
		&& (import.meta.env.VITE_ADMIN_USER_ID_DEV || '') === userId) {
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

export const hoverPopup = (e, popupElementId) => {
	
	const popup = document.getElementById(popupElementId);
	const currentDisplay = popup.style.display;

	if("mouseover" === e.type) {
		if(currentDisplay === "none") {
			popup.style.display = "";
		}
	}
	else if("mousemove" === e.type) {
		const left  = e.clientX  + 5 + "px";
		const top  = e.clientY  + 5 + "px";
		popup.style.left = left;
		popup.style.top = top;
	}
	else {
		if(currentDisplay !== "none") {
			popup.style.display = "none";
		}
	}
}


export const copyToClipboard = async (value = "") => {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(value);
			log("Copy to Clipboard: " + value);
			return true;
		} catch (err) {
			log("Clipboard write rejected: " + err.message, "ERROR");
			return false;
		}
	}
	log("Clipboard API unavailable", "ERROR");
	return false;
};