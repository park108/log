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
		// 마지막 두 줄은 마커가 아니므로 앞 항목의 **이어짐**이다 (lazy continuation).
		// 목록이 아니라는 판정은 그대로이고 귀속만 바뀐다 — 두 줄 다 `<li>` 가 되지 않는다.
		expect(result).toBe("<ol><li>item1</li><li>item2</li><li>item11<br />123Common Text<br />1.Has Not Space After Dot</li></ol>");
		// 세 항목은 여전히 평탄한 하나의 <ol> 이다 (중첩이 생기지 않는다).
		expect(result.match(/<ol>/g)).toHaveLength(1);
		expect(result.match(/<li>/g)).toHaveLength(3);
	});

	it("test parsing UL and Text", () => {
		const result = parser.markdownToHtml("- item1\n- item2\nCommon Text");
		// `Common Text` 는 마커가 없으므로 `item2` 의 이어짐이다 (lazy continuation).
		expect(result).toBe("<ul><li>item1</li><li>item2<br />Common Text</li></ul>");
		expect(result.match(/<ul>/g)).toHaveLength(1);
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

	// 전환됨 — `**` 가 공백 판정 밖이던 시절에는 이 입력이 굵게였다. 입력은
	// 그대로 두고 기대값만 뒤집는다. 무엇이 바뀌었는지 자리로 남기기 위함이다.
	it("test parsing STRONG", () => {
		const result = parser.markdownToHtml("** STRONG **");
		expect(result).toBe("<p>** STRONG **</p>");
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

// 파서가 **원문에 없는 글자를 만들어 내면** 안 된다. `1. 하나` 를 쓰면 항목 내용은
// `하나` 이지 ` 하나` 가 아니다 — 마커 뒤 공백은 표기이지 내용이 아니다.
//
// 이 저장소는 "글에 쓴 글자는 화면에 남아야 한다" 를 게이트로 세웠지만 그것은
// **소실 방향만** 잰다. 파서가 글자를 **더하는** 방향에는 채널이 없었고, 그 사각에
// 들어앉아 있던 것이 이 공백 한 칸이다. 채널이 없는 동안 결함은 기대값으로 승격돼
// 저장소 곳곳에 굳었다 (착수 시점 19곳).
describe('번호 목록 항목의 내용은 마커 뒤부터 시작한다', () => {

	// `<li>` 와 `</li>` 사이 문자열 — 판정면은 리터럴이 아니라 **두 표기의 등식**이다.
	const itemContents = (html: string): string[] =>
		[...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1] ?? '');

	it('1. X 의 항목 내용은 X 다 — 앞에 공백이 붙지 않는다', () => {
		expect(parser.markdownToHtml('1. X')).toBe('<ol><li>X</li></ol>');
	});

	// 등식 — 리터럴만 못 박으면 `ol` 만 고치고 `ul` 이 뒤에 어긋나도 보이지 않는다.
	it('같은 내용을 쓰면 두 표기의 항목 내용이 서로 같다', () => {
		expect(itemContents(parser.markdownToHtml('1. X')))
			.toEqual(itemContents(parser.markdownToHtml('- X')));
		expect(itemContents(parser.markdownToHtml('1. 하나\n2. 둘')))
			.toEqual(itemContents(parser.markdownToHtml('- 하나\n- 둘')));
	});

	// 등식만으로는 부족하다 — `ul` 을 `ol` 에 맞추는 방향도 등식을 만족시킨다.
	// 그래서 글머리 목록 산출을 함께 못 박는다 (그쪽은 이미 옳다).
	it('글머리 목록 항목 내용은 그대로다', () => {
		expect(parser.markdownToHtml('- X')).toBe('<ul><li>X</li></ul>');
		expect(parser.markdownToHtml('- 하나\n- 둘')).toBe('<ul><li>하나</li><li>둘</li></ul>');
	});

	// 절단을 고치면서 **판정**까지 옮기는 구현이 이 축에서 갈린다 —
	// 무엇이 목록인가는 바뀌지 않는다.
	it('마커 판정은 바뀌지 않는다', () => {
		expect(parser.markdownToHtml('1.Has Not Space After Dot')).toBe('<p>1.Has Not Space After Dot</p>');
		expect(parser.markdownToHtml('123Common Text')).toBe('<p>123Common Text</p>');
		expect(parser.markdownToHtml('1) 하나')).toBe('<p>1) 하나</p>');
	});

	// 중첩에서도 같다 — 절단은 각 항목마다 한 벌씩 적용된다.
	it('중첩 번호 목록에서도 내용은 마커 뒤부터다', () => {
		expect(parser.markdownToHtml('1. a\n\t1. b')).toBe('<ol><li>a<ol><li>b</li></ol></li></ol>');
	});
});

describe('MD parsing — indented list detection (regression + nesting scan)', () => {

	it("still produces flat UL HTML when items are not indented (regression)", () => {
		const result = parser.markdownToHtml("- a\n- b\nCommon Text");
		// `Common Text` 는 `b` 의 이어짐이다. 이 게이트가 지키는 명제는 **평탄함**이며
		// 그것은 그대로다 — 중첩 <ul> 이 생기지 않고 항목은 둘이다.
		expect(result).toBe("<ul><li>a</li><li>b<br />Common Text</li></ul>");
		expect(result.match(/<ul>/g)).toHaveLength(1);
		expect(result.match(/<li>/g)).toHaveLength(2);
	});

	it("still produces flat OL HTML when items are not indented (regression)", () => {
		const result = parser.markdownToHtml("1. item1\n2. item2\n11. item11\n123Common Text\n1.Has Not Space After Dot");
		// 마지막 두 줄은 마커가 아니므로 앞 항목의 **이어짐**이다 (lazy continuation).
		// 목록이 아니라는 판정은 그대로이고 귀속만 바뀐다 — 두 줄 다 `<li>` 가 되지 않는다.
		expect(result).toBe("<ol><li>item1</li><li>item2</li><li>item11<br />123Common Text<br />1.Has Not Space After Dot</li></ol>");
		// 세 항목은 여전히 평탄한 하나의 <ol> 이다 (중첩이 생기지 않는다).
		expect(result.match(/<ol>/g)).toHaveLength(1);
		expect(result.match(/<li>/g)).toHaveLength(3);
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
		expect(result).toBe("<ol><li>a<ol><li>b</li></ol></li></ol>");

		// 같은 종류(OL>OL) 중첩의 그룹 경계 대조 — 위 UL 쪽과 대칭이다.
		// 번호 목록은 바깥이 쪼개지면 번호가 1 로 되감기므로 개수 단언이 핵심이다.
		const group = parser.markdownToHtml("1. 하나\n   1. 안쪽\n2. 둘");
		expect(group).toBe(
			"<ol><li>하나<ol><li>안쪽</li></ol></li><li>둘</li></ol>"
		);
		expect(group).toMatch(/<li>[^<]*<ol>/); // 중첩이 <li> 안쪽에서 열린다
		expect(group.match(/<ol>/g)?.length).toBe(2); // 바깥 1 + 중첩 1 (바깥은 쪼개지지 않는다)
	});

	it("closes all nested lists before a trailing paragraph", () => {
		// TSK-20260418-10 §7 case 4
		// 들여쓰지 않은 `Text` 는 이제 가장 가까운 열린 항목 `b` 의 이어짐이다
		// (lazy continuation). 문단으로 떨어져 나오지 않는다.
		const result = parser.markdownToHtml("- a\n\t- b\nText");
		expect(result).toBe("<ul><li>a<ul><li>b<br />Text</li></ul></li></ul>");

		// 이 게이트가 지키는 명제(중첩 목록이 뒤따르는 문단 앞에서 전부 닫힌다)는
		// **빈 줄**로 문단을 연 표기가 그대로 보존한다 — 명제를 잃지 않도록 함께 잠근다.
		const separated = parser.markdownToHtml("- a\n\t- b\n\nText");
		expect(separated).toContain("</ul></li></ul>");
		expect(separated).toContain("<p>Text</p>");
	});

	it("treats two leading spaces as equivalent to one tab for UL nesting", () => {
		// TSK-20260418-10 §7 case 5
		const result = parser.markdownToHtml("- a\n  - b");
		expect(result).toBe("<ul><li>a<ul><li>b</li></ul></li></ul>");

		// 같은 종류(UL>UL) 중첩의 그룹 경계 대조 — `does NOT nest ...` fixture 가
		// 지키던 명제(같은 종류 그룹 경계가 무너지지 않는다) 를 여기서 이어받는다.
		// 중첩 구조(<li> 안쪽)와 바깥 목록 개수를 **함께** 잰다: 둘 중 하나만 재면
		// 중첩된 채 바깥이 쪼개진 산출(번호 되감김) 이 초록으로 통과한다.
		const group = parser.markdownToHtml("- 하나\n  - 안쪽\n- 둘");
		expect(group).toBe(
			"<ul><li>하나<ul><li>안쪽</li></ul></li><li>둘</li></ul>"
		);
		expect(group).toMatch(/<li>[^<]*<ul>/); // 중첩이 <li> 안쪽에서 열린다
		expect(group.match(/<ul>/g)?.length).toBe(2); // 바깥 1 + 중첩 1 (바깥은 쪼개지지 않는다)
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

	// 혼합 종류 중첩의 산출 형태는 `markdown-mixed-type-nested-list` 계약이 소유한다
	// (TSK-20260831-20-b). 이 fixture 는 그 계약이 뒤집을 명제(중첩이 일어나지 않는다) 를
	// 박제하고 있었으므로 그 단언 한 줄을 **인계**했다 — 그것이 지키던 명제(같은 종류
	// 그룹 경계 보존) 는 위 두 대조 게이트로 옮겨 세웠다 (TSK-20260831-20-a).
	// **입력은 바꾸지 않는다** (RULE-06 §(T3)) — 남은 두 단언은 계약 착지 후에도 참이다.
	it("emits both ul and ol for a mixed-type indented list", () => {
		const input = "- a\n\t1. b";
		const result = parser.markdownToHtml(input);
		// <ul> 과 <ol> 가 둘 다 출력에 등장.
		expect(result).toContain("<ul>");
		expect(result).toContain("<ol>");
	});
});

// `- 준비` 아래 들여쓴 `1. 설치` 는 그 항목 **안에** 들어가야 하는데, 종전에는 바깥
// 목록을 끊고 형제 목록을 만들었다. 번호 목록이 바깥이면 독자는 `1.` 을 두 번 본다.
//
// 두 축을 **나눠 세운다**: 중첩 여부만 재는 게이트는 바깥이 쪼개진 채로도 초록이고,
// 개수만 재는 게이트는 중첩 없이 한 덩어리로 뭉갠 구현을 통과시킨다.
describe('MD parsing — mixed-type nested lists', () => {

	it("종류가 달라도 깊게 들여쓴 목록은 중첩된다", () => {

		// **`<li>` 본문 앞 공백 표기는 이 계약의 판정면이 아니다** — 그 축은
		// `markdown-list-item-content-start` 소유다 (출처 spec §역할). 그래서
		// 산출 전체를 리터럴로 못 박지 않고 항목 본문 자리를 `[^<]*` 로 열어 둔 채
		// **중첩 구조 전체**를 잰다. 앞뒤를 `^`·`$` 로 닫으므로 리터럴만큼 조인다.
		//
		// 리터럴로 못 박았더니 범위 밖 축의 정상 변경(내용 시작 표기 되돌리기)에서
		// 이 게이트가 붉어졌다 — RULE-06 §음성 대조 Ctrl-3 실측. 과잉 특정이었다.

		// ul 이 바깥
		const ulOuter = parser.markdownToHtml("- 준비\n  1. 설치\n  2. 설정\n- 실행");
		expect(ulOuter).toMatch(
			/^<ul><li>[^<]*준비[^<]*<ol><li>[^<]*설치[^<]*<\/li><li>[^<]*설정[^<]*<\/li><\/ol><\/li><li>[^<]*실행[^<]*<\/li><\/ul>$/
		);
		expect(ulOuter).toMatch(/<li>[^<]*<ol>/);

		// ol 이 바깥 — **양방향**이다. 한쪽만 고치면 대칭 회귀가 남는다.
		const olOuter = parser.markdownToHtml("1. 준비\n   - 설치\n   - 설정\n2. 실행");
		expect(olOuter).toMatch(
			/^<ol><li>[^<]*준비[^<]*<ul><li>[^<]*설치[^<]*<\/li><li>[^<]*설정[^<]*<\/li><\/ul><\/li><li>[^<]*실행[^<]*<\/li><\/ol>$/
		);
		expect(olOuter).toMatch(/<li>[^<]*<ul>/);

		// 탭 들여쓰기도 같다.
		const tabbed = parser.markdownToHtml("- a\n\t1. b");
		expect(tabbed).toMatch(
			/^<ul><li>[^<]*a[^<]*<ol><li>[^<]*b[^<]*<\/li><\/ol><\/li><\/ul>$/
		);
		expect(tabbed).toMatch(/<li>[^<]*<ol>/);
	});

	it("종류가 바뀌어도 바깥 목록은 하나다", () => {

		// 바깥 여는 태그는 1개다. 구조(<li> 안쪽)와 개수를 **함께** 잰다 —
		// 중첩만 재면 바깥이 쪼개진 채로, 개수만 재면 중첩 없이 뭉갠 채로 초록이 된다.
		const ulOuter = parser.markdownToHtml("- 준비\n  1. 설치\n  2. 설정\n- 실행");
		expect(ulOuter.match(/<ul>/g)?.length).toBe(1);
		expect(ulOuter.match(/<ol>/g)?.length).toBe(1);
		expect(ulOuter).toMatch(/<li>[^<]*<ol>/);

		// 번호 목록이 바깥이면 쪼개짐은 곧 **번호 되감김**이다 (`1.` 을 두 번 본다).
		const olOuter = parser.markdownToHtml("1. 준비\n   - 설치\n   - 설정\n2. 실행");
		expect(olOuter.match(/<ol>/g)?.length).toBe(1);
		expect(olOuter.match(/<ul>/g)?.length).toBe(1);
		expect(olOuter).toMatch(/<li>[^<]*<ul>/);
	});
});

// 인용의 **대조 축** 두 가지. 인용 안 블록 재귀(TSK-20260831-21-b)가 들어올 때
// 가장 흔한 두 실패 방향은 손상 축 게이트에 **초록으로 보인다**:
//
//   1. 인용 내용을 인라인 파이프라인에 두 번 태운다 -> <strong><strong>굵게</strong></strong>.
//      렌더 결과가 굵은 글씨라 눈으로 구분되지 않는다.
//   2. 인용 패스를 옮기면서 여러 줄 묶음을 잃는다 -> 줄마다 <blockquote>.
//      세 줄짜리 인용 하나가 화면에서 서로 떨어진 인용 셋이 된다 (이 파일 위쪽
//      `93.56 -> 144.72` 실측 주석이 그 회귀의 기록이다).
//
// 그래서 구현보다 **먼저** 채널을 세운다. 두 게이트 모두 표기 문자열이 아니라
// **처리 횟수와 덩어리 개수**를 잰다 — 표기를 못 박으면 정당한 변경에서 붉어진다.
describe('MD parsing — blockquote contrast axes', () => {

	it("인용 안 인라인은 한 번만 처리된다", () => {

		const bold = parser.markdownToHtml("> **굵게**");
		expect(bold).toContain("<blockquote>");
		expect(bold).toContain("<strong>굵게</strong>");
		expect(bold.match(/<strong>/g)?.length).toBe(1);
		expect(bold).not.toContain("<strong><strong>");
		// 이웃한 실패 방향: 인용 본문을 먼저 HTML 로 렌더해 **값 노드**에 넣으면
		// 이중 처리가 아니라 **이스케이프 사멸**이 된다 — 독자는 `<strong>` 글자를
		// 그대로 본다. 주입 왕복에서 실제로 그 산출을 만들었고 개수 단언만으로는
		// 잡히지 않았다. 입력에 `<` 가 없으므로 `&lt;` 는 곧 사멸의 증거다.
		expect(bold).not.toContain("&lt;");

		// 코드 스팬도 같은 부류다 — 두 번 태우면 <code><code> 가 된다.
		const code = parser.markdownToHtml("> `코드`");
		expect(code).toContain("<blockquote>");
		expect(code).toContain("<code>코드</code>");
		expect(code.match(/<code>/g)?.length).toBe(1);
		expect(code).not.toContain("<code><code>");
		expect(code).not.toContain("&lt;");
	});

	it("블록이 없는 여러 줄 인용은 한 덩어리다", () => {

		// 판정면은 **덩어리 개수**이지 `<br />` 의 유무가 아니다 — 줄 잇는 표기를
		// 다른 것으로 바꾸면서 한 덩어리를 유지하는 구현도 계약을 만족한다.
		const two = parser.markdownToHtml("> 한 줄\n> 두 줄");
		expect(two.match(/<blockquote>/g)?.length).toBe(1);
		expect(two.match(/<\/blockquote>/g)?.length).toBe(1);
		expect(two).toContain("한 줄");
		expect(two).toContain("두 줄");
	});
});

// 인용 안에 쓴 목록·제목·중첩 인용이 **글자로 보였다.** 인용 패스가 줄들을 평탄한
// 값 노드로 확정해 버려 뒤에 도는 블록 패스가 마커를 보지 못했기 때문이다.
//
// 게이트는 산출 전체를 못 박지 않고 **구조와 개수**를 잰다. 특히 중첩 인용은
// `&gt;` 0건과 `<blockquote>` 2개를 **함께** 잰다 — escape 만 푸는 해법은 앞의
// 조건만 충족하고 독자에게는 여전히 인용이 하나로 보인다.
describe('MD parsing — blockquote block recursion', () => {

	it("인용 안에서도 목록은 목록이다", () => {

		const ul = parser.markdownToHtml("> - 하나\n> - 둘");
		expect(ul).toContain("<blockquote>");
		expect(ul.match(/<ul>/g)?.length).toBe(1);
		expect(ul.match(/<li>/g)?.length).toBe(2);
		expect(ul).toMatch(/<blockquote>[^<]*<ul>/);
		// 독자가 마커를 글자로 보지 않는다.
		expect(ul).not.toContain("- 하나");

		const ol = parser.markdownToHtml("> 1. 하나\n> 2. 둘");
		expect(ol).toContain("<blockquote>");
		expect(ol.match(/<ol>/g)?.length).toBe(1);
		expect(ol.match(/<li>/g)?.length).toBe(2);
		expect(ol).toMatch(/<blockquote>[^<]*<ol>/);
		expect(ol).not.toContain("1. 하나");
	});

	it("인용 안에서도 제목은 제목이다", () => {

		const heading = parser.markdownToHtml("> # 제목");
		expect(heading).toContain("<blockquote>");
		expect(heading).toMatch(/<blockquote>[^<]*<h1>/);
		expect(heading).toContain("<h1>제목</h1>");
		expect(heading).not.toContain("# 제목");
	});

	it("인용은 인용 안에서 다시 열린다", () => {

		// **두 축을 함께 잰다.** escape 만 푸는 해법은 `&gt;` 0건은 만족시키지만
		// 인용은 열리지 않아 독자에게는 여전히 한 덩어리로 보인다.
		const nested = parser.markdownToHtml("> 바깥\n> > 안쪽");
		expect(nested.match(/&gt;/g)?.length ?? 0).toBe(0);
		expect(nested.match(/<blockquote>/g)?.length).toBe(2);
		expect(nested.match(/<\/blockquote>/g)?.length).toBe(2);
		expect(nested).toContain("바깥");
		expect(nested).toContain("안쪽");
	});
});

// 밑줄식 제목(setext) 축의 위험은 과소 인식이 아니라 **과잉 인식**이다.
// `---` 를 만나면 앞줄을 제목으로 올리는 순진한 구현은 손상 축 게이트를 전부
// 통과하면서 **기존 글의 가로줄을 통째로 제목으로 바꾼다.** 글쓴이는 화면이
// 그럴듯해 보이므로 알아챌 수 없다.
//
// 그래서 다섯 대조를 **한 게이트 안에** 모은다. 나눠 두면 순진한 구현이 일부만
// 통과시키며 부분 초록을 만든다. 다섯 전부 밑줄식 제목 계약이 착지한 뒤에도
// **무변경**이어야 한다.
describe('MD parsing — thematic break preservation (setext contrast)', () => {

	it("밑줄식 제목은 가로줄을 가로채지 않는다", () => {

		// 앞 문단이 없는 밑줄은 가로줄이다.
		expect(parser.markdownToHtml("---")).toBe("<hr />");

		// 빈 줄이 갈랐으면 앞 문단을 붙잡지 않는다.
		expect(parser.markdownToHtml("문단\n\n---")).toBe("<p>문단</p><p></p><hr />");

		// `*` 와 `_` 는 setext 밑줄이 아니다 (CommonMark 는 `-`·`=` 만 인정한다).
		expect(parser.markdownToHtml("제목\n***")).toBe("<p>제목</p><hr />");
		expect(parser.markdownToHtml("제목\n___")).toBe("<p>제목</p><hr />");

		// 밑줄이 목록을 가로채지 않는다. `<li>` 본문 표기는 다른 계약 소유이므로
		// 판정에 넣지 않는다 — 그 축의 정상 변경에서 이 게이트가 붉어지면 안 된다.
		expect(parser.markdownToHtml("- 항목\n---"))
			.toMatch(/^<ul><li>[^<]*항목[^<]*<\/li><\/ul><hr \/>$/);
	});
});

// `제목` 밑에 `---` 을 쓰면 **제목이 사라지고 가로줄이 생겼다.** 화면에는 글자와
// 그 아래 선이 나타나 글쓴이가 의도한 것과 비슷해 보이므로 아무도 신고하지 않은 채
// 목차·스크린리더·검색엔진에서 제목만 조용히 사라진다.
//
// 판정면은 **제목이 생겼다**와 **가로줄이 남지 않았다**를 함께 재는 것이다.
// 앞의 것만 재면 밑줄이 산출에 남은 구현이 통과한다.
describe('MD parsing — setext heading underline', () => {

	it("밑줄식 제목은 제목이다", () => {

		// 밑줄 길이는 판정면이 아니다 — 1개 이상이면 제목이다 (CommonMark §4.3).
		for (const underline of ["---", "----", "--"]) {

			const out = parser.markdownToHtml("제목\n" + underline);

			expect(out).toContain("<h2>제목</h2>");
			expect(out).not.toContain("<hr />");
			// 밑줄 줄이 산출에 글자로 남지 않는다.
			expect(out).not.toContain("--");
		}
	});

	it("등호 밑줄은 큰 제목이다", () => {

		const out = parser.markdownToHtml("제목\n===");

		expect(out).toContain("<h1>제목</h1>");
		expect(out).not.toContain("===");

		// 표기가 달라도 같은 제목이다 — ATX 와 같은 태그, 같은 escape 규칙.
		expect(out).toBe(parser.markdownToHtml("# 제목"));
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

	// 전환됨 — `**` 도 이제 홑 `*` 와 같은 공백 규칙 아래 있다. 이 자리의 이전
	// 명제는 "공백을 끼워도 굵게로 읽는다" 였고, 그 명제와 본 계약은 동시에
	// 참일 수 없다. 이름과 기대값을 함께 뒤집는 이유가 그것이다.
	it('겹 별표도 공백을 끼우면 굵게가 아니다', () => {
		expect(parser.markdownToHtml("** 굵게 **")).toBe("<p>** 굵게 **</p>");
	});

	it('중첩 강조는 그대로', () => {
		expect(parser.markdownToHtml("**굵고 *기울고* 굵다**"))
			.toBe("<p><strong>굵고 <em>기울고</em> 굵다</strong></p>");
	});
});

// 겹 별표의 공백 flanking 계약.
//
// `2 ** 10 은 1024 이고 2 ** 20 은 1048576 이다` 가 독자에게
// `2  10 은 1024 이고 2  20 은 1048576 이다` 로 보였다 — 문장 한가운데부터
// 통째로 굵어지고 구분자 네 글자가 사라진다. 본문 · 목록 요약 · 검색
// 미리보기 세 표면에서 동시에 났다.
//
// 여는 쪽과 닫는 쪽을 **따로** 잰다. `** 굵게 **` 처럼 대칭인 예시만 두면
// 한쪽 판정만 넣은 구현도 통과한다 (열지 못하면 닫을 것도 없으므로).
// 비대칭 두 예시가 두 방향을 가르는 유일한 관측 채널이다.
describe('겹 별표는 공백을 사이에 두면 굵게가 아니다', () => {

	// (I1) 여는 쪽 단독 — 뒤는 붙어 있고 앞만 띄었다.
	it('여는 자리에 공백이 있으면 열지 않는다', () => {
		expect(parser.markdownToHtml("** 굵게**")).toBe("<p>** 굵게**</p>");
	});

	// (I2) 닫는 쪽 단독 — 앞은 붙어 있고 뒤만 띄었다.
	it('닫는 자리에 공백이 있으면 닫지 않는다', () => {
		expect(parser.markdownToHtml("**굵게 **")).toBe("<p>**굵게 **</p>");
	});

	// 산문 — 이 축을 연 실제 결함 문장이다.
	it('거듭제곱 표기가 든 산문은 그대로다', () => {
		expect(parser.markdownToHtml("2 ** 10 은 1024 이고 2 ** 20 은 1048576 이다"))
			.toBe("<p>2 ** 10 은 1024 이고 2 ** 20 은 1048576 이다</p>");
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

// 대조 — 붙여 쓴 물결의 현 동작은 그대로다.
//
// 물결 축의 대표 실패는 결함을 못 고치는 것이 아니라 **고치면서 정상 취소선까지
// 죽이는 것**이다. `~~` 등록을 통째로 지우는 방향과, 등록 인자를 채우면서
// 낱말 안쪽 억제(5번째 인자)까지 함께 켜는 방향이 그것이며, 공백 flanking 만
// 재는 게이트에는 두 방향이 **전부 초록으로 보인다**. 아래 여섯 축이 그 선을 긋는다.
describe('붙여 쓴 물결의 현 동작은 그대로다', () => {

	it('낱말에 밀착한 물결은 취소선이다', () => {
		expect(parser.markdownToHtml("~~취소~~")).toBe("<p><del>취소</del></p>");
	});

	it('한 줄에 두 쌍이 있어도 각각 취소선이다', () => {
		expect(parser.markdownToHtml("~~취소~~ 와 ~~또취소~~"))
			.toBe("<p><del>취소</del> 와 <del>또취소</del></p>");
	});

	// 낱말 안쪽 과잉의 **단독 관측 채널**이다. `**` 축에서 그대로 베낀 구현은
	// 등록 인자를 채우면서 5번째 인자(`intrawordSuppression`)까지 켜기 쉽고,
	// 그러면 이 표기가 조용히 평문(`<p>앞a~~b~~c뒤</p>`)이 된다. 억제는 `_` 계열의
	// 것이고 물결은 낱말에 붙여 쓰는 표기가 저장소에 이미 있다 — `**` 축에는
	// 없던 방향이라, 이 `it` 이 사라지면 그 회귀를 아무도 보지 못한다.
	it('낱말 안쪽의 물결도 취소선이다', () => {
		expect(parser.markdownToHtml("앞a~~b~~c뒤")).toBe("<p>앞a<del>b</del>c뒤</p>");
	});

	// 런 길이 3 — 런은 쪼개 쓰지 않으므로 열리지 않는다.
	it('세 겹 물결 런은 글자로 남는다', () => {
		expect(parser.markdownToHtml("아~~~ 그렇구나")).toBe("<p>아~~~ 그렇구나</p>");
	});

	// 짝이 없는 런은 글자다.
	it('짝 없는 물결은 글자로 남는다', () => {
		expect(parser.markdownToHtml("가격은 1~~2만원")).toBe("<p>가격은 1~~2만원</p>");
	});

	// 홑 물결은 구분자가 아니다 — 범위 표기가 취소선에 삼켜지지 않는다.
	it('홑 물결은 구분자가 아니다', () => {
		expect(parser.markdownToHtml("3~5개 그리고 10~20개"))
			.toBe("<p>3~5개 그리고 10~20개</p>");
	});
});

// 물결 취소선의 공백 flanking 계약.
//
// 이 저장소는 한국어로 쓰는 블로그이고 `와~~` · `헐~~` · `대박~~` 같은 늘임
// 표기가 캐주얼한 글에 흔하다. 그런데 `~~` 는 인라인 구분자 다섯 중 유일하게
// 공백 판정 밖에 있어서, 늘임표기가 한 문단에 짝수 번 나오기만 하면 그 사이
// 문장이 통째로 `<del>` 로 지워졌다 — `와~~ 좋다 정말 대박~~` 이 독자에게
// `와` + 취소선 그어진 `좋다 정말 대박` 으로 보였다. 목록 요약 경로에서는
// 태그가 벗겨져 `와 좋다 정말 대박` 으로 줄고 물결 네 글자가 사라진다.
//
// 여는 쪽과 닫는 쪽을 **따로** 잰다. `~~ 취소 ~~` 처럼 대칭인 예시만 두면
// 한쪽 판정만 넣은 구현도 통과한다 (열지 못하면 닫을 것도 없으므로).
// 비대칭 두 예시가 두 방향을 가르는 유일한 관측 채널이며, `**` 축이 같은
// 이유로 두 방향을 갈랐다.
describe('물결 취소선은 공백을 사이에 두면 취소선이 아니다', () => {

	// (I1) 여는 쪽 단독 — 뒤는 붙어 있고 앞만 띄었다.
	it('여는 자리에 공백이 있으면 열지 않는다', () => {
		expect(parser.markdownToHtml("~~ 취소~~")).toBe("<p>~~ 취소~~</p>");
	});

	// (I2) 닫는 쪽 단독 — 앞은 붙어 있고 뒤만 띄었다.
	it('닫는 자리에 공백이 있으면 닫지 않는다', () => {
		expect(parser.markdownToHtml("~~취소 ~~")).toBe("<p>~~취소 ~~</p>");
	});

	it('양쪽에 공백을 끼우면 취소선이 아니다', () => {
		expect(parser.markdownToHtml("~~ 취소 ~~")).toBe("<p>~~ 취소 ~~</p>");
	});

	// 이 축을 연 실제 결함 문장이다 — 운영자가 직접 재현했다.
	it('늘임 표기가 든 산문은 그대로다', () => {
		expect(parser.markdownToHtml("와~~ 좋다 정말 대박~~"))
			.toBe("<p>와~~ 좋다 정말 대박~~</p>");
	});

	it('늘임 표기가 문장 사이에 흩어져도 그대로다', () => {
		expect(parser.markdownToHtml("헐~~ 진짜? 대박~~ 신기"))
			.toBe("<p>헐~~ 진짜? 대박~~ 신기</p>");
	});

	// 이 계약은 손상을 없애는 데 그치지 않고 **잃어버린 취소선을 되찾는다**.
	// 전환 전에는 늘임표기의 여는 런이 뒤따라오는 의도된 취소선의 구분자를
	// 먼저 먹어치워 `와<del> 하니 </del>정말~~ 좋다` 가 됐다 — 글쓴이가 실제로
	// 의도한 `~~정말~~` 이 취소선을 잃었다. 이 축은 "취소선을 덜 그린다" 가
	// 아니라 "취소선이 옳은 자리에 그려진다" 이다.
	it('늘임 표기 뒤의 의도된 취소선이 되살아난다', () => {
		expect(parser.markdownToHtml("와~~ 하니 ~~정말~~ 좋다"))
			.toBe("<p>와~~ 하니 <del>정말</del> 좋다</p>");
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
		expect(out).toBe('<ol><li>하나<br />이어지는 줄</li><li>둘</li></ol>');
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

// 목록을 쓰다 줄이 길어져 **그냥 엔터를 친** 표기가 목록을 쪼갰다. 이어짐 판정이
// 들여쓰기를 요구했기 때문이다 — 들여쓰지 않은 줄은 `depth === 0 > openItemDepth === 0`
// 이 거짓이라 흡수되지 않고 비-list 노드로 `bindListItem` 에 도착해 `flushAll()` 이
// 열린 목록을 전부 닫았다. CommonMark 0.31.2 §5.2 의 lazy continuation 은 문단 계속에
// 한해 그 들여쓰기 요구를 면제한다.
//
// **판정면은 `<ol>`/`<ul>` 개수다.** `<p>` 가 사라졌는지만 재면 번호 축을 놓친다 —
// 문단이 없어져도 `<ol>` 이 둘이면 독자는 여전히 `1.` 을 두 번 본다. 그래서 단언마다
// 산출 문자열 등식과 목록 태그 개수를 **함께** 잠근다.
describe('들여쓰지 않은 이어짐 줄도 항목에 속한다', () => {

	// 독자가 겪은 손상 그대로 — 글쓴이가 `2.` 라고 쓴 것이 화면에 `1.` 로 나왔다.
	it('ol — 들여쓰지 않은 이어짐이 있어도 <ol> 은 하나다 (번호가 되감기지 않는다)', () => {
		const out = parser.markdownToHtml('1. 첫째 항목\n설명이 이어진다\n2. 둘째 항목');
		expect(out).toBe('<ol><li>첫째 항목<br />설명이 이어진다</li><li>둘째 항목</li></ol>');
		// 쪼개졌다면 `<ol>` 이 둘이고 두 번째가 1 부터 다시 센다.
		expect(out.match(/<ol>/g)).toHaveLength(1);
		expect(out.match(/<li>/g)).toHaveLength(2);
		// 이어짐이 목록 밖으로 새지 않는다.
		expect(out).not.toContain('<p>');
	});

	// 번호가 없어 눈에 덜 띄지만 보조기술에는 "항목 1개짜리 목록" 둘로 읽힌다.
	it('ul — 들여쓰지 않은 이어짐이 있어도 <ul> 은 하나다', () => {
		const out = parser.markdownToHtml('- 첫째 항목\n설명이 이어진다\n- 둘째 항목');
		expect(out).toBe('<ul><li>첫째 항목<br />설명이 이어진다</li><li>둘째 항목</li></ul>');
		expect(out.match(/<ul>/g)).toHaveLength(1);
		expect(out.match(/<li>/g)).toHaveLength(2);
		expect(out).not.toContain('<p>');
	});

	// 가장 흔한 표기 — 한 항목을 쓰다 줄이 길어져 넘긴 두 줄짜리.
	it('ul — 두 줄로 넘긴 한 항목은 하나의 항목이다', () => {
		const out = parser.markdownToHtml('- 문장이 길어서\n다음 줄로 넘겼다');
		expect(out).toBe('<ul><li>문장이 길어서<br />다음 줄로 넘겼다</li></ul>');
		expect(out.match(/<ul>/g)).toHaveLength(1);
		expect(out.match(/<li>/g)).toHaveLength(1);
		expect(out).not.toContain('<p>');
	});

	// ul 만 고치고 ol 을 두는 방향(또는 그 반대)은 계약을 반쪽만 만족시킨다.
	it('ol — 두 줄로 넘긴 한 항목은 하나의 항목이다', () => {
		const out = parser.markdownToHtml('1. 문장이 길어서\n다음 줄로 넘겼다');
		expect(out).toBe('<ol><li>문장이 길어서<br />다음 줄로 넘겼다</li></ol>');
		expect(out.match(/<ol>/g)).toHaveLength(1);
		expect(out.match(/<li>/g)).toHaveLength(1);
		expect(out).not.toContain('<p>');
	});

	it('여러 줄이 차례로 들여쓰기 없이 이어진다', () => {
		const out = parser.markdownToHtml('- 하나\n줄1\n줄2\n- 둘');
		expect(out).toBe('<ul><li>하나<br />줄1<br />줄2</li><li>둘</li></ul>');
		expect(out.match(/<ul>/g)).toHaveLength(1);
	});

	// ── 보존 축 — 들여쓰기를 빼면서 함께 삼키면 안 되는 자리들 ──────────────

	// 들여쓴 이어짐은 그대로다. 두 표기가 다른 산출을 내면 글쓴이가 구별할 수 없는
	// 차이가 화면에 나타난다.
	it('들여쓴 이어짐은 그대로다 (<ol> 하나)', () => {
		const out = parser.markdownToHtml('1. 하나\n   이어짐\n2. 둘');
		expect(out).toBe('<ol><li>하나<br />이어짐</li><li>둘</li></ol>');
		expect(out.match(/<ol>/g)).toHaveLength(1);
	});

	// 들여쓴 표기와 들여쓰지 않은 표기가 같은 연결 표기를 낸다.
	it('들여쓴 표기와 들여쓰지 않은 표기가 같은 산출을 낸다', () => {
		expect(parser.markdownToHtml('- 하나\n이어짐\n- 둘'))
			.toBe(parser.markdownToHtml('- 하나\n  이어짐\n- 둘'));
	});

	// **빈 줄은 여전히 목록을 끊는다.** 들여쓰기 조건을 빼면서 빈 줄까지 삼키는
	// 방향이 이 축의 과잉이며, 이어짐 축만 재는 단언에는 초록으로 보인다.
	it('빈 줄은 이어짐이 아니다 — 목록은 거기서 끝난다', () => {
		const ol = parser.markdownToHtml('1. 하나\n\n문단');
		expect(ol).toBe('<ol><li>하나</li></ol><p></p><p>문단</p>');
		expect(ol.match(/<ol>/g)).toHaveLength(1);
		expect(ol).toContain('<p>문단</p>');

		const ul = parser.markdownToHtml('- 하나\n\n문단');
		expect(ul).toBe('<ul><li>하나</li></ul><p></p><p>문단</p>');
		expect(ul).toContain('<p>문단</p>');
	});

	// 앞선 마커 줄이 없으면 이어짐이 아니다 — 열린 항목의 존재가 남은 조건이다.
	it('앞선 항목이 없는 줄은 그대로 문단이다', () => {
		expect(parser.markdownToHtml('  hello')).toBe('<p>  hello</p>');
		expect(parser.markdownToHtml('a\nb')).toBe('<p>a</p><p>b</p>');
	});

	// 이어짐은 가장 가까운 열린 항목에 붙는다 — 중첩 구조는 보존된다.
	it('중첩 항목에 들여쓰기 없이 이어지는 줄은 그 안쪽 항목의 내용이다', () => {
		const out = parser.markdownToHtml('- 하나\n  - 안쪽\n안쪽 이어짐\n- 둘');
		expect(out).toBe('<ul><li>하나<ul><li>안쪽<br />안쪽 이어짐</li></ul></li><li>둘</li></ul>');
		expect(out.match(/<ul>/g)).toHaveLength(2);
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
	// 항목 내용은 마커 뒤부터 시작한다 (`<li>첫째`) — 번호 목록도 글머리 목록과
	// 같다. 한때 이 자리에 `<li> 첫째` 의 선행 공백을 "현행이니 다듬지 않는다" 고
	// 적어 두었는데, 그 근거는 순환이었다: 표기가 옳은 이유가 게이트이고 게이트가
	// 그렇게 잠긴 이유가 표기였다.
	it('빈 줄 뒤가 목록이 아니면 목록은 끝난다', () => {
		expect(parser.markdownToHtml('1. 첫째\n\n본문')).toBe('<ol><li>첫째</li></ol><p></p><p>본문</p>');
	});

	// (I6) 종류가 다르면 두 목록이다.
	it('빈 줄 뒤 목록의 종류가 다르면 두 목록이다', () => {
		expect(parser.markdownToHtml('1. 첫째\n\n- 둘째')).toBe('<ol><li>첫째</li></ol><p></p><ul><li>둘째</li></ul>');
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

// `markdown-blank-line-predicate` (green) §동작 (I1)~(I4).
// 소유 계약(바로 위 describe)의 등식은 `\n\n` 만 말하는데, 구현 술어
// `isBlankLine` 은 `n.text.trim() === ""` 이라 **공백·탭만 있는 줄까지**
// 빈 줄로 본다 (CommonMark 0.31.2 §2.1 과 같은 방향). 산출은 옳은데
// **그 옳음이 어떤 게이트에도 걸려 있지 않았다** — 술어를 `n.text === ""`
// 로 좁히면 목록이 항목마다 쪼개지고 `<ol>` 번호가 되감기며 중첩이
// 평탄해지는데, 파서 스위트·교차 게이트 8 파일·인용 축이 전부 rc=0 이었다.
// 글쓴이가 항목 사이에 남긴 공백은 화면에서 보이지 않으므로 원문에서도
// 잘못을 찾을 수 없다. 이 describe 가 그 자리를 판정한다.
describe('빈 줄 술어는 공백만 있는 줄을 포함한다', () => {

	// (I2) 글머리 목록 — 항목 사이가 공백만 있는 줄이어도 그 줄을 걷어낸
	// 입력과 산출이 문자열로 같다. 오른쪽 항을 리터럴로 박지 않는 이유는
	// 소유 계약과 같다: `<ul>` 개수만 재면 항목을 잃은 구현이 통과하고
	// `<li>` 개수만 재면 목록이 갈라진 구현이 통과한다.
	it('공백만 있는 줄은 글머리 목록을 끊지 않는다', () => {
		expect(parser.markdownToHtml('- 첫째\n  \n- 둘째'))
			.toBe(parser.markdownToHtml('- 첫째\n- 둘째'));
	});

	// (I2) 번호 목록 — `ul` 만 고치고 `ol` 이 어긋나는 구현이 이 자리에서
	// 갈린다. 술어를 좁히면 목록이 둘로 쪼개지며 번호가 1 로 되감긴다.
	it('공백만 있는 줄은 번호 목록의 번호를 되감지 않는다', () => {
		expect(parser.markdownToHtml('1. 첫째\n   \n2. 둘째'))
			.toBe(parser.markdownToHtml('1. 첫째\n2. 둘째'));
	});

	// (I3) 탭만 있는 줄도 공백만 있는 줄과 같게 판정된다.
	// CommonMark 의 blank line 정의는 공백(U+0020)과 탭(U+0009) 둘 다다.
	it('탭만 있는 줄도 빈 줄과 같게 다뤄진다', () => {
		expect(parser.markdownToHtml('- 첫째\n\t\n- 둘째'))
			.toBe(parser.markdownToHtml('- 첫째\n- 둘째'));
	});

	// (I3) 공백만 있는 줄이 둘 이상이어도 경계를 만들지 않는다
	// (빈 줄 수는 경계가 아니라는 소유 계약의 명제를 입력 부류만 넓힌 것).
	it('공백만 있는 줄이 둘이어도 목록은 하나다', () => {
		expect(parser.markdownToHtml('- 첫째\n  \n  \n- 둘째'))
			.toBe(parser.markdownToHtml('- 첫째\n- 둘째'));
	});

	// (I3) 중첩 — 등식의 오른쪽 항이 평탄 목록이면 "목록은 잇되 depthStack
	// 을 푼" 구현이 등식만으로는 보이지 않는다. 그래서 산출도 함께 못 박는다.
	// 술어를 좁히면 이 자리가 <ul><li>하나</li></ul><p>  </p><ul>… 로 갈린다.
	it('공백만 있는 줄은 중첩도 보존한다', () => {
		expect(parser.markdownToHtml('- 하나\n  \n  - 중첩'))
			.toBe(parser.markdownToHtml('- 하나\n  - 중첩'));
		expect(parser.markdownToHtml('- 하나\n  \n  - 중첩'))
			.toBe('<ul><li>하나<ul><li>중첩</li></ul></li></ul>');
	});

	// (I4) 술어는 패스마다 갈려 있다 — 목록 연속성 패스는 isBlankLine 을
	// 거쳐 공백만 있는 줄을 흡수하지만, **문단 패스는 빈 줄 술어를 쓰지 않고
	// 원문을 그대로 흘린다.** 그래서 목록 밖에서는 `<p>  </p>` 가 남고
	// 진짜 빈 줄만 `<p></p>` 가 된다. 그 자리에서 두 항이 **다른 것이
	// 요점**이므로 등식으로 쓸 수 없고 리터럴로 못 박는다.
	//
	// **이것은 결함이 아니라 판정된 현행이다.** 렌더 결과는 공백이 접혀
	// 육안으로 같고, `<p>  </p>` → `<p></p>` 정규화는 소유 계약 (I7) 이
	// `\n\n` 쪽에서 **보존**으로 잠근 축을 건드리므로 별 req 가 필요하다.
	// 이 자리를 판정하지 않으면 다음 사람이 위 (I2) 등식을 문단 축까지
	// 참이라고 읽고, 문단 패스 정규화가 "일관성 개선" 으로 보여 통과한다.
	it('문단 패스는 공백만 있는 줄을 빈 줄로 보지 않는다', () => {
		expect(parser.markdownToHtml('첫\n  \n둘'))
			.toBe('<p>첫</p><p>  </p><p>둘</p>');
		// 대조: 진짜 빈 줄은 같은 자리에서 `<p></p>` 다.
		expect(parser.markdownToHtml('첫\n\n둘'))
			.toBe('<p>첫</p><p></p><p>둘</p>');
	});
});
