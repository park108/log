import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 링크가 링크답게 굴어야 한다.
//
// 이전에는 파서가 **모든** 링크에 `target='_blank'` 를 붙였다. 실측 2026-08-31:
//
//   [맨 위로](#top)              → <a href="#top" target="_blank" …>
//   [지난 글](/log/2024-…)       → <a href="/log/2024-…" target="_blank" …>
//   [상대 경로](./other)         → <a target="_blank" …>          ← href 가 없다
//
// 같은 문서 안을 가리키는 `#` 링크가 새 탭을 열어 앱이 통째로 다시 떴다. 이 사이트
// 안의 글로 가는 링크도 마찬가지다 — 읽던 탭이 남고 뒤로 가기가 끊긴다.
//
// 셋째 줄은 다른 결함이다. sanitize 의 허용 패턴이 `/` 로 시작하는 경로만 통과시켜,
// `./other` 는 href 가 통째로 지워졌다. 링크 모양의 죽은 글자가 된다.
//
// 두 축을 함께 못 박는다 — 어느 한쪽만 있으면 다른 쪽이 조용히 되돌아간다.

const html = (markdown: string): string => sanitizeHtml(markdownToHtml(markdown));

const anchor = (markdown: string): HTMLAnchorElement | null => {
	const host = document.createElement('div');
	host.innerHTML = html(markdown);
	return host.querySelector('a');
};

describe('링크는 사이트 밖으로 나갈 때만 새 탭을 연다', () => {

	describe('안쪽 — 같은 탭', () => {

		it.each([
			['같은 문서 안', '[맨 위로](#top)', '#top'],
			['이 사이트의 다른 글', '[지난 글](/log/2024-01-01-hello)', '/log/2024-01-01-hello'],
			['상대 경로', '[옆 글](./other)', './other'],
			// 글자로 시작하는 상대 경로를 빠뜨리면, 허용 패턴에서 "글자로 시작하되
			// 스킴이 아닌 것" 갈래를 통째로 지워도 게이트가 통과한다 (실측: 주입
			// 6방향 중 이 한 방향만 검출 실패). 가장 흔한 표기이기도 하다.
			['글자로 시작하는 상대 경로', '[옆 글](other-post)', 'other-post'],
			['질의 문자열만', '[검색](?q=react)', '?q=react'],
		])('%s', (_label, markdown, href) => {

			const el = anchor(markdown);

			expect(el).not.toBeNull();
			// href 가 살아 있어야 한다 — 없으면 눌러도 아무 일도 일어나지 않는다.
			expect(el?.getAttribute('href')).toBe(href);
			expect(el?.hasAttribute('target')).toBe(false);
		});
	});

	describe('바깥 — 새 탭', () => {

		it.each([
			['절대 URL', '[바깥 글](https://example.com/a)'],
			['autolink', '<https://example.com>'],
			['프로토콜 상대', '[바깥](//example.com/a)'],
			['메일', '[메일](mailto:a@b.com)'],
		])('%s', (_label, markdown) => {

			const el = anchor(markdown);

			expect(el?.getAttribute('target')).toBe('_blank');
			// 새 탭을 여는 링크는 opener 를 넘기지 않는다.
			expect(el?.getAttribute('rel') ?? '').toContain('noopener');
		});
	});

	// 상대경로를 통과시키느라 스킴 검사를 잃으면 안 된다.
	describe('위험한 스킴은 여전히 막는다', () => {

		it.each([
			['javascript', '[x](javascript:alert(1))'],
			['대소문자 섞기', '[x](JaVaScRiPt:alert(1))'],
			['data', '[x](data:text/html;base64,PHNjcmlwdD4=)'],
			['vbscript', '[x](vbscript:msgbox)'],
		])('%s', (_label, markdown) => {

			const el = anchor(markdown);

			expect(el?.hasAttribute('href')).toBe(false);
			// 글자는 남는다 — 지우면 사용자가 쓴 것이 사라진다.
			expect(el?.textContent).toBe('x');
		});
	});
});
