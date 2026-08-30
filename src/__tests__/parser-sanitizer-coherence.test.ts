import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { markChangedLines } from '../Log/diffContents';

// 파서가 내는 것을 sanitizer 가 지우면 **글자가 사라진다.**
//
// 실제로 그렇게 사라진 적이 있다 — 본문의 `<String>` 이 미지의 태그로 읽혀
// 통째로 삭제됐다 (6d853fb). 그것은 escape 로 고쳤지만, 같은 결함이 다른
// 경로로 다시 올 수 있다: 파서에 표(`<table>`)나 체크박스(`<input>`)를
// 더하면서 sanitizer 허용 목록을 함께 고치지 않으면, 새 문법은 조용히
// 빈 자리로 렌더된다.
//
// 허용 목록을 들여다보는 대신 **결과**를 본다 — 파서가 낸 태그·속성이 sanitize
// 뒤에도 남아 있는가. 그것이 사용자가 겪는 사실이다.

const corpus: Array<[string, string]> = [
	['제목 6단계', '# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6'],
	['문단', '문단이다.\n\n둘째 문단'],
	['목록', '- 하나\n- 둘\n\t- 중첩'],
	['순서목록', '1. 하나\n2. 둘'],
	['인용', '> 인용문'],
	['수평선', '앞\n\n---\n\n뒤'],
	['인라인', '**굵게** *기울임* ~~취소~~ `코드`'],
	['링크', '[링크](https://example.com "제목")'],
	['이미지', '![그림](https://example.com/a.png "제목")'],
	['자동링크', '<https://example.com>'],
	['코드펜스 kotlin', '```kotlin\nprivate val a = "x"\n@Service\n```'],
	['코드펜스 yaml', '```yaml\nkey: value\n# 주석\n```'],
	['변경 강조', markChangedLines('바뀐 줄이다', '예전 줄이다')],
];

const shapeOf = (html: string) => {
	const tags = new Set<string>();
	const attrs = new Set<string>();
	for (const m of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
		tags.add(m[1]!.toLowerCase());
		for (const a of (m[2] ?? '').matchAll(/([a-zA-Z-]+)\s*=/g)) attrs.add(a[1]!.toLowerCase());
	}
	return { tags, attrs };
};

const missing = (from: Set<string>, inside: Set<string>): string[] =>
	[...from].filter((x) => !inside.has(x)).sort();

describe('파서 산출 ↔ sanitizer 허용 정합', () => {

	it.each(corpus)('%s — 파서가 낸 태그·속성이 sanitize 를 지나 살아남는다', (_name, markdown) => {

		const parsed = markdownToHtml(markdown);
		const clean = sanitizeHtml(parsed);

		const before = shapeOf(parsed);
		const after = shapeOf(clean);

		expect(missing(before.tags, after.tags),
			'sanitizer 가 지운 태그 — 그 문법으로 쓴 글은 빈 자리가 된다').toEqual([]);
		expect(missing(before.attrs, after.attrs),
			'sanitizer 가 지운 속성').toEqual([]);
	});

	// 대조 1 — corpus 가 실제로 무언가를 재고 있는가. 태그를 하나도 안 내는
	// corpus 면 위 전부가 공허하다.
	it('corpus 가 파서의 산출 표면을 덮는다', () => {

		const tags = new Set<string>();
		for (const [, markdown] of corpus) {
			for (const t of shapeOf(markdownToHtml(markdown)).tags) tags.add(t);
		}

		for (const expected of ['p', 'h1', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre',
			'code', 'a', 'img', 'strong', 'em', 'del', 'span', 'hr', 'br']) {
			expect(tags.has(expected), 'corpus 가 <' + expected + '> 를 내지 않는다').toBe(true);
		}
	});

	// 대조 2 — sanitizer 가 실제로 일하고 있는가. 아무것도 안 지우는 sanitizer 면
	// 위 단정이 자동으로 참이 되어 게이트가 공허해진다.
	it('sanitizer 는 허용 밖 태그를 실제로 지운다', () => {

		const dirty = '<p>본문</p><table><tr><td>표</td></tr></table><script>alert(1)</script>';
		const clean = sanitizeHtml(dirty);

		expect(clean.toLowerCase()).not.toContain('<table');
		expect(clean.toLowerCase()).not.toContain('<script');
		expect(clean).toContain('본문');
	});
});
