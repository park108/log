import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 속성값·autolink·라벨의 백틱 원문 (spec `markdown-rendering-links` §동작 27 백틱 하위 항목 ·
// §동작 24 백틱 런 하위 항목 · §수용 기준 "속성값·autolink·라벨의 백틱 원문").
//
// 주소·제목·꺾쇠 autolink 안에서 백틱은 코드 스팬이 아니라 글자다. 코드 스팬 스캔이 런 길이와
// 앞뒤 한 칸 걷기를 알게 된 뒤에도 이 자리들은 "백틱 하나 + 걷은 내용 + 백틱 하나" 로
// 되살렸다 — 런 길이와 런 안쪽 공백이 사라졌고, 런 길이가 다른 두 라벨이 같은 키가 됐다.
//
// 기존 속성 게이트의 코퍼스는 공백 없는 홑 백틱으로 칸을 채워 이 축이 깨진 트리에서도
// 초록이었다. 그래서 여기서는 속성 자리마다 런 길이 ≥2 행과 공백 낀 홑 백틱 행을 둘 다
// 갖는지를 코퍼스 자체에 단언한다.
//
// 판정면은 정제를 거친 DOM 의 `getAttribute` · `textContent` 다. 대조 4행만 정제 후
// `innerHTML` 전체를 잰다 — 이 task 가 바꾸지 않아야 하는 산출이다.
const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const PLACES = ['a@href', 'a@title', 'img@src', 'img@title', 'autolink'] as const;
type Place = typeof PLACES[number];
type Form = 'run' | 'spaced';
type Row = { place: Place; form: Form; md: string; want: string };

const ATTR: Record<string, Row> = {
	D1:  { place: 'a@href',    form: 'run',    md: '[x](https://example.com/?q=``v``)', want: 'https://example.com/?q=``v``' },
	D11: { place: 'a@href',    form: 'run',    md: '[x](/a?```b```)',                    want: '/a?```b```' },
	H1:  { place: 'a@href',    form: 'spaced', md: '[x](/a?` b `)',                      want: '/a?` b `' },
	D5:  { place: 'img@src',   form: 'run',    md: '![x](/i``a``.png)',                  want: '/i``a``.png' },
	S1:  { place: 'img@src',   form: 'spaced', md: '![x](/i` a `.png)',                  want: '/i` a `.png' },
	D2:  { place: 'a@title',   form: 'run',    md: '[x](/u "제목 `` c `` 끝")',          want: '제목 `` c `` 끝' },
	D16: { place: 'a@title',   form: 'spaced', md: '[x](/u "제목 ` c ` 끝")',            want: '제목 ` c ` 끝' },
	D13: { place: 'a@title',   form: 'run',    md: '[x](/u "``a ` b``")',                want: '``a ` b``' },
	D6:  { place: 'img@title', form: 'run',    md: '![x](/i.png "t ``a`` z")',           want: 't ``a`` z' },
	T1:  { place: 'img@title', form: 'spaced', md: '![x](/i.png "t ` a ` z")',           want: 't ` a ` z' },
	D14: { place: 'autolink',  form: 'run',    md: '<https://example.com/?q=``v``>',     want: 'https://example.com/?q=``v``' },
	U1:  { place: 'autolink',  form: 'spaced', md: '<https://example.com/?q=` v `>',     want: 'https://example.com/?q=` v `' },
};

// 행의 form 은 표기가 아니라 입력에서 다시 잰다 — 라벨만 바꾼 행이 칸을 채우지 못하게.
//   run    — 백틱 2개 이상인 런이 있다
//   spaced — 런이 전부 홑 백틱이고, 그 사이 내용이 공백으로 시작하고 끝난다
const measuredForm = (md: string): Form | null => {
	const runs = md.match(/`+/g) ?? [];
	if(runs.some((run) => run.length >= 2)) return 'run';
	if(0 < runs.length && /` [^`]* `/.test(md)) return 'spaced';
	return null;
};

// 자리마다 판정할 값 — autolink 는 `href` 와 글자 둘 다다.
const valuesAt = (place: Place, el: HTMLElement): (string | null)[] => {
	switch(place) {
		case 'a@href':    return [el.querySelector('a')?.getAttribute('href') ?? null];
		case 'a@title':   return [el.querySelector('a')?.getAttribute('title') ?? null];
		case 'img@src':   return [el.querySelector('img')?.getAttribute('src') ?? null];
		case 'img@title': return [el.querySelector('img')?.getAttribute('title') ?? null];
		case 'autolink': {
			const a = el.querySelector('a');
			return [a?.getAttribute('href') ?? null, a?.textContent ?? null];
		}
	}
};

describe('속성값·autolink·라벨의 백틱 원문', () => {

	it('코퍼스 · 속성 자리마다 런 ≥2 행과 공백 낀 홑 백틱 행이 있다', () => {
		const missing: string[] = [];
		for(const place of PLACES) {
			for(const form of ['run', 'spaced'] as const) {
				const has = Object.values(ATTR).some((row) =>
					row.place === place && row.form === form && measuredForm(row.md) === form
				);
				if(!has) missing.push(place + ' ' + form);
			}
		}
		expect(missing).toEqual([]);
	});

	it.each(Object.entries(ATTR))('%s · 속성값은 쓴 그대로다', (_name, row) => {
		const values = valuesAt(row.place, render(row.md));
		expect(values.length).toBeGreaterThan(0);
		for(const value of values) {
			expect(value).toBe(row.want);
		}
	});

	it('E9 · 참조 정의 제목의 백틱도 쓴 그대로다', () => {
		const el = render('[``a``]: /x "t ``b``"\n\n[``a``]');
		const a = el.querySelector('a');
		expect(a).not.toBeNull();
		expect(a?.getAttribute('title')).toBe('t ``b``');
	});

	it('라벨 런 불일치 · 백틱 런 길이가 다른 라벨은 연결되지 않는다', () => {
		for(const md of ['[`a`]\n\n[``a``]: /x', '[``a``]\n\n[`a`]: /x']) {
			expect(render(md).querySelectorAll('a')).toHaveLength(0);
		}
	});

	it('같은 표기 · 같은 런 길이의 라벨은 계속 연결된다', () => {
		for(const md of ['[``a``]\n\n[``a``]: /x', '[`a`]\n\n[`a`]: /x']) {
			const anchors = render(md).querySelectorAll('a');
			expect(anchors).toHaveLength(1);
			expect(anchors[0]?.getAttribute('href')).toBe('/x');
		}
	});

	it('E1 · E2 · 백틱 사이 백슬래시 이스케이프는 주소·제목에서 풀린다', () => {
		const title = render('[x](/u "`a\\_b`")').querySelector('a')?.getAttribute('title');
		expect(title).toBe('`a_b`');

		const href = render('[x](https://example.com/`a\\_b`)').querySelector('a')?.getAttribute('href');
		expect(href).not.toBeUndefined();
		expect(href).not.toBeNull();
		expect((href ?? '').split('').filter((c) => '\\' === c)).toHaveLength(0);
	});

	it('alt · 설명의 코드 스팬은 런 길이와 무관하게 내용만 남는다', () => {
		for(const md of ['![``a`` 그림](/i.png)', '![` a ` 그림](/i.png)']) {
			expect(render(md).querySelector('img')?.getAttribute('alt')).toBe('a 그림');
		}
	});

	it('대조 · 홑 백틱 주소 · 정의 없는 참조 · 링크 텍스트 · 맨 URL 뒤 백틱의 산출은 그대로다', () => {
		const CONTROL: [string, string][] = [
			['[x](https://example.com/?q=`v`)', '<p><a href="https://example.com/?q=`v`" target="_blank" rel="noopener noreferrer">x</a></p>'],
			['[``a``][r]', '<p>[<code>a</code>][r]</p>'],
			['[``a``](/x)', '<p><a href="/x"><code>a</code></a></p>'],
			['https://example.com/?q=``v`` 끝', '<p><a href="https://example.com/?q=" target="_blank" rel="noopener noreferrer">https://example.com/?q=</a><code>v</code> 끝</p>'],
		];
		for(const [md, want] of CONTROL) {
			expect(render(md).innerHTML).toBe(want);
		}
	});
});
