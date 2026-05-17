// TSK-20260518-08 / REQ-20260518-003 — meta description 토큰 양면 정합 fixture.
// spec: specs/30.spec/green/foundation/meta-description-default-fallback-token-coherence.md
//       §동작 G-A~G-F + §수용 기준 FR-01~FR-06.
//
// 본 fixture 는 2 발화 채널 (H=index.html `<meta name="description">` /
// D=src/common/common.ts `DEFAULT_META_DESCRIPTION`) 의 결정론 측정 채널을 박제한다:
//   G-A / FR-01: index.html `name="description"` match count === 1
//   G-B / FR-02: src/common/common.ts `const DEFAULT_META_DESCRIPTION =` match count === 1
//   G-C / FR-03: src/common/common.ts `setMetaDescription(...=DEFAULT_META_DESCRIPTION` match count === 1
//   G-D / FR-04: 양면 토큰 H ≡ D byte-for-byte 동치 (실측 63 byte ASCII literal)
//   G-E / FR-05: src/common/common.ts `DEFAULT_META_DESCRIPTION` 분포 === 2 (정의 1 + 사용 1)
//   G-F / FR-06: index.html `name="description"\s+content="..."` double quote ASCII literal form === 1
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync 만 사용, 어떤 production
// 파일도 수정하지 않는다. build artifact 강제 생성하지 않음 (수단 영역).
//
// 자체 진단 제외 (§spec NFR-04): 본 fixture 본문 내 `name="description"` /
// `DEFAULT_META_DESCRIPTION` / description literal 문자열 occurrence 는 게이트 scope 외 —
// 측정 대상은 단일 production 파일 path 한정 (`index.html` + `src/common/common.ts`).
//
// 실측 vs spec 본문 박제 (§task ##구현 지시 9):
//   spec 본문 "67 byte" 박제 ↔ 실측 63 byte 격차는 spec writer (inspector) 영역의
//   후속 정정 신호로 본 fixture scope 외. fixture 는 **실측 byte 길이** 기준 단언.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계.
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_COMMON_TS = join(REPO_ROOT, "src", "common", "common.ts");

// G-A 패턴 — `name="description"` literal occurrence.
const RE_HTML_NAME_DESCRIPTION = /name="description"/g;

// G-B 패턴 — `const DEFAULT_META_DESCRIPTION =` 정의 발화.
const RE_TS_CONST_DEFINE = /const DEFAULT_META_DESCRIPTION\s*=/g;

// G-C 패턴 — `setMetaDescription = (...=DEFAULT_META_DESCRIPTION` default 인자 binding 발화.
const RE_TS_SET_BINDING = /setMetaDescription\s*=\s*\([^)]*=\s*DEFAULT_META_DESCRIPTION/g;

// G-E 패턴 — `DEFAULT_META_DESCRIPTION` 식별자 분포 (정의 + 사용).
const RE_TS_IDENT_DISTRIBUTION = /DEFAULT_META_DESCRIPTION/g;

// G-F 패턴 — `<meta name="description" content="...">` double quote ASCII literal form.
const RE_HTML_META_CONTENT_FORM = /name="description"\s+content="[^"]*"/g;

// G-D 캡처 — 양면 토큰 byte-for-byte 동치 비교용.
const RE_HTML_DESCRIPTION_CAPTURE = /name="description"\s+content="([^"]*)"/;
const RE_TS_DEFAULT_CAPTURE = /const DEFAULT_META_DESCRIPTION\s*=\s*"([^"]*)"/;

// G-D baseline — 실측 63 byte ASCII literal (HEAD `d6ffc3e` 발행 시점 dry-run).
const EXPECTED_TOKEN = "park108.net is a personal journal of Jongkil Park the developer";
const EXPECTED_BYTE_LENGTH = 63;

function countMatches(source: string, pattern: RegExp): number {
	const matches = source.match(pattern);
	return matches ? matches.length : 0;
}

describe("meta-description-token-coherence (TSK-20260518-08)", () => {
	it("G-A / FR-01: index.html `name=\"description\"` match count === 1", () => {
		const src = readFileSync(PATH_INDEX_HTML, "utf8");
		const count = countMatches(src, RE_HTML_NAME_DESCRIPTION);
		expect(count).toBe(1);
	});

	it("G-B / FR-02: src/common/common.ts `const DEFAULT_META_DESCRIPTION =` match count === 1", () => {
		const src = readFileSync(PATH_COMMON_TS, "utf8");
		const count = countMatches(src, RE_TS_CONST_DEFINE);
		expect(count).toBe(1);
	});

	it("G-C / FR-03: src/common/common.ts `setMetaDescription = (...=DEFAULT_META_DESCRIPTION` match count === 1", () => {
		const src = readFileSync(PATH_COMMON_TS, "utf8");
		const count = countMatches(src, RE_TS_SET_BINDING);
		expect(count).toBe(1);
	});

	it("G-D / FR-04: 양면 토큰 H ≡ D byte-for-byte 동치 (실측 63 byte ASCII literal)", () => {
		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const commonTs = readFileSync(PATH_COMMON_TS, "utf8");

		const hMatch = html.match(RE_HTML_DESCRIPTION_CAPTURE);
		const dMatch = commonTs.match(RE_TS_DEFAULT_CAPTURE);

		expect(hMatch, "index.html `<meta name=\"description\" content=\"…\">` 캡처 실패").not.toBeNull();
		expect(dMatch, "src/common/common.ts `const DEFAULT_META_DESCRIPTION = \"…\"` 캡처 실패").not.toBeNull();

		const H = (hMatch as RegExpMatchArray)[1];
		const D = (dMatch as RegExpMatchArray)[1];

		// 실측 63 byte ASCII literal — H ≡ D.
		expect(H).toBe(EXPECTED_TOKEN);
		expect(D).toBe(EXPECTED_TOKEN);
		expect(H).toBe(D);
		expect(H.length).toBe(EXPECTED_BYTE_LENGTH);
		expect(D.length).toBe(EXPECTED_BYTE_LENGTH);
	});

	it("G-E / FR-05: src/common/common.ts `DEFAULT_META_DESCRIPTION` 분포 === 2 (정의 1 + 사용 1)", () => {
		const src = readFileSync(PATH_COMMON_TS, "utf8");
		const count = countMatches(src, RE_TS_IDENT_DISTRIBUTION);
		expect(count).toBe(2);
	});

	it("G-F / FR-06: index.html `name=\"description\"\\s+content=\"...\"` double quote ASCII literal form === 1", () => {
		const src = readFileSync(PATH_INDEX_HTML, "utf8");
		const count = countMatches(src, RE_HTML_META_CONTENT_FORM);
		expect(count).toBe(1);
	});
});
