import * as common from './common';

// env-spec §5.2 / REQ-20260420-002 FR-01 — 런타임 env 분기는 `isDev()/isProd()`
// (= `import.meta.env.DEV/PROD`) 경유. 테스트에서는 `vi.stubEnv('MODE', ...)` 와
// 보조로 `DEV/PROD` 를 짝맞춰 stub. 전역 `afterEach(vi.unstubAllEnvs)` 는
// `src/setupTests.js` 에 박제돼 있으므로 개별 teardown 생략.
const stubMode = (mode) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

console.error = vi.fn();
console.log = vi.fn();

describe('set HTML page title', () => {
  
	it("dev title", () => {
		stubMode('development');
		document.title = "";
		common.log("DEFAULT", "");
		common.log("INFO", "INFO");
		common.log("ERROR", "ERROR");
		common.setHtmlTitle("test");
		expect(document.title).toBe("[DEV] test - park108.net");
	});

	it("prod title", () => {
		stubMode('production');
		document.title = "";
		common.log("DEFAULT");
		common.log("INFO", "INFO");
		common.log("ERROR", "ERROR");
		common.setHtmlTitle("test");
		expect(document.title).toBe("test - park108.net");
	});
});

describe('set HTML page meta description', () => {

	const mockingMetaTags = document.createElement('meta');
    mockingMetaTags.setAttribute('name', 'description');
    document.head.appendChild(mockingMetaTags); 
  
	it("render meta description", () => {
		common.setMetaDescription("Test Descsription");
	});
});

it('test parse Jwt token', () => {
	const result = common.parseJwt("eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJldmVudF9pZCI6IjljMzVkZGVlLTliMWMtNGY1Ni1iZGI3LWE2NmI5NWE1NDZmOSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2MzM4NDc3MzUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMi5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMl93SzR3dDdaYVIiLCJleHAiOjE2MzM4NTEzMzUsImlhdCI6MTYzMzg0NzczNSwidmVyc2lvbiI6MiwianRpIjoiMDkzMTg2OTEtN2JhNC00ZTA4LWEyYWItMGY0Nzg2ZjkwYWM0IiwiY2xpZW50X2lkIjoiaDNtOTJhMjd0MzlzZmNhdDMwMnRpcXRrbyIsInVzZXJuYW1lIjoiMDUxZmQ1ZjktYTMzNi00MDU1LTk2ZTUtNmUxZTEyNWViZDE1In0.Dg_M1EyU1gOUbHwwAoDi6LycG37dZuGJY2y-uOHz9R69R30uLgiWXtIQEpi2Minlg_okDHXPyDLKt0NU4PnlsNNDavp65Yh-1xEFl0AL7Rg6lOkIrmlohLkcqS70L-I1w6ezuM8QWJmq1Or0ci65qYhQyfTeGy1-cU7n5ER3f7OYfcia4_ZuHOX5NCnj4WyLiQCbnystvI1ZSOfFsKcVY0sMNO7RIOBg0_i6CYOVE1bJjSvS9im2RdVksUSKJ-jkrAoYm7RXmO4xtPj--hJPT9v6g9WiiVCqRm0XNPolc5Q5mCOsr107UNRs_FRALjz2WVP0HodaQMJMSN-EvRNbOg");
	expect(result['client_id']).toBe("h3m92a27t39sfcat302tiqtko");
});

describe('parseJwt input guards (REQ-20260418-032 FR-01, FR-03)', () => {
	// parseJwt 는 손상/비정상 입력에 대해 throw 대신 null sentinel 을 반환해야 한다.
	// App 마운트 시 isAdmin → parseJwt 경로의 TypeError 전파를 차단하기 위한 경계 계약.

	it('returns null for undefined', () => {
		expect(common.parseJwt(undefined)).toBeNull();
	});

	it('returns null for null', () => {
		expect(common.parseJwt(null)).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(common.parseJwt('')).toBeNull();
	});

	it('returns null when there are no dots (single part)', () => {
		expect(common.parseJwt('ZZZ')).toBeNull();
	});

	it('returns null when there are only 2 parts', () => {
		expect(common.parseJwt('header.signature')).toBeNull();
	});

	it('returns null when payload base64 is malformed', () => {
		// atob / decodeURIComponent / JSON.parse 중 하나라도 throw 하면 null.
		expect(common.parseJwt('header.!!!invalid_base64!!!.signature')).toBeNull();
	});

	it('does not emit console.error for guarded inputs (FR-06)', () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const before = errSpy.mock.calls.length;
		common.parseJwt(undefined);
		common.parseJwt('ZZZ');
		common.parseJwt('header.signature');
		common.parseJwt('header.!!!invalid!!!.signature');
		expect(errSpy.mock.calls.length).toBe(before);
		errSpy.mockRestore();
	});
});

describe('get URL by stage', () => {
  
	it("test URL", () => {
		stubMode('development');
		const getUrl = common.getUrl();
		expect(getUrl).toBe("http://localhost:3000/");
	});

	it("prod URL", () => {
		stubMode('production');
		const getUrl = common.getUrl();
		expect(getUrl).toBe("https://www.park108.net/");
	});
});

describe('handling cookie correctly', () => {

  it("set cookie", () => {

    let expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 1);
    
    common.setCookie("set_test", "TEST_TOKEN", {'expires': expireDate});
    const cookie = common.getCookie("set_test");

    expect("TEST_TOKEN").toEqual(cookie);

    common.deleteCookie("set_test");
  })

  it("delete cookie", () => {

    common.setCookie("delete_test", "TEST_TOKEN");
    common.deleteCookie("delete_test");
    const cookie = common.getCookie("delete_test");

    expect(undefined).toEqual(cookie);
  });
});

it('test auth', () => {

	let currentLocation = window.location; // Backup current location

	const mockLocation = new URL("http://localhost:3000");
	mockLocation.replace = vi.fn();
	mockLocation.href += "?access_token=12345#id_token=67890";
	delete window.location;
	window.location = mockLocation;

	stubMode('development');
	common.auth();

	stubMode('production');
	common.auth();

	stubMode('');
	common.auth();

	window.location = currentLocation; // Rollback location
});

describe('auth() URL parsing regression (REQ-20260418-031 FR-04, FR-05)', () => {
	let savedLocation;
	const clearAuthCookies = () => {
		common.deleteCookie('access_token');
		common.deleteCookie('id_token');
	};

	beforeEach(() => {
		savedLocation = window.location;
		clearAuthCookies();
		stubMode('development');
	});

	afterEach(() => {
		clearAuthCookies();
		delete window.location;
		window.location = savedLocation;
	});

	it('extracts access_token when it is the first query parameter', () => {
		const mockLocation = new URL('http://localhost:3000/?access_token=AAA#id_token=BBB');
		mockLocation.replace = vi.fn();
		delete window.location;
		window.location = mockLocation;

		common.auth();

		expect(common.getCookie('access_token')).toBe('AAA');
		expect(common.getCookie('id_token')).toBe('BBB');
	});

	it('extracts id_token when fragment has trailing parameter', () => {
		const mockLocation = new URL('http://localhost:3000/?access_token=AAA#id_token=BBB&token_type=Bearer');
		mockLocation.replace = vi.fn();
		delete window.location;
		window.location = mockLocation;

		common.auth();

		expect(common.getCookie('access_token')).toBe('AAA');
		expect(common.getCookie('id_token')).toBe('BBB');
	});
});

describe('auth() idempotent cookie result (REQ-20260418-025 FR-01)', () => {
	let savedLocation;
	const clearAuthCookies = () => {
		common.deleteCookie('access_token');
		common.deleteCookie('id_token');
	};
	const normalizeCookie = (raw) =>
		raw
			.split(';')
			.map((c) => c.trim())
			.filter(Boolean)
			.sort()
			.join('; ');

	beforeEach(() => {
		savedLocation = window.location;
		const mock = new URL('http://localhost:3000');
		mock.replace = vi.fn();
		mock.href += '?access_token=AAA#id_token=BBB';
		delete window.location;
		window.location = mock;
		clearAuthCookies();
	});

	afterEach(() => {
		clearAuthCookies();
		window.location = savedLocation;
	});

	it('produces equivalent document.cookie body after 1 vs 2 calls (development)', () => {
		stubMode('development');
		common.auth();
		const cookieAfter1 = normalizeCookie(document.cookie);
		common.auth();
		const cookieAfter2 = normalizeCookie(document.cookie);
		expect(cookieAfter1).toBe(cookieAfter2);
		// 설정된 토큰 자체도 검증 (허수 등가성 방지)
		expect(cookieAfter1).toMatch(/access_token=AAA/);
		expect(cookieAfter1).toMatch(/id_token=BBB/);
	});

	it('produces equivalent document.cookie body after 1 vs 3 calls (production)', () => {
		stubMode('production');
		common.auth();
		const cookieAfter1 = normalizeCookie(document.cookie);
		common.auth();
		common.auth();
		const cookieAfter3 = normalizeCookie(document.cookie);
		expect(cookieAfter1).toBe(cookieAfter3);
	});
});

describe('login test', () => {

	it("is not logged", () => {
		common.deleteCookie("access_token");
		common.deleteCookie("id_token");
		expect(false).toBe(common.isLoggedIn());
	});

	it("is logged", () => {
		common.setCookie("access_token", "TEST_TOKEN", {site: "localhost:3000", expires: 3600});
		common.setCookie("id_token", "TEST_ID", {site: "localhost:3000"});

		expect(true).toBe(common.isLoggedIn());

		common.deleteCookie("access_token");
		common.deleteCookie("id_token");
	});
});

describe('test isAdmin', () => {

	// REQ-20260421-017 FR-03 — admin user ID 외부화 이후 이 두 회귀 케이스는
	// `VITE_ADMIN_USER_ID_*` env stub 에 의존한다. 기존 하드코딩 UUID 는 현재도
	// 실제 운영값과 동일하므로 동일한 리터럴을 stub 값으로 박제한다.
	beforeEach(() => {
		vi.stubEnv('VITE_ADMIN_USER_ID_PROD', 'df256e56-7c24-4b19-9172-10acc47ab8f4');
		vi.stubEnv('VITE_ADMIN_USER_ID_DEV', '051fd5f9-a336-4055-96e5-6e1e125ebd15');
	});

	it('test production admin', () => {
		stubMode('production');
		common.setCookie(
			"access_token"
			, "eyJraWQiOiJ0S2JQRzgwS2ZJeWdYWk1XRXRRWVwvc3haM0NmVXAzNTR1RlQyeG1kd1l2TT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJkZjI1NmU1Ni03YzI0LTRiMTktOTE3Mi0xMGFjYzQ3YWI4ZjQiLCJjb2duaXRvOmdyb3VwcyI6WyJhZG1pbiJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtbm9ydGhlYXN0LTIuYW1hem9uYXdzLmNvbVwvYXAtbm9ydGhlYXN0LTJfT1dqd0M1Vk1uIiwidmVyc2lvbiI6MiwiY2xpZW50X2lkIjoiNW9idGhldWxiN29sdjV1aG5rdWJ1bGRncWoiLCJldmVudF9pZCI6IjVjNjc0MjRhLTRmZWQtNDY5My1hNTdhLTY0YThhYjY0MzkzNSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2NTc0NTY2ODksImV4cCI6MTY1NzQ2MDI4OSwiaWF0IjoxNjU3NDU2Njg5LCJqdGkiOiI0ZjUzMTdmYi01ZThlLTRjNDQtOGFjYi0wMDY5MWE4M2U0MjIiLCJ1c2VybmFtZSI6ImRmMjU2ZTU2LTdjMjQtNGIxOS05MTcyLTEwYWNjNDdhYjhmNCJ9.gzJRLPzL9b4vqX4kVnX_yIQbJtPDd-ohm1znwjXttuBIAjlKIYs5_VwQzdEH6CpHZN4slPu2hYENKVXqXZqh0Au3sMOy-ATOX_OQiqerP0WSjAzhpw6kc1spLPlK-LsHvpnVv14F4j33DrDGJspKYR8BRwNUuVafc1lck6h43xwXiG78pt-_QbnLmd8LGAGZmLS4zRaya1WZCsG9SsNXIPcKmOwlbUNw-pbJVTtIS8lTNZr7h8ETFxMO2ryZlfcdYSKZbdab_71xHdOB6S-_zK3Kx7Y1xqKQ2iTIlG4PGmpE3WEV6rZqiWFW4CJALZ127bqWdTEK8RDlr5Xx6-UgUA"
			, {site: "park108.net", expires: 3600}
		);
		common.setCookie(
			"id_token"
			, "eyJraWQiOiJGYk9DQnk1WlVsamRlTHRYbHgwUUl4MlcrNllBVENSMFRMNlhwWEU1cDNBPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoic0Z3eVVXZHVQbXpuQmlFaWF6OXNUdyIsInN1YiI6ImRmMjU2ZTU2LTdjMjQtNGIxOS05MTcyLTEwYWNjNDdhYjhmNCIsImNvZ25pdG86Z3JvdXBzIjpbImFkbWluIl0sImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtbm9ydGhlYXN0LTIuYW1hem9uYXdzLmNvbVwvYXAtbm9ydGhlYXN0LTJfT1dqd0M1Vk1uIiwiY29nbml0bzp1c2VybmFtZSI6ImRmMjU2ZTU2LTdjMjQtNGIxOS05MTcyLTEwYWNjNDdhYjhmNCIsImF1ZCI6IjVvYnRoZXVsYjdvbHY1dWhua3VidWxkZ3FqIiwiZXZlbnRfaWQiOiI1YzY3NDI0YS00ZmVkLTQ2OTMtYTU3YS02NGE4YWI2NDM5MzUiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY1NzQ1NjY4OSwiZXhwIjoxNjU3NDYwMjg5LCJpYXQiOjE2NTc0NTY2ODksImVtYWlsIjoicGFyazEwOEBnbWFpbC5jb20ifQ.jhQ5z-mJW3NjngYOYHHEv-pgeGo6Xb-akhIZbORijst7nn_5KFF1gAstvWz8_PQbFyOo_UD_iZgzy6xZVidSUookcWmUet_xFD0XLHi1lMTRD7vXyDOjtj74TLuB3m2_L7rRqAB4Ju8g6DIP5WsXvV867qNIEzbANO4Bb4-w_fYAAYI4K-8Px7qp8WWgpRgDDrM8HTcIsFIMtn2ltVos07DkIkYV9lSOn65s5ldjikPsCgcW6GDFkiu2uCUP0n4jdbS3UeiO4jCzm9DdQyVtcesSBSA2Kc-50_ebJr0wu91cMzOm1Qr9J3mz-wp-hYLYWtFVkdMI86zsAsEHjEjvNw"
			, {site: "park108.net"}
		);

		const resultProdAdmin = common.isAdmin();
		expect(resultProdAdmin).toBe(true);
	});

	it('test development admin', () => {
		stubMode('development');
		common.setCookie(
			"access_token"
			, "eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJldmVudF9pZCI6IjljMzVkZGVlLTliMWMtNGY1Ni1iZGI3LWE2NmI5NWE1NDZmOSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2MzM4NDc3MzUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMi5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMl93SzR3dDdaYVIiLCJleHAiOjE2MzM4NTEzMzUsImlhdCI6MTYzMzg0NzczNSwidmVyc2lvbiI6MiwianRpIjoiMDkzMTg2OTEtN2JhNC00ZTA4LWEyYWItMGY0Nzg2ZjkwYWM0IiwiY2xpZW50X2lkIjoiaDNtOTJhMjd0MzlzZmNhdDMwMnRpcXRrbyIsInVzZXJuYW1lIjoiMDUxZmQ1ZjktYTMzNi00MDU1LTk2ZTUtNmUxZTEyNWViZDE1In0.Dg_M1EyU1gOUbHwwAoDi6LycG37dZuGJY2y-uOHz9R69R30uLgiWXtIQEpi2Minlg_okDHXPyDLKt0NU4PnlsNNDavp65Yh-1xEFl0AL7Rg6lOkIrmlohLkcqS70L-I1w6ezuM8QWJmq1Or0ci65qYhQyfTeGy1-cU7n5ER3f7OYfcia4_ZuHOX5NCnj4WyLiQCbnystvI1ZSOfFsKcVY0sMNO7RIOBg0_i6CYOVE1bJjSvS9im2RdVksUSKJ-jkrAoYm7RXmO4xtPj--hJPT9v6g9WiiVCqRm0XNPolc5Q5mCOsr107UNRs_FRALjz2WVP0HodaQMJMSN-EvRNbOg"
			, {site: "localhost:3000", expires: 3600}
		);
		common.setCookie(
			"id_token"
			, "TEST_ID"
			, {site: "localhost:3000"}
		);
	
		const resultDevAdmin = common.isAdmin();
		expect(resultDevAdmin).toBe(true);
	});

	it('test not admin', () => {
		stubMode('');
		common.setCookie("access_token", "eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJldmVudF9pZCI6IjljMzVkZGVlLTliMWMtNGY1Ni1iZGI3LWE2NmI5NWE1NDZmOSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2MzM4NDc3MzUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMi5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMl93SzR3dDdaYVIiLCJleHAiOjE2MzM4NTEzMzUsImlhdCI6MTYzMzg0NzczNSwidmVyc2lvbiI6MiwianRpIjoiMDkzMTg2OTEtN2JhNC00ZTA4LWEyYWItMGY0Nzg2ZjkwYWM0IiwiY2xpZW50X2lkIjoiaDNtOTJhMjd0MzlzZmNhdDMwMnRpcXRrbyIsInVzZXJuYW1lIjoiMDUxZmQ1ZjktYTMzNi00MDU1LTk2ZTUtNmUxZTEyNWViZDE1In0.Dg_M1EyU1gOUbHwwAoDi6LycG37dZuGJY2y-uOHz9R69R30uLgiWXtIQEpi2Minlg_okDHXPyDLKt0NU4PnlsNNDavp65Yh-1xEFl0AL7Rg6lOkIrmlohLkcqS70L-I1w6ezuM8QWJmq1Or0ci65qYhQyfTeGy1-cU7n5ER3f7OYfcia4_ZuHOX5NCnj4WyLiQCbnystvI1ZSOfFsKcVY0sMNO7RIOBg0_i6CYOVE1bJjSvS9im2RdVksUSKJ-jkrAoYm7RXmO4xtPj--hJPT9v6g9WiiVCqRm0XNPolc5Q5mCOsr107UNRs_FRALjz2WVP0HodaQMJMSN-EvRNbOg");

		const resultDevCommonUser = common.isAdmin();
		expect(resultDevCommonUser).toBe(false);
	});
});

describe('isAdmin fail-safe with corrupted cookie (REQ-20260418-032 FR-02, FR-04)', () => {
	// isAdmin 은 손상된 access_token 쿠키 상태에서도 throw 하지 않고 false 로 귀결돼야 한다.
	// App/Navigation/SearchInput 등 25+ 호출처의 마운트 시 화이트 스크린 회귀 방어선.

	afterEach(() => {
		common.deleteCookie('access_token');
	});

	it('returns false when access_token is a single-part garbage string', () => {
		stubMode('development');
		common.setCookie('access_token', 'ZZZ', { site: 'localhost:3000' });
		expect(() => common.isAdmin()).not.toThrow();
		expect(common.isAdmin()).toBe(false);
	});

	it('returns false when access_token payload is malformed base64', () => {
		stubMode('development');
		common.setCookie('access_token', 'header.!!!invalid!!!.sig', { site: 'localhost:3000' });
		expect(() => common.isAdmin()).not.toThrow();
		expect(common.isAdmin()).toBe(false);
	});
});

it('test HTML converting', () => {
	const result = common.convertToHTML("Wow!\nIt's Possible!\n");
	expect(result).toBe("Wow!<br />It's Possible!<br />");
});

it('test HTML decoding', () => {
	const result = common.decodeHTML("&lt;h1&gt;Big Header!!!&lt;/h1&gt;");
	expect(result).toBe("<h1>Big Header!!!</h1>");
});

it('is not mobile', () => {
	const getIsMobile = common.isMobile();
	expect(getIsMobile).toBe(false);
});

describe('Date formatting test', () => {

	it('test converting Sunday', () => {
		const result = common.getWeekday(1633847332000);
		expect(result).toBe("Sun");
	});

	it('test formatted date', () => {
		const result = common.getFormattedDate(1633847332000);
		expect(result).toBe("2021-10-10");
	});

	it('test formatted time', () => {
		const result = common.getFormattedTime(1633847332000);
		expect(result).toBe("15:28:52");
	});
});


describe('Size formatting test', () => {

	it('test zero', () => {
		const result = common.getFormattedSize(0);
		expect(result).toBe("0 ");
	});

	it('test bytes', () => {
		const result = common.getFormattedSize(999);
		expect(result).toBe("999 bytes");
	});
	
	it('test KB', () => {
		const result = common.getFormattedSize(1000);
		expect(result).toBe("1 KB");
	});
	
	it('test MB', () => {
		const result = common.getFormattedSize(1000000);
		expect(result).toBe("1 MB");
	});
	
	it('test GB', () => {
		const result = common.getFormattedSize(1000000000);
		expect(result).toBe("1 GB");
	});
	
	it('test TB', () => {
		const result = common.getFormattedSize(1000000000000);
		expect(result).toBe("1 TB");
	});
	
	it('test PB', () => {
		const result = common.getFormattedSize(1000000000000000);
		expect(result).toBe("1 PB");
	});
});

describe('Size formatting test', () => {

	const onConfirm = () => { return; };
	const onCancel = () => { return; };

	it('test confirmation', () => {
		const result = common.confirm("CONFIRM TEST", onConfirm, onCancel);
		expect(typeof(result)).toBe("function");
	});

	it('failed test confirmation', () => {
		const result = common.confirm("CONFIRM TEST", "", "");
		expect(result).toBe(undefined);
	});

	it('failed test cancellation', () => {
		const result = common.confirm("CONFIRM TEST", onConfirm, "HAHA");
		expect(result).toBe(undefined);
	});

	it('failed test cancellation for no message', () => {
		const result = common.confirm("CONFIRM TEST", "HAHA", onCancel);
		expect(result).toBe(undefined);
	});

	it('failed test confirmation no arguments', () => {
		const result = common.confirm();
		expect(result).toBe(undefined);
	});
});

it('is not mobile', () => {
	const getIsMobile = common.isMobile();
	expect(getIsMobile).toBe(false);
});

it('test fullscreen', () => {

	// Make DOM element 'root' and append at document body
	let root = document.createElement("div");
	root.setAttribute("id", "root");
	document.body.appendChild(root);

	// Test disable fullscreen
	common.setFullscreen(false);
	expect(root.getAttribute("class")).toBe("div");

	// Test enable fullscreen
	common.setFullscreen(true);
	expect(root.getAttribute("class")).toBe("div fullscreen");

	// Test root is null
	document.body.removeChild(root);
	common.setFullscreen(true);
});

describe('User Agent parsing test', () => {

	it('get User Agent Info', () => {

		stubMode('development');
		const result = common.userAgentParser();
		expect(result.url).toBe("http://localhost:3000/");
	});

	it('get User Agent Info', () => {

		stubMode('development');
		const result = common.userAgentParser();
		expect(result.url).toBe("http://localhost:3000/");
	});

	it('test User Agent for Seamonkey, Webkit, Mac OS X', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Seamonkey/TestVersion",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Seamonkey");
		expect(result.renderingEngine).toBe("Webkit");
		expect(result.operatingSystem).toBe("Mac OS X");
	});

	it('test User Agent for Firefox, Gecko, Windows', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Firefox");
		expect(result.renderingEngine).toBe("Gecko");
		expect(result.operatingSystem).toBe("Windows");
	});

	it('test User Agent for Safari, Trident, iOS', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) Trident/testversion (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Safari");
		expect(result.renderingEngine).toBe("Trident");
		expect(result.operatingSystem).toBe("iOS");
	});

	it('test User Agent for Opera, Presto, Linux', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "(X11; Linux x86_64) Opera/86.0.4363.59",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Opera");
		expect(result.renderingEngine).toBe("Presto");
		expect(result.operatingSystem).toBe("Linux");
	});

	it('test User Agent for Chrome, Blink, Android', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "Android Chrome/",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Chrome");
		expect(result.renderingEngine).toBe("Blink");
		expect(result.operatingSystem).toBe("Android");
	});

	it('test User Agent for Kakaotalk, Others, Chrome OS', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "(X11; CrOS KAKAOTALK",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Kakaotalk");
		expect(result.renderingEngine).toBe("Others");
		expect(result.operatingSystem).toBe("Chrome OS");
	});

	it('test User Agent for Chrome, Others, Symbian', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "Symbian CriOS/",
				configurable: true
			}
		);

		const result = common.userAgentParser();
		expect(result.browser).toBe("Chrome");
		expect(result.renderingEngine).toBe("Others");
		expect(result.operatingSystem).toBe("Symbian");
	});

	it('test User Agent for Chromium, Opera, Explorer on Browser', () => {

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "Chromium/",
				configurable: true
			}
		);

		const result1 = common.userAgentParser();
		expect(result1.browser).toBe("Chromium");

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "OPR/",
				configurable: true
			}
		);

		const result2 = common.userAgentParser();
		expect(result2.browser).toBe("Opera");

		// Mocking user agent
		Object.defineProperty(window.navigator, 'userAgent',
			{
				value : "; MSIE ",
				configurable: true
			}
		);

		const result3 = common.userAgentParser();
		expect(result3.browser).toBe("Internet Explorer");
	});
});

describe("copyToClipboard (async Clipboard API)", () => {
	afterEach(() => {
		// navigator 를 재할당해 테스트간 간섭 제거
		delete navigator.clipboard;
	});

	it("returns true and calls writeText on success", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		const ok = await common.copyToClipboard("Test");
		expect(ok).toBe(true);
		expect(writeText).toHaveBeenCalledWith("Test");
	});

	it("returns false when writeText rejects", async () => {
		const writeText = vi.fn().mockRejectedValue(new Error("denied"));
		Object.assign(navigator, { clipboard: { writeText } });
		const ok = await common.copyToClipboard("Test");
		expect(ok).toBe(false);
	});

	it("returns false when Clipboard API is unavailable", async () => {
		Object.assign(navigator, { clipboard: undefined });
		const ok = await common.copyToClipboard("Test");
		expect(ok).toBe(false);
	});
});

describe('isAdmin matrix (REQ-20260421-017)', () => {
	// FR-07 — env 외부화 (`VITE_ADMIN_USER_ID_*`) 이후 isAdmin 경로의 6 케이스 매트릭스.
	// 기존 `test isAdmin` / `isAdmin fail-safe ...` describe 와 독립 — username 매칭
	// 분기 × env 분기 × 손상 토큰 분기를 일관된 stub 세트로 박제한다.
	//
	// env stub 해제는 `src/setupTests.js` 전역 `afterEach(vi.unstubAllEnvs)` 가 담당.

	const PROD_UUID = 'df256e56-7c24-4b19-9172-10acc47ab8f4';
	const DEV_UUID  = '051fd5f9-a336-4055-96e5-6e1e125ebd15';

	// 미리 생성된 고정 JWT — payload.username 필드로만 username 판정.
	// prod / dev / mismatch 3종.
	const JWT_PROD_MATCH = 'eyJraWQiOiJ0S2JQRzgwS2ZJeWdYWk1XRXRRWVwvc3haM0NmVXAzNTR1RlQyeG1kd1l2TT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJkZjI1NmU1Ni03YzI0LTRiMTktOTE3Mi0xMGFjYzQ3YWI4ZjQiLCJjb2duaXRvOmdyb3VwcyI6WyJhZG1pbiJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtbm9ydGhlYXN0LTIuYW1hem9uYXdzLmNvbVwvYXAtbm9ydGhlYXN0LTJfT1dqd0M1Vk1uIiwidmVyc2lvbiI6MiwiY2xpZW50X2lkIjoiNW9idGhldWxiN29sdjV1aG5rdWJ1bGRncWoiLCJldmVudF9pZCI6IjVjNjc0MjRhLTRmZWQtNDY5My1hNTdhLTY0YThhYjY0MzkzNSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2NTc0NTY2ODksImV4cCI6MTY1NzQ2MDI4OSwiaWF0IjoxNjU3NDU2Njg5LCJqdGkiOiI0ZjUzMTdmYi01ZThlLTRjNDQtOGFjYi0wMDY5MWE4M2U0MjIiLCJ1c2VybmFtZSI6ImRmMjU2ZTU2LTdjMjQtNGIxOS05MTcyLTEwYWNjNDdhYjhmNCJ9.gzJRLPzL9b4vqX4kVnX_yIQbJtPDd-ohm1znwjXttuBIAjlKIYs5_VwQzdEH6CpHZN4slPu2hYENKVXqXZqh0Au3sMOy-ATOX_OQiqerP0WSjAzhpw6kc1spLPlK-LsHvpnVv14F4j33DrDGJspKYR8BRwNUuVafc1lck6h43xwXiG78pt-_QbnLmd8LGAGZmLS4zRaya1WZCsG9SsNXIPcKmOwlbUNw-pbJVTtIS8lTNZr7h8ETFxMO2ryZlfcdYSKZbdab_71xHdOB6S-_zK3Kx7Y1xqKQ2iTIlG4PGmpE3WEV6rZqiWFW4CJALZ127bqWdTEK8RDlr5Xx6-UgUA';
	const JWT_DEV_MATCH = 'eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJldmVudF9pZCI6IjljMzVkZGVlLTliMWMtNGY1Ni1iZGI3LWE2NmI5NWE1NDZmOSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2MzM4NDc3MzUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMi5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMl93SzR3dDdaYVIiLCJleHAiOjE2MzM4NTEzMzUsImlhdCI6MTYzMzg0NzczNSwidmVyc2lvbiI6MiwianRpIjoiMDkzMTg2OTEtN2JhNC00ZTA4LWEyYWItMGY0Nzg2ZjkwYWM0IiwiY2xpZW50X2lkIjoiaDNtOTJhMjd0MzlzZmNhdDMwMnRpcXRrbyIsInVzZXJuYW1lIjoiMDUxZmQ1ZjktYTMzNi00MDU1LTk2ZTUtNmUxZTEyNWViZDE1In0.Dg_M1EyU1gOUbHwwAoDi6LycG37dZuGJY2y-uOHz9R69R30uLgiWXtIQEpi2Minlg_okDHXPyDLKt0NU4PnlsNNDavp65Yh-1xEFl0AL7Rg6lOkIrmlohLkcqS70L-I1w6ezuM8QWJmq1Or0ci65qYhQyfTeGy1-cU7n5ER3f7OYfcia4_ZuHOX5NCnj4WyLiQCbnystvI1ZSOfFsKcVY0sMNO7RIOBg0_i6CYOVE1bJjSvS9im2RdVksUSKJ-jkrAoYm7RXmO4xtPj--hJPT9v6g9WiiVCqRm0XNPolc5Q5mCOsr107UNRs_FRALjz2WVP0HodaQMJMSN-EvRNbOg';
	// payload.username = '00000000-0000-0000-0000-000000000000' (mismatch — neither PROD nor DEV UUID).
	const JWT_MISMATCH  = 'eyJhbGciOiJSUzI1NiJ9.eyJ1c2VybmFtZSI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.sig';

	beforeEach(() => {
		vi.stubEnv('VITE_ADMIN_USER_ID_PROD', PROD_UUID);
		vi.stubEnv('VITE_ADMIN_USER_ID_DEV', DEV_UUID);
		common.deleteCookie('access_token');
	});

	afterEach(() => {
		common.deleteCookie('access_token');
	});

	it('(1) returns false when no cookie is set', () => {
		stubMode('development');
		expect(common.isAdmin()).toBe(false);
	});

	it('(2) returns false when cookie exists but parseJwt returns null (corrupted token)', () => {
		stubMode('development');
		common.setCookie('access_token', 'ZZZ');
		expect(common.isAdmin()).toBe(false);
	});

	it('(3) returns false when username does not match either admin UUID', () => {
		stubMode('development');
		common.setCookie('access_token', JWT_MISMATCH);
		expect(common.isAdmin()).toBe(false);
	});

	it('(4) returns true when username matches PROD UUID under isProd', () => {
		stubMode('production');
		common.setCookie('access_token', JWT_PROD_MATCH);
		expect(common.isAdmin()).toBe(true);
	});

	it('(5) returns true when username matches DEV UUID under isDev', () => {
		stubMode('development');
		common.setCookie('access_token', JWT_DEV_MATCH);
		expect(common.isAdmin()).toBe(true);
	});

	it('(6) returns false when username matches but neither isProd nor isDev (test mode)', () => {
		stubMode('test');
		common.setCookie('access_token', JWT_DEV_MATCH);
		expect(common.isAdmin()).toBe(false);
	});
});