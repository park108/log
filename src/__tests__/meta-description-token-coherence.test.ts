// TSK-20260518-08 / REQ-20260518-003 — meta description 토큰 양면 정합 fixture.
// spec: specs/30.spec/green/common/document-head.md §동작 7~9
//       (구 foundation/meta-description-default-fallback-token-coherence — 2026-09-01 통합).
//
// 본 fixture 는 3 발화 채널 (H=index.html `<meta name="description">` /
// O=index.html `<meta property="og:description">` / D=src/common/common.ts
// `DEFAULT_META_DESCRIPTION`) 의 결정론 측정 채널을 박제한다:
//   G-A / FR-01: index.html `name="description"` match count === 1
//   G-B / FR-02: src/common/common.ts `const DEFAULT_META_DESCRIPTION =` match count === 1
//   G-C / FR-03: src/common/common.ts `setMetaDescription(...=DEFAULT_META_DESCRIPTION` match count === 1
//   G-D / FR-04: 3 발화점 토큰 H (index.html description) ≡ O (og:description)
//                ≡ D (DEFAULT_META_DESCRIPTION) 동치 + 길이 단위 분리 측정
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
// 길이 단위 (TSK-20260901-18):
//   요약문이 한국어가 되면서 UTF-16 code unit (32) 과 UTF-8 byte (64) 가 갈렸다.
//   `EXPECTED_BYTE_LENGTH` 는 `Buffer.byteLength(…, "utf8")` 과만 비교하고, code
//   unit 은 `EXPECTED_CODE_UNIT_LENGTH` 로 따로 잰다. 둘을 한 이름으로 재던 것이
//   ASCII 문장에서는 드러나지 않던 결함이었다.

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

// G-D 캡처 (O) — 요약문이 사는 세 번째 발화점. 기대 요약문을 리터럴로 박은 게이트는
// 요약문이 사는 **모든** 발화점을 함께 읽어야 한다 (소유 spec 동작 7). 하나를 빼면
// 그 하나만 조용히 갈린다.
const RE_HTML_OG_DESCRIPTION_CAPTURE = /property="og:description"\s+content="([^"]*)"/;

// G-D baseline — TSK-20260901-18 실측 (한국어 요약문): UTF-8 64 byte / UTF-16 32 code unit.
// 두 수치는 ASCII 에서만 우연히 같았다. 이름이 말하는 단위로 각각 잰다 (소유 spec 동작 9).
const EXPECTED_TOKEN = "park108.net 은 개발자 박종길의 개인 기록장입니다";
const EXPECTED_BYTE_LENGTH = 64;
const EXPECTED_CODE_UNIT_LENGTH = 32;

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

	it("G-D / FR-04: 3 발화점 토큰 H ≡ O ≡ D 동치 (실측 UTF-8 64 byte / UTF-16 32 code unit)", () => {
		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const commonTs = readFileSync(PATH_COMMON_TS, "utf8");

		const hMatch = html.match(RE_HTML_DESCRIPTION_CAPTURE);
		const oMatch = html.match(RE_HTML_OG_DESCRIPTION_CAPTURE);
		const dMatch = commonTs.match(RE_TS_DEFAULT_CAPTURE);

		expect(hMatch, "index.html `<meta name=\"description\" content=\"…\">` 캡처 실패").not.toBeNull();
		expect(oMatch, "index.html `<meta property=\"og:description\" content=\"…\">` 캡처 실패").not.toBeNull();
		expect(dMatch, "src/common/common.ts `const DEFAULT_META_DESCRIPTION = \"…\"` 캡처 실패").not.toBeNull();

		// noUncheckedIndexedAccess: true — capture group 인덱스 접근 결과는
		// `string | undefined`. capture 정규식 자체가 group 1 을 강제하므로 실측은
		// 항상 string 이지만, .length 접근을 위해 명시 narrowing.
		const H = (hMatch as RegExpMatchArray)[1] as string;
		const O = (oMatch as RegExpMatchArray)[1] as string;
		const D = (dMatch as RegExpMatchArray)[1] as string;

		// 세 발화점이 같은 한 문장이다.
		expect(H).toBe(EXPECTED_TOKEN);
		expect(O).toBe(EXPECTED_TOKEN);
		expect(D).toBe(EXPECTED_TOKEN);
		expect(H).toBe(D);
		expect(O).toBe(H);

		// 길이는 이름이 말하는 단위로 잰다 — `String.prototype.length` 는 UTF-16 code
		// unit 수이지 UTF-8 byte 수가 아니다 (소유 spec 동작 9).
		expect(Buffer.byteLength(H, "utf8")).toBe(EXPECTED_BYTE_LENGTH);
		expect(Buffer.byteLength(D, "utf8")).toBe(EXPECTED_BYTE_LENGTH);
		expect(H.length).toBe(EXPECTED_CODE_UNIT_LENGTH);
		expect(D.length).toBe(EXPECTED_CODE_UNIT_LENGTH);
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
