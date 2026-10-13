import { markChangedLines, CHANGED_CLASS } from '../Log/diffContents';
import { markdownToHtml, HIGHLIGHT_OPEN, HIGHLIGHT_CLOSE } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// **변경 이력 강조의 "이 줄은 코드 블록 안인가" 는 파서의 판정이다**
// (spec `writer-change-history-highlight` 동작 1~4).
//
// 강조 쪽이 펜스 규칙 사본(`^\s*` + 백틱 셋 토글)으로 판정하던 동안 파서와 두 방향으로
// 갈렸다 (HEAD=78c8ddc 실측):
//
//   물결 펜스 · 인용 안 펜스 · 항목 안 펜스   표식이 `pre` 안에 들어가 U+E002 · U+E003 이 화면에 남았다
//   정보 문자열에 백틱이 든 줄 · 4칸 들여쓴 펜스 꼴   그 뒤의 바뀐 줄이 강조를 잃었다
//
// 판정면은 화면에 닿는 경로 그대로의 DOM 이다 — `sanitizeHtml(markdownToHtml(markChangedLines(...)))`.
// 식별자·주석은 재지 않는다. 판정 함수의 이름이나 위치가 바뀌어도 이 파일은 그대로 초록이어야
// 하고, 사본이 돌아오면 붉어야 한다.

const MARKERS = new RegExp('[' + HIGHLIGHT_OPEN + HIGHLIGHT_CLOSE + ']', 'g');

const render = (markdown: string): HTMLElement => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(markdown));
	return el;
};

const highlighted = (newer: string, older: string): HTMLElement =>
	render(markChangedLines(newer, older));

const markerCount = (el: HTMLElement): number =>
	(el.textContent ?? '').match(MARKERS)?.length ?? 0;

const spanTexts = (el: HTMLElement): string[] =>
	Array.from(el.querySelectorAll('span.' + CHANGED_CLASS)).map((n) => n.textContent ?? '');

const preTexts = (el: HTMLElement): string[] =>
	Array.from(el.querySelectorAll('pre')).map((n) => n.textContent ?? '');

const textOutsidePre = (el: HTMLElement): string => {
	const copy = el.cloneNode(true) as HTMLElement;
	copy.querySelectorAll('pre').forEach((pre) => pre.remove());
	return copy.textContent ?? '';
};

describe('파서가 코드 블록으로 그리는 줄에는 표식이 들어가지 않는다 (동작 1 · 4)', () => {

	it.each([
		['물결 펜스', '~~~\nconst y = 2;\n~~~', '~~~\nconst x = 1;\n~~~'],
		['인용 안 펜스', '> ```\n> const y = 2;\n> ```', '> ```\n> const x = 1;\n> ```'],
		['항목 안 펜스', '1. a\n   ~~~\n   const y = 2;\n   ~~~', '1. a\n   ~~~\n   const x = 1;\n   ~~~'],
	])('%s', (_label, newer, older) => {

		const el = highlighted(newer, older);

		expect(markerCount(el)).toBe(0);
		expect(spanTexts(el)).toEqual([]);
		expect(preTexts(el)).toEqual(['const y = 2;']);
	});

	// 대조 — 최상위 백틱 펜스는 사본 시절에도 맞던 자리다. 그대로여야 한다.
	it('최상위 백틱 펜스 (대조)', () => {

		const el = highlighted('```\nconst y = 2;\n```', '```\nconst x = 1;\n```');

		expect(markerCount(el)).toBe(0);
		expect(spanTexts(el)).toEqual([]);
		expect(preTexts(el)).toEqual(['const y = 2;']);
	});
});

describe('파서가 코드 밖으로 그리는 바뀐 줄은 강조된다 (동작 3)', () => {

	it.each([
		['정보 문자열에 백틱이 든 줄 뒤', '```인라인``` 문장\n새 문단', '```인라인``` 문장\n옛 문단', '새 문단'],
		['4칸 들여쓴 펜스 꼴 사이', '    ```\n새 줄\n    ```', '    ```\n옛 줄\n    ```', '새 줄'],
	])('%s', (_label, newer, older, expected) => {

		const el = highlighted(newer, older);

		expect(spanTexts(el)).toEqual([expected]);
		expect(markerCount(el)).toBe(0);
	});
});

// 동작 2 — 맥락 × 펜스 문자 × 여는 펜스 들여쓰기(맥락의 내용 열 기준). 각 조합에서 펜스 안
// 한 줄과 펜스 뒤 문단 한 줄을 바꾸고, 바뀐 줄마다
//   *강조 span 을 받았다* ⇔ *newer 단독 렌더에서 그 줄의 텍스트가 `pre` 밖에 있다*
// 를 잰다. 어느 쪽이 맞는지는 이 파일이 정하지 않는다 — 파서가 그린 모양이 정한다.
describe('강조의 코드 블록 판정은 파서의 판정과 한 벌이다 (동작 2)', () => {

	const CONTEXTS = [
		{ name: '최상위', head: [] as string[], prefix: '' },
		{ name: '인용', head: [] as string[], prefix: '> ' },
		{ name: '목록 항목', head: ['1. a'], prefix: '   ' },
	];
	const FENCES = [
		{ name: '백틱', run: '```' },
		{ name: '물결', run: '~~~' },
	];
	const INDENTS = [0, 3, 4];

	const CODE = { newer: 'const y = 2;', older: 'const x = 1;' };
	const PARAGRAPH = { newer: '새 문단', older: '옛 문단' };

	const compose = (context: typeof CONTEXTS[number], run: string, indent: number, code: string, paragraph: string): string => {
		const fenced = (text: string): string => context.prefix + ' '.repeat(indent) + text;
		return [...context.head, fenced(run), fenced(code), fenced(run), context.prefix + paragraph].join('\n');
	};

	// 모집단은 조합에서 도출한다.
	const CASES = CONTEXTS.flatMap((context) => FENCES.flatMap((fence) => INDENTS.map((indent) => ({
		label: context.name + ' · ' + fence.name + ' · ' + indent + '칸',
		newer: compose(context, fence.run, indent, CODE.newer, PARAGRAPH.newer),
		older: compose(context, fence.run, indent, CODE.older, PARAGRAPH.older),
	}))));

	const CHANGED = [CODE.newer, PARAGRAPH.newer];

	it('모집단이 비어 있지 않다', () => {
		expect(CASES.length).toBe(CONTEXTS.length * FENCES.length * INDENTS.length);
		expect(CASES.length).toBeGreaterThan(0);
	});

	it.each(CASES)('$label', ({ newer, older }) => {

		const plain = render(newer);
		const marked = highlighted(newer, older);

		// 표식 문자는 어떤 경우에도 화면에 남지 않고, 코드 블록은 강조 전후로 같다.
		expect(markerCount(marked)).toBe(0);
		expect(preTexts(marked)).toEqual(preTexts(plain));

		for (const text of CHANGED) {
			// 그 줄이 단독 렌더 어딘가에는 있어야 판정이 공허하지 않다.
			expect(plain.textContent ?? '').toContain(text);

			const outsidePre = textOutsidePre(plain).includes(text);
			const hasSpan = spanTexts(marked).some((span) => span.includes(text));

			expect({ text, hasSpan }).toEqual({ text, hasSpan: outsidePre });
		}
	});

	// ⇔ 의 양쪽이 모두 모집단에 있어야 배터리가 두 방향을 잰다 — 전부 코드 밖이면 "다
	// 강조한다" 가, 전부 코드 안이면 "아무것도 강조하지 않는다" 가 통과한다.
	it('모집단에 코드 블록 안의 바뀐 줄과 밖의 바뀐 줄이 모두 있다', () => {

		let inside = 0;
		let outside = 0;

		for (const { newer } of CASES) {
			const plain = render(newer);
			for (const text of CHANGED) {
				if (textOutsidePre(plain).includes(text)) outside++;
				else if (preTexts(plain).some((pre) => pre.includes(text))) inside++;
			}
		}

		expect(inside).toBeGreaterThan(0);
		expect(outside).toBeGreaterThan(0);
	});
});
