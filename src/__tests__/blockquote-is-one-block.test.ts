import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 여러 줄 인용은 한 덩어리다.
//
// 파서는 줄마다 `<blockquote>` 를 따로 열고 닫았다. 인용에는 좌측 선과 아래 여백이
// 붙으므로(`styles/typography.css:44`), 세 줄짜리 인용 하나가 화면에서는 서로 떨어진
// 인용 **셋**으로 보인다. 실측 (Chrome, 375px, 실제 CSS):
//
//   줄마다 blockquote   전체 높이 144.72  (34.38 짜리 상자 3개 + 사이 여백)
//   하나의 blockquote   전체 높이  93.56
//
// 인용은 남의 말을 옮기는 자리다. 옮긴 말이 세 토막으로 갈라지면 누가 어디까지
// 말했는지가 흐려진다.

const html = (markdown: string): string => sanitizeHtml(markdownToHtml(markdown));

const quotes = (markdown: string): HTMLQuoteElement[] => {
	const host = document.createElement('div');
	host.innerHTML = html(markdown);
	return Array.from(host.querySelectorAll('blockquote'));
};

describe('여러 줄 인용은 한 덩어리다', () => {

	it('연달아 붙은 줄은 인용 하나가 된다', () => {

		const found = quotes('> 한 줄\n> 두 줄\n> 세 줄');

		expect(found).toHaveLength(1);
		// 줄바꿈은 보존한다 — 원문의 줄 나눔이 인용의 일부다.
		expect(found[0]?.innerHTML).toBe('한 줄<br>두 줄<br>세 줄');
	});

	it('빈 줄은 인용을 끊는다', () => {

		const found = quotes('> 앞 인용\n\n> 뒤 인용');

		expect(found).toHaveLength(2);
		expect(found.map((q) => q.textContent)).toEqual(['앞 인용', '뒤 인용']);
	});

	it('인용이 아닌 줄에서 끝난다', () => {

		const found = quotes('> 인용\n본문');

		expect(found).toHaveLength(1);
		expect(found[0]?.textContent).toBe('인용');
		expect(html('> 인용\n본문')).toContain('<p>본문</p>');
	});

	// `>` 뒤의 공백 한 칸은 표기이지 내용이 아니다. 남겨 두면 인용문만 한 칸씩
	// 들여쓰인 것처럼 보인다.
	it.each([
		['공백 한 칸', '> 인용문'],
		['공백 없음', '>인용문'],
	])('%s — 같은 내용이 된다', (_label, markdown) => {

		expect(quotes(markdown)[0]?.textContent).toBe('인용문');
	});

	it('인용 안의 강조·코드는 그대로 산다', () => {

		const found = quotes('> **굵게** 와 `코드`');

		expect(found).toHaveLength(1);
		expect(found[0]?.innerHTML).toContain('<strong>굵게</strong>');
		expect(found[0]?.innerHTML).toContain('<code>코드</code>');
	});

	it('인용 안의 빈 줄은 줄바꿈으로 남는다', () => {

		const found = quotes('> 하나\n>\n> 둘');

		expect(found).toHaveLength(1);
		expect(found[0]?.innerHTML).toBe('하나<br><br>둘');
	});
});
