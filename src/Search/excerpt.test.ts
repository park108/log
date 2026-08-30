import { describe, it, expect } from 'vitest';
import { buildExcerpt } from './excerpt';

describe('buildExcerpt', () => {

	// 실제 응답의 모양 — 서버가 마크다운을 걷어낸 뒤라 줄바꿈 없는 긴 한 덩어리다.
	it('뒤쪽 매치를 미리보기 앞으로 끌어온다', () => {
		const text = '오늘은 날씨가 좋았다. '.repeat(40) + 'AWS Lambda 를 붙였다.';
		const out = buildExcerpt(text, 'Lambda');
		expect(out.indexOf('Lambda')).toBeLessThan(20);
		expect(out.startsWith('…')).toBe(true);
	});

	it('매치가 이미 앞에 있으면 자르지 않는다', () => {
		const text = 'Lambda 를 붙였다. ' + '뒷 내용. '.repeat(30);
		expect(buildExcerpt(text, 'Lambda')).toBe(text);
	});

	it('대소문자를 가리지 않는다', () => {
		const text = '앞 내용. '.repeat(30) + 'GitHub Actions';
		expect(buildExcerpt(text, 'github')).toContain('GitHub');
	});

	it('매치가 없으면 본문을 그대로 둔다', () => {
		const text = '앞 내용. '.repeat(30);
		expect(buildExcerpt(text, '없는말')).toBe(text);
	});

	it('빈 질의어면 본문을 그대로 둔다', () => {
		expect(buildExcerpt('아무 말', '')).toBe('아무 말');
	});

	it('자른 자리가 단어 중간이 아니다', () => {
		const text = '가나다라마바사아자차 '.repeat(10) + '카타파하 keyword';
		const out = buildExcerpt(text, 'keyword');
		// 선행 `…` 다음은 단어 첫 글자여야 한다.
		expect(out.slice(1, 2)).not.toBe(' ');
		expect(text).toContain(out.slice(1));
	});

	it('문자열이 아니면 빈 문자열', () => {
		expect(buildExcerpt(null as unknown as string, 'x')).toBe('');
		expect(buildExcerpt('본문', null as unknown as string)).toBe('본문');
	});

	it('공백 없는 긴 토큰이어도 매치를 넘겨 자르지 않는다', () => {
		const text = 'a'.repeat(200) + 'needle';
		const out = buildExcerpt(text, 'needle');
		expect(out.indexOf('needle')).toBeLessThan(20);
	});
});
