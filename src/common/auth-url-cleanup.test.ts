import * as common from './common';

// Cognito Hosted UI 의 implicit flow 는 토큰을 **주소에 실어** 돌려준다.
//
//   https://www.park108.net/#access_token=eyJ…&id_token=eyJ…&expires_in=3600&token_type=Bearer
//
// `auth()` 는 그 값을 쿠키로 옮기면서 주소는 그대로 두었다. 그러면 토큰이
// 주소창에 남고, 방문기록에 박히고, 화면 공유에 찍힌다. 로그인 직후는 주소를
// 복사해 남에게 보내기 쉬운 순간이기도 하다 — 그러면 살아 있는 토큰을 함께 보낸다.
//
// 쿠키에 옮긴 뒤에는 주소에 있을 이유가 없다.

const ACCESS = 'eyJhbGciOiJIUzI1NiJ9.access.signature';
const ID = 'eyJhbGciOiJIUzI1NiJ9.id.signature';

const goTo = (href: string): void => {
	window.history.replaceState(null, '', href);
};

const currentUrl = (): string =>
	window.location.pathname + window.location.search + window.location.hash;

const clearCookies = (): void => {
	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();
		if (name) document.cookie = `${name}=; max-age=0; path=/`;
	}
};

beforeEach(() => { clearCookies(); goTo('/'); });
afterEach(() => { clearCookies(); goTo('/'); });

describe('로그인 뒤 주소에서 토큰을 지운다', () => {

	it('fragment 의 토큰이 남지 않는다', () => {

		goTo(`/#access_token=${ACCESS}&id_token=${ID}&expires_in=3600&token_type=Bearer`);

		common.auth();

		expect(currentUrl()).not.toContain('access_token');
		expect(currentUrl()).not.toContain('id_token');
		expect(currentUrl()).not.toContain(ACCESS);
		expect(currentUrl()).not.toContain(ID);
	});

	it('query string 의 토큰도 남지 않는다', () => {

		goTo(`/?access_token=${ACCESS}&id_token=${ID}`);

		common.auth();

		expect(currentUrl()).not.toContain('access_token');
		expect(currentUrl()).not.toContain(ACCESS);
	});

	// 지우는 것과 저장하는 것은 별개다 — 지우기만 하면 로그인이 성립하지 않는다.
	it('지우기 전에 쿠키로 옮긴다', () => {

		goTo(`/#access_token=${ACCESS}&id_token=${ID}`);

		common.auth();

		expect(common.getCookie('access_token')).toBe(ACCESS);
		expect(common.getCookie('id_token')).toBe(ID);
		expect(common.isLoggedIn()).toBe(true);
	});

	// 같은 자리의 다른 값은 남의 것이다.
	it('같은 주소의 질의 문자열은 그대로 둔다', () => {

		goTo(`/log/search?q=%ED%95%9C%EA%B8%80#access_token=${ACCESS}`);

		common.auth();

		expect(new URLSearchParams(window.location.search).get('q')).toBe('한글');
		expect(currentUrl()).not.toContain('access_token');
	});

	it('토큰과 함께 온 다른 fragment 값은 남긴다', () => {

		goTo(`/#access_token=${ACCESS}&section=intro`);

		common.auth();

		expect(window.location.hash).toContain('section=intro');
		expect(currentUrl()).not.toContain('access_token');
	});

	// 토큰이 없던 평범한 이동은 건드리지 않는다 — 이유 없이 방문기록 항목을
	// 덮어쓰지 않는다. 이 단언이 없으면 "언제나 주소를 갈아치운다" 도 통과한다.
	it('토큰이 없으면 주소를 건드리지 않는다', () => {

		goTo('/log/search?q=abc#top');

		common.auth();

		expect(currentUrl()).toBe('/log/search?q=abc#top');
	});
});
