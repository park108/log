import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 렌더 경로 전체(파서 → 정제)에 대한 **성질 검사**.
//
// 사례 기반 테스트는 사람이 떠올린 입력만 덮는다. 이 파일은 마크다운 표기와
// 낱말을 결정적으로 섞어 3000건을 만들고, 어떤 입력에도 참이어야 하는 두
// 성질만 확인한다.
//
//   (1) 사용자가 쓴 **낱말**은 화면에 남는다. 표기 문자(`*` `#` `>` …)는
//       사라져도 되지만 글자는 아니다.
//   (2) 정제를 마친 HTML 의 태그는 짝이 맞는다.
//
// 이 성질들은 이미 두 번 깨졌었다 (둘 다 실측):
//   • 본문을 escape 하지 않아 `List<String>` 이 `List` 로 렌더됐다.
//   • 강조 패스가 링크의 href 안을 다시 써 주소가 바뀌었다.
//
// 난수는 고정 시드의 결정적 생성기다 — `Math.random()` · `Date.now()` 를 쓰면
// 실패가 재현되지 않고, 붉어진 CI 를 다시 돌리면 초록이 된다.

let seed = 5150;
const random = (): number => {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed / 0x7fffffff;
};
const pick = <T,>(candidates: T[]): T => candidates[Math.floor(random() * candidates.length)] as T;

const WORDS = ['alpha', 'beta', '감마', 'delta9', 'x', '2026', 'Kotlin', '한글단어'];
const SYNTAX = ['#', '##', '*', '**', '_', '__', '`', '```', '~~', '>', '-', '1.', '[', ']',
	'(', ')', '!', '<', '>', '&', '"', '|', '\\', '\n', '\n\n', ' ', '  ', '\t', ':', '/'];

const makeInput = (length: number): string =>
	Array.from({ length }, () => random() < 0.45 ? pick(WORDS) : pick(SYNTAX)).join('');

const textOf = (html: string): string => {
	const holder = document.createElement('div');
	holder.innerHTML = html;
	return holder.textContent ?? '';
};

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

/** 짝이 맞지 않으면 사유 문자열, 맞으면 null. */
const unbalancedReason = (html: string): string | null => {
	const stack: string[] = [];
	const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
	let matched: RegExpExecArray | null;
	while ((matched = tagPattern.exec(html)) !== null) {
		const tag = (matched[2] ?? '').toLowerCase();
		if (VOID_TAGS.has(tag) || matched[3] === '/') continue;
		if (matched[1]) {
			const opened = stack.pop();
			if (opened !== tag) return `</${tag}> 앞에 ${opened ?? '아무것도'} 열려 있음`;
		}
		else stack.push(tag);
	}
	return stack.length ? `닫히지 않음: ${stack.join(',')}` : null;
};

const SAMPLE_COUNT = 3000;

describe('렌더 경로 성질 검사', () => {

	it(`${SAMPLE_COUNT}건의 임의 입력에서 낱말이 사라지지 않고 태그 짝이 맞는다`, () => {

		const wordLoss: string[] = [];
		const unbalanced: string[] = [];

		for (let i = 0; i < SAMPLE_COUNT; i++) {

			const input = makeInput(2 + Math.floor(random() * 12));

			// 코드 펜스의 여는 줄 나머지는 **언어 이름**이라 규정상 렌더되지 않는다
			// (CommonMark info string). 낱말 보존 성질의 예외이므로 제외한다.
			if (input.includes('```')) continue;

			const clean = sanitizeHtml(markdownToHtml(input));
			const rendered = textOf(clean);

			const words = input.match(/[A-Za-z0-9가-힣]+/g) ?? [];
			const missing = words.filter(word => !rendered.includes(word));
			if (missing.length) {
				wordLoss.push(`${JSON.stringify(input)} → 없어진 낱말 ${JSON.stringify(missing)} (렌더 ${JSON.stringify(rendered)})`);
			}

			const reason = unbalancedReason(clean);
			if (reason) {
				unbalanced.push(`${JSON.stringify(input)} → ${reason} (${JSON.stringify(clean)})`);
			}
		}

		expect(wordLoss.slice(0, 5)).toEqual([]);
		expect(unbalanced.slice(0, 5)).toEqual([]);
	});

	// 링크·이미지가 섞인 말뭉치는 성질 (1) 을 쓸 수 없다 — `[글](주소)` 의 주소는
	// 화면에 나오지 않는 것이 정상이기 때문이다. 대신 이 말뭉치로 세 번째 성질을
	// 본다.
	//
	//   (3) 만들어진 속성값 안에는 태그가 들어가지 않는다.
	//
	// 이 성질이 깨진 채로 나갔던 적이 있다 (실측 2026-08-30):
	//   [문서](https://example.com/a**b**c.html)
	//     → href='https://example.com/a<strong>b</strong>c.html'
	// 주소가 바뀌므로 링크가 실제로 깨진다.
	it(`${SAMPLE_COUNT}건의 링크 입력에서 속성값에 태그가 섞이지 않는다`, () => {

		// 무작위 이어붙이기는 유효한 링크를 거의 만들지 못한다 (실측: 3000건에서
		// 속성 오염 0건 — 주입을 넣어도 붉어지지 않았다). 그래서 **링크 형태를
		// 조립**한다. 주소와 제목 자리에 강조 문자를 섞는 것이 이 성질의 표적이다.
		//
		// (주석·리터럴의 호스트도 csp-origin-coverage 게이트의 스캔 대상이라
		//  example.com 을 쓴다.)
		const TEXT_PARTS = ['글', '**굵게**', '*기울임*', '~~취소~~', '`코드`', 'a b', ''];
		const URL_PARTS = [
			'https://example.com/a', 'https://example.com/a**b**c', 'https://example.com/a~~b~~c',
			'https://example.com/a*b*c', 'https://example.com/x_y', 'https://example.com/p(q)',
			'mailto:a@example.com', 'https://example.com/z?q=1#anchor',
		];
		const TITLE_PARTS = [undefined, '제목', '제목 **굵게**', '제목 ~~취소~~', '제목 *기울임*'];

		const makeLinkInput = (): string => {
			const text = pick(TEXT_PARTS);
			const url = pick(URL_PARTS);
			const title = pick(TITLE_PARTS);
			const titlePart = undefined === title ? '' : ` "${title}"`;
			const form = Math.floor(random() * 3);
			if (0 === form) return `[${text}](${url}${titlePart})`;
			if (1 === form) return `![${text}](${url}${titlePart})`;
			return `<${url}>`;
		};

		const polluted: string[] = [];
		const unbalanced: string[] = [];

		for (let i = 0; i < SAMPLE_COUNT; i++) {

			// 앞뒤에 다른 글자를 붙여 강조가 링크를 가로지르는 경우도 만든다.
			const input = pick(['', '**', '~~', '앞 ']) + makeLinkInput() + pick(['', '**', '~~', ' 뒤']);

			const html = markdownToHtml(input);

			// 홑따옴표로 감싼 속성값 안의 `<` — 이 파서는 속성을 홑따옴표로만 낸다.
			const attributeWithTag = /='[^']*</.exec(html);
			if (attributeWithTag) {
				polluted.push(`${JSON.stringify(input)} → ${JSON.stringify(html)}`);
			}

			const reason = unbalancedReason(sanitizeHtml(html));
			if (reason) {
				unbalanced.push(`${JSON.stringify(input)} → ${reason}`);
			}
		}

		expect(polluted.slice(0, 5)).toEqual([]);
		expect(unbalanced.slice(0, 5)).toEqual([]);
	});
});
