import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 펜스 코드 블록은 여는 펜스의 문자·길이로 닫히고, 펜스 줄의 글자를 삼키지 않는다.
// (spec `markdown-rendering` §동작 21)
//
// 이 게이트가 없던 동안 펜스 판정은 "trim 한 줄의 앞 3자가 백틱" 이었다. 그래서
//   - `~~~kotlin` 블록이 문단 세 줄로 보였고 (`<p>~~~kotlin</p>…`),
//   - `` ```인라인``` 문장 `` 한 줄이 문서 끝까지를 코드로 만들고 그 줄의 글자는
//     언어 자리라 화면에 나가지 않았고,
//   - 코드 안에 펜스를 적어 보이려고 바깥 펜스를 길게 써도 안쪽 ``` 에서 닫혔다.
//
// 판정면은 정제를 거친 DOM 이다 — 독자가 보는 것이다. 6 번(물결·백틱 동치)과
// 10 번(줄 가운데 물결 대조)만 `markdownToHtml` 산출 문자열을 비교한다.
//
// 입력은 백틱이 섞여 표 칸에 적으면 모호하므로 JS 문자열 리터럴 그대로 적는다.

const CASES = {
	1: '````\n```js\ncode\n```\n````',
	2: '~~~\ncode\n~~~',
	3: '```\na\n````',
	4: '```인라인``` 문장\n다음 줄',
	5: '~~~ 그렇구나\n다음 줄',
	6: ['~~~kotlin\nval a = 1\n~~~', '```kotlin\nval a = 1\n```'],
	7: '    ```\n    x\n    ```',
	8: '  ```\n    a\n  ```',
	9: '```\na\n~~~\nb\n```',
	10: '아~~~ 그렇구나',
} as const;

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

// `pre` 안의 줄은 `<br />` 로 나뉜다. 텍스트 노드를 이어 붙이다 `br` 에서 끊는다.
// 마지막 줄 뒤의 `br` 이 남기는 빈 꼬리는 줄이 아니다.
const preLines = (pre: Element): string[] => {
	const lines: string[] = [];
	let current = '';
	for (const child of Array.from(pre.childNodes)) {
		if ('BR' === child.nodeName) {
			lines.push(current);
			current = '';
		} else {
			current += child.textContent ?? '';
		}
	}
	if ('' !== current) lines.push(current);
	return lines;
};

describe('펜스 코드 블록 문자·길이·정보 문자열 (21)', () => {

	it('1 · 긴 바깥 펜스 안의 짧은 펜스 줄은 코드 내용이다', () => {
		const el = render(CASES[1]);
		const pres = el.querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect(preLines(pres[0] as Element)).toEqual(['```js', 'code', '```']);
	});

	it('2 · 물결 펜스는 코드 블록을 열고 닫는다', () => {
		const el = render(CASES[2]);
		expect(el.querySelectorAll('pre')).toHaveLength(1);
		expect(el.textContent).not.toContain('~');
	});

	it('3 · 여는 펜스보다 긴 닫는 펜스도 닫는다', () => {
		const el = render(CASES[3]);
		const pres = el.querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('a');
		expect(el.textContent).not.toContain('`');
	});

	it('4 · 백틱 펜스의 정보 문자열에 백틱이 있으면 펜스가 아니다', () => {
		const el = render(CASES[4]);
		expect(el.querySelectorAll('pre')).toHaveLength(0);
		const codes = el.querySelectorAll('code');
		expect(codes).toHaveLength(1);
		expect(codes[0]?.textContent).toBe('인라인');
		expect(el.textContent).toContain('문장');
		expect(el.textContent).toContain('다음 줄');
	});

	it('5 · 물결 펜스의 정보 문자열이 언어 이름 꼴이 아니면 펜스가 아니다', () => {
		const el = render(CASES[5]);
		expect(el.querySelectorAll('pre')).toHaveLength(0);
		expect(el.textContent).toContain('~~~ 그렇구나');
		expect(el.textContent).toContain('다음 줄');
	});

	it('6 · 물결 펜스의 언어 표기와 하이라이트는 백틱 펜스와 같다', () => {
		const [tilde, backtick] = CASES[6];
		expect(markdownToHtml(tilde)).toBe(markdownToHtml(backtick));
	});

	it('7 · 4칸 들여쓴 펜스 줄은 펜스가 아니다', () => {
		expect(render(CASES[7]).querySelectorAll('pre')).toHaveLength(0);
	});

	it('8 · 여는 펜스 들여쓰기만큼만 내용 줄에서 걷힌다', () => {
		const pres = render(CASES[8]).querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toBe('  a');
	});

	it('9 · 다른 문자의 펜스 줄은 닫지 않고 코드 내용이다', () => {
		const pres = render(CASES[9]).querySelectorAll('pre');
		expect(pres).toHaveLength(1);
		expect(pres[0]?.textContent).toContain('~~~');
	});

	it('10 · 대조 — 줄 가운데의 물결 런은 펜스와 무관하다', () => {
		expect(markdownToHtml(CASES[10])).toBe('<p>아~~~ 그렇구나</p>');
	});
});
