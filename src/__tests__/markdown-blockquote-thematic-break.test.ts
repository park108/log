import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 인용 안의 가로줄 (spec `markdown-rendering` §동작 3 넷째 하위 항목 ·
// §수용 기준 "인용 안 가로줄 (3 넷째 하위 항목)").
//
// 최상위의 `---` · `***` · `___` 줄은 `<hr>` 인데 같은 줄을 인용 안에 쓰면 표기가
// 글자로 남았다 — `> ***` 는 `<blockquote>***</blockquote>` 였다. 가로줄 판정은 인용
// 패스보다 먼저 도는데 그때 인용 줄은 아직 `> ***` 라 맞지 않고, 인용 패스가 내용을
// 다시 세울 때는 펜스·밑줄식 제목만 다시 불렀다.
//
// 판정면은 정제를 거친 DOM 과 정제 후 `innerHTML` 이다 — 독자가 보는 것이다. `hr` 수만
// 세면 표기가 글자로 함께 남는 산출을 놓친다 (REQ-126 NFR-01). 그래서 렌더 텍스트의
// 가로줄 표기 런 0 을 함께 잰다.
//
// 대조(CONTROL) 는 산출 불변이다. Q1 은 "인용 안 `---` 를 무조건 가로줄로 바꾼다" 는
// 과잉 구현(밑줄식 제목보다 먼저)을, Q3 은 펜스 보호를 건너뛰는 구현을 붉게 만든다
// (REQ-126 NFR-02).
const html = (markdown: string): string => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el.innerHTML;
};

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const THEMATIC_BREAK_RUN = /-{3,}|\*{3,}|_{3,}/;

// 정제 후 innerHTML === '<blockquote><hr></blockquote>'
const ONLY: Record<string, string> = {
	H01: '> ---',
	H02: '> ***',
	H03: '> ___',
	H04: '> -----',
};

// blockquote hr 1 · 렌더 텍스트 표기 런 0 · 나머지 글자 실재
const MIXED: Record<string, [string, string[]]> = {
	H07: ['> - a\n> ---', ['a']],
	H09: ['> # 제목\n> ---', ['제목']],
	H10: ['> 앞 문단\n>\n> ***\n>\n> 뒤 문단', ['앞 문단', '뒤 문단']],
	H11: ['- a\n  > ---', ['a']],
	H12: ['> > ---', []],
};

// 정제 후 innerHTML 그대로 (HEAD=b5e0112 산출)
const CONTROL: Record<string, [string, string]> = {
	T1: ['---', '<hr>'],
	T2: ['***', '<hr>'],
	T3: ['___', '<hr>'],
	Q1: ['> 제목\n> ---', '<blockquote><h2>제목</h2></blockquote>'],
	Q2: ['> a\n> ===', '<blockquote><h1>a</h1></blockquote>'],
	Q3: ['> ```\n> ---\n> ```', '<blockquote><pre>---<br></pre></blockquote>'],
	Q4: ['> --', '<blockquote>--</blockquote>'],
};

describe('인용 안의 가로줄은 blockquote 안 hr 이다', () => {

	it.each(Object.entries(ONLY))('%s · 인용 안 가로줄 줄 하나는 blockquote 안 hr 하나다', (_, markdown) => {
		expect(html(markdown)).toBe('<blockquote><hr></blockquote>');
	});

	it.each(Object.entries(MIXED))('%s · blockquote 안 hr 하나 · 표기 런 0 · 나머지 글자 실재', (_, [markdown, texts]) => {
		const el = render(markdown);
		expect(el.querySelectorAll('blockquote hr')).toHaveLength(1);
		expect(el.querySelectorAll('hr')).toHaveLength(1);
		const text = el.textContent ?? '';
		expect(text).not.toMatch(THEMATIC_BREAK_RUN);
		for(const t of texts) {
			expect(text).toContain(t);
		}
	});

	it('H07 · 인용 안 목록 뒤 가로줄은 최상위 산출을 인용으로 감싼 것과 같다', () => {
		const inner = html('- a\n---');
		expect(inner).toContain('<hr>');
		expect(html('> - a\n> ---')).toBe('<blockquote>' + inner + '</blockquote>');
	});

	it('H11 · 목록 항목 안 인용의 가로줄은 그 항목 안 인용에 있다', () => {
		const el = render(MIXED.H11?.[0] ?? '');
		expect(el.querySelectorAll('li blockquote hr')).toHaveLength(1);
	});

	it('H12 · 중첩 인용의 가로줄은 안쪽 인용에 있다', () => {
		const el = render(MIXED.H12?.[0] ?? '');
		expect(el.querySelectorAll('blockquote blockquote hr')).toHaveLength(1);
	});
});

describe('인용 안 가로줄 — 바뀌지 않는 산출 (대조)', () => {

	it.each(Object.entries(CONTROL))('%s · 산출 불변', (_, [markdown, expected]) => {
		expect(html(markdown)).toBe(expected);
	});
});
