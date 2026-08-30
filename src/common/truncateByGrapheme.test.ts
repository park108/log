import { truncateByGrapheme } from './common';

// `substr(0, N)` 은 UTF-16 코드 유닛을 센다. 100번째 자리에 이모지가 걸리면
// 상위 서로게이트 하나만 남고, 그 문자열이 meta description 으로 나가면
// 크롤러와 링크 미리보기에는 대체 문자로 보인다.

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe('글자 경계 자르기', () => {

	it('이모지를 반으로 쪼개지 않는다', () => {

		const text = 'ㄱ'.repeat(99) + '😀' + '뒤에 더 있는 글';

		expect(text.substr(0, 100)).toMatch(LONE_SURROGATE);       // 구 동작
		expect(truncateByGrapheme(text, 100)).not.toMatch(LONE_SURROGATE);
	});

	it('경계에 걸린 이모지는 통째로 들어가거나 통째로 빠진다', () => {

		const text = 'ㄱ'.repeat(99) + '😀뒤';

		const cut = truncateByGrapheme(text, 100);

		expect(cut).toBe('ㄱ'.repeat(99) + '😀');
		expect(truncateByGrapheme(text, 99)).toBe('ㄱ'.repeat(99));
	});

	it('결합 이모지를 쪼개지 않는다', () => {

		const family = '👨‍👩‍👧';
		const text = 'ㄱ'.repeat(98) + family + '뒤';

		const cut = truncateByGrapheme(text, 100);

		// Intl.Segmenter 가 있으면 가족 이모지는 한 글자다 — 통째로 들어간다.
		// 없으면 코드 포인트 단위라 잘릴 수 있으나, 고립 서로게이트는 남지 않는다.
		expect(cut).not.toMatch(LONE_SURROGATE);
		if(cut.includes('👨')) expect(cut).toContain(family);
	});

	it('한계보다 짧으면 원문 그대로다', () => {

		expect(truncateByGrapheme('짧은 글', 100)).toBe('짧은 글');
		expect(truncateByGrapheme('', 100)).toBe('');
	});

	it('한계가 0 이하면 빈 문자열이다', () => {

		expect(truncateByGrapheme('무엇이든', 0)).toBe('');
		expect(truncateByGrapheme('무엇이든', -1)).toBe('');
	});

	// Intl.Segmenter 가 없는 환경(구형 브라우저)에서도 본 결함은 사라져야 한다.
	it('Intl.Segmenter 가 없어도 고립 서로게이트를 남기지 않는다', () => {

		const original = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
		// @ts-expect-error — 폴백 경로를 실제로 태우기 위해 지운다.
		delete Intl.Segmenter;

		try {
			const text = 'ㄱ'.repeat(99) + '😀뒤';
			const cut = truncateByGrapheme(text, 100);
			expect(cut).not.toMatch(LONE_SURROGATE);
			expect(cut).toBe('ㄱ'.repeat(99) + '😀');
		}
		finally {
			if(original) Object.defineProperty(Intl, 'Segmenter', original);
		}
	});
});
