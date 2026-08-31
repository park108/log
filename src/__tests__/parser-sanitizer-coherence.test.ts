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
	// 이름 대신 **구조와 동작**으로 찾는다 — 소스에서 문자열 배열 상수를 전부
	// 뽑은 뒤, 원소가 전부 *태그로서* sanitize 를 통과하는 배열을 고른다.
	// 속성 목록은 태그로 넣으면 한 건도 살아남지 않으므로 이 판정으로 갈린다.
	// 이름이 바뀌어도 따라가고, 상수를 옮기거나 지우면 도출이 비어 실패한다.

	const policySource = (): string => {
		const path = resolve(process.cwd(), 'src/common/sanitizeHtml.ts');
		const src = readFileSync(path, 'utf8');
		// 도출의 입력이 비면 그 뒤 단언은 전부 공허하다 — 여기서 끊는다.
		expect(src.length, '정책 모듈 소스를 읽지 못했다: ' + path).toBeGreaterThan(0);
		return src;
	};

	// 소스의 `const 이름 = [ '문자열', … ]` 배열을 전부 뽑는다 (이름은 보지 않는다).
	const stringArrayConstants = (src: string): string[][] => {
		const out: string[][] = [];
		for (const m of src.matchAll(/const\s+[A-Za-z_$][\w$]*\s*=\s*\[([^\]]*)\]/g)) {
			const items = [...(m[1] ?? '').matchAll(/'([^']*)'|"([^"]*)"/g)]
				.map((q) => (q[1] ?? q[2] ?? ''))
				.filter((x) => x.length > 0);
			if (items.length > 0) out.push(items);
		}
		return out;
	};

	// 그 이름이 **태그 역할**인가 **속성 역할**인가를 동작으로 읽는다.
	//
	// 처음에는 "원소가 전부 태그로 살아남는가" 하나로 갈랐는데, 그 판별자는
	// **문맥 의존 태그에서 무너진다** — `<td>probe</td>` 를 홀로 파싱하면 표 밖의
	// `td` 는 HTML 파서 단계에서 사라지므로, 정책이 허용해도 "살아남지 않는" 것으로
	// 읽힌다 (실측: thead·tbody·tr·th·td 전부 홀로는 소멸). 표 6 태그가 등재되는
	// 순간 그 배열은 "전원 통과" 를 잃고 후보에서 탈락해 도출이 공집합이 됐다.
	//
	// 그래서 절대 기준 대신 **역할 비교**로 바꾼다. 태그 목록은 태그 자리에서
	// 일부라도 살아남고 속성 자리에서는 전무하며, 속성 목록은 정확히 그 반대다.
	// 문맥 의존 태그가 몇 개 섞여도 이 비교는 흔들리지 않는다.
	const survivesAsTag = (tag: string): boolean =>
		sanitizeHtml('<' + tag + '>probe</' + tag + '>').toLowerCase().includes('<' + tag);

	const survivesAsAttr = (attr: string): boolean =>
		sanitizeHtml('<a ' + attr + '="x">y</a>').toLowerCase().includes(attr.toLowerCase() + '=');

	const countBy = (items: string[], f: (x: string) => boolean): number =>
		items.filter(f).length;

	it('허용 목록의 모든 태그가 sanitize 를 통과한다', () => {

		const candidates = stringArrayConstants(policySource())
			.filter((items) => countBy(items, survivesAsTag) > countBy(items, survivesAsAttr)
				&& countBy(items, survivesAsTag) > 0);

		// 도출이 비거나 여럿이면 **통과가 아니라 무판정 실패**다. 공집합을 통과로
		// 읽으면 "위반 0" 과 "측정 0" 이 구별되지 않는다.
		expect(candidates.length,
			'정책 태그 목록 도출이 유일하게 확정되지 않았다 (0 이면 도출 붕괴)').toBe(1);

		const policyTags = candidates[0]!;

		// 하한 — 도출이 한두 건으로 쪼그라드는 방향도 무판정이다.
		expect(policyTags.length,
			'도출된 정책 태그 수가 하한 미만이다').toBeGreaterThanOrEqual(10);
		expect(new Set(policyTags).size, '도출 결과에 중복이 있다').toBe(policyTags.length);

		// corpus 가 실제로 통과시켜 본 태그 — 파서 산출을 sanitize 에 태운 뒤 남은 것.
		const exercised = new Set<string>();
		for (const [, markdown] of corpus) {
			for (const t of shapeOf(sanitizeHtml(markdownToHtml(markdown))).tags) exercised.add(t);
		}
		expect(missing(new Set(policyTags), exercised),
			'정책에 등재됐으나 corpus 가 한 번도 통과시켜 보지 않는 태그 — 그 태그를 쓰는 글은 무측정이다').toEqual([]);
	});
});
