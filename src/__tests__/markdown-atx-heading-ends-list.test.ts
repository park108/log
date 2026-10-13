import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 목록 바로 뒤의 0칸 ATX 제목 줄은 목록을 끝내고 제목이 된다 (spec `markdown-rendering`
// §동작 5 하위 항목 — CommonMark §4.2, ATX 제목은 문단을 끊는다).
//
// 판정면은 정제를 거친 DOM 과 정제 후 `innerHTML` 이다 — 독자가 보는 것이다.
//
// 이어짐 패스가 그 줄을 앞 항목에 흡수하던 동안 `1. 준비\n2. 실행\n## 결과\n잘 됐다.`
// 의 독자는 제목 대신 둘째 항목 안에서 `## 결과` 라는 글자를 봤고, 그 아래 문단도
// 항목 안으로 빨려 들어갔다. 같은 자리의 인용 · 펜스 · 표 · 가로줄은 이미 목록을 끝냈다.
//
// 기대값은 **분할 도출**이다 — 입력을 제목 줄 앞에서 나눠 따로 렌더해 이은 것
// (`html(앞) + html(제목 줄부터)`). 분할 지점은 파서의 판정을 부르지 않고 여기서 따로
// 정한다 — 같은 판정으로 기대값을 만들면 판정이 틀려도 맞는다.
//
// 대조(CONTROL)는 분할 지점이 없는 꼴이다. 기대 문자열은 이 규칙이 들어오기 전의
// 정제 후 `innerHTML` 그대로다 (HEAD=b5e0112). 이스케이프 대조(C3)는 "줄 머리 `#`
// 이면 무조건 끊는다" 는 과잉 구현을 가른다.

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

// 분할 지점: 빈 줄 없이 이어진 목록 줄 덩어리 바로 뒤의 0칸 ATX 제목 줄.
const MARKER = /^[ \t]*([-*]|[0-9]{1,9}\.) /;
const ATX = /^#{1,6} /;

// 빈 줄에서 목록 덩어리를 리셋하고, 덩어리 안 첫 ATX 줄에서 나눈다. 분할 지점이
// 없으면 null.
const splitAtHeading = (md: string): [string, string] | null => {
	const lines = md.split('\n');
	let inList = false;

	for(let i = 0; i < lines.length; i++) {
		const line = lines[i] as string;

		if('' === line.trim()) {
			inList = false;
			continue;
		}
		if(MARKER.test(line)) {
			inList = true;
			continue;
		}
		if(inList && ATX.test(line)) {
			return [lines.slice(0, i).join('\n'), lines.slice(i).join('\n')];
		}
	}

	return null;
};

const SPLIT = {
	B01: '- a\n# 제목',
	B02: '- a\n- b\n## 다음 절\n본문',
	B03: '1. a\n### 제목',
	B09: '- a\n# 제목 #',
	B10: '- a\n  b\n# 제목',
	B11: '- a\n  - b\n# 제목',
	B14: '1. 준비\n2. 실행\n## 결과\n잘 됐다.',
} as const;

// 인용 안 목록 (spec 3 셋째 하위 항목). 감싼 동치는 이 규칙 전에도 참이었다 — 안쪽이
// 같이 틀렸다. 그래서 `blockquote h1` 1 · 렌더 텍스트 `#` 0 을 함께 잰다.
const B05 = '> - a\n> # 제목';
const B05_INNER = '- a\n# 제목';

const CONTROL = {
	C1: ['- a\n#제목', '<ul><li>a<br>#제목</li></ul>'],
	C2: ['- a\n####### 일곱', '<ul><li>a<br>####### 일곱</li></ul>'],
	C3: ['- a\n\\# 제목', '<ul><li>a<br># 제목</li></ul>'],
	C4: ['- a\n\n# 제목', '<ul><li>a</li></ul><p></p><h1>제목</h1>'],
	C5: ['- a\n  b', '<ul><li>a<br>b</li></ul>'],
	C6: ['본문\n# 제목', '<p>본문</p><h1>제목</h1>'],
} as const;

const HEADING = 'h1, h2, h3, h4, h5, h6';

describe('목록 바로 뒤 0칸 ATX 제목 줄 — 목록을 끝내고 제목이 된다', () => {

	it('무판정 가드 — 분할 행 7 전부에 분할 지점이 있고 대조 6 전부에 없다', () => {
		const splits = Object.values(SPLIT).map(splitAtHeading);
		expect(splits).toHaveLength(7);
		for(const split of splits) expect(split).not.toBeNull();

		expect(splitAtHeading(B05_INNER)).not.toBeNull();

		const controls = Object.values(CONTROL).map(([md]) => splitAtHeading(md));
		expect(controls).toHaveLength(6);
		for(const split of controls) expect(split).toBeNull();
	});

	for(const [name, md] of Object.entries(SPLIT)) {
		it(`${name} · 제목 줄 앞에서 나눠 렌더한 것과 같다`, () => {
			const split = splitAtHeading(md);
			expect(split).not.toBeNull();
			const [before, from] = split as [string, string];

			expect(html(md)).toBe(html(before) + html(from));

			// 제목은 목록 밖이고 표기는 글자로 남지 않는다.
			const el = render(md);
			expect(el.querySelectorAll(HEADING)).toHaveLength(1);
			expect(el.querySelectorAll('li h1, li h2, li h3, li h4, li h5, li h6')).toHaveLength(0);
			expect(el.textContent).not.toContain('#');
		});
	}

	it('B05 · 인용 안 목록 뒤 제목 줄도 목록을 끝낸다', () => {
		expect(html(B05)).toBe('<blockquote>' + html(B05_INNER) + '</blockquote>');

		const el = render(B05);
		expect(el.querySelectorAll('blockquote h1')).toHaveLength(1);
		expect(el.querySelectorAll('li h1')).toHaveLength(0);
		expect(el.textContent).not.toContain('#');
	});

	for(const [name, [md, expected]] of Object.entries(CONTROL)) {
		it(`${name} · 분할 지점이 없는 꼴은 산출이 그대로다`, () => {
			expect(html(md)).toBe(expected);
		});
	}
});
