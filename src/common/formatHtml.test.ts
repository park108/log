import { describe, it, expect } from 'vitest';
import { formatHtml } from './formatHtml';

// Writer 의 HTML 보기가 한 줄로 이어져 구조를 눈으로 좇을 수 없었다.
// 이 변환은 **표시 전용**이다 — 저장·게시에는 원본 HTML 이 쓰인다.
describe('formatHtml', () => {

	it('중첩을 들여쓴다', () => {
		expect(formatHtml('<ul><li>하나</li><li>둘</li></ul>'))
			.toBe('<ul>\n  <li>하나</li>\n  <li>둘</li>\n</ul>');
	});

	it('한 줄에 담기는 요소는 접는다', () => {
		// 세 줄로 늘어놓으면 <p>텍스트</p> 가 화면을 채워 구조가 안 보인다.
		expect(formatHtml('<p>본문</p>')).toBe('<p>본문</p>');
		expect(formatHtml('<p></p>')).toBe('<p></p>');
	});

	it('pre 안의 공백은 건드리지 않는다', () => {
		// 코드 블록은 보이는 그대로여야 한다.
		expect(formatHtml('<pre>const x=1;<br /></pre>')).toBe('<pre>const x=1;<br /></pre>');
	});

	it('void 태그는 깊이를 늘리지 않는다', () => {
		// <hr> 뒤의 형제가 안으로 밀려 들어가면 구조가 거짓말을 한다.
		expect(formatHtml('<hr /><p>뒤</p>')).toBe('<hr />\n<p>뒤</p>');
	});

	it('빈 입력은 빈 문자열이다', () => {
		expect(formatHtml('')).toBe('');
	});

	it('텍스트를 잃지 않는다', () => {
		// 표시용 변환이라도 글자가 사라지면 안 된다.
		const src = '<h1>제목</h1><p>본문 <strong>강조</strong> 끝</p>';
		const out = formatHtml(src);
		for (const word of ['제목', '본문', '강조', '끝']) {
			expect(out).toContain(word);
		}
	});
});
