import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// `\*` 는 "별표를 글자로 보여 달라" 는 뜻이다. 파서는 그 뜻을 정확히 뒤집었다 —
// 백슬래시를 글자로 남기고 별표는 별표대로 강조에 썼다. 실측:
//
//   `\*별표\*`   →  <p>\<em>별표\</em></p>     기대: <p>*별표*</p>
//   `\_밑줄\_`   →  <p>\_밑줄\_</p>           기대: <p>_밑줄_</p>
//
// 두 경우 다 독자가 백슬래시를 본다. 글쓴이가 내보내려던 적이 없는 글자다.
// 별표를 글자로 쓰는 유일한 방법이 코드 스팬뿐이었다.

const html = (markdown: string): string => sanitizeHtml(markdownToHtml(markdown));

describe('백슬래시 이스케이프', () => {

	describe('마크업 문자를 글자로 되돌린다', () => {

		it.each([
			['별표', '\\*별표\\*', '<p>*별표*</p>'],
			['밑줄', '\\_밑줄\\_', '<p>_밑줄_</p>'],
			['백틱', '\\`코드 아님\\`', '<p>`코드 아님`</p>'],
			['대괄호', '\\[링크 아님\\](url)', '<p>[링크 아님](url)</p>'],
			['백슬래시 자체', '\\\\', '<p>\\</p>'],
		])('%s', (_label, markdown, expected) => {

			expect(html(markdown)).toBe(expected);
		});
	});

	// 이스케이프된 글자는 어떤 문법에도 참여하지 않는다 — 줄 머리의 블록 표시도
	// 마찬가지다.
	describe('블록 문법도 열지 못한다', () => {

		it.each([
			['제목', '\\# 제목 아님', '<p># 제목 아님</p>'],
			['목록', '\\- 목록 아님', '<p>- 목록 아님</p>'],
			['인용', '\\> 인용 아님', '<p>&gt; 인용 아님</p>'],
		])('%s', (_label, markdown, expected) => {

			expect(html(markdown)).toBe(expected);
		});
	});

	// 되돌린 글자는 **다시 escape 해야** 한다. 그냥 끼워 넣으면 사용자가 글자로
	// 쓰려던 꺾쇠가 진짜 태그가 된다. 허용 태그 이름을 골라야 이 축이 드러난다 —
	// 한글 태그 이름은 브라우저가 어차피 글자로 읽어 두 구현이 같은 출력을 낸다.
	it.each([
		['한글 이름', '\\<태그 아님\\>', '<p>&lt;태그 아님&gt;</p>'],
		['허용 태그 이름', '\\<em\\>기울임 아님\\</em\\>', '<p>&lt;em&gt;기울임 아님&lt;/em&gt;</p>'],
	])('꺾쇠는 글자로 돌아오되 태그가 되지 않는다 — %s', (_label, markdown, expected) => {

		expect(html(markdown)).toBe(expected);
	});

	// 구두점이 아니면 백슬래시는 그냥 글자다 (CommonMark §6.1). 경로와 정규식이
	// 조용히 망가지면 안 된다.
	it('구두점이 아닌 글자 앞의 백슬래시는 그대로 남는다', () => {

		expect(html('C:\\Users\\name 과 \\d+')).toBe('<p>C:\\Users\\name 과 \\d+</p>');
	});

	// 코드 스팬 안에서 백슬래시는 글자다. 걷어 가면 코드가 원문과 달라진다.
	it('코드 스팬 안의 백슬래시는 걷지 않는다', () => {

		expect(html('`\\*그대로\\*`')).toBe('<p><code>\\*그대로\\*</code></p>');
	});

	// 대조 — 이스케이프하지 않은 문법은 계속 문법이다.
	it('평범한 강조는 그대로 동작한다', () => {

		expect(html('*기울임* 과 **굵게**')).toBe('<p><em>기울임</em> 과 <strong>굵게</strong></p>');
	});

	it('평범한 코드 스팬도 그대로 동작한다', () => {

		expect(html('`a * b`')).toBe('<p><code>a * b</code></p>');
	});
});
