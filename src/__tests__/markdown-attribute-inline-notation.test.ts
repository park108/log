import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 링크·이미지의 속성값과 꺾쇠 autolink 의 글자에는 파서 내부 자리표시자가 남지 않고,
// 인라인 표기는 자리마다 정해진 대로 풀린다 (spec `markdown-rendering` §동작 27).
//
// 자리표시자 0 은 이미 참이었지만 지키는 게이트가 없었다. 태그 조각 안의 복원을 지운
// 트리에서 스위트가 초록이었다 — 기존 게이트의 입력에는 속성 안 이스케이프·코드 스팬이
// 없었고, 판정 문자 집합도 파서가 쓰는 범위보다 좁았다. 그래서 여기서는 자리표시자
// 집합과 속성 자리 목록을 **열거하지 않고 도출**하고, (자리표시자 종류 × 속성 자리)
// 모든 칸에 행을 둔다.
//
// 이미지 `alt` 는 설명의 평문이다 — 설명 원문을 그대로 넣던 동안 화면 낭독기가 표기
// 문자(`**` · 백틱)를 읽었다. 판정면은 정제를 거친 DOM 의 `getAttribute` 와
// `textContent` 다 — 직렬화 문자열이 아니다.

const PARSER_PATH = resolve(__dirname, '..', 'common', 'markdownParser.ts');

const render = (markdown: string): HTMLDivElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const elementsOf = (el: HTMLElement): Element[] => Array.from(el.querySelectorAll('a, img'));

// 자리표시자 집합 — 파서 소스의 private-use 코드 포인트(`\uE0xx` 표기와 소스에 그대로
// 박힌 문자)를 모아 최소~최대 범위로 잡는다. 파서가 새 자리표시자를 들이면 범위가
// 따라 넓어진다.
const derivePlaceholderRange = (): { min: number; max: number } | null => {
	const source = readFileSync(PARSER_PATH, 'utf8');
	const codes: number[] = [];
	for(const m of source.matchAll(/\\u(E[0-9A-F]{3}|F[0-8][0-9A-F]{2})/gi)) {
		codes.push(parseInt(m[1] as string, 16));
	}
	for(const m of source.matchAll(/[\uE000-\uF8FF]/gu)) {
		codes.push(m[0].codePointAt(0) as number);
	}
	if(0 === codes.length) return null;
	return { min: Math.min(...codes), max: Math.max(...codes) };
};

const RANGE = derivePlaceholderRange();
const PLACEHOLDER = null === RANGE
	? null
	: new RegExp('[' + String.fromCodePoint(RANGE.min) + '-' + String.fromCodePoint(RANGE.max) + ']', 'u');

const hasPlaceholder = (value: string | null): boolean =>
	null !== value && null !== PLACEHOLDER && PLACEHOLDER.test(value);

// 자리표시자 종류 × 속성 자리. 키는 `<종류> <자리>` 이고, 자리는 `태그@속성` 또는
// 꺾쇠 autolink 의 글자(`autolink`)다.
const KINDS = ['escape', 'entity', 'code'] as const;

const GRID: Record<string, string> = {
	'escape a@href':    '[x](https://example.com/a\\_b)',
	'escape a@title':   '[x](https://example.com/ "t \\_ e")',
	'escape img@src':   '![a](https://example.com/a\\_b.png)',
	'escape img@alt':   '![a\\_b](https://example.com/x.png)',
	'escape img@title': '![a](https://example.com/x.png "t \\_ e")',
	'escape autolink':  '<https://example.com/a\\_b>',
	'entity a@href':    '[x](https://example.com/?a=1&amp;b=2)',
	'entity a@title':   '[x](https://example.com/ "t &copy;")',
	'entity img@src':   '![a](https://example.com/x.png?a=1&amp;b=2)',
	'entity img@alt':   '![a &copy; b](https://example.com/x.png)',
	'entity img@title': '![a](https://example.com/x.png "t &copy;")',
	'entity autolink':  '<https://example.com/?a=1&amp;b=2>',
	'code a@href':      '[x](https://example.com/?q=`v`)',
	'code a@title':     '[x](https://example.com/ "t `c`")',
	'code img@src':     '![a](https://example.com/`v`.png)',
	'code img@alt':     '![`c`](https://example.com/x.png)',
	'code img@title':   '![a](https://example.com/x.png "t `c`")',
	'code autolink':    '<https://example.com/`v`>',
};

// 속성 자리 도출용 탐침 — GRID 에 링크 형태 몇 가지(참조 정의 · 맨 URL · 사이트 안
// 주소)를 더한다. 정제 **전** 산출의 `이름='값'` 을 모은다.
const PROBES = [
	...Object.values(GRID),
	'[x][r]\n\n[r]: https://example.com/ref "참조 제목"',
	'주소 https://example.com/bare 를 본다',
	'[안](/log/1) [밖](https://example.com/out)',
];

const emittedSlots = (): Map<string, Set<string>> => {
	const slots = new Map<string, Set<string>>();
	for(const input of PROBES) {
		for(const tag of markdownToHtml(input).matchAll(/<(a|img)\s([^>]*)>/g)) {
			for(const attr of (tag[2] as string).matchAll(/([\w-]+)=(?:'([^']*)'|"([^"]*)")/g)) {
				const slot = `${tag[1]}@${attr[1]}`;
				const values = slots.get(slot) ?? new Set<string>();
				values.add(attr[2] ?? attr[3] ?? '');
				slots.set(slot, values);
			}
		}
	}
	return slots;
};

// 고정값 속성 — 관측된 값이 전부 파서 소스에 `이름='값'` 리터럴로 박혀 있는 속성
// (`target='_blank'` · `rel='noreferrer'`). 사용자 글자가 들지 않으므로 칸을 요구하지
// 않는다. 그래도 아래 GRID 행은 **모든** 속성값을 재므로 이 속성들도 자리표시자 0 을 받는다.
const isFixedValueSlot = (slot: string, values: Set<string>, source: string): boolean => {
	const name = slot.split('@')[1] as string;
	return Array.from(values).every((value) => source.includes(`${name}='${value}'`));
};

describe('자리표시자 집합과 속성 자리는 파서에서 도출된다', () => {

	it('파서 소스에서 자리표시자 범위가 도출된다 (비면 실패)', () => {

		expect(RANGE).not.toBeNull();
		expect(PLACEHOLDER).not.toBeNull();
		expect((RANGE as { min: number }).min).toBeLessThanOrEqual((RANGE as { max: number }).max);
	});

	it('파서가 내는 사용자 글자 속성 자리마다 GRID 에 세 종류 행이 다 있다', () => {

		const source = readFileSync(PARSER_PATH, 'utf8');
		const slots = emittedSlots();
		const userSlots = Array.from(slots.entries())
			.filter(([slot, values]) => !isFixedValueSlot(slot, values, source))
			.map(([slot]) => slot)
			.sort();

		expect(userSlots.length).toBeGreaterThan(0);

		const missing = [...userSlots, 'autolink']
			.flatMap((slot) => KINDS.map((kind) => `${kind} ${slot}`))
			.filter((key) => !(key in GRID));

		expect(missing).toEqual([]);
	});
});

describe('속성값과 autolink 글자에 자리표시자가 남지 않는다 (GRID)', () => {

	it.each(Object.entries(GRID))('%s', (key, markdown) => {

		const el = render(markdown);
		const elements = elementsOf(el);

		// 공허 통과 차단 — 그 행이 겨누는 자리가 실제로 산출에 있어야 한다.
		expect(elements.length).toBeGreaterThan(0);
		const slot = key.split(' ')[1] as string;
		if('autolink' === slot) {
			expect(elements.some((e) => 'A' === e.tagName && e.getAttribute('href') === e.textContent)).toBe(true);
		}
		else {
			const [tag, name] = slot.split('@') as [string, string];
			expect(elements.some((e) => tag.toUpperCase() === e.tagName && e.hasAttribute(name))).toBe(true);
		}

		const leaked = elements.flatMap((e) =>
			Array.from(e.attributes)
				.filter((attr) => hasPlaceholder(attr.value))
				.map((attr) => `${e.tagName.toLowerCase()}@${attr.name}=${JSON.stringify(attr.value)}`)
		);
		expect(leaked).toEqual([]);
		expect(hasPlaceholder(el.textContent)).toBe(false);
	});
});

describe('주소·제목 — 이스케이프는 풀리고 엔티티는 해석되며 백틱은 글자다', () => {

	it.each([
		['[x](https://example.com/a\\_b)', 'a', 'href', 'https://example.com/a_b'],
		['![a](https://example.com/a\\_b.png)', 'img', 'src', 'https://example.com/a_b.png'],
		['[x](https://example.com/?q=`v`)', 'a', 'href', 'https://example.com/?q=`v`'],
		['![a](https://example.com/`v`.png)', 'img', 'src', 'https://example.com/`v`.png'],
		['![그림](https://example.com/x.png "제목 `c` \\_ &copy;")', 'img', 'title', '제목 `c` _ ©'],
	])('%s → %s@%s', (markdown, tag, name, expected) => {

		const found = render(markdown).querySelectorAll(tag);
		expect(found.length).toBe(1);
		expect(found[0]?.getAttribute(name)).toBe(expected);
	});
});

// 설명 원문 → 기대 `alt`. 마지막 행은 대조다 — 구두점이 아닌 문자 앞의 백슬래시는 글자다.
const ALT_ROWS: [string, string][] = [
	['`c`', 'c'],
	['**굵게** 그림', '굵게 그림'],
	['*기울임*', '기울임'],
	['a ~~b~~ c', 'a b c'],
	['a\\_b', 'a_b'],
	['a &copy; b', 'a © b'],
	['``a`` 그림', 'a 그림'],
	['` a ` 그림', 'a 그림'],
	['C:\\Users', 'C:\\Users'],
];

describe('이미지 alt 는 설명의 평문이다', () => {

	const altOf = (description: string): string | null | undefined =>
		render(`![${description}](https://example.com/x.png)`).querySelector('img')?.getAttribute('alt');

	it.each(ALT_ROWS)('![%s](…) → alt %s', (description, expected) => {

		expect(altOf(description)).toBe(expected);
	});

	// 기대값을 파서 자신의 본문 렌더에서 도출한다 — 같은 설명을 본문으로 렌더한 글자.
	it.each(ALT_ROWS)('![%s](…) 의 alt === 설명을 본문으로 렌더한 글자', (description) => {

		expect(altOf(description)).toBe(render(description).textContent);
	});
});

describe('꺾쇠 autolink 의 href 와 글자는 같고 인라인 링크의 href 와 같다', () => {

	it.each([
		['https://example.com/?a=1&amp;b=2', 'https://example.com/?a=1&b=2'],
		['https://example.com/a\\_b', 'https://example.com/a_b'],
	])('<%s> → %s', (address, expected) => {

		const autolinks = render(`<${address}>`).querySelectorAll('a');
		expect(autolinks.length).toBe(1);
		expect(autolinks[0]?.getAttribute('href')).toBe(expected);
		expect(autolinks[0]?.textContent).toBe(expected);

		const inline = render(`[u](${address})`).querySelector('a');
		expect(inline?.getAttribute('href')).toBe(expected);
	});
});
