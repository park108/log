import * as codeHighlighter from '../common/codeHighlighter';

describe('highlight Kotlin code correctly', () => {
	it("test ANNOTATION highlighter", () => {
		const result = codeHighlighter.codeHighlighter("kotlin", "@RestController");
		expect(result).toBe("<span class='span span--kotlin-annotation'>@RestController</span>");
	});
	it("test LITERAL highlighter", () => {
		const result = codeHighlighter.codeHighlighter("kotlin", '"Some String Value"');
		expect(result).toBe("<span class='span span--kotlin-literal'>\"Some String Value\"</span>");
	});
	it("test RESERVED WORD highlighter", () => {
		const result = codeHighlighter.codeHighlighter("kotlin", "fun { }");
		expect(result).toBe("<span class='span span--kotlin-reserved'>fun</span> { }");
	});
});

describe('highlight YAML code correctly', () => {
	it("test KEY - VALUE highlighter", () => {
		const result = codeHighlighter.codeHighlighter("yaml", "key: value");
		expect(result).toBe("<span class='span--yml-key'>key</span>: value");
	});
	it("test COMMENT highlighter", () => {
		const result = codeHighlighter.codeHighlighter("yaml", "# comment ok");
		expect(result).toBe("<span class='span--yml-comment'># comment ok</span>");
	});
});