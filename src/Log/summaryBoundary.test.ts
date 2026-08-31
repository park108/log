import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { trimmedContents, stripTagsForSummary } from './api';

// 요약이 낱말을 붙여 내보낸 적이 있다.
//
// 목록·검색 미리보기 요약은 마크다운을 HTML 로 만든 뒤 태그를 걷어낸다. 태그를
// 빈 문자열로 지우면 블록 경계가 사라져 `<h1>제목</h1><p>본문</p>` 이 `"제목본문"`
// 이 된다 — 실제로 "AI 시대의 소프트웨어 엔지니어2025년까지만 해도" 처럼 나갔다
// (`api.ts` 의 근거 주석).
//
// **현 정합은 맞다. 없던 것은 검출력이다.** `BLOCK_TAGS` 에서 `h[1-6]` 을 빼고
// 요약 3스위트(45개)를 돌리면 **전부 통과한다.** 인접한 두 제목에서 그 태그가
// 유일한 경계 공급자인데, 그 입력을 재는 단언이 어디에도 없었기 때문이다.
//
// 그래서 이 파일은 **목록을 비교하지 않는다.** 목록 비교는 정합이 맞는 동안 늘
// 초록이라 같은 구멍을 영영 못 본다. 대신 세 가지를 동작으로 잰다:
//
//   (1) 인접한 두 제목이 실제로 붙지 않는가        — 알려진 구멍의 직접 재현
//   (2) 인라인 태그가 공백을 넣지 않는가            — 반대 방향(과잉)
//   (3) 허용 목록의 각 태그가 제 성질대로 굴러가는가 — 모집단을 도출해 전수
describe('요약 낱말 경계', () => {

	it('인접한 두 제목은 요약에서 붙지 않는다', () => {

		// `<h1>하나</h1><h1>둘</h1>` — 두 낱말 사이에 있는 것은 제목 태그뿐이다.
		// `BLOCK_TAGS` 에서 `h[1-6]` 이 빠지면 이 자리가 "하나둘" 이 된다.
		expect(trimmedContents('# 하나\n# 둘')).toBe('하나 둘');

		// 제목 단계가 달라도 같다. `h[1-6]` 을 `h[1-9]` 같은 오타로 바꿔도 목록
		// 비교 게이트는 초록이지만 이 단언은 붉다.
		expect(trimmedContents('## 하나\n### 둘')).toBe('하나 둘');

		// 제목과 본문 사이 — 원 회귀가 났던 그 형태다.
		expect(trimmedContents('# 제목\n\n본문')).toBe('제목 본문');

		// 목록 항목도 서로 붙지 않는다 (`li` 가 유일한 공급자다).
		expect(trimmedContents('- 하나\n- 둘')).toBe('하나 둘');
	});

	it('인라인 태그는 요약에 공백을 넣지 않는다', () => {

		// 인라인 태그는 낱말 **중간**에 올 수 있다. 공백으로 치환하면 없던 공백이
		// 생겨 낱말이 갈라진다 — 경계를 살리려다 반대쪽으로 무너지는 방향이다.
		expect(trimmedContents('**굵게**한 낱말')).toBe('굵게한 낱말');
		expect(trimmedContents('`코드`옆')).toBe('코드옆');
		expect(trimmedContents('*기울임*체')).toBe('기울임체');
		expect(trimmedContents('~~취소~~선')).toBe('취소선');
	});

	// 모집단을 **도출**한다. 손으로 다시 적으면 같은 손 유지를 한 겹 옮길 뿐이고,
	// 새 태그가 허용될 때 따라오지 않는다 — 표 6 태그가 올라온 날 아무 게이트도
	// 그것을 판정 대상에 넣지 않았다.
	//
	// 도출은 두 단계다.
	//
	//   후보 모으기 — `ALLOWED_TAGS` 가 있는 정책 모듈 소스의 문자열 · 파서가 실제로
	//     내는 태그 · **살아남지 않을 것이 분명한 대조 태그** 를 합친다. 후보는
	//     넉넉해도 좋다. 다음 단계가 걸러 낸다.
	//   실효 판정 — 후보를 하나씩 `sanitizeHtml` 에 태워 **살아남는지 본다.**
	//     소스의 배열 구조나 상수 이름에 기대지 않으므로, 주석 처리된 옛 상수가
	//     남아 있어도 · 이름이 바뀌어도 · 배열이 둘로 쪼개져도 결과가 같다.
	//     상수를 통째로 옮기거나 지우면 후보가 말라 하한 단언에서 걸린다.
	const policySource = (): string => {
		const path = resolve(process.cwd(), 'src/common/sanitizeHtml.ts');
		const source = readFileSync(path, 'utf8');
		expect(source.length, '정책 모듈 소스를 읽지 못했다: ' + path).toBeGreaterThan(0);
		expect(source, '정책 모듈에 ALLOWED_TAGS 가 없다').toContain('ALLOWED_TAGS');
		return source;
	};

	// 파서가 실제로 내는 태그 — 요약이 겪는 표면이다.
	const PARSER_CORPUS = [
		'# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6',
		'문단이다.\n\n둘째 문단',
		'- 하나\n- 둘',
		'1. 하나\n2. 둘',
		'> 인용문\n> 둘째 줄',
		'앞\n\n---\n\n뒤',
		'**굵게** *기울임* ~~취소~~ `코드`',
		'[링크](https://example.com "제목")',
		'![그림](https://example.com/a.png "제목")',
		'```kotlin\nval a = "x"\n```',
		'| 이름 | 값 |\n|---|---|\n| a | 1 |',
	];

	const tagsIn = (html: string): string[] =>
		[...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[1]!.toLowerCase());

	// 정제를 통과하지 못하는 것이 분명한 태그 — 프로브가 실제로 가르는지 본다.
	// 이것이 없으면 "전부 살아남는다" 로 무너진 프로브를 통과로 읽는다.
	const KNOWN_DEAD = ['iframe', 'script', 'object', 'embed', 'form'];

	const candidateTags = (): string[] => {
		const found = new Set<string>();
		for (const m of policySource().matchAll(/'([a-z][a-z0-9]*)'|"([a-z][a-z0-9]*)"/g)) {
			found.add((m[1] ?? m[2] ?? '').toLowerCase());
		}
		for (const markdown of PARSER_CORPUS) {
			for (const tag of tagsIn(markdownToHtml(markdown))) found.add(tag);
		}
		for (const tag of KNOWN_DEAD) found.add(tag);
		return [...found].filter((t) => t.length > 0).sort();
	};

	// **홀로 파싱해서는 살아남지 못하는 태그가 있다.** `<thead>probe</thead>` 를
	// 표 밖에서 파싱하면 HTML 파서 단계에서 사라지므로, 정책이 허용해도 "죽은 것"
	// 으로 읽힌다 (실측: table·thead·tbody·tr·td·th 전부 홀로는 소멸).
	//
	// 그래서 실효 모집단을 **두 갈래로** 모은다 — 홀로 살아남는 것과, 파이프라인이
	// 실제로 내보내 정제를 지나온 것. 문맥 의존 태그는 뒤쪽이 데려온다. 프로브를
	// 한 갈래로만 두면 그 부류가 통째로 판정 밖에 숨는다.
	const survivesAlone = (tag: string): boolean =>
		sanitizeHtml('<' + tag + '>probe</' + tag + '>').toLowerCase().includes('<' + tag);

	const survivesInPipeline = (): string[] => {
		const found = new Set<string>();
		for (const markdown of PARSER_CORPUS) {
			for (const tag of tagsIn(sanitizeHtml(markdownToHtml(markdown)))) found.add(tag);
		}
		return [...found].sort();
	};

	// 태그의 성질은 **DOM 에 물어본다.** 목록에 다시 적지 않는다.
	//
	// `display` 가 이 저장소의 판단이 아니라 HTML 표준의 기본 스타일이므로,
	// 새 태그가 허용되는 날에도 분류가 저절로 따라온다.
	const defaultDisplay = (tag: string): string => {
		const element = document.createElement(tag);
		document.body.appendChild(element);
		const display = getComputedStyle(element).display;
		element.remove();
		return display;
	};

	// 빈 요소는 자식을 담지 못한다 — 직렬화가 그 사실을 그대로 보여 준다.
	// 텍스트를 담지 못하는 태그는 두 낱말 사이에 **자기 내용으로** 끼어들 수 없으므로
	// 경계 공급 여부가 요약에 보이지 않는다. 양방향 모두 면제한다.
	const isVoidElement = (tag: string): boolean => {
		const element = document.createElement(tag);
		element.textContent = 'x';
		return !element.outerHTML.includes('x');
	};

	// 판정면. `stripTagsForSummary` 에 직접 물으므로 파서가 내지 못하는 태그도 잰다.
	const suppliesBoundary = (tag: string): boolean =>
		stripTagsForSummary('가<' + tag + '>나</' + tag + '>다') !== '가나다';

	it('요약 경계 태그는 허용 목록에서 도출된다', () => {

		const candidates = candidateTags();
		const aliveAlone = candidates.filter(survivesAlone);
		const dead = candidates.filter((t) => !survivesAlone(t));
		const fromPipeline = survivesInPipeline();
		const alive = [...new Set([...aliveAlone, ...fromPipeline])].sort();

		// 도출이 마르거나 프로브가 무너지면 **통과가 아니라 무판정 실패**다.
		expect(aliveAlone.length, '허용 태그 도출이 하한 미만이다 (도출 붕괴)').toBeGreaterThanOrEqual(15);
		expect(fromPipeline.length, '파이프라인 산출 도출이 하한 미만이다').toBeGreaterThanOrEqual(10);
		expect(dead.length, '정제가 아무것도 지우지 않는다 — 프로브가 가르지 못한다').toBeGreaterThanOrEqual(2);

		// 파이프라인이 실제로 내보낸 태그는 모집단에 들어와 있다 (구성상 참이지만,
		// 두 갈래 중 한쪽이 끊기면 여기서 드러난다).
		for (const tag of fromPipeline) {
			expect(alive, '파이프라인이 내는 <' + tag + '> 가 모집단에 없다').toContain(tag);
		}

		const missingBoundary: string[] = [];
		const spuriousBoundary: string[] = [];

		for (const tag of alive) {

			// 자기 내용으로 두 낱말 사이에 설 수 없는 태그는 면제한다.
			if (isVoidElement(tag)) continue;

			const display = defaultDisplay(tag);

			// 표의 구조 태그(`table` `thead` `tbody` `tr`)와 표시되지 않는 태그는
			// 스스로 텍스트를 담지 않는다 — 셀이 담는다. 경계 공급을 요구하지도
			// 금지하지도 않는다. 여기를 붉히면 과잉이다.
			const holdsOwnText = 'block' === display
				|| 'list-item' === display
				|| 'table-cell' === display
				|| display.startsWith('inline');

			if (!holdsOwnText) continue;

			if (display.startsWith('inline')) {
				if (suppliesBoundary(tag)) spuriousBoundary.push(tag);
			}
			else if (!suppliesBoundary(tag)) {
				missingBoundary.push(tag);
			}
		}

		expect(missingBoundary,
			'허용된 블록 태그가 요약에서 낱말 경계를 공급하지 않는다 — 그 태그를 쓴 글은 낱말이 붙어 나간다')
			.toEqual([]);
		expect(spuriousBoundary,
			'인라인 태그가 요약에 공백을 넣는다 — 낱말 중간이 갈라진다')
			.toEqual([]);
	});
});
