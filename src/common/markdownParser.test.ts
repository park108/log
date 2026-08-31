import * as parser from './markdownParser';
import sanitizeHtml from './sanitizeHtml';

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

// inline code 는 리터럴이어야 하는데 강조 파서가 먼저 돌아 안쪽을 먹고 있었다.
// `` `src/**/*.js` `` 가 `<code>src/<em></em>/*.js</code>` 로 뭉개졌다 —
// 기술 글의 glob · 곱셈 · 포인터 표기가 그대로 깨진다 (실측 2026-08-30).
describe('inline code 는 리터럴이다', () => {

	const cases: Array<[string, string, string]> = [
		['glob', '`src/**/*.js`', 'src/**/*.js'],
		['별표 곱셈', '`2 * 3 * 4`', '2 * 3 * 4'],
		['밑줄', '`my_var_name`', 'my_var_name'],
		['취소선 표기', '`a~~b~~c`', 'a~~b~~c'],
		['링크 표기', '`[a](b)`', '[a](b)'],
	];

	for (const [name, src, want] of cases) {
		it(`${name} — 안쪽이 그대로 남는다`, () => {
			const out = parser.markdownToHtml(src);
			expect(out).toBe('<p><code>' + want + '</code></p>');
			// 강조 태그가 새어 들어오면 안 된다.
			expect(out).not.toContain('<em>');
			expect(out).not.toContain('<strong>');
		});
	}

	it('꺾쇠는 이스케이프해 살린다', () => {
		// 이스케이프하지 않으면 sanitize 가 태그로 보고 지워 글자가 사라진다.
		expect(parser.markdownToHtml('`List<String>`'))
			.toBe('<p><code>List&lt;String&gt;</code></p>');
	});

	it('코드 밖 강조는 그대로 동작한다', () => {
		// 대조 — 코드를 보호하느라 강조 자체를 죽이지 않았는지 본다.
		const out = parser.markdownToHtml('**굵게** 와 `code` 와 *기울임*');
		expect(out).toContain('<strong>굵게</strong>');
		expect(out).toContain('<em>기울임</em>');
		expect(out).toContain('<code>code</code>');
	});

	it('한 줄에 코드 스팬이 둘 이상이어도 각각 보호된다', () => {
		expect(parser.markdownToHtml('`a*b` 와 `c*d`'))
			.toBe('<p><code>a*b</code> 와 <code>c*d</code></p>');
	});
});

// 코드 스팬 보호는 자리표시자 치환으로 구현된다. 그 자리표시자와 같은 문자가
// **입력에 이미 있으면** 복원 단계가 사용자 글자를 코드로 오치환한다 (실측:
// `\uE000c9\uE001` → `<code></code>` — 글자가 사라진다). private-use 영역은
// 아이콘 폰트가 쓰므로 붙여넣기로 유입될 수 있다.
describe('자리표시자 충돌 방어', () => {

	const S0 = String.fromCharCode(0xE000);
	const S1 = String.fromCharCode(0xE001);
	const BT = String.fromCharCode(96);

	it('입력에 섞인 자리표시자 문자가 코드 스팬을 가로채지 않는다', () => {
		const out = parser.markdownToHtml(S0 + 'c0' + S1 + ' 와 ' + BT + 'real' + BT);
		// 사용자가 쓴 c0 은 글자로 남고, 진짜 코드 스팬만 코드가 된다.
		expect(out).toBe('<p>c0 와 <code>real</code></p>');
	});

	it('코드 스팬이 없는데 자리표시자만 있으면 글자가 사라지지 않는다', () => {
		// 방어 전에는 `<code></code>` 가 되어 c9 가 소실됐다.
		expect(parser.markdownToHtml(S0 + 'c9' + S1)).toBe('<p>c9</p>');
	});

	it('대조 — 자리표시자가 없는 평범한 c0 은 영향받지 않는다', () => {
		expect(parser.markdownToHtml('c0 와 ' + BT + 'real' + BT))
			.toBe('<p>c0 와 <code>real</code></p>');
	});
});

// 공백에 둘러싸인 홑 별표는 곱셈이지 강조가 아니다.
// 이전에는 `2 * 3 * 4 = 24` 가 `2 <em> 3 </em> 4 = 24` 로 렌더돼, 기술 글에서
// 곱셈 표기가 통째로 기울어졌다.
describe('강조 — 공백에 둘러싸인 홑 별표', () => {

	it('곱셈을 기울이지 않는다', () => {
		expect(parser.markdownToHtml("2 * 3 * 4 = 24")).toBe("<p>2 * 3 * 4 = 24</p>");
	});

	it('별표 하나만 있어도 그대로 둔다', () => {
		expect(parser.markdownToHtml("가격 * 세금 별도")).toBe("<p>가격 * 세금 별도</p>");
	});

	// 대조 — 붙여 쓴 강조는 그대로 동작해야 한다. 없으면 "별표는 절대 강조 아님"
	// 구현도 통과한다.
	it('붙여 쓴 강조는 그대로 기울인다', () => {
		expect(parser.markdownToHtml("이건 *기울임* 이다")).toBe("<p>이건 <em>기울임</em> 이다</p>");
	});

	// 대조 — `**` 는 공백을 끼워도 의도가 분명하므로 규칙 밖이다.
	it('굵게는 공백을 끼워도 그대로 굵게', () => {
		expect(parser.markdownToHtml("** 굵게 **")).toBe("<p><strong> 굵게 </strong></p>");
	});

	it('중첩 강조는 그대로', () => {
		expect(parser.markdownToHtml("**굵고 *기울고* 굵다**"))
			.toBe("<p><strong>굵고 <em>기울고</em> 굵다</strong></p>");
	});
});

// 대조 — 붙여 쓴 겹 별표는 강조로 남아야 한다.
//
// 산문 손상(`2 ** 10` 이 통째로 굵어지는 것)을 없애는 방법에는 `**` 를 통째로
// 비활성화하는 것도 있다. 그러면 손상은 사라지지만 글쓴이의 정상 강조까지
// 함께 죽는다 — 이 축의 대표 과잉 실패다. 아래 네 축이 그 선을 긋는다.
describe('붙여 쓴 겹 별표의 현 동작은 그대로다', () => {

	it('낱말에 밀착한 겹 별표는 굵게다', () => {
		expect(parser.markdownToHtml("**굵게**")).toBe("<p><strong>굵게</strong></p>");
	});

	it('한 줄에 두 쌍이 있어도 각각 굵게다', () => {
		expect(parser.markdownToHtml("**굵게** 와 **또굵게**"))
			.toBe("<p><strong>굵게</strong> 와 <strong>또굵게</strong></p>");
	});

	it('겹 별표 안의 홑 별표 중첩은 그대로다', () => {
		expect(parser.markdownToHtml("**굵고 *기울고* 굵다**"))
			.toBe("<p><strong>굵고 <em>기울고</em> 굵다</strong></p>");
	});

	// 짝이 없는 런은 글자다 — 경로 표기가 강조로 삼켜지지 않는다.
	it('짝 없는 겹 별표 런은 글자로 남는다', () => {
		expect(parser.markdownToHtml("경로는 src/**/*.ts 이다"))
			.toBe("<p>경로는 src/**/*.ts 이다</p>");
	});
});

// URL 안의 균형 잡힌 괄호. 위키·MSDN 처럼 괄호가 든 주소는 흔한데, 첫 `)` 에서
// (호스트는 example.com 을 쓴다 — csp-origin-coverage 게이트가 소스의 실 호스트를
//  CSP 허용 목록과 대조하므로, 픽스처가 없는 출처를 들여오면 안 된다.)
// 끊겨 href 가 잘리고 남은 `)` 가 본문에 샜다.
describe('링크 — URL 안의 괄호', () => {

	it('괄호가 든 주소를 끝까지 가져간다', () => {
		expect(parser.markdownToHtml("[wiki](https://example.com/wiki/C_(프로그래밍_언어))"))
			.toBe("<p><a href='https://example.com/wiki/C_(프로그래밍_언어)' target='_blank' rel='noreferrer'>wiki</a></p>");
	});

	it('이미지 주소도 같다', () => {
		expect(parser.markdownToHtml("![도표](https://example.com/a_(1).png)"))
			.toBe("<p><img src='https://example.com/a_(1).png' alt='도표' /></p>");
	});

	// 대조 — 괄호가 없는 평범한 주소와 제목 있는 링크는 그대로여야 한다.
	it('평범한 주소는 그대로', () => {
		expect(parser.markdownToHtml("[e](https://example.com/a?b=1&c=2)"))
			.toBe("<p><a href='https://example.com/a?b=1&amp;c=2' target='_blank' rel='noreferrer'>e</a></p>");
	});

	it('제목 있는 링크는 그대로', () => {
		expect(parser.markdownToHtml('[e](https://example.com "제목")'))
			.toBe("<p><a href='https://example.com' title='제목' target='_blank' rel='noreferrer'>e</a></p>");
	});
});

// 본문의 꺾쇠는 사용자 글자다. escape 하지 않던 동안 브라우저가 `<String>` 을
// 태그로 읽고 sanitize 가 미지의 태그를 지워, 글자가 조용히 사라졌다.
// 이 수리는 저장된 원문을 읽을 때마다 적용되므로 이미 올라간 글에도 반영된다.
describe('본문의 꺾쇠', () => {

	const rendered = (md: string): string => {
		const el = document.createElement('div');
		el.innerHTML = sanitizeHtml(parser.markdownToHtml(md));
		return el.textContent ?? '';
	};

	it('제네릭 표기가 살아남는다', () => {
		// 이전: "제네릭은 List 이다"
		expect(rendered('제네릭은 List<String> 이다')).toBe('제네릭은 List<String> 이다');
	});

	it('부등호가 살아남는다', () => {
		// 이전: "조건은 ad 이다"
		expect(rendered('조건은 a<b 이고 c>d 이다')).toBe('조건은 a<b 이고 c>d 이다');
	});

	it('태그 이름을 본문에 써도 살아남는다', () => {
		expect(rendered('React 에서 <div> 를 쓴다')).toBe('React 에서 <div> 를 쓴다');
	});

	it('코드 블록 안에서도 살아남는다', () => {
		// 이전: "List"
		expect(rendered('```\nList<String>\n```')).toContain('List<String>');
	});

	it('강조 안에서도 살아남는다', () => {
		expect(rendered('**굵은 <div> 안**')).toBe('굵은 <div> 안');
	});

	it('앰퍼샌드가 두 번 escape 되지 않는다', () => {
		expect(rendered('AT&T 와 R&D')).toBe('AT&T 와 R&D');
	});

	// 대조 — escape 는 표시를 위한 것이지 실행 허용이 아니다. 스크립트는
	// 글자로 보이되 실행 가능한 태그로 남지 않아야 한다.
	it('스크립트는 글자로 보이되 태그가 되지 않는다', () => {
		const html = sanitizeHtml(parser.markdownToHtml('<script>alert(1)</script> 를 조심하라'));
		expect(rendered('<script>alert(1)</script> 를 조심하라'))
			.toBe('<script>alert(1)</script> 를 조심하라');
		expect(html.toLowerCase()).not.toContain('<script');
	});

	// 대조 — 마크다운 문법 자체는 그대로 동작해야 한다.
	it('링크·자동링크는 그대로 동작한다', () => {
		expect(parser.markdownToHtml('[문구](https://example.com)'))
			.toBe("<p><a href='https://example.com' target='_blank' rel='noreferrer'>문구</a></p>");
		expect(parser.markdownToHtml('<https://example.com>'))
			.toBe("<p><a href='https://example.com' target='_blank' rel='noreferrer'>https://example.com</a></p>");
	});
});

// 하나로 쓴 목록이 둘로 쪼개졌다. 마커 없는 들여쓴 줄이 비-list 노드로 도착해
// 열린 목록을 전부 닫았기 때문이다 (`bindListItem` 의 `flushAll`). 번호 목록에서는
// 피해가 눈에 보인다 — `<ol>` 이 새로 열리고 HTML 은 start 없는 `<ol>` 을 1 부터
// 매기므로 독자가 `1.` 을 두 번 본다.
describe('목록 항목에 이어지는 줄', () => {

	it('들여쓴 줄은 그 항목의 내용이고 목록을 끊지 않는다', () => {
		expect(parser.markdownToHtml('- 하나\n  이어지는 줄\n- 둘'))
			.toBe('<ul><li>하나<br />이어지는 줄</li><li>둘</li></ul>');
	});

	// 들여쓰기는 표기이지 내용이 아니다 — 본문 앞에 남으면 그 항목만 밀려 보인다.
	it('들여쓰기 공백이 본문에 남지 않는다', () => {
		const out = parser.markdownToHtml('- 하나\n  이어지는 줄');
		expect(out).toContain('<br />이어지는 줄');
		expect(out).not.toContain('  이어지는');
	});

	it('이어지는 인용은 항목 안에서 인용이다 (꺾쇠가 글자로 남지 않는다)', () => {
		const out = parser.markdownToHtml('- 하나\n  > 인용\n- 둘');
		expect(out).toBe('<ul><li>하나<blockquote>인용</blockquote></li><li>둘</li></ul>');
		expect(out).not.toContain('&gt;');
	});

	// 연달아 붙은 인용 줄은 한 덩어리다 — 줄 머리 인용과 같은 규칙이다.
	it('연달아 붙은 이어짐 인용은 한 덩어리다', () => {
		expect(parser.markdownToHtml('- 하나\n  > 인용1\n  > 인용2\n- 둘'))
			.toBe('<ul><li>하나<blockquote>인용1<br />인용2</blockquote></li><li>둘</li></ul>');
	});

	// 표기 수단에 따라 결과가 갈리지 않는다 (computeDepth 의 현 규칙).
	it('4칸 들여쓰기와 탭 들여쓰기가 같은 결과를 낸다', () => {
		const spaces = parser.markdownToHtml('- 하나\n    이어지는 줄');
		const tab = parser.markdownToHtml('- 하나\n\t이어지는 줄');
		expect(spaces).toBe('<ul><li>하나<br />이어지는 줄</li></ul>');
		expect(tab).toBe(spaces);
	});

	it('여러 줄이 차례로 이어진다', () => {
		expect(parser.markdownToHtml('- 하나\n  줄1\n  줄2\n- 둘'))
			.toBe('<ul><li>하나<br />줄1<br />줄2</li><li>둘</li></ul>');
	});

	// 중첩 항목에도 같은 규칙이 적용된다 — 이어짐은 가장 가까운 열린 항목에 붙는다.
	it('중첩 항목에 이어지는 줄은 그 안쪽 항목의 내용이다', () => {
		expect(parser.markdownToHtml('- 하나\n  - 안쪽\n    안쪽 이어짐\n- 둘'))
			.toBe('<ul><li>하나<ul><li>안쪽<br />안쪽 이어짐</li></ul></li><li>둘</li></ul>');
	});
});

// (I1) 만 만족시키고 이것을 빠뜨리는 구현이 이 축의 대표 실패다 — 줄은 이어지는데
// `<ol>` 이 다시 열려 번호가 1 로 되감긴다. 이 대조가 없으면 아무것도 달라지지
// 않은 구현도 위 describe 를 통과한다.
describe('번호가 되감기지 않는다', () => {

	it('이어짐이 있어도 <ol> 은 하나로 유지된다', () => {
		const out = parser.markdownToHtml('1. 하나\n   이어지는 줄\n2. 둘');
		expect(out).toBe('<ol><li> 하나<br />이어지는 줄</li><li> 둘</li></ol>');
		// 목록이 쪼개졌다면 `<ol>` 이 둘이고 독자는 `1.` 을 두 번 본다.
		expect(out.match(/<ol>/g)).toHaveLength(1);
		expect(out.match(/<li>/g)).toHaveLength(2);
	});

	it('이어짐이 인용이어도 <ol> 은 하나로 유지된다', () => {
		const out = parser.markdownToHtml('1. 하나\n   > 인용\n2. 둘');
		expect(out.match(/<ol>/g)).toHaveLength(1);
		expect(out).toContain('<blockquote>인용</blockquote>');
	});
});

// `## 제목 ##` 처럼 양쪽에 `#` 을 두어 쓰면 독자가 `제목 ##` 을 봤다 — 글쓴이가
// 화면에 내보내려던 적이 없는 글자다. 제목 패스가 여는 쪽만 보고 나머지를 줄 끝까지
// 통째로 제목 내용에 넣었기 때문이다.
describe('제목의 닫는 # 은 제목 글자가 아니다', () => {

	it('양쪽에 #을 둔 제목은 닫는 쪽을 내용에서 뺀다', () => {
		expect(parser.markdownToHtml('## 제목 ##')).toBe('<h2>제목</h2>');
		expect(parser.markdownToHtml('# 제목 #')).toBe('<h1>제목</h1>');
	});

	// 닫는 개수는 여는 쪽과 같을 필요가 없다 (CommonMark 0.31.2 §4.2).
	it('닫는 #의 개수는 여는 쪽과 무관하다', () => {
		expect(parser.markdownToHtml('## 제목 ######')).toBe('<h2>제목</h2>');
		expect(parser.markdownToHtml('### 제목 #')).toBe('<h3>제목</h3>');
	});

	// 줄 끝 공백도 제목 내용이 아니다 — 닫는 시퀀스 뒤든, 닫는 시퀀스가 없든.
	it('줄 끝 공백은 제목 내용이 아니다', () => {
		expect(parser.markdownToHtml('## 제목 ##   ')).toBe('<h2>제목</h2>');
		expect(parser.markdownToHtml('## 제목   ')).toBe('<h2>제목</h2>');
	});

	// 닫는 시퀀스 제거는 블록 패스 안에서 끝난다 — 제목 안의 인라인 마크업은
	// 종전대로 동작해야 한다.
	it('제목 안의 인라인 마크업은 그대로 동작한다', () => {
		expect(parser.markdownToHtml('## **굵게** ##')).toBe('<h2><strong>굵게</strong></h2>');
		expect(parser.markdownToHtml('## `code` ##')).toBe('<h2><code>code</code></h2>');
	});

	// 대조 — 제목이 아닌 것은 여전히 제목이 아니다. 여는 쪽 판정은 건드리지 않았다.
	it('제목이 아닌 줄은 여전히 문단이다', () => {
		expect(parser.markdownToHtml('####### 일곱')).toBe('<p>####### 일곱</p>');
		expect(parser.markdownToHtml('##제목')).toBe('<p>##제목</p>');
	});
});

// 닫는 시퀀스를 "줄 끝 #을 지운다" 로 구현하면 언어 이름이 잘려 나간다. 판정
// 기준은 # 런의 바로 앞 문자이며, 그것이 공백·탭이 아니면 내용이다.
describe('앞에 공백이 없는 줄 끝 # 은 내용이다', () => {

	it('C#과 F#은 잘리지 않는다', () => {
		expect(parser.markdownToHtml('## C# 과 F#')).toBe('<h2>C# 과 F#</h2>');
		expect(parser.markdownToHtml('## C#')).toBe('<h2>C#</h2>');
	});

	it('글자에 붙은 #은 남고 공백을 둔 #만 표기다', () => {
		expect(parser.markdownToHtml('## 제목#')).toBe('<h2>제목#</h2>');
		// 마지막 런만 닫는 시퀀스다 — 가운데 #은 내용으로 남는다.
		expect(parser.markdownToHtml('# a # b #')).toBe('<h1>a # b</h1>');
	});
});

// CommonMark 는 강조 구분자로 `*` 와 `_` 를 대등하게 규정한다 (0.31.2 §6.2).
// 그런데 인라인 패스에 등록된 것이 `*`·`~` 계열뿐이라 `_기울임_` 은 강조를 잃고
// 그 위에 밑줄이 독자 화면에 글자로 남았다. 같은 문장 안에서 한쪽만 렌더되므로
// 글쓴이는 자기 글이 왜 반만 동작하는지 알 방법이 없다.
describe('밑줄 강조', () => {

	// 비한글 예시. 예시가 한글뿐이면 단어 글자 판정을 ASCII 로 좁힌 구현이
	// 이 게이트를 전부 통과한다.
	it('홑 밑줄은 기울임이다 — 영문', () => {
		expect(parser.markdownToHtml('_italic_')).toBe('<p><em>italic</em></p>');
	});

	it('홑 밑줄은 기울임이다 — 한글', () => {
		expect(parser.markdownToHtml('_기울임_')).toBe('<p><em>기울임</em></p>');
	});

	// 겹 밑줄은 굵게다. `**` 와 같은 결과여야 한다.
	it('겹 밑줄은 굵게다 — 영문', () => {
		expect(parser.markdownToHtml('__bold__')).toBe('<p><strong>bold</strong></p>');
	});

	it('겹 밑줄은 굵게다 — 한글', () => {
		expect(parser.markdownToHtml('__굵게__')).toBe('<p><strong>굵게</strong></p>');
	});

	// 구분자 혼용. 한 문장 안에서 한쪽만 동작하는 것이 이 축의 사용자 관측면이다.
	it('별표와 밑줄이 한 문장에서 함께 동작한다', () => {
		expect(parser.markdownToHtml('*별표* 와 _밑줄_'))
			.toBe('<p><em>별표</em> 와 <em>밑줄</em></p>');
	});
});

// 이 축의 나머지 절반은 무엇을 강조하지 **않는가** 다. `_` 는 `*` 와 달리
// 식별자에 흔히 쓰이므로(`foo_bar_baz` · `snake_case`) 억제 없이 등록하면
// 기술 글이 깨진다 — 현재 정상인 것을 깨뜨리는 방향이라 (I1) 만 만족시키는
// 구현보다 나쁠 수 있다.
describe('단어 안의 밑줄은 강조가 아니다', () => {

	// 비한글 — CommonMark 규격의 예시 그대로다.
	it('영문 식별자는 그대로 남는다', () => {
		expect(parser.markdownToHtml('foo_bar_baz')).toBe('<p>foo_bar_baz</p>');
	});

	// 단어 글자 판정을 `[A-Za-z0-9]` 로 좁히면 이 입력이 `한글<em>강조</em>표기`
	// 가 된다. 한글 예시만 있는 게이트에는 보이지 않는 방향이라 이 대조가
	// 그 유일한 관측 채널이다.
	it('한글 낱말 안쪽도 그대로 남는다', () => {
		expect(parser.markdownToHtml('한글_강조_표기')).toBe('<p>한글_강조_표기</p>');
	});

	// 억제와 강조는 한 문장에서 공존한다. 억제 조건을 "앞뒤 중 어느 한쪽" 으로
	// 쓰면 여는 구분자의 뒤는 정의상 언제나 낱말의 첫 글자이므로 뒤쪽 강조가
	// 통째로 죽는다.
	it('식별자와 강조가 한 문장에서 공존한다', () => {
		expect(parser.markdownToHtml('snake_case_name 과 _강조_'))
			.toBe('<p>snake_case_name 과 <em>강조</em></p>');
	});

	// 억제는 겹 구분자에도 걸린다 — `__` 만 등록하고 억제를 홑에만 두면
	// `a__b__c` 가 `a<strong>b</strong>c` 가 된다.
	it('겹 밑줄도 낱말 안쪽에서는 강조가 아니다', () => {
		expect(parser.markdownToHtml('a__b__c')).toBe('<p>a__b__c</p>');
	});
});

// **구분자 런은 쪼개 쓰지 않는다.** 런 가드는 `charAt` 산출(한 글자)을 구분자
// 문자열과 통째로 비교했기 때문에 겹 구분자(`"__"`, 두 글자)에서 결코 참이 되지
// 않았다. 이 결함은 `strictFlanking` 을 켠 등록이 홑 `*` 하나뿐이던 동안에는
// 발현할 자리가 없었다.
//
// 고치지 않은 채 `__` 를 등록하면 `___둘다___` 가 `<strong><em>둘다</strong></em>`
// — **겹침이 어긋난 태그** 로 나오고, sanitize 가 이를 조용히 메워 준다. 독자
// 화면에서는 밑줄 여섯 개가 사라지고 텍스트가 굵은 기울임으로 바뀌는데 콘솔에도
// 테스트에도 아무 소리가 나지 않는다 (실측 2026-08-31, 격리 사본).
//
// 그래서 단언은 산출 문자열 **전체** 를 비교한다. `toContain('둘다')` 로 쓰면
// 어긋난 태그도 통과해 이 게이트가 침묵한다.
describe('구분자 런은 쪼개 쓰지 않는다', () => {

	it('___둘다___ 는 현 산출을 유지한다', () => {
		expect(parser.markdownToHtml('___둘다___')).toBe('<p>___둘다___</p>');
	});

	// 대조 — 수평선 판정은 블록 패스라 인라인 변경이 이 순서를 뒤집지 않는다.
	it('___ 은 여전히 수평선이다', () => {
		expect(parser.markdownToHtml('___')).toBe('<hr />');
	});

	// 대조 — 3개 미만은 수평선이 아니고 강조도 아니다 (감쌀 내용이 없다).
	it('__ 는 수평선도 강조도 아니다', () => {
		expect(parser.markdownToHtml('__')).toBe('<p>__</p>');
	});

	// 대조 — 별표 축의 런 판정은 바뀌지 않는다 (한 글자끼리의 비교라 결과가 같다).
	it('별표 축의 런 판정은 그대로다', () => {
		expect(parser.markdownToHtml('***')).toBe('<hr />');
		expect(parser.markdownToHtml('2 * 3 * 4 = 24')).toBe('<p>2 * 3 * 4 = 24</p>');
	});
});

// 빈 줄이 목록을 **끝내는** 자리를 못 박는다.
//
// 빈 줄이 항목 사이에서 목록을 끊는 결함(TSK-20260831-09-b)을 고칠 때, 정확히
// 반대 방향의 과잉이 붙는다: 빈 줄 뒤 블록의 종류를 보지 않고 무조건 목록을
// 이으면 문단·다른 종류 목록 앞에서도 이어져 현행 경계가 무너진다.
//
// 그 과잉은 이 describe 가 생기기 전까지 **어떤 게이트에도 잡히지 않았다** —
// 빈 줄이 든 입력이 이 스위트에 한 건도 없었기 때문이다 (`\n\n` 0 hit).
// 무조건형 변형에서 `1. 첫째\n\n본문` 의 `<p></p>` 가 사라지는데도 파서 109 ·
// 교차 게이트 105 가 전부 초록이었다 (실측 2026-08-31, 격리 사본).
//
// 그래서 단언은 산출 문자열 **전체** 를 비교한다. `toContain` · 개수 세기로
// 쓰면 `<p></p>` 하나가 사라지는 형태의 과잉이 보이지 않는다.
describe('빈 줄이 목록을 끝내는 자리', () => {

	// (I5) 빈 줄 뒤가 목록이 아니면 목록은 끝난다.
	// `<li>` 본문 앞 한 칸 공백(`<li> 첫째`)은 현행이며 위 평탄 OL 게이트가
	// 이미 잠근 표기다 — 임의로 다듬지 않는다.
	it('빈 줄 뒤가 목록이 아니면 목록은 끝난다', () => {
		expect(parser.markdownToHtml('1. 첫째\n\n본문')).toBe('<ol><li> 첫째</li></ol><p></p><p>본문</p>');
	});

	// (I6) 종류가 다르면 두 목록이다.
	it('빈 줄 뒤 목록의 종류가 다르면 두 목록이다', () => {
		expect(parser.markdownToHtml('1. 첫째\n\n- 둘째')).toBe('<ol><li> 첫째</li></ol><p></p><ul><li>둘째</li></ul>');
	});
});

// 항목 사이의 빈 줄은 목록을 끊지 않는다.
//
// 번호 목록의 항목 사이를 빈 줄로 띄우면 목록이 항목 수만큼 쪼개졌고, 쪼개진
// 자리마다 `<ol>` 이 새로 열려 **독자는 `1.` 을 세 번 봤다**. 표기 자체는
// CommonMark 표준(§5.3 Ex.306·Ex.311)이라 글쓴이는 자기 원문에서 잘못을 찾을
// 수 없다.
//
// 단언은 **등식**으로 쓴다 — 왼쪽은 빈 줄이 있는 입력, 오른쪽은 그 빈 줄만
// 걷어낸 같은 입력이다. 개수로 쪼개면 각 방향이 서로 다른 결함을 놓친다:
// `<ol>` 개수만 재면 **항목을 잃은** 구현이 통과하고, `<li>` 개수만 재면
// **목록이 갈라진** 구현이 통과한다. 등식은 목록 개수·항목 개수·항목 내용·
// 중첩·빈 문단 잔존을 한 번에 잠근다. 오른쪽 항의 표기는 위 평탄 UL·OL
// 게이트가 이미 잠근 것이므로 새 표기를 발명하지 않는다.
describe('빈 줄은 같은 종류의 목록을 끊지 않는다', () => {

	// (I1) 번호 목록 — 빈 줄로 띄운 세 항목이 하나의 <ol> 이다.
	it('빈 줄로 띄운 번호 목록은 하나다', () => {
		expect(parser.markdownToHtml('1. 첫째\n\n2. 둘째\n\n3. 셋째'))
			.toBe(parser.markdownToHtml('1. 첫째\n2. 둘째\n3. 셋째'));
	});

	// (I1) 글머리 목록 — 번호가 없어 눈에 덜 띄지만 보조기술에는
	// "항목 1개짜리 목록" 여럿으로 읽힌다.
	it('빈 줄로 띄운 글머리 목록은 하나다', () => {
		expect(parser.markdownToHtml('- 첫째\n\n- 둘째'))
			.toBe(parser.markdownToHtml('- 첫째\n- 둘째'));
	});

	// (I2) 빈 줄이 둘이어도 하나다 (빈 줄 수는 경계를 만들지 않는다).
	// (I3) 빈 문단 잔존 금지는 이 등식의 계다 — 오른쪽 항에 <p></p> 가 없다.
	it('빈 줄이 둘이어도 목록은 하나다', () => {
		expect(parser.markdownToHtml('1. 첫째\n\n\n2. 둘째'))
			.toBe(parser.markdownToHtml('1. 첫째\n2. 둘째'));
	});

	// (I4) 중첩 — 목록 개수만 고치고 depthStack 을 놓친 구현이 이 축에서 갈린다.
	// 등식만으로는 오른쪽 항이 평탄 목록 게이트에 잠기지 않으므로 산출도 못 박는다.
	it('빈 줄은 중첩도 보존한다', () => {
		expect(parser.markdownToHtml('- 하나\n\n  - 중첩'))
			.toBe(parser.markdownToHtml('- 하나\n  - 중첩'));
		expect(parser.markdownToHtml('- 하나\n\n  - 중첩'))
			.toBe('<ul><li>하나<ul><li>중첩</li></ul></li></ul>');
	});
});
