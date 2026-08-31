import { isDev, isProd } from './env';

export const setHtmlTitle = (title: string): void => {
	if(isProd()) {
		document.title = title + " - park108.net";
	}
	else if(isDev()) {
		document.title = "[DEV] " + title + " - park108.net";
	}
}

const DEFAULT_META_DESCRIPTION = "park108.net 은 개발자 박종길의 개인 기록장입니다";

export const setMetaDescription = (desc: string = DEFAULT_META_DESCRIPTION): void => {
	// `document.getElementsByTagName('meta')` 는 HTMLCollection 이지만, jsdom/legacy 코드 호환을 위해
	// `name="description"` 첫 매치를 직접 조회. 과거 `meta.description` 표기는 비표준 named-item 접근.
	const metaEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
	if (metaEl) {
		metaEl.content = desc;
	}
}

export const hasValue = (obj: unknown): boolean => {
	return (undefined !== obj
		&& null !== obj
		&& "undefined" !== obj
		&& "null" !== obj
		&& "" !== obj
		&& 0 !== obj
	);
}

export const log = (logText: string, type: string = "INFO"): void => {
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

export function parseJwt (token: unknown): Record<string, unknown> | null {

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

export const getUrl = (): string | undefined => {
	if (isProd()) {
		return "https://www.park108.net/";
	}
	else if (isDev()) {
		return "http://localhost:3000/";
	}
	return undefined;
}

export function getCookie(name: string): string | undefined {
	const matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([$?*|{}^])/g, '\\$1') + "=([^;]*)"
	));

	return matches && matches[1] !== undefined ? decodeURIComponent(matches[1]) : undefined;
}

type CookieOptionValue = string | number | boolean | Date;
type CookieOptions = Record<string, CookieOptionValue>;

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {

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

export function deleteCookie(name: string): void {
	setCookie(name, "", {
		'max-age': -1
	})
}

export function auth(): void {

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
		// 지속 속성은 RFC 6265 §5.2.2 표준명 "Max-Age" (하이픈 필수) 로 주입 — camelCase `maxAge` 는
		// 브라우저가 인식하지 못해 세션 쿠키로 강등됨 (REQ-20260421-032 FR-04/07).
		// 직렬화 결과: "access_token=<v>; path=/; secure; SameSite=Lax; max-age=3600" (브라우저 인식 속성명 정합).
		setCookie("access_token", accessToken, {
			secure: true,
			SameSite: "Lax",
			'max-age': 3600,
		});

		// id_token 이 null 이면 id_token 쿠키를 세팅하지 않는다 (안전 fallthrough).
		// 기존 `substring` 구현은 `idTokenStart === -1` 에도 전체 href 를 반환하는 버그가 있었다.
		if (idToken !== null && idToken !== undefined) {
			setCookie("id_token", idToken, {
				secure: true,
				SameSite: "Lax",
				'max-age': 3600,
			});
		}
	}

	// **토큰을 쿠키로 옮겼으면 주소에서 지운다.**
	//
	// implicit flow 는 토큰을 주소에 실어 돌려준다. 그것을 그대로 두면
	// `https://www.park108.net/#access_token=eyJ…&id_token=eyJ…` 가 주소창에
	// 남고 방문기록에 박히고 화면 공유에 찍힌다. 로그인 직후는 주소를 복사해
	// 남에게 보내기 쉬운 순간이기도 하다 — 그러면 살아 있는 토큰을 함께 보낸다.
	//
	// 쿠키에 옮긴 뒤에는 주소에 있을 이유가 없다. 토큰 파라미터가 실제로 있을
	// 때만 손대고, 같은 자리의 다른 값(질의 문자열·앵커)은 그대로 둔다.
	stripAuthParamsFromUrl(u);
}

// implicit flow 가 주소에 싣는 파라미터. 쿠키로 옮긴 뒤에는 남길 이유가 없다.
const AUTH_URL_PARAMS = [
	"access_token", "id_token", "refresh_token",
	"expires_in", "token_type",
] as const;

const stripAuthParamsFromUrl = (url: URL): void => {

	const hashParams = new URLSearchParams(
		url.hash.startsWith('#') ? url.hash.slice(1) : url.hash,
	);

	let touched = false;
	for (const key of AUTH_URL_PARAMS) {
		if (hashParams.has(key)) { hashParams.delete(key); touched = true; }
		if (url.searchParams.has(key)) { url.searchParams.delete(key); touched = true; }
	}

	// 토큰이 애초에 없던 평범한 이동은 건드리지 않는다 — 그때 replaceState 를
	// 부르면 아무 이유 없이 방문기록 항목을 덮어쓴다.
	if (!touched) return;

	// 앵커나 다른 fragment 값은 살린다. 남은 것이 없으면 `#` 자체를 지운다.
	const remainingHash = hashParams.toString();
	const cleaned = url.pathname + url.search + (remainingHash ? "#" + remainingHash : "");

	if (typeof window.history?.replaceState === 'function') {
		window.history.replaceState(null, '', cleaned);
	}
};

export function isLoggedIn(): boolean {
	return hasValue(getCookie("access_token"));
}

// REQ-20260421-038 FR-04 (α): admin group 이름은 리터럴 상수 1회 박제.
const ADMIN_GROUP = 'admin';

export function isAdmin(): boolean {

	if (isDev()) log(`isAdmin: cookie=${isLoggedIn()} env=${isProd() ? 'prod' : isDev() ? 'dev' : 'none'}`, "DEBUG");

	if(!isLoggedIn()) {
		return false;
	}

	// Fail-safe (REQ-20260418-032 FR-02): parseJwt 는 손상 토큰에 대해 null 을 반환한다.
	// 그 경우 비-admin 으로 귀결시켜 App 마운트 시 throw 전파를 차단한다.
	const payload = parseJwt(getCookie("access_token"));
	if (!payload) return false;

	// REQ-20260421-038 FR-01/02: 판정 경로는 payload 의 `cognito:groups` 배열이
	// ADMIN_GROUP 을 포함하는 경우에만 true. 필드 부재·null·비-배열·빈 배열 → false.
	const groups = payload['cognito:groups'];
	if (!Array.isArray(groups)) return false;
	return groups.includes(ADMIN_GROUP);
}

export function convertToHTML(input: string): string {
	return input.replace(/(\n|\r\n)/g, "<br />");
}

export function decodeHTML(input: string): string {
	return input.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function getFormattedDate(timestamp: number, format: string = "yyyy-mm-dd"): string {

	const date = new Date(timestamp);
	
	const yyyy = date.getFullYear();
	const mm = date.getMonth() + 1;
	const dd = date.getDate();

	if("date mon year" === format) {
		const month = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		// 두 자리로 채운다. `yyyy % 100` 을 그대로 쓰면 2005 가 `'5`, 2000 이
		// `'0` 이 된다 — 연도로 읽히지 않는다.
		const shortYear = String(yyyy % 100).padStart(2, "0");
		return dd + " " + month[mm] + " '" + shortYear;
	}
	else {
	
		const formattedDate = yyyy + "-"
			+ (mm < 10 ? "0" + mm : mm) + "-"
			+ (dd < 10 ? "0" + dd : dd);

		return formattedDate;
	}
}

export function getFormattedTime(timestamp: number): string {

	const time = new Date(timestamp);

	const hh = time.getHours();
	const min = time.getMinutes();
	const ss = time.getSeconds();

	const formattedTime = (hh < 10 ? "0" + hh : hh) + ":"
		+ (min < 10 ? "0" + min : min) + ":"
		+ (ss < 10 ? "0" + ss : ss);

	return formattedTime;
}

export function getFormattedSize(size: number): string {

	let unit = "";
	let scaled: number = size;

	// 0 도 크기다. 예전에는 단위를 비워 `"0 "` 이 나왔고, 화면에는 단위 없는
	// "0" 이 떴다 — 같은 항목의 title 은 "0 bytes" 라고 적고 있었다. 빈 파일은
	// 실제로 올릴 수 있다.
	if(1000 > scaled) {
		// `1 bytes` 는 문장이 아니다.
		unit = 1 === scaled ? "byte" : "bytes";
	}

	if(1000 <= scaled) {
		scaled = Number((scaled / 1000).toFixed(2));
		unit = "KB";
	}

	if(1000 <= scaled) {
		scaled = Number((scaled / 1000).toFixed(2));
		unit = "MB";
	}

	if(1000 <= scaled) {
		scaled = Number((scaled / 1000).toFixed(2));
		unit = "GB";
	}

	if(1000 <= scaled) {
		scaled = Number((scaled / 1000).toFixed(2));
		unit = "TB";
	}

	if(1000 <= scaled) {
		scaled = Number((scaled / 1000).toFixed(1));
		unit = "PB";
	}

	return scaled.toLocaleString() + " " + unit;
}

// 글자 수로 자르되 **글자를 반으로 쪼개지 않는다.**
//
// `substr(0, 100)` 은 UTF-16 코드 유닛을 센다. 100번째 자리에 이모지가 걸리면
// 상위 서로게이트만 남아 `\uD83D` 하나가 잘려 나가고, 그것이 meta description
// 으로 들어가면 크롤러와 링크 미리보기에는 대체 문자로 보인다. 실측:
//
//   "ㄱ"×99 + "😀"  →  substr(0, 100) 끝이 "ㄱ\ud83d"
//
// 가족 이모지(ZWJ 시퀀스)나 결합 문자도 같은 식으로 쪼개진다 — "👨‍👩‍👧" 이
// "👨" 만 남는다.
//
// `Intl.Segmenter` 가 있으면 grapheme 경계로 센다 (ZWJ 시퀀스까지 온전하다).
// 없는 환경에서는 `Array.from` 으로 코드 포인트 경계까지는 지킨다 — 고립
// 서로게이트라는 본 결함은 그것으로 사라진다.
export const truncateByGrapheme = (text: string, limit: number): string => {

	if (limit <= 0) return "";

	const SegmenterCtor = (Intl as { Segmenter?: new (locale?: string, options?: { granularity?: string }) => { segment: (input: string) => Iterable<{ segment: string }> } }).Segmenter;

	if (SegmenterCtor) {
		const segmenter = new SegmenterCtor(undefined, { granularity: "grapheme" });
		let out = "";
		let count = 0;
		for (const { segment } of segmenter.segment(text)) {
			if (count >= limit) break;
			out += segment;
			count++;
		}
		return out;
	}

	return Array.from(text).slice(0, limit).join("");
};

export function getWeekday(timestamp: number): string {

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

export const confirm = (
	message: string = "",
	onConfirm?: unknown,
	onCancel?: unknown,
): (() => void) | undefined => {

	if (!onConfirm || typeof onConfirm !== "function") {
		return;
	}
	if (onCancel && typeof onCancel !== "function") {
		return;
	}

	const confirmAction = () => {
		if (window.confirm(message)) {
			(onConfirm as () => void)();
		} else {
			(onCancel as () => void)();
		}
	};

	return confirmAction;
}

export const isMobile = (): boolean => {
	let hasTouchPoint = navigator.maxTouchPoints;
	return hasTouchPoint > 0;
}

export const setFullscreen = (isFullscreen: boolean): void => {

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

// UA 판정은 **순서가 곧 규칙**이다. 아래로 갈수록 덜 구체적이다 — 위에 있는
// 브라우저가 아래 것의 표식을 함께 달고 다니기 때문이다. 실제 UA 로 재보면
// 그 포함 관계가 드러난다 (2026-08-30 실측):
//
//   Edge      ...Chrome/119...  Edg/119            → Chrome 보다 먼저
//   Opera     ...Chrome/119...  OPR/105            → 〃
//   삼성      ...SamsungBrowser/23  Chrome/115     → 〃
//   Chromium  ...Chromium/119  Chrome/119          → 〃
//   SeaMonkey ...Firefox/60  SeaMonkey/2.53        → Firefox 보다 먼저
//
// 순서가 어긋나 있던 동안 Edge·Opera·Chromium·삼성이 전부 "Chrome" 으로
// 집계됐고, Chromium·Seamonkey 갈래는 도달조차 하지 않았다. Monitor 의
// 사용자 환경 통계가 그만큼 조용히 왜곡돼 있었다.
//
// 기존 테스트는 분기마다 가짜 문자열을 하나씩 넣어("Android Chrome/") 전 분기를
// 덮고 있었다. 그래서 커버리지는 가득 찼는데 실제 조합은 하나도 재지 않았다.
const BROWSER_RULES: ReadonlyArray<readonly [RegExp, string]> = [
	[/KAKAOTALK/, "Kakaotalk"],           // 인앱 브라우저 — Chrome 표식을 함께 단다
	[/Edg(?:e|A|iOS)?\//, "Edge"],
	[/OPR\/|Opera\//, "Opera"],
	[/SamsungBrowser\//, "Samsung Internet"],
	[/Whale\//, "Whale"],
	[/Sea[Mm]onkey\//, "Seamonkey"],      // Firefox 표식을 함께 단다
	[/Firefox\/|FxiOS\//, "Firefox"],
	[/Chromium\//, "Chromium"],           // Chrome 표식을 함께 단다
	[/Chrome\/|CriOS\//, "Chrome"],
	[/Safari\//, "Safari"],
	[/; MSIE |Trident\//, "Internet Explorer"],
];

// 엔진도 같은 이유로 순서가 있다. `AppleWebKit/` 을 먼저 보면 Chromium 계열이
// 전부 "Webkit" 으로 집계된다 — 2013년 Blink 분기 이후로는 사실과 다르다.
// 실측: Chrome·Edge·Opera·삼성 전부 Webkit 으로 나왔고 Blink 갈래는 도달하지
// 않았다.
const ENGINE_RULES: ReadonlyArray<readonly [RegExp, string]> = [
	[/Trident\//, "Trident"],
	[/Presto\/|Opera\//, "Presto"],      // 구 Opera 12 이하
	[/Gecko\//, "Gecko"],                 // "like Gecko" 에는 슬래시가 없다
	// `CriOS/` 는 넣지 않는다 — iOS 의 Chrome 은 Apple 정책상 WebKit 위에서 돈다.
	// UA 도 `AppleWebKit/605...  CriOS/...` 형태라 아래 Webkit 갈래가 맞다.
	// (이 사실은 기존 합성 테스트가 잡아냈다: "Symbian CriOS/" → Others 기대.)
	[/Edg(?:e|A|iOS)?\/|Chrome\/|Chromium\//, "Blink"],
	[/AppleWebKit\//, "Webkit"],
];

// iPad·iPod 의 UA 에는 "iPhone OS" 가 없고 "like Mac OS X" 만 있다. 그래서
// iPad 가 Mac OS X 로 집계됐다 (실측).
const OS_RULES: ReadonlyArray<readonly [RegExp, string]> = [
	[/Android/, "Android"],                // "Linux" 를 함께 단다
	[/iPhone OS|iPad|iPod|CPU OS \d/, "iOS"],
	[/Windows/, "Windows"],
	[/\(X11; CrOS/, "Chrome OS"],
	[/Mac OS X|Macintosh/, "Mac OS X"],
	[/X11|Linux/, "Linux"],
	[/Symbian/, "Symbian"],
];

const firstMatch = (rules: ReadonlyArray<readonly [RegExp, string]>, text: string): string => {
	for(const [pattern, label] of rules) {
		if(pattern.test(text)) return label;
	}
	return "Others";
};

export const userAgentParser = () => {

	// Parser reference
	// 1. https://developer.mozilla.org/ko/docs/Web/HTTP/Browser_detection_using_the_user_agent
	// 2. https://developers.whatismybrowser.com/useragents/explore
	const uaText = navigator.userAgent;

	return {
		url: getUrl(),
		originalText: uaText,
		browser: firstMatch(BROWSER_RULES, uaText),
		renderingEngine: firstMatch(ENGINE_RULES, uaText),
		operatingSystem: firstMatch(OS_RULES, uaText),
	};
}

interface HoverPopupEventLike {
	type: string;
	clientX?: number;
	clientY?: number;
}

export const hoverPopup = (e: HoverPopupEventLike, popupElementId: string): void => {

	const popup = document.getElementById(popupElementId);
	const currentDisplay = (popup as HTMLElement).style.display;

	if("mouseover" === e.type) {
		if(currentDisplay === "none") {
			(popup as HTMLElement).style.display = "";
		}
	}
	else if("mousemove" === e.type) {
		const left  = (e.clientX as number) + 5 + "px";
		const top  = (e.clientY as number) + 5 + "px";
		(popup as HTMLElement).style.left = left;
		(popup as HTMLElement).style.top = top;
	}
	else {
		if(currentDisplay !== "none") {
			(popup as HTMLElement).style.display = "none";
		}
	}
}


export const copyToClipboard = async (value: string = ""): Promise<boolean> => {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(value);
			log("Copy to Clipboard: " + value);
			return true;
		} catch (err) {
			log("Clipboard write rejected: " + (err as Error).message, "ERROR");
			return false;
		}
	}
	log("Clipboard API unavailable", "ERROR");
	return false;
};