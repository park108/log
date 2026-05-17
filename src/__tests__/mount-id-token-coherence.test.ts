// TSK-20260518-07 / REQ-20260518-002 — mount 노드 ID 토큰 3 극 정합 fixture.
// spec: specs/30.spec/green/foundation/index-html-root-mount-id-token-coherence.md
//       §동작 G-A~G-F + §수용 기준 FR-01~FR-06.
//
// 본 fixture 는 3 극 토큰 (H=index.html / R=src/index.jsx / C=src/common/common.ts)
// 의 결정론 측정 채널을 박제한다:
//   G-A / FR-01: index.html `id="root"` match count === 1
//   G-B / FR-02: src/index.jsx `getElementById("root")` match count === 1
//   G-C / FR-03: src/common/common.ts `getElementById("root")` match count === 1
//   G-D / FR-04: 3 극 토큰 캡처 + byte-for-byte 동치 ("root" ≡ "root" ≡ "root")
//   G-E / FR-05: src/** production scope (`*.test.*` 제외) 총합 === 2
//   G-F / FR-06: build/index.html 존재 시 `id="root"` count === 1 (부재 시 skip)
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync 만 사용, 어떤 production
// 파일도 수정하지 않는다. build artifact 강제 생성하지 않음 (수단 영역).
//
// 자체 진단 제외 (§spec NFR-04): 본 fixture 본문 내 `id="root"` / `getElementById("root")`
// 문자열 occurrence 는 게이트 scope 외 — G-E walk 는 `*.test.*` 제외 패턴으로
// 본 fixture 자기 자신을 측정 대상에서 배제한다.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계.
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_INDEX_JSX = join(REPO_ROOT, "src", "index.jsx");
const PATH_COMMON_TS = join(REPO_ROOT, "src", "common", "common.ts");
const PATH_BUILD_INDEX_HTML = join(REPO_ROOT, "build", "index.html");
const PATH_SRC = join(REPO_ROOT, "src");

// G-A / G-F 패턴 — HTML `id="root"` literal.
const RE_HTML_ID_ROOT = /id="root"/g;
const RE_HTML_ID_ROOT_CAPTURE = /<div[^>]*\bid="(root)"/;

// G-B / G-C / G-E 패턴 — JS/TS `getElementById("root")` literal.
const RE_GEBI_ROOT = /getElementById\("root"\)/g;
const RE_GEBI_ROOT_CAPTURE = /getElementById\("(root)"\)/;

function countMatches(source: string, pattern: RegExp): number {
	const matches = source.match(pattern);
	return matches ? matches.length : 0;
}

/**
 * src/** production scope walk — `*.test.*` 파일 제외 + 4 확장자 (.ts/.tsx/.js/.jsx).
 * §spec FR-05 / G-E baseline = 2 (`src/index.jsx:1` + `src/common/common.ts:1`).
 */
function walkProductionMatchCount(root: string, pattern: RegExp): number {
	let total = 0;
	const stack: string[] = [root];
	while (stack.length > 0) {
		const current = stack.pop() as string;
		const entries = readdirSync(current);
		for (const entry of entries) {
			const full = join(current, entry);
			const st = statSync(full);
			if (st.isDirectory()) {
				// node_modules / build 등 산출물 디렉터리는 src 산하에 없으나 방어적 제외.
				if (entry === "node_modules" || entry === "build" || entry === "coverage") continue;
				stack.push(full);
				continue;
			}
			if (!st.isFile()) continue;
			// 확장자 4종 + `*.test.*` 제외.
			if (!/\.(ts|tsx|js|jsx)$/.test(entry)) continue;
			if (/\.test\.(ts|tsx|js|jsx)$/.test(entry)) continue;
			const src = readFileSync(full, "utf8");
			total += countMatches(src, pattern);
		}
	}
	return total;
}

describe("mount-id-token-coherence (TSK-20260518-07)", () => {
	it("G-A / FR-01: index.html `id=\"root\"` match count === 1", () => {
		const src = readFileSync(PATH_INDEX_HTML, "utf8");
		const count = countMatches(src, RE_HTML_ID_ROOT);
		expect(count).toBe(1);
	});

	it("G-B / FR-02: src/index.jsx `getElementById(\"root\")` match count === 1", () => {
		const src = readFileSync(PATH_INDEX_JSX, "utf8");
		const count = countMatches(src, RE_GEBI_ROOT);
		expect(count).toBe(1);
	});

	it("G-C / FR-03: src/common/common.ts `getElementById(\"root\")` match count === 1", () => {
		const src = readFileSync(PATH_COMMON_TS, "utf8");
		const count = countMatches(src, RE_GEBI_ROOT);
		expect(count).toBe(1);
	});

	it("G-D / FR-04: 3 극 토큰 byte-for-byte 동치 (H ≡ R ≡ C ≡ \"root\")", () => {
		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const indexJsx = readFileSync(PATH_INDEX_JSX, "utf8");
		const commonTs = readFileSync(PATH_COMMON_TS, "utf8");

		const hMatch = html.match(RE_HTML_ID_ROOT_CAPTURE);
		const rMatch = indexJsx.match(RE_GEBI_ROOT_CAPTURE);
		const cMatch = commonTs.match(RE_GEBI_ROOT_CAPTURE);

		expect(hMatch, "index.html `<div id=\"…\">` 캡처 실패").not.toBeNull();
		expect(rMatch, "src/index.jsx selector 인자 캡처 실패").not.toBeNull();
		expect(cMatch, "src/common/common.ts selector 인자 캡처 실패").not.toBeNull();

		const H = (hMatch as RegExpMatchArray)[1];
		const R = (rMatch as RegExpMatchArray)[1];
		const C = (cMatch as RegExpMatchArray)[1];

		// 4 byte ASCII literal "root" — H ≡ R ≡ C.
		expect(H).toBe("root");
		expect(R).toBe("root");
		expect(C).toBe("root");
		expect(H).toBe(R);
		expect(R).toBe(C);
	});

	it("G-E / FR-05: src/** production scope `getElementById(\"root\")` 총합 === 2 (`*.test.*` 제외)", () => {
		const total = walkProductionMatchCount(PATH_SRC, RE_GEBI_ROOT);
		expect(total).toBe(2);
	});

	it("G-F / FR-06: build/index.html 존재 시 `id=\"root\"` match count === 1 (부재 시 skip)", () => {
		if (!existsSync(PATH_BUILD_INDEX_HTML)) {
			// §spec NFR-02 — 본 fixture 는 `npm run build` 강제하지 않음.
			// build artifact 부재 시 read-only no-op (skip 동치).
			expect(true).toBe(true);
			return;
		}
		const src = readFileSync(PATH_BUILD_INDEX_HTML, "utf8");
		const count = countMatches(src, RE_HTML_ID_ROOT);
		expect(count).toBe(1);
	});
});
