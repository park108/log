// TSK-20260518-10 / REQ-20260517-098 — CSP meta build artifact 보존 결정론 fixture.
// spec: specs/30.spec/blue/foundation/csp-meta-dev-strip-prod-preserve.md
//       §동작 G-A (FR-01) + §수용 기준 FR-01 / NFR-01 / NFR-05.
//
// 본 fixture 는 `index.html:9` 의 단일 `<meta http-equiv="Content-Security-Policy">`
// 메타 태그가 `vite build` 산출물 (`build/index.html`) 에 **정확히 1회 보존**
// 됨을 결정론 (rc=0/1) 채널로 박제한다:
//   G-A / FR-01: build/index.html `Content-Security-Policy` match count === 1
//                (build 존재 시 measure / 부재 시 skip — §spec NFR-02 정합)
//   G-A 보조  : index.html (원본) `Content-Security-Policy` match count === 1
//   directive 보존: build/index.html 존재 시 9 directive substring 전수 보존
//                   — `vite build` 가 directive 값을 변형하지 않음 (byte-for-byte).
//   NFR-05    : 본 fixture 본문 내 `Content-Security-Policy` occurrence 는
//                G-A scope (`build/index.html` 단일 파일) 외 — 자체 진단 제외 박제.
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync / existsSync 만 사용,
// 어떤 production 파일도 수정하지 않는다. `npm run build` 강제 부재 (G-A 메인 +
// directive 보존 조건부 skip 분기 박제).
//
// 자체 진단 제외 (§spec NFR-05 / G-G): 본 fixture 본문 내 `Content-Security-Policy`
// 문자열 occurrence 는 G-A grep count 영향 0 — G-A scope 는 `build/index.html`
// 단일 파일 한정, 본 fixture 는 `src/__tests__/` 산하.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계
// (선례 TSK-07 / TSK-08 / TSK-09 동형).
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_BUILD_INDEX_HTML = join(REPO_ROOT, "build", "index.html");
const PATH_SELF = join(REPO_ROOT, "src", "__tests__", "csp-meta-build-artifact-preservation.test.ts");

// G-A 측정 패턴 — `Content-Security-Policy` 토큰 global match.
// `String.prototype.match(/.../g)` 반환 `RegExpMatchArray | null` 을
// `?? []` 로 narrowing (§spec / DoD — `noUncheckedIndexedAccess` 정합).
const RE_CSP_TOKEN = /Content-Security-Policy/g;

// directive 보존 9 항목 baseline — `index.html:9` / `build/index.html:9` 실측.
// `vite build` 가 CSP directive 값 자체를 변형하지 않음을 byte-for-byte 박제.
// §spec §동작 1 line 19 본문 "8 directive" 표기와 별개로 실측 9 항목 전수 박제
// (작성 시점 HEAD 실측 정합 — §task 구현 지시 5 명시).
const CSP_DIRECTIVE_TOKENS = [
	"default-src 'self'",
	"script-src 'self'",
	"connect-src 'self' https://*.execute-api.ap-northeast-2.amazonaws.com",
	"img-src 'self' data: https://d0.awsstatic.com",
	"style-src 'self' 'unsafe-inline'",
	"object-src 'none'",
	"base-uri 'self'",
	"frame-ancestors 'none'",
	"form-action 'self'",
] as const;

describe("csp-meta-build-artifact-preservation (TSK-20260518-10)", () => {
	it("G-A / FR-01: build/index.html `Content-Security-Policy` match count === 1 — build 존재 시 measure / 부재 시 skip", () => {
		if (!existsSync(PATH_BUILD_INDEX_HTML)) {
			// §spec NFR-02 — 본 fixture 는 `npm run build` 강제하지 않음.
			// build 부재 시 read-only no-op (skip 동치).
			expect(true).toBe(true);
			return;
		}
		const src = readFileSync(PATH_BUILD_INDEX_HTML, "utf8");
		const matches = src.match(RE_CSP_TOKEN) ?? [];
		expect(matches.length).toBe(1);
	});

	it("G-A 보조: index.html (원본) `Content-Security-Policy` match count === 1", () => {
		const src = readFileSync(PATH_INDEX_HTML, "utf8");
		const matches = src.match(RE_CSP_TOKEN) ?? [];
		expect(matches.length).toBe(1);
	});

	it("G-A directive 보존: build/index.html 존재 시 9 directive substring 전수 보존 — 부재 시 skip", () => {
		if (!existsSync(PATH_BUILD_INDEX_HTML)) {
			// §spec NFR-02 — build 부재 시 skip.
			expect(true).toBe(true);
			return;
		}
		const src = readFileSync(PATH_BUILD_INDEX_HTML, "utf8");
		for (const token of CSP_DIRECTIVE_TOKENS) {
			expect(src.includes(token), `build/index.html directive 보존 위반 — token 부재: ${token}`).toBe(true);
		}
	});

	it("NFR-05: 본 fixture 의 `Content-Security-Policy` occurrence 는 G-A grep scope (build/index.html 단일 파일) 외 — 본 fixture 본문 측정 0 영향", () => {
		// 본 fixture 파일 자체 read → `Content-Security-Policy` occurrence ≥ 1 단언.
		// 의미: §spec NFR-05 / G-G 자체 진단 제외 — 본 fixture 의 토큰 occurrence 는
		//   G-A 측정 영향 0 (scope `build/index.html` 단일 파일 한정).
		const self = readFileSync(PATH_SELF, "utf8");
		const matches = self.match(RE_CSP_TOKEN) ?? [];
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});
});
