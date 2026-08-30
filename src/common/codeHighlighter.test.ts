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

// 예약어 판정은 **식별자 단위**다. 이전에는 문자열 치환이라 단어 안쪽이 걸렸다.
describe('codeHighlighter Kotlin 단어 경계', () => {

	const marked = (code: string): string[] => {
		const el = document.createElement('div');
		el.innerHTML = codeHighlighter.codeHighlighter('kotlin', code);
		return Array.from(el.querySelectorAll('span')).map((n) => n.textContent ?? '');
	};

	const shown = (code: string): string => {
		const el = document.createElement('div');
		el.innerHTML = codeHighlighter.codeHighlighter('kotlin', code);
		return el.textContent ?? '';
	};

	it('단어 안쪽의 예약어를 칠하지 않는다', () => {
		// 이전: ["fun", "val"] — evaluate 의 val 이 걸렸다.
		expect(marked('fun evaluate(): Int = 0')).toEqual(['fun']);
		expect(marked('val interval = 10')).toEqual(['val']);
		expect(marked('return returnValue')).toEqual(['return']);
	});

	it('한 줄에 여러 번 나와도 전부 칠한다', () => {
		// 이전: ["val"] — String.replace 가 첫 하나만 바꿨다.
		expect(marked('val a = 1; val b = 2')).toEqual(['val', 'val']);
	});

	it('줄 머리의 예약어도 칠한다', () => {
		// 이전: [] — frontSpace 로 앞 공백을 요구했다.
		expect(marked('if (ifCondition) { }')).toEqual(['if']);
	});

	it('문자열 리터럴 안의 단어는 키워드가 아니다', () => {
		expect(marked('val s = "return null"')).toEqual(['val', '"return null"']);
	});

	it('글자는 그대로 남는다', () => {
		for (const code of [
			'private val privateKey = null',
			'fun bar(): String { return "hello" }',
			'val a = 1; val b = 2',
		]) {
			expect(shown(code)).toBe(code);
		}
	});

	// 대조 — 진짜 예약어·애너테이션·리터럴은 여전히 칠해야 한다.
	it('예약어와 애너테이션과 리터럴은 칠한다', () => {
		expect(marked('@Service')).toEqual(['@Service']);
		expect(marked('class Foo')).toEqual(['class']);
		expect(marked('"literal"')).toEqual(['"literal"']);
	});
});
