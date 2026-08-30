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
// 모르는 언어는 칠하지 않는다.
//
// 이전에는 else 가 전부 YAML 로 떨어졌다 — 주석은 "yml or yaml" 이라 적혀 있었지만
// 실제로는 폴백이었다. 콜론이 든 줄이면 무엇이든 YAML 키처럼 칠해졌다.
describe('codeHighlighter 언어 판정', () => {

	const spans = (lang: string, code: string): string[] => {
		const el = document.createElement('div');
		el.innerHTML = codeHighlighter.codeHighlighter(lang, code);
		return Array.from(el.querySelectorAll('span')).map((n) => n.className);
	};

	it.each([
		['ts', 'const m: Map<string, number> = new Map();'],
		['js', 'const a = { key: 1 };'],
		['python', 'def f(x):'],
		['json', '{ "key": "value" }'],
		['', 'plain text: with colon'],
		['   ', 'plain text: with colon'],
	])('%s 는 칠하지 않는다', (lang, code) => {
		expect(spans(lang, code)).toEqual([]);
		// 글자는 그대로여야 한다.
		expect(codeHighlighter.codeHighlighter(lang, code)).toBe(code);
	});

	// 대조 — 아는 언어는 여전히 칠해야 한다. 없으면 "아무것도 안 칠하는" 구현도 통과한다.
	it('yaml 은 칠한다', () => {
		expect(spans('yaml', 'key: value').length).toBeGreaterThan(0);
		expect(spans('yml', 'key: value').length).toBeGreaterThan(0);
		expect(spans('YAML', '# 주석').length).toBeGreaterThan(0);
	});

	it('kotlin 은 칠한다', () => {
		expect(spans('kotlin', 'val a: Int = 1').length).toBeGreaterThan(0);
		expect(spans('kt', 'val a: Int = 1').length).toBeGreaterThan(0);
	});
});
