import * as common from '../common';

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
    expect(getUrl).toBe("https://park108.net/");
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
  let location;
  const mockLocation = new URL("http://localhost:3000?access_token=12345#id_token=12345&abcde=abcde");

  location = window.location;
  mockLocation.replace = jest.fn();
  // You might need to mock other functions as well
  // location.assign = jest.fn();
  // location.reload = jest.fn();
  delete window.location;
  window.location = mockLocation;

  process.env.NODE_ENV = "development";
  const spyFn = jest.spyOn(common, "auth");
  common.auth();

  expect(spyFn).toBeCalled();

  window.location = location;
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

it('test formatted date', () => {
  const result = common.getFormattedDate(1633847332000);
  expect(result).toBe("2021-10-10");
});

it('test formatted time', () => {
  const result = common.getFormattedTime(1633847332000);
  expect(result).toBe("15:28:52");
});

it('is not mobile', () => {
  const getIsMobile = common.isMobile();
  expect(getIsMobile).toBe(false);
});