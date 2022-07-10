import * as common from '../common/common';

console.error = jest.fn();

describe('set HTML page title', () => {
  
	it("dev title", () => {
		process.env.NODE_ENV = "development";
		document.title = "";
		common.log("DEFAULT", "");
		common.log("INFO", "INFO");
		common.log("ERROR", "ERROR");
		common.setHtmlTitle("test");
		expect(document.title).toBe("[DEV] test - park108.net");
	});

	it("prod title", () => {
		process.env.NODE_ENV = "production";
		document.title = "";
		common.log("DEFAULT");
		common.log("INFO", "INFO");
		common.log("ERROR", "ERROR");
		common.setHtmlTitle("test");
		expect(document.title).toBe("test - park108.net");
	});
});

it('test parse Jwt token', () => {
	const result = common.parseJwt("eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJldmVudF9pZCI6IjljMzVkZGVlLTliMWMtNGY1Ni1iZGI3LWE2NmI5NWE1NDZmOSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2MzM4NDc3MzUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMi5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMl93SzR3dDdaYVIiLCJleHAiOjE2MzM4NTEzMzUsImlhdCI6MTYzMzg0NzczNSwidmVyc2lvbiI6MiwianRpIjoiMDkzMTg2OTEtN2JhNC00ZTA4LWEyYWItMGY0Nzg2ZjkwYWM0IiwiY2xpZW50X2lkIjoiaDNtOTJhMjd0MzlzZmNhdDMwMnRpcXRrbyIsInVzZXJuYW1lIjoiMDUxZmQ1ZjktYTMzNi00MDU1LTk2ZTUtNmUxZTEyNWViZDE1In0.Dg_M1EyU1gOUbHwwAoDi6LycG37dZuGJY2y-uOHz9R69R30uLgiWXtIQEpi2Minlg_okDHXPyDLKt0NU4PnlsNNDavp65Yh-1xEFl0AL7Rg6lOkIrmlohLkcqS70L-I1w6ezuM8QWJmq1Or0ci65qYhQyfTeGy1-cU7n5ER3f7OYfcia4_ZuHOX5NCnj4WyLiQCbnystvI1ZSOfFsKcVY0sMNO7RIOBg0_i6CYOVE1bJjSvS9im2RdVksUSKJ-jkrAoYm7RXmO4xtPj--hJPT9v6g9WiiVCqRm0XNPolc5Q5mCOsr107UNRs_FRALjz2WVP0HodaQMJMSN-EvRNbOg");
	expect(result['client_id']).toBe("h3m92a27t39sfcat302tiqtko");
});

describe('get URL by stage', () => {
  
	it("test URL", () => {
		process.env.NODE_ENV = "development";
		const getUrl = common.getUrl();
		expect(getUrl).toBe("http://localhost:3000/");
	});

	it("prod URL", () => {
		process.env.NODE_ENV = "production";
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
	mockLocation.replace = jest.fn();
	mockLocation.href += "?abcde=abcde&access_token=12345#id_token=67890&abcdef=abcdef";
	delete window.location;
	window.location = mockLocation;

	process.env.NODE_ENV = "development";
	common.auth();

	process.env.NODE_ENV = "production";
	common.auth();

	process.env.NODE_ENV = "";
	common.auth();

	window.location = currentLocation; // Rollback location
});

describe('login test', () => {

	it("is not logged", () => {
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

	it('test production admin', () => {
		process.env.NODE_ENV = "production";
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
		process.env.NODE_ENV = "development";
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
		process.env.NODE_ENV = "";
		common.setCookie("access_token", "eyJraWQiOiJrbFwvaFlubzFQZ040MkxnMmU0SkVQMzJnYzRTWUpDWWVVRll3UkhcL20yZjA9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiIwNTFmZDVmOS1hMzM2LTQwNTUtOTZlNS02ZTFlMTI1ZWJkMTUiLCJldmVudF9pZCI6IjljMzVkZGVlLTliMWMtNGY1Ni1iZGI3LWE2NmI5NWE1NDZmOSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4gb3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhdXRoX3RpbWUiOjE2MzM4NDc3MzUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1ub3J0aGVhc3QtMi5hbWF6b25hd3MuY29tXC9hcC1ub3J0aGVhc3QtMl93SzR3dDdaYVIiLCJleHAiOjE2MzM4NTEzMzUsImlhdCI6MTYzMzg0NzczNSwidmVyc2lvbiI6MiwianRpIjoiMDkzMTg2OTEtN2JhNC00ZTA4LWEyYWItMGY0Nzg2ZjkwYWM0IiwiY2xpZW50X2lkIjoiaDNtOTJhMjd0MzlzZmNhdDMwMnRpcXRrbyIsInVzZXJuYW1lIjoiMDUxZmQ1ZjktYTMzNi00MDU1LTk2ZTUtNmUxZTEyNWViZDE1In0.Dg_M1EyU1gOUbHwwAoDi6LycG37dZuGJY2y-uOHz9R69R30uLgiWXtIQEpi2Minlg_okDHXPyDLKt0NU4PnlsNNDavp65Yh-1xEFl0AL7Rg6lOkIrmlohLkcqS70L-I1w6ezuM8QWJmq1Or0ci65qYhQyfTeGy1-cU7n5ER3f7OYfcia4_ZuHOX5NCnj4WyLiQCbnystvI1ZSOfFsKcVY0sMNO7RIOBg0_i6CYOVE1bJjSvS9im2RdVksUSKJ-jkrAoYm7RXmO4xtPj--hJPT9v6g9WiiVCqRm0XNPolc5Q5mCOsr107UNRs_FRALjz2WVP0HodaQMJMSN-EvRNbOg");
	
		const resultDevCommonUser = common.isAdmin();
		expect(resultDevCommonUser).toBe(false);
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

		process.env.NODE_ENV = "development";
		const result = common.userAgentParser();
		expect(result.url).toBe("http://localhost:3000/");
	});
});