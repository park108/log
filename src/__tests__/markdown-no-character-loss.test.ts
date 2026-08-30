import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 글에 쓴 글자는 화면에 남아야 한다.
//
// 이 불변식이 없던 동안 꺾쇠가 든 문장이 조용히 잘렸다 — 브라우저가 `<String>` 을
// 태그로 읽고 sanitize 가 미지의 태그를 지운 결과다. 실측:
//   "제네릭은 List<String> 이다"  → "제네릭은 List 이다"
//   "조건은 a<b 이고 c>d 이다"    → "조건은 ad 이다"
// 코드 블록 안도 같았다.
//
// 아래 corpus 는 **마크다운 문법이 없는 평문**만 담는다. 그래야 "입력과 출력이
// 같아야 한다" 는 판정이 성립한다. 문법이 든 경우는 markdownParser.test.ts 가
// 개별로 다룬다.

const PLAIN_PROSE = [
	'제네릭은 List<String> 이다',
	'React 에서 <div> 를 쓴다',
	'조건은 a<b 이고 c>d 이다',
	'<script>alert(1)</script> 를 조심하라',
	'AT&T 와 R&D 와 Q&A',
	'꺾쇠 사이 공백: a < b > c',
	'화살표는 -> 와 => 로 쓴다',
	'비교 연산자 a <= b 와 c >= d',
	'제네릭 중첩 Map<String, List<Integer>> 이다',
	'HTML 엔티티는 &amp; 로 쓴다',
	'따옴표 "큰것" 과 \'작은것\'',
	'백분율 100% 와 통화 $100',
	'이모지 🎉 와 한글과 English 혼용',
	'수식 2 * 3 * 4 = 24 이다',
	'경로는 src/**/*.ts 이다',

	// 마크다운 문법에 **인접한** 표기들. 줄 머리가 아니거나 짝이 없어 문법이
	// 아니지만, 파서가 잘못 삼키기 쉬운 자리다.
	'변수는 snake_case_name 이고 __dunder__ 도 쓴다',
	'대괄호 [메모] 와 느낌표 ![alt] 만 있다',
	'백틱 하나 ` 만 있는 문장',
	'파이프 a | b | c 와 물결 ~홈',
	'대시 -- 두 개와 역슬래시 C:\\Users\\me',
	'중괄호 {a: 1} 과 캐럿 a^b',
	'따옴표 안 별표 "a*b" 이다',
	'줄 가운데 인용부호 > 는 인용이 아니다',
	'숫자 1.5 초는 목록이 아니다',
	'주소 https://example.com/a?b=1&c=2 를 본다',
];

const renderedText = (markdown: string): string => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el.textContent ?? '';
};

describe('마크다운 렌더에서 글자가 사라지지 않는다', () => {

	it.each(PLAIN_PROSE)('평문이 그대로 남는다: %s', (prose) => {
		expect(renderedText(prose)).toBe(prose);
	});

	it('코드 블록 안의 글자도 그대로 남는다', () => {
		const code = 'Map<String, List<Integer>> m = new HashMap<>();';
		expect(renderedText('```java\n' + code + '\n```')).toContain(code);
	});

	it('인라인 코드 안의 글자도 그대로 남는다', () => {
		expect(renderedText('`List<String>` 은 코드')).toBe('List<String> 은 코드');
	});

	// 대조 — escape 는 표시를 위한 것이지 실행 허용이 아니다.
	it('스크립트는 글자로 보이되 태그로 남지 않는다', () => {
		const html = sanitizeHtml(markdownToHtml('<script>alert(1)</script>'));
		expect(html.toLowerCase()).not.toContain('<script');
		expect(html.toLowerCase()).not.toContain('<img');
	});

	// 대조 — corpus 가 실제로 무언가를 재고 있는지. 비어 있으면 위 전부가 공허하다.
	it('corpus 가 비어 있지 않다', () => {
		expect(PLAIN_PROSE.length).toBeGreaterThanOrEqual(10);
		expect(PLAIN_PROSE.some((s) => s.includes('<'))).toBe(true);
		expect(PLAIN_PROSE.some((s) => s.includes('&'))).toBe(true);
	});
});
