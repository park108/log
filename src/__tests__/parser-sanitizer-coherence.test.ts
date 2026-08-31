import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { markChangedLines } from '../Log/diffContents';

// 파서가 내는 것을 sanitizer 가 지우면 **글자가 사라진다.**
//
// 실제로 그렇게 사라진 적이 있다 — 본문의 `<String>` 이 미지의 태그로 읽혀
// 통째로 삭제됐다 (6d853fb). 그것은 escape 로 고쳤지만, 같은 결함이 다른
// 경로로 다시 올 수 있다: 파서에 표(`<table>`)나 체크박스(`<input>`)를
// 더하면서 sanitizer 허용 목록을 함께 고치지 않으면, 새 문법은 조용히
// 빈 자리로 렌더된다.
//
// 허용 목록을 들여다보는 대신 **결과**를 본다 — 파서가 낸 태그·속성이 sanitize
// 뒤에도 남아 있는가. 그것이 사용자가 겪는 사실이다.

const corpus: Array<[string, string]> = [
	['제목 6단계', '# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6'],
	['문단', '문단이다.\n\n둘째 문단'],
	['목록', '- 하나\n- 둘\n\t- 중첩'],
	['순서목록', '1. 하나\n2. 둘'],
	['인용', '> 인용문'],
	['수평선', '앞\n\n---\n\n뒤'],
	['인라인', '**굵게** *기울임* ~~취소~~ `코드`'],
	['링크', '[링크](https://example.com "제목")'],
	['이미지', '![그림](https://example.com/a.png "제목")'],
	['자동링크', '<https://example.com>'],
	['코드펜스 kotlin', '```kotlin\nprivate val a = "x"\n@Service\n```'],
	['코드펜스 yaml', '```yaml\nkey: value\n# 주석\n```'],
	['변경 강조', markChangedLines('바뀐 줄이다', '예전 줄이다')],
	['파이프 표', '| 이름 | 값 |\n|---|---|\n| a | 1 |'],
];

// **HTML 직접 입력 대역은 철거했다** (TSK-20260831-23-a). 이 자리는 "파서가 아직
// 내지 못하는 구조" 를 위한 임시 대역이었고 표가 유일한 입주자였는데, 파이프 표
// 블록 패스가 착지해 위 corpus 의 `파이프 표` 행이 그 자리를 이어받았다 — 이 파일이
// 예고한 그대로다.
//
// 남겨 두면 **아래 도출 단언이 그 대역으로 충족돼 corpus 의 표 행이 빠져도 초록이
// 된다.** 실제로 그 상태를 만들어 확인했다 (주입 Dir-4). 대역이 없어야 "정책이
// 허용하는 것을 corpus 가 통과시켜 보는가" 를 corpus 만으로 재게 된다.
//
// 다음에 같은 상황(파서가 아직 못 내는 구조)이 오면 이 주석을 근거로 다시 세우되,
// 착지와 함께 철거하는 것까지 한 묶음이다.

const shapeOf = (html: string) => {
	const tags = new Set<string>();
	const attrs = new Set<string>();
	for (const m of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
		tags.add(m[1]!.toLowerCase());
		for (const a of (m[2] ?? '').matchAll(/([a-zA-Z-]+)\s*=/g)) attrs.add(a[1]!.toLowerCase());
	}
	return { tags, attrs };
};

const missing = (from: Set<string>, inside: Set<string>): string[] =>
	[...from].filter((x) => !inside.has(x)).sort();

describe('파서 산출 ↔ sanitizer 허용 정합', () => {

	it.each(corpus)('%s — 파서가 낸 태그·속성이 sanitize 를 지나 살아남는다', (_name, markdown) => {

		const parsed = markdownToHtml(markdown);
		const clean = sanitizeHtml(parsed);

		const before = shapeOf(parsed);
		const after = shapeOf(clean);

		expect(missing(before.tags, after.tags),
			'sanitizer 가 지운 태그 — 그 문법으로 쓴 글은 빈 자리가 된다').toEqual([]);
		expect(missing(before.attrs, after.attrs),
			'sanitizer 가 지운 속성').toEqual([]);
	});

	// 대조 1 — corpus 가 실제로 무언가를 재고 있는가. 태그를 하나도 안 내는
	// corpus 면 위 전부가 공허하다.
	it('corpus 가 파서의 산출 표면을 덮는다', () => {

		const tags = new Set<string>();
		for (const [, markdown] of corpus) {
			for (const t of shapeOf(markdownToHtml(markdown)).tags) tags.add(t);
		}

		for (const expected of ['p', 'h1', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre',
			'code', 'a', 'img', 'strong', 'em', 'del', 'span', 'hr', 'br']) {
			expect(tags.has(expected), 'corpus 가 <' + expected + '> 를 내지 않는다').toBe(true);
		}
	});

	// 대조 2 — sanitizer 가 실제로 일하고 있는가. 아무것도 안 지우는 sanitizer 면
	// 위 단정이 자동으로 참이 되어 게이트가 공허해진다.
	//
	// **예시 태그는 "앞으로도 허용되지 않을 것" 중에서 고른다.** 여기에는 원래
	// `<table>` 이 박혀 있었는데, 이 파일의 머리말이 바로 그 태그를 "파서에 더할
	// 때 허용 목록도 함께 고쳐야 할 것" 의 예로 들고 있다. 한 파일 안에서 두
	// 전제가 어긋났고, 실제로 표를 허용 목록에 넣는 작업이 이 대조에 막혔다
	// (`TSK-20260831-05-a` 격리). 같은 이유로 `<input>`(체크박스) 도 피한다.
	//
	// 임베딩·스크립팅 태그는 마크다운 렌더 결과에 들어올 이유가 없다 — 정책이
	// 바뀔 축이 아니므로 대조로 안전하다. 검출력은 그대로다: "지우는가" 를 재는
	// 데에 어떤 태그를 쓰는지는 상관없고, 두 개를 두는 이유는 한 종류(script)만
	// 특별 취급하는 구현을 거르기 위해서다.
	it('sanitizer 는 허용 밖 태그를 실제로 지운다', () => {

		const dirty = '<p>본문</p><iframe src="https://example.com"></iframe><script>alert(1)</script>';
		const clean = sanitizeHtml(dirty);

		expect(clean.toLowerCase()).not.toContain('<iframe');
		expect(clean.toLowerCase()).not.toContain('<script');
		expect(clean).toContain('본문');
	});

	// 표는 파서 계약이 착지하기 전에도 정책에 등재돼 있어야 한다 — 등재가 없으면
	// sanitize 가 표 트리를 통째로 지우고 **머리 셀 글자마저 남지 않는다**
	// (등재 전 실측: 아래 입력이 `"1"` 하나로 줄었다).
	it('sanitizer 는 표 트리를 보존한다', () => {

		const clean = sanitizeHtml(
			'<table><thead><tr><th>머리</th></tr></thead><tbody><tr><td>값</td></tr></tbody></table>');

		for (const tag of ['table', 'thead', 'tbody', 'tr', 'th', 'td']) {
			expect(clean, '<' + tag + '> 가 지워졌다 — 표가 빈 자리가 된다').toContain('<' + tag + '>');
		}
		// 글자가 살아남는 것이 사용자가 겪는 사실이다.
		expect(clean).toContain('머리');
		expect(clean).toContain('값');
	});

	// 대조 3 — **정책이 넓어졌는데 corpus 가 따라오지 않는** 방향.
	//
	// 위 corpus 행들은 "파서가 낸 것이 살아남는가" 를 재고, 그 반대 방향인
	// "정책이 허용하는 것을 corpus 가 실제로 통과시켜 보는가" 는 어디서도 재지
	// 않았다. 그 결과 허용 목록에 태그를 6건 더해도 저장소 전체 스위트가 전수
	// 초록이었다 (실측). 정책 표면이 넓어진 만큼 무측정 영역이 넓어진 것이고,
	// 무측정이 감추는 회귀의 결과는 **글자 소실**이다.
	//
	// 판정 대상 목록을 손으로 적으면 정책이 넓어질 때 그 목록이 따라오지 않아
	// 다시 무측정이 된다. 그래서 **정책 모듈 소스에서 도출**한다.
	//
	// 도출이 상수를 **이름으로 부르지 않는 이유**: 이 spec 의 (I1) 이 정책 모듈
	// 밖에서의 정책 토큰 정의·소비를 0 으로 막고 있고, 이 파일은 그 밖이다.
	//
	// **판정 모집단은 소스 표기가 아니라 효력면이다.** 종전 도출은 `const 이름 = [...]`
	// 배열의 **모양**을 읽었고, 그 모양은 정책의 효력과 양방향으로 갈렸다:
	//
	//   - 표기는 그대로인데 효력이 넓어짐 → 게이트가 못 봄 (민감도 0)
	//   - 효력은 그대로인데 표기가 바뀜   → 게이트가 붉음 (특이도 붕괴)
	//
	// 그래서 배열 이름·배열 개수·배열 존재에 기대지 않는다. 주석을 걷은 정책
	// 소스의 **따옴표 문자열 전부**를 후보 우주로 삼고, 그중 *실제로 태그로서
	// 살아남는 것* 을 효력 집합으로 확정한 뒤 corpus 와 교차 검증한다.

	// **정상 변형 배터리** — 이 게이트를 고칠 때 무엇이 통과해야 하는지가 같은
	// 자리에 있어야 한다. 아래 넷은 출처 spec 이 정한 구조 클래스이고,
	// 마지막 하나만 방향이 반대다.
	//
	//   V2 — 배열의 분해·전개: 부분집합을 별 상수로 빼고 `...` 로 결합      → 통과해야 한다
	//   V7 — 주석 잔존: 옛 정책 배열을 `//` 주석으로 남김                   → 통과해야 한다
	//   V8 — 의미 단위 분해: BLOCK_TAGS + INLINE_TAGS 두 그룹으로 결합       → 통과해야 한다
	//   V9 — 상수 소멸 + 확장: 호출에 인라인 + 주석 잔존 + 신규 태그 등재    → **붉어야 한다**
	//
	// V2 는 종전 게이트에서 rc=1 이었다 (배열이 둘이 되어 "정확히 하나" 가 깨짐).
	// V9 는 종전 게이트에서 rc=0 이었다 (주석 잔존 배열을 후보로 잡고, 옛 태그는
	// corpus 가 전부 통과시키므로 신규 태그가 어느 단언의 시야에도 없음).

	const policySource = (): string => {
		const path = resolve(process.cwd(), 'src/common/sanitizeHtml.ts');
		const src = readFileSync(path, 'utf8');
		// 도출의 입력이 비면 그 뒤 단언은 전부 공허하다 — 여기서 끊는다.
		expect(src.length, '정책 모듈 소스를 읽지 못했다: ' + path).toBeGreaterThan(0);
		return src;
	};

	// 주석을 걷는다. V9 가 정확히 **주석 잔존**으로 들어온다 — 옛 정책을 `//` 로
	// 남기면 주석을 걷지 않는 도출은 그것을 살아 있는 정책으로 읽는다.
	// 줄 끝 주석에서 `[^:]` 를 요구해 URL 의 `//` 를 주석으로 오인하지 않는다.
	const stripComments = (src: string): string => src
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/^[ \t]*\/\/[^\n]*$/gm, '')
		.replace(/([^:])\/\/[^\n]*$/gm, '$1');

	// 후보 우주는 열거하지 않는다 (RULE-06 §열거 고정 금지). 주석을 걷은 정책
	// 소스의 따옴표 문자열 **전부**다. 배열 이름·개수·존재에 기대지 않으므로
	// V2·V8 이 배열을 쪼개도, V9 가 배열을 없애고 호출에 인라인해도 따라간다.
	const quotedStrings = (src: string): string[] => {
		const out: string[] = [];
		for (const m of src.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) {
			const v = (m[1] ?? m[2] ?? '').trim();
			if (v.length > 0) out.push(v.toLowerCase());
		}
		return out;
	};

	// 태그 이름의 **모양** (열거가 아니라 형태 조건). 공백이 든 문자열이나
	// 스킴·클래스명을 프로브에 넣지 않기 위한 최소 필터다.
	const TAG_SHAPE = /^[a-z][a-z0-9]*$/;

	// **효력면은 부모 문맥을 갖춘 프로브로 읽는다.**
	//
	// 홀로 파싱하면 사라지는 태그가 있다 — thead·tbody·tr·th·td 는 <table>
	// 조상이 없으면 HTML 파서 단계에서 소멸하므로, 정책이 허용해도 "살아남지
	// 않는" 것으로 읽힌다 (실측: 다섯 태그 전부 홀로는 소멸, 문맥 안에서는 보존).
	// 태그가 **자기 문맥 안에서** 살아남는지를 물어야 효력면이 된다.
	const PARENT_CONTEXT: Record<string, [string, string]> = {
		thead: ['<table>', '</table>'],
		tbody: ['<table>', '</table>'],
		tr: ['<table><tbody>', '</tbody></table>'],
		th: ['<table><thead><tr>', '</tr></thead></table>'],
		td: ['<table><tbody><tr>', '</tr></tbody></table>'],
		li: ['<ul>', '</ul>'],
	};

	// `<' + tag + '>` 를 **닫는 꺾쇠까지** 확인한다. 접두 일치로 재면 문맥이
	// 답을 준다 — `th` 프로브의 문맥에 있는 `<thead` 가 `<th` 를 만족시킨다.
	const survivesInContext = (tag: string): boolean => {
		const [open, close] = PARENT_CONTEXT[tag] ?? ['', ''];
		const probe = open + '<' + tag + '>probe</' + tag + '>' + close;
		return sanitizeHtml(probe).toLowerCase().includes('<' + tag + '>');
	};

	it('허용 목록의 모든 태그가 sanitize 를 통과한다', () => {

		const universe = [...new Set(quotedStrings(stripComments(policySource())))];

		// 우주가 비면 그 뒤 단언은 전부 공허하다 — 통과가 아니라 무판정 실패다.
		expect(universe.length,
			'정책 소스에서 문자열 후보를 하나도 뽑지 못했다 (도출 붕괴)').toBeGreaterThan(0);

		// 효력 집합 — 정책이 **실제로 살려 보내는** 태그.
		const effectiveTags = universe.filter((s) => TAG_SHAPE.test(s))
			.filter(survivesInContext)
			.sort();

		// 하한. 효력 집합이 비거나 쪼그라들면 통과가 아니라 **무판정 실패**다 —
		// "위반 0" 과 "측정 0" 은 다르다.
		expect(effectiveTags.length,
			'효력 집합이 하한 미만이다 (0 이면 도출 붕괴)').toBeGreaterThanOrEqual(10);
		expect(new Set(effectiveTags).size,
			'효력 집합에 중복이 있다 — 도출이 같은 태그를 두 번 셌다').toBe(effectiveTags.length);

		// corpus 가 실제로 통과시켜 본 태그 — 파서 산출을 sanitize 에 태운 뒤 남은 것.
		const exercised = new Set<string>();
		for (const [, markdown] of corpus) {
			for (const t of shapeOf(sanitizeHtml(markdownToHtml(markdown))).tags) exercised.add(t);
		}

		// 교차 검증. 효력면에 있는데 corpus 가 한 번도 통과시키지 않은 태그가
		// 있으면 그 태그를 쓰는 글은 무측정이다 — V9 의 신규 태그가 여기서 걸린다.
		expect(missing(new Set(effectiveTags), exercised),
			'정책이 살려 보내지만 corpus 가 한 번도 통과시켜 보지 않는 태그 — 그 태그를 쓰는 글은 무측정이다').toEqual([]);
	});
});
