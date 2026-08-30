import { markdownToHtml } from '../common/markdownParser';

// 인라인 패스는 **사용자가 쓴 글자만** 본다.
//
// 링크·이미지·autolink 패스가 태그를 만들고 나면 그 뒤의 강조 패스(`**` · `~~` ·
// `*`)가 같은 문자열을 다시 훑는다. 태그 조각을 빼 두지 않으면 강조가 속성값
// 안까지 파고든다 — 실측 (2026-08-30):
//
//   [문서](https://example.com/a**b**c.html)
//     → href='https://example.com/a<strong>b</strong>c.html'
//
// 주소가 바뀌므로 링크가 실제로 깨지고, 속성 안에 태그가 들어가 마크업도
// 망가진다. URL 에 `*` 나 `~` 가 드물다고 보기 어렵다 — 파일명·쿼리스트링·
// 위키 주소에 흔하다.
//
// 뺄 때 링크 텍스트까지 함께 빼면 안 된다. `[**굵게**](url)` 은 강조가 살아야
// 하는 자리다. 그래서 아래는 **두 방향**을 함께 못 박는다.

const attrOf = (html: string, name: string): string | null => {
	const matched = new RegExp(`${name}='([^']*)'`).exec(html);
	return matched ? (matched[1] ?? null) : null;
};

describe('생성된 속성값은 이후 인라인 패스가 건드리지 않는다', () => {

	it.each([
		['**', 'https://example.com/a**b**c.html'],
		['~~', 'https://example.com/a~~b~~c'],
		['*',  'https://example.com/a*b*c'],
	])('링크 URL 안의 %s 가 태그로 바뀌지 않는다', (_delimiter, url) => {

		const html = markdownToHtml(`[문서](${url})`);

		expect(attrOf(html, 'href')).toBe(url);
		expect(html).not.toContain('<strong>b</strong>c');
		expect(html).not.toContain('<del>b</del>c');
		expect(html).not.toContain('<em>b</em>c');
	});

	it('이미지의 src 와 title 이 온전하다', () => {

		const html = markdownToHtml('![그림](https://example.com/a**b**c.png "제목 ~~여기~~")');

		expect(attrOf(html, 'src')).toBe('https://example.com/a**b**c.png');
		expect(attrOf(html, 'title')).toBe('제목 ~~여기~~');
	});

	it('autolink 의 주소와 보이는 글자가 모두 원문 그대로다', () => {

		const url = 'https://example.com/a**b**c';
		const html = markdownToHtml(`<${url}>`);

		expect(attrOf(html, 'href')).toBe(url);
		expect(html).toContain(`>${url}</a>`);
	});

	// 반대 방향 — 링크 **텍스트**의 강조는 계속 살아야 한다. 태그를 통째로
	// 빼면 이쪽이 죽는다.
	it.each([
		['[**굵게**](https://example.com/x)', '<strong>굵게</strong>'],
		['[*기울임*](https://example.com/x)', '<em>기울임</em>'],
		['[~~취소~~](https://example.com/x)', '<del>취소</del>'],
	])('링크 텍스트 %s 의 강조는 유지된다', (input, expected) => {

		expect(markdownToHtml(input)).toContain(expected);
	});

	it('링크를 감싼 강조도 유지된다', () => {

		const html = markdownToHtml('**앞 [링크](https://example.com/x) 뒤**');

		expect(html).toContain('<strong>앞 ');
		expect(html).toContain(' 뒤</strong>');
		expect(attrOf(html, 'href')).toBe('https://example.com/x');
	});

	// 자리표시자가 밖으로 새지 않는지 — private-use 문자가 화면에 남으면
	// 보이지 않는 글자가 본문에 섞인다.
	it('자리표시자 문자가 출력에 남지 않는다', () => {

		const html = markdownToHtml(
			'![그림](https://example.com/a.png) [문서](https://example.com/b) <https://example.com/c> `code` **굵게**'
		);

		expect(html).not.toMatch(/[\uE000-\uE003]/);
	});
});
