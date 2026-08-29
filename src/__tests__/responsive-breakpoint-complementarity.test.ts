// 반응형 상보 쌍의 경계 정합.
//
// `hidden--width-<N>px` 와 `show--width-<N>px` 는 **상보**다 — 한쪽이 보이면
// 다른 쪽은 숨는다. SearchInput 이 데스크톱 입력(hidden--)과 모바일 입력·버튼
// (show--)을 이 쌍으로 전환한다.
//
// 실제로 어긋나 있었다: `hidden` 은 `max-width: 400px`, `show` 는
// `min-width: 399px` 였다. 399px·400px 에서 **양쪽 다** 숨겨져 그 폭에서는
// 검색을 아예 할 수 없었다. CSS 경계는 렌더 테스트로 잡히지 않는다 —
// jsdom 은 미디어 쿼리를 평가하지 않는다. 그래서 선언을 직접 읽어 판정한다.
//
// 판정: `max-width: N` 과 짝을 이루는 `min-width` 는 정확히 `N + 1` 이어야 한다.
// 같으면 그 1px 에서 둘 다 적용되고, 작으면 그 구간이 통째로 비는 대신
// 겹친다. 어느 쪽도 상보가 아니다.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const PATH_UTILITIES = join(REPO_ROOT, "src", "styles", "utilities.css");

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** `@media ... (max|min-width: Npx) { .cls { ... } }` 에서 (클래스, 종류, N) 추출. */
const collectGuards = (css: string): Array<{ cls: string; kind: "max" | "min"; px: number }> => {
	const out: Array<{ cls: string; kind: "max" | "min"; px: number }> = [];
	const RULE = /@media[^{]*\((max|min)-width:\s*(\d+)px\)[^{]*\{\s*\.([A-Za-z0-9_-]+)\s*\{[^{}]*\}\s*\}/g;
	let m: RegExpExecArray | null;
	while ((m = RULE.exec(css)) !== null) {
		out.push({ cls: m[3]!, kind: m[1] as "max" | "min", px: Number(m[2]) });
	}
	return out;
};

describe("반응형 상보 쌍 경계 정합", () => {

	it("hidden--width-Npx 와 show--width-Npx 의 경계가 상보다 (min = max + 1)", () => {

		const guards = collectGuards(stripComments(readFileSync(PATH_UTILITIES, "utf8")));

		const hidden = new Map<string, number>();
		const show = new Map<string, number>();
		for (const g of guards) {
			const h = /^hidden--width-(\d+)px$/.exec(g.cls);
			const s = /^show--width-(\d+)px$/.exec(g.cls);
			if (h && g.kind === "max") hidden.set(h[1]!, g.px);
			if (s && g.kind === "min") show.set(s[1]!, g.px);
		}

		// 공허 통과 차단 — 도출이 비면 "불일치 0" 은 무조건 참이다.
		expect(
			show.size,
			"show--width-*px 규칙 도출이 0건이다 — 선택자나 파일 경로가 어긋났다",
		).toBeGreaterThanOrEqual(1);

		const mismatches = [...show.entries()]
			.filter(([token]) => hidden.has(token))
			.map(([token, minPx]) => ({ token, minPx, maxPx: hidden.get(token)! }))
			.filter(({ minPx, maxPx }) => minPx !== maxPx + 1);

		expect(
			mismatches,
			`상보 경계가 어긋났다 — min-width 는 max-width + 1 이어야 한다: ` +
				mismatches.map((x) => `${x.token}px(max=${x.maxPx}, min=${x.minPx})`).join(", "),
		).toEqual([]);
	});

	it("짝 없는 상보 클래스가 없다 (hidden 만 있거나 show 만 있는 토큰)", () => {

		const guards = collectGuards(stripComments(readFileSync(PATH_UTILITIES, "utf8")));

		const hiddenTokens = new Set<string>();
		const showTokens = new Set<string>();
		for (const g of guards) {
			const h = /^hidden--width-(\d+)px$/.exec(g.cls);
			const s = /^show--width-(\d+)px$/.exec(g.cls);
			if (h) hiddenTokens.add(h[1]!);
			if (s) showTokens.add(s[1]!);
		}

		// show 는 반드시 짝이 있어야 한다 — 상보의 한쪽만 있으면 전환이 성립하지 않는다.
		// (hidden 단독은 허용한다: 좁은 화면에서 감추기만 하는 축이 실제로 있다.)
		const orphanShow = [...showTokens].filter((t) => !hiddenTokens.has(t));

		expect(
			orphanShow,
			`show--width-*px 에 짝이 되는 hidden 이 없다: ${orphanShow.join(", ")}`,
		).toEqual([]);
	});
});
