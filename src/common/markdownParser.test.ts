import * as parser from './markdownParser';

describe('MD parsing test', () => {

	it("test parsing NEW LINE", () => {
		const result = parser.markdownToHtml("a\nb");
		expect(result).toBe("<p>a</p><p>b</p>");
	});

	it("test parsing HEADER", () => {
		const result = parser.markdownToHtml("# Header");
		expect(result).toBe("<h1>Header</h1>");
	});

	it("test parsing PRE", () => {
		const result = parser.markdownToHtml("```\nPre\nTest");
		expect(result).toBe("<pre>Pre<br />Test<br /></pre>");
	});

	it("test parsing PRE and Text", () => {
		const result = parser.markdownToHtml("```\nPre\nTest\n```\nText");
		expect(result).toBe("<pre>Pre<br />Test<br /></pre><p>Text</p>");
	});


	it("test parsing HR", () => {
		const result = parser.markdownToHtml("---");
		expect(result).toBe("<hr />");
	});

	it("test parsing BLOCKQUOTE", () => {
		const result = parser.markdownToHtml(">BLOCKQUOTE");
		expect(result).toBe("<blockquote>BLOCKQUOTE</blockquote>");
	});

	it("test parsing OL", () => {
		const result = parser.markdownToHtml("1. item1\n2. item2\n11. item11\n123Common Text\n1.Has Not Space After Dot");
		expect(result).toBe("<ol><li> item1</li><li> item2</li><li> item11</li></ol><p>123Common Text</p><p>1.Has Not Space After Dot</p>");
	});

	it("test parsing UL and Text", () => {
		const result = parser.markdownToHtml("- item1\n- item2\nCommon Text");
		expect(result).toBe("<ul><li>item1</li><li>item2</li></ul><p>Common Text</p>");
	});

	it("test parsing IMG", () => {
		const result = parser.markdownToHtml("![ALT_TEXT](https://www.example.com \"TITLE\")");
		expect(result).toBe("<p><img src='https://www.example.com' alt='ALT_TEXT' title='TITLE' /></p>");
	});

	it("escapes single quote in IMG alt (attribute boundary guard)", () => {
		// TSK-20260418-20 / REQ-20260418-001 FR-07 — parser-level escape
		const result = parser.markdownToHtml("![a'b](https://example.com/u.png \"t\")");
		expect(result).toContain("alt='a&#39;b'");
	});

	it("escapes < and > in IMG url (attribute boundary guard)", () => {
		const result = parser.markdownToHtml("![x](https://example.com/u.png?a=<script> \"t\")");
		expect(result).toContain("src='https://example.com/u.png?a=&lt;script&gt;'");
	});

	it("escapes double quote in IMG title (attribute boundary guard)", () => {
		// The parser's title syntax consumes up to the closing ")` pair, so an
		// internal `"` never reaches the emitter; instead we verify a string with
		// an already-embedded `"` inside url survives escape into `&quot;`.
		const result = parser.markdownToHtml("![a](https://example.com/u.png?q=\"v\" \"t\")");
		expect(result).toContain("&quot;");
	});

	it("escapes & in anchor href (attribute boundary guard)", () => {
		const result = parser.markdownToHtml("[x](https://example.com/?a=1&b=2 \"t\")");
		expect(result).toContain("href='https://example.com/?a=1&amp;b=2'");
	});

	it("test parsing STRONG", () => {
		const result = parser.markdownToHtml("** STRONG **");
		expect(result).toBe("<p><strong> STRONG </strong></p>");
	});
});

describe('computeDepth helper', () => {

	it("returns depth 0 for a line with no leading indent", () => {
		expect(parser.computeDepth("- a")).toEqual({ depth: 0, prefixLength: 0 });
	});

	it("returns depth 1 for a single leading tab", () => {
		expect(parser.computeDepth("\t- a")).toEqual({ depth: 1, prefixLength: 1 });
	});

	it("returns depth 1 for two leading spaces", () => {
		expect(parser.computeDepth("  - a")).toEqual({ depth: 1, prefixLength: 2 });
	});

	it("returns depth 2 for two leading tabs", () => {
		expect(parser.computeDepth("\t\t- a")).toEqual({ depth: 2, prefixLength: 2 });
	});

	it("returns depth 2 for four leading spaces", () => {
		expect(parser.computeDepth("    - a")).toEqual({ depth: 2, prefixLength: 4 });
	});

	it("uses tabs when both tabs and spaces appear (tab-first precedence)", () => {
		expect(parser.computeDepth("\t  - a")).toEqual({ depth: 1, prefixLength: 1 });
	});

	it("floors odd space counts", () => {
		expect(parser.computeDepth("   - a")).toEqual({ depth: 1, prefixLength: 3 });
	});

	it("returns zero for empty or non-string input", () => {
		expect(parser.computeDepth("")).toEqual({ depth: 0, prefixLength: 0 });
		expect(parser.computeDepth(undefined)).toEqual({ depth: 0, prefixLength: 0 });
	});
});

describe('MD parsing — indented list detection (regression + nesting scan)', () => {

	it("still produces flat UL HTML when items are not indented (regression)", () => {
		const result = parser.markdownToHtml("- a\n- b\nCommon Text");
		expect(result).toBe("<ul><li>a</li><li>b</li></ul><p>Common Text</p>");
	});

	it("still produces flat OL HTML when items are not indented (regression)", () => {
		const result = parser.markdownToHtml("1. item1\n2. item2\n11. item11\n123Common Text\n1.Has Not Space After Dot");
		expect(result).toBe("<ol><li> item1</li><li> item2</li><li> item11</li></ol><p>123Common Text</p><p>1.Has Not Space After Dot</p>");
	});

	it("does not treat a non-marker indented line as a list item", () => {
		// Leading spaces without a marker must fall through to the paragraph pass.
		const result = parser.markdownToHtml("  hello");
		expect(result).toBe("<p>  hello</p>");
	});
});

describe('MD parsing — same-type nested lists (bindListItem stack)', () => {

	it("nests a tab-indented UL child inside the parent <li>", () => {
		// TSK-20260418-10 §7 case 1
		const result = parser.markdownToHtml("- a\n\t- b");
		expect(result).toBe("<ul><li>a<ul><li>b</li></ul></li></ul>");
	});

	it("reopens the outer UL after a depth-2 descent returns to depth 1", () => {
		// TSK-20260418-10 §7 case 2
		const result = parser.markdownToHtml("- a\n\t- b\n- c");
		expect(result).toBe("<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>");
	});

	it("nests a tab-indented OL child inside the parent <li>", () => {
		// TSK-20260418-10 §7 case 3
		const result = parser.markdownToHtml("1. a\n\t1. b");
		expect(result).toBe("<ol><li> a<ol><li> b</li></ol></li></ol>");
	});

	it("closes all nested lists before a trailing paragraph", () => {
		// TSK-20260418-10 §7 case 4
		const result = parser.markdownToHtml("- a\n\t- b\nText");
		expect(result).toBe("<ul><li>a<ul><li>b</li></ul></li></ul><p>Text</p>");
	});

	it("treats two leading spaces as equivalent to one tab for UL nesting", () => {
		// TSK-20260418-10 §7 case 5
		const result = parser.markdownToHtml("- a\n  - b");
		expect(result).toBe("<ul><li>a<ul><li>b</li></ul></li></ul>");
	});

	it("keeps sibling children at the same depth inside one nested UL", () => {
		const result = parser.markdownToHtml("- a\n\t- b\n\t- c");
		expect(result).toBe("<ul><li>a<ul><li>b</li><li>c</li></ul></li></ul>");
	});

	it("handles a three-level descent and a return to depth 0", () => {
		const result = parser.markdownToHtml("- a\n\t- b\n\t\t- c\n- d");
		expect(result).toBe(
			"<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li><li>d</li></ul>"
		);
	});

	// markdownParser.md §동작 (I6) "same-type 한정 계약" 박제:
	// ul ↔ ol 혼합 중첩 (`- a\n  1. b`) 은 bindListItem 알고리즘 범위 밖.
	// 본 fixture 는 의도적 out-of-scope 박제 — same-type 케이스가 아니므로 nested <ol> in <li>
	// 구조로 결합되지 않고, 평탄한 sibling <ul> + <ol> (또는 동등 fail-safe 출력) 으로 분기.
	it("does NOT nest ol child inside ul parent (mixed-type out-of-scope, REQ-076 FR-03 I6)", () => {
		const input = "- a\n\t1. b";
		const result = parser.markdownToHtml(input);
		// 핵심 평서문: <ul><li> a<ol> ... 형태 (same-type nested 결과) 가 나타나지 않는다.
		expect(result).not.toMatch(/<li>[^<]*<ol>/);
		// <ul> 과 <ol> 가 둘 다 출력에 등장 (mixed 입력의 평탄 출력 박제).
		expect(result).toContain("<ul>");
		expect(result).toContain("<ol>");
	});
});

// 링크·이미지의 **제목 없는 표준 형식**이 렌더되지 않고 있었다 (2026-08-30 실측).
//
// 구 구현은 `[`, `](`, ` "`, `")` 를 indexOf 로 순서 비교해 제목이 있어야만
// 매치했다. 그래서 `[텍스트](url)` 과 `![alt](url)` — 마크다운에서 가장 흔한
// 형식 — 이 조용히 문자 그대로 남았다. Writer 의 삽입 템플릿이 제목 자리를
// `OPTIONAL_TITLE` 이라 부르는 것과도 어긋났다.
describe('링크·이미지 제목 선택', () => {

	const cases = [
		{
			name: '링크 — 제목 없음 (표준)',
			src: '[링크](https://example.com)',
			has: ["<a href='https://example.com'", ">링크</a>"],
			hasNot: ['title=', '[링크]'],
		},
		{
			name: '링크 — 제목 있음',
			src: '[링크](https://example.com "제목")',
			has: ["<a href='https://example.com'", "title='제목'", ">링크</a>"],
			hasNot: ['[링크]'],
		},
		{
			name: '이미지 — 제목 없음 (표준)',
			src: '![alt](https://example.com/a.png)',
			has: ["<img src='https://example.com/a.png'", "alt='alt'"],
			hasNot: ['title=', '![alt]'],
		},
		{
			name: '이미지 — 제목 있음',
			src: '![alt](https://example.com/a.png "제목")',
			has: ["<img src='https://example.com/a.png'", "title='제목'"],
			hasNot: ['![alt]'],
		},
		{
			name: '문장 한가운데의 링크',
			src: '앞 [링크](https://example.com) 뒤',
			has: ['앞 ', "<a href='https://example.com'", ' 뒤'],
			hasNot: ['[링크]'],
		},
	];

	for (const c of cases) {
		it(c.name, () => {
			const out = parser.markdownToHtml(c.src);
			for (const frag of c.has) expect(out).toContain(frag);
			// 미변환 잔재가 없어야 한다 — 변환 여부만 보면 "문자 그대로 통과" 를 놓친다.
			for (const frag of c.hasNot) expect(out).not.toContain(frag);
		});
	}

	it('한 줄에 링크가 둘 이상이면 모두 변환한다', () => {
		const out = parser.markdownToHtml('[A](https://a.test) 와 [B](https://b.test "t")');
		expect(out).toContain(">A</a>");
		expect(out).toContain(">B</a>");
		expect(out).not.toContain('[A]');
		expect(out).not.toContain('[B]');
	});

	it('코드 블록 안의 링크 표기는 변환하지 않는다', () => {
		const out = parser.markdownToHtml(['```', '[링크](https://example.com)', '```'].join('\n'));
		expect(out).toContain('[링크](https://example.com)');
		expect(out).not.toContain('<a href=');
	});
});

// 수평선은 `---` 만 인식했다. CommonMark 는 `-` · `*` · `_` 를 3개 이상 반복하면
// 수평선으로 규정한다. `***` 는 수평선이 되지 못한 채 emphasis 파서에 걸려
// `<em></em>*` 라는 깨진 출력을 냈다 (실측 2026-08-30).
describe('수평선 — 세 문자 · 3개 이상', () => {

	for (const src of ['---', '***', '___', '-----', '****']) {
		it(`${src} 는 수평선이다`, () => {
			expect(parser.markdownToHtml(src)).toBe('<hr />');
		});
	}

	// 대조 — 3개 미만은 수평선이 아니다. 없으면 "무엇이든 hr" 구현도 통과한다.
	for (const src of ['--', '**', '__']) {
		it(`${src} 는 수평선이 아니다`, () => {
			expect(parser.markdownToHtml(src)).not.toBe('<hr />');
		});
	}
});

// autolink 를 지원하지 않으면 `<https://...>` 가 raw HTML 로 흘러가 sanitize
// 단계에서 통째로 삭제된다 — 사용자가 쓴 글자가 화면에서 사라진다.
describe('autolink', () => {

	it('<https://…> 가 링크가 된다', () => {
		const out = parser.markdownToHtml('<https://example.com>');
		expect(out).toContain("href='https://example.com'");
		// 표시 텍스트도 남아야 한다 — 링크만 되고 글자가 비면 소실과 다를 바 없다.
		expect(out).toContain('>https://example.com</a>');
	});

	it('<mailto:…> 도 링크가 된다', () => {
		expect(parser.markdownToHtml('<mailto:a@b.com>')).toContain("href='mailto:a@b.com'");
	});

	it('허용 스킴 밖은 링크로 만들지 않는다', () => {
		// sanitize 의 ALLOWED_URI_REGEXP 와 정책을 맞춘다 — 여기서 넓히면
		// 그쪽에서 잘려 결국 글자가 사라진다.
		const out = parser.markdownToHtml('<javascript:alert(1)>');
		expect(out).not.toContain('<a href=');
	});

	it('코드 블록 안에서는 변환하지 않는다', () => {
		const out = parser.markdownToHtml(['```', '<https://example.com>', '```'].join('\n'));
		expect(out).not.toContain('<a href=');
	});
});
