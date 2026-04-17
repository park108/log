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
});