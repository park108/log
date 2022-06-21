import * as parser from '../common/markdownParser';

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

	it("test parsing HR", () => {
		const result = parser.markdownToHtml("---");
		expect(result).toBe("<hr />");
	});

	it("test parsing BLOCKQUOTE", () => {
		const result = parser.markdownToHtml(">BLOCKQUOTE");
		expect(result).toBe("<blockquote>BLOCKQUOTE</blockquote>");
	});

	it("test parsing OL", () => {
		const result = parser.markdownToHtml("1. item1\n2. item2");
		expect(result).toBe("<ol><li> item1</li><li> item2</li></ol>");
	});

	it("test parsing UL", () => {
		const result = parser.markdownToHtml("- item1\n- item2");
		expect(result).toBe("<ul><li>item1</li><li>item2</li></ul>");
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