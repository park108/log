import * as codeHighlighter from '../common/codeHighlighter';

describe('highlight Kotlin code correctly', () => {
	it("test ANNOTATION highlighter", () => {
		const result = codeHighlighter.codeHighlighter("kotlin", "@RestController");
		expect(result).toBe("<span class='span span--kotlin-annotation'>@RestController</span>");
	});
	it("test LITERAL highlighter", () => {
		const result = codeHighlighter.codeHighlighter("kotlin", '"Some String Value"');
		expect(result).toBe("<span class='span span--kotlin-literal'>\"Some String Value\"</span>");

		const result1 = codeHighlighter.codeHighlighter("kotlin", '"Some Failed Literal');
		expect(result1).toBe("\"Some Failed Literal");
	});
	it("test RESERVED WORD highlighter", () => {
		const result = codeHighlighter.codeHighlighter("kotlin", "fun { }");
		expect(result).toBe("<span class='span span--kotlin-reserved'>fun</span> { }");
	});
});

describe('highlight YAML code correctly', () => {
	it("test KEY - VALUE highlighter", () => {
		// YAML
		const result = codeHighlighter.codeHighlighter("yaml", "key: value");
		expect(result).toBe("<span class='span--yml-key'>key</span>: value");

		// YML
		const result1 = codeHighlighter.codeHighlighter("yml", "key: value");
		expect(result1).toBe("<span class='span--yml-key'>key</span>: value");

		// Only Key
		const result2 = codeHighlighter.codeHighlighter("yaml", "key:");
		expect(result2).toBe("<span class='span--yml-key'>key</span>:");

		// Dash
		const result3 = codeHighlighter.codeHighlighter("yaml", "- Dashed: value");
		expect(result3).toBe("-<span class='span--yml-key'> Dashed</span>: value");
	});
	it("test COMMENT highlighter", () => {
		// Fail comment
		const result1 = codeHighlighter.codeHighlighter("yml", " #COMMENT?");
		expect(result1).toBe("<span class='span--yml-comment'> #COMMENT?</span>");

		// Success comment
		const result = codeHighlighter.codeHighlighter("yaml", "# comment ok");
		expect(result).toBe("<span class='span--yml-comment'># comment ok</span>");
	});
	it("test statement", () => {
		const result = codeHighlighter.codeHighlighter("yaml", "not yaml statement");
		expect(result).toBe("not yaml statement");
	});
});