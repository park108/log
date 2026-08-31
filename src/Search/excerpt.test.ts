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

// 발췌는 UTF-16 코드 유닛 인덱스로 자른다. 매치 앞 12칸에 이모지가 걸려 있고
// 그 사이에 공백이 없으면 자를 자리가 서로게이트 쌍 한가운데에 떨어진다. 남는
// 것은 짝 잃은 반쪽이고 화면에는 대체 문자(`\uFFFD`) 로 보인다. 실측:
//
//   "a🎉bbbbbbbbbbb테스트" 에서 "테스트" 검색  →  "…\udf89bbbbbbbbbbb테스트"
//
// 검색 결과 미리보기는 방문자가 검색할 때마다 보는 자리다.
describe('발췌는 글자를 반으로 쪼개지 않는다', () => {

	// 짝 잃은 서로게이트가 하나라도 있는가.
	const hasLoneSurrogate = (s: string): boolean =>
		/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

	// 앞 글자 수를 0~8 로 흔들어도 이모지가 매치 13칸 앞에 놓이도록 만든 입력들.
	// 한 자리만 재면 우연히 경계에 맞아떨어진 것을 통과시킨다.
	it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])('앞 글자 %i개일 때도 온전하다', (lead) => {

		const text = 'a'.repeat(lead) + '🎉' + 'b'.repeat(11) + '테스트';

		const excerpt = buildExcerpt(text, '테스트');

		expect(hasLoneSurrogate(excerpt), JSON.stringify(excerpt)).toBe(false);
		// 자른 목적 자체는 유지된다 — 매치가 발췌 안에 있어야 한다.
		expect(excerpt).toContain('테스트');
	});

	it('이모지가 온전히 남거나 통째로 빠진다', () => {

		const excerpt = buildExcerpt('a🎉' + 'b'.repeat(11) + '테스트', '테스트');

		// 반쪽이 남는 대신 한 칸 밀린다.
		expect(excerpt.includes('\uD83C')).toBe(false);
		expect(excerpt.includes('\uDF89')).toBe(false);
	});

	// 대조 — 쪼갤 일이 없는 입력은 예전 그대로다.
	it.each([
		['공백이 있으면 공백까지 민다', '🎉🎉🎉🎉🎉🎉 그리고 여기 테스트', '…그리고 여기 테스트'],
		['매치가 앞에 있으면 자르지 않는다', '앞쪽 테스트 뒤쪽', '앞쪽 테스트 뒤쪽'],
	])('%s', (_label, text, expected) => {

		expect(buildExcerpt(text, '테스트')).toBe(expected);
	});
});
