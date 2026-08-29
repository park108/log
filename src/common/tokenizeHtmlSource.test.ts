import { describe, it, expect } from 'vitest';
import { tokenizeHtmlSource } from './tokenizeHtmlSource';
import { formatHtml } from './formatHtml';
import { markdownToHtml } from './markdownParser';

// 구문 강조는 **표시일 뿐**이다. 글자가 사라지거나 순서가 바뀌면 강조가
// 아니라 손실이다. 그래서 이 파일의 중심 단언은 색 분류가 아니라 무손실이다.
describe('tokenizeHtmlSource', () => {

	const rejoin = (s: string): string =>
		tokenizeHtmlSource(s).map((t) => t.value).join('');

	describe('무손실 — 토큰을 이어붙이면 입력과 같다', () => {

		const inputs: Array<[string, string]> = [
			['평범한 요소', '<p>본문</p>'],
			['속성 있는 태그', "<a href='https://x' title='제목'>링크</a>"],
			['self-closing', '<br /><hr />'],
			['중첩', '<ul>\n  <li>하나</li>\n</ul>'],
			['들여쓰기 공백', '<div>\n\t<span>x</span>\n</div>'],
			['속성 없는 닫는 태그', '</p>'],
			['텍스트만', '그냥 글자'],
			['빈 문자열', ''],
			['따옴표 섞임', '<img src="a.png" alt=\'설명\' />'],
			['깨진 태그', '<p 속성없음 >본문</p>'],
		];

		for (const [name, src] of inputs) {
			it(name, () => {
				expect(rejoin(src)).toBe(src);
			});
		}

		it('실제 파서 산출물 전체', () => {
			const md = [
				'# 제목', '', '본문 <strong>강조</strong>.', '',
				'- 하나', '- 둘', '', '> 인용', '',
				'```', 'const x = 1;', '```', '',
				'[링크](https://park108.net "제목") 와 `code`',
			].join('\n');
			const src = formatHtml(markdownToHtml(md));

			// 모집단이 비면 무손실은 공허하게 참이다.
			expect(src.length).toBeGreaterThan(80);
			expect(rejoin(src)).toBe(src);
		});
	});

	describe('분류', () => {

		it('태그 이름과 구두점을 가른다', () => {
			const kinds = tokenizeHtmlSource('<p>x</p>').map((t) => t.kind + ':' + t.value);
			expect(kinds).toEqual(['punc:<', 'tag:p', 'punc:>', 'text:x', 'punc:</', 'tag:p', 'punc:>']);
		});

		it('속성 이름과 값을 가른다', () => {
			const tokens = tokenizeHtmlSource("<a href='https://x'>t</a>");
			expect(tokens.find((t) => t.kind === 'attr')?.value).toBe('href');
			expect(tokens.find((t) => t.kind === 'value')?.value).toBe("'https://x'");
		});

		it('닫는 태그의 구두점은 </ 로 묶는다', () => {
			// 대조 — `<` 와 `/` 를 따로 내면 색이 끊겨 보인다.
			expect(tokenizeHtmlSource('</div>')[0]).toEqual({ kind: 'punc', value: '</' });
		});
	});
});
