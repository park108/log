// TSK-20260518-12 / REQ-20260518-001 — `<meta name="robots">` ↔ `public/robots.txt`
// 양면 색인 정책 의미 동치 fixture.
// spec: specs/30.spec/green/common/document-head.md §동작 3~4
//       (구 foundation/meta-robots-robotstxt-policy-semantic-coherence — 2026-09-01 통합).
//
// 본 fixture 는 채널 A (HTML 페이지-수준 `<meta name="robots">`) 와 채널 B
// (HTTP path 수준 `public/robots.txt`) 의 결정론 측정 + 의미 매핑 (M_A / M_B)
// 양면 동치 비교를 박제한다:
//   G-A / FR-01: index.html `<meta name="robots">` match count === 1
//   G-B / FR-02: public/robots.txt 실재 + byte === 112 + `\n` split line === 4
//   G-C / FR-03: 채널 A 토큰 → M_A === { index: "allow", follow: "allow" }
//   G-D / FR-04: 채널 B `User-agent: *` group `Disallow:` value === "" → M_B
//                === { path: "allow-all", crawl: "allow" }
//   G-E / FR-05: M_A permissive ≡ M_B permissive → 양면 동치 PASS
//   G-F / FR-06: build/index.html meta 1 hit + build/robots.txt byte-equal source
//                — 동시대 산출물 존재 시 measure / 미빌드·stale 은 미측정 skip
//                  (TSK-20260824-08-a / REQ-20260824-003 FR-02~04)
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync + 공통 헬퍼의 existsSync /
// statSync 만 사용, production 파일을 수정하지 않는다. `npm run build` 강제하지
// 않음 — 3 상태 판정(미빌드/stale/동시대)은 ../test-utils/buildArtifactGate 에 수렴.
//
// 자체 진단 제외 (§task 구현 지시 8 — TSK-07/08/09/10/11 동형 직교 토큰 검증):
// 본 fixture 본문 내 다른 task production literal 토큰 (선례 4 carve) occurrence
// 0 단언 (RULE-06 expansion 불허 강제). 구체 토큰 literal 은 본 주석 어디에도
// 박제하지 않는다 — 자기 주석이 self-read 시 false-positive 로 매치되지 않도록
// (선례 TSK-11 manifest-icons fixture 동형 패턴). 측정 대상은 production file
// path 한정 (`index.html` / `public/robots.txt` / `build/index.html` /
// `build/robots.txt`).
//
// 행 수 세는 법 (trailing newline 부재 baseline):
//   `wc -l` 은 개행 문자 수를 세므로 마지막 행에 개행이 없으면 한 행 적게 나온다.
//   fixture 는 `\n` split line 수 + byte 길이를 동시 단언해 이 함정을 피한다.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { measureBuildArtifacts } from "../test-utils/buildArtifactGate";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계
// (선례 TSK-07/08/09/10/11 동형).
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_PUBLIC_ROBOTS = join(REPO_ROOT, "public", "robots.txt");
const PATH_BUILD_INDEX_HTML = join(REPO_ROOT, "build", "index.html");
const PATH_BUILD_ROBOTS = join(REPO_ROOT, "build", "robots.txt");
const PATH_SELF = join(REPO_ROOT, "src", "__tests__", "robots-policy-coherence.test.ts");

// G-A 측정 패턴 — `<meta name="robots">` literal occurrence (global).
const RE_HTML_META_ROBOTS = /<meta\s+name="robots"/g;

// G-C 캡처 — `<meta name="robots" content="...">` content attribute 값.
const RE_HTML_META_ROBOTS_CAPTURE = /<meta\s+name="robots"\s+content="([^"]*)"/;

// G-B baseline — TSK-20260901-18 실측: 112 byte, `\n` split 후 4 행.
// (`Sitemap:` 선언 1 행 추가 — 67 byte/3 행에서 갱신. 선언 추가는 색인 의도를
//  바꾸지 않는다: 채널 A/B 의 permissive baseline 은 그대로다.)
const EXPECTED_ROBOTS_BYTE = 112;
const EXPECTED_ROBOTS_SPLIT_LINES = 4;

// G-C baseline — 채널 A content === "index, follow" (permissive).
const EXPECTED_META_CONTENT = "index, follow";

// 직교 토큰 검증 baseline — 다른 task production literal occurrence === 0 단언
// (RULE-06 expansion 불허 강제 / §task 구현 지시 8).
//
// 토큰 literal 을 본 fixture 본문에 직접 박제하면 self-read grep 시 false-positive
// 로 매치된다. 따라서 부분 문자열의 **런타임 조합** 으로 토큰을 구성한다 — 본 fixture
// 본문 어디에도 완전 토큰 literal 이 등장하지 않으면서 검증은 결정론으로 수행.
//
// 부분 문자열 구성요소 (각각은 다른 task 토큰의 완전 substring 아님):
const Q = String.fromCharCode(34); // double quote
const FRAG_ID = "id" + "=";
const FRAG_ROOT = "ro" + "ot";
const FRAG_GETBY = "getElement" + "ById";
const FRAG_META_DESC_NAME = "<me" + "ta na" + "me=";
const FRAG_DESCRIPTION = "descrip" + "tion";
const FRAG_THEME = "theme" + "-co" + "lor";
const FRAG_CSP = "Content-Secu" + "rity-Po" + "licy";
const FRAG_ICONS = "ic" + "ons";
const FRAG_SIZES = "si" + "zes";

function buildOrthogonalTokens(): readonly string[] {
	// 각 entry 는 다른 task production literal 의 런타임 조합 — 본 fixture 본문
	// 어디에도 완전 토큰 literal 부재 (self-read false-positive 회피). 토큰 의미
	// 라벨은 주석에 박지 않는다 — 라벨 자체가 false-positive 매치 위험.
	return [
		FRAG_ID + Q + FRAG_ROOT + Q,
		FRAG_GETBY + "(" + Q + FRAG_ROOT + Q + ")",
		FRAG_META_DESC_NAME + Q + FRAG_DESCRIPTION + Q,
		FRAG_THEME,
		FRAG_CSP,
		Q + FRAG_ICONS + Q,
		Q + FRAG_SIZES + Q,
	] as const;
}

function countMatches(source: string, pattern: RegExp): number {
	const matches = source.match(pattern);
	return matches ? matches.length : 0;
}

// 채널 A 토큰 집합 → 의미 매핑 M_A (Google Search Central `noindex` / `nofollow`
// 우세 규약 — § 구현 지시 3).
type MA = { index: "allow" | "deny"; follow: "allow" | "deny" };

function mapChannelA(content: string): { tokens: Set<string>; ma: MA } {
	const tokens = new Set(
		content
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0),
	);
	const ma: MA = {
		index: tokens.has("noindex") ? "deny" : "allow",
		follow: tokens.has("nofollow") ? "deny" : "allow",
	};
	return { tokens, ma };
}

// 채널 B `User-agent: *` group `Disallow:` value → 의미 매핑 M_B
// (RFC 9309 §2.2.2 — § 구현 지시 4).
type MB =
	| { path: "allow-all"; crawl: "allow" }
	| { path: "deny-all"; crawl: "deny" }
	| { path: "partial-deny"; crawl: "partial-allow" };

function mapChannelB(body: string): { disallowValue: string; mb: MB } {
	const lines = body.split("\n");
	// `User-agent: *` group baseline 단일 — group 시작 인덱스 추적.
	let groupStart = -1;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		if (/^User-agent:\s*\*\s*$/.test(line)) {
			groupStart = i;
			break;
		}
	}
	if (groupStart < 0) {
		throw new Error("public/robots.txt: `User-agent: *` group 부재 — 채널 B 파싱 실패");
	}
	// group 본문 = User-agent 다음 행부터 다음 `User-agent:` 또는 EOF 까지.
	let disallowValue: string | null = null;
	for (let i = groupStart + 1; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		if (/^User-agent:/.test(line)) break;
		const m = line.match(/^Disallow:\s*(.*)$/);
		if (m) {
			// capture group 1: 콜론 우측 (`\s*` 소비 후) — `noUncheckedIndexedAccess`
			// 정합을 위해 명시 narrowing.
			const captured = m[1];
			disallowValue = captured === undefined ? "" : captured.trimEnd();
			break;
		}
	}
	if (disallowValue === null) {
		throw new Error(
			"public/robots.txt: `User-agent: *` group 의 `Disallow:` 행 부재 — fixture 명시 분기 신호",
		);
	}
	let mb: MB;
	if (disallowValue === "") {
		mb = { path: "allow-all", crawl: "allow" };
	} else if (disallowValue === "/") {
		mb = { path: "deny-all", crawl: "deny" };
	} else if (disallowValue.startsWith("/") && disallowValue.length > 1) {
		mb = { path: "partial-deny", crawl: "partial-allow" };
	} else {
		throw new Error(
			`public/robots.txt: \`Disallow:\` value "${disallowValue}" 는 인식 분기 외 — fixture 명시 분기 신호`,
		);
	}
	return { disallowValue, mb };
}

// G-E 양면 동치 — permissive ≡ permissive | deny-all ≡ deny-all 만 PASS.
function semanticCoherence(
	ma: MA,
	mb: MB,
): { coherent: boolean; reason: string } {
	const aPermissive = ma.index === "allow" && ma.follow === "allow";
	const aDenyAll = ma.index === "deny" && ma.follow === "deny";
	const bPermissive = mb.path === "allow-all" && mb.crawl === "allow";
	const bDenyAll = mb.path === "deny-all" && mb.crawl === "deny";
	if (aPermissive && bPermissive) {
		return { coherent: true, reason: "permissive ≡ permissive" };
	}
	if (aDenyAll && bDenyAll) {
		return { coherent: true, reason: "deny-all ≡ deny-all" };
	}
	return {
		coherent: false,
		reason: `단방향 분기 — M_A=${JSON.stringify(ma)} M_B=${JSON.stringify(mb)}`,
	};
}

describe("robots-policy-coherence (TSK-20260518-12)", () => {
	it("G-A / FR-01: index.html `<meta name=\"robots\">` match count === 1", () => {
		const src = readFileSync(PATH_INDEX_HTML, "utf8");
		const count = countMatches(src, RE_HTML_META_ROBOTS);
		expect(count).toBe(1);
	});

	it("G-B / FR-02: public/robots.txt 실재 + byte === 112 + `\\n` split 후 line === 4", () => {
		expect(existsSync(PATH_PUBLIC_ROBOTS)).toBe(true);
		const body = readFileSync(PATH_PUBLIC_ROBOTS, "utf8");
		// byte 측정 — fixture 는 utf8 read 후 Buffer.byteLength 로 byte 길이 비교
		// (baseline ASCII-only — UTF-8 BOM 부재 baseline).
		const byteLength = Buffer.byteLength(body, "utf8");
		expect(byteLength).toBe(EXPECTED_ROBOTS_BYTE);
		// 본문 `\n` split — trailing newline 부재 baseline → line 수 === 4
		// ("# 주석" + "User-agent: *" + "Disallow:" + "Sitemap:").
		const lines = body.split("\n");
		expect(lines.length).toBe(EXPECTED_ROBOTS_SPLIT_LINES);
	});

	it("G-C / FR-03: 채널 A content === \"index, follow\" → M_A === { index: \"allow\", follow: \"allow\" }", () => {
		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const match = html.match(RE_HTML_META_ROBOTS_CAPTURE);
		expect(match, "index.html `<meta name=\"robots\" content=\"…\">` 캡처 실패").not.toBeNull();
		const captured = (match as RegExpMatchArray)[1];
		expect(captured, "capture group 1 부재").toBeDefined();
		const content = captured as string;
		expect(content).toBe(EXPECTED_META_CONTENT);

		const { tokens, ma } = mapChannelA(content);
		// 토큰 집합 — Set equality 는 size + has 로 박제.
		expect(tokens.size).toBe(2);
		expect(tokens.has("index")).toBe(true);
		expect(tokens.has("follow")).toBe(true);
		expect(ma).toEqual({ index: "allow", follow: "allow" });
	});

	it("G-D / FR-04: 채널 B `User-agent: *` group `Disallow:` value === \"\" → M_B === { path: \"allow-all\", crawl: \"allow\" }", () => {
		const body = readFileSync(PATH_PUBLIC_ROBOTS, "utf8");
		const { disallowValue, mb } = mapChannelB(body);
		expect(disallowValue).toBe("");
		expect(mb).toEqual({ path: "allow-all", crawl: "allow" });
	});

	it("G-E / FR-05: M_A permissive ≡ M_B permissive → 양면 의미 동치 PASS", () => {
		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const body = readFileSync(PATH_PUBLIC_ROBOTS, "utf8");

		const aMatch = html.match(RE_HTML_META_ROBOTS_CAPTURE);
		expect(aMatch).not.toBeNull();
		const content = (aMatch as RegExpMatchArray)[1] as string;
		const { ma } = mapChannelA(content);
		const { mb } = mapChannelB(body);

		const result = semanticCoherence(ma, mb);
		expect(
			result.coherent,
			`양면 동치 위반 — ${result.reason}`,
		).toBe(true);
		expect(result.reason).toBe("permissive ≡ permissive");
	});

	it("G-F / FR-06: 동시대 build artifact 동치 보존 — meta 1 hit + byte-equal source (미빌드·stale 은 skip)", (ctx) => {
		// 술어 입도는 **파일 단위** 이며 두 산출물을 함께 요구한다. 한쪽만 있는
		// 부분 산출은 위반이 아니라 미측정이다. 미측정은 자명 단언이 아니라 skip
		// 으로 계수돼야 실행 출력에서 측정과 구별된다.
		const gate = measureBuildArtifacts(ctx, {
			artifacts: [PATH_BUILD_INDEX_HTML, PATH_BUILD_ROBOTS],
			sources: [PATH_INDEX_HTML, PATH_PUBLIC_ROBOTS],
		});
		const src = readFileSync(PATH_BUILD_INDEX_HTML, "utf8");
		const count = countMatches(src, RE_HTML_META_ROBOTS);
		expect(
			count,
			`G-F 위반 — 빌드가 채널 A 메타 선언을 변형·소실시켰다. ${gate.mtimeEvidence}`,
		).toBe(1);

		const sourceBuf = readFileSync(PATH_PUBLIC_ROBOTS);
		const buildBuf = readFileSync(PATH_BUILD_ROBOTS);
		// byte-for-byte 동치 — Vite `publicDir` 자동 복사 보존.
		expect(
			buildBuf.equals(sourceBuf),
			`G-F 위반 — 빌드가 채널 B robots.txt 를 변형시켰다. ${gate.mtimeEvidence}`,
		).toBe(true);
	});

	it("직교 토큰 검증 (§task 구현 지시 8): 본 fixture 본문 내 다른 task production literal 토큰 0 hit — RULE-06 expansion 불허 강제", () => {
		const self = readFileSync(PATH_SELF, "utf8");
		// 본 fixture 본문 자체 read — 다른 task production literal token 7 종
		// (선례 4 carve: TSK-07 / TSK-08 / TSK-10 / TSK-11) occurrence 0 단언.
		// 토큰 literal 은 self-read false-positive 회피 위해 런타임 부분 조합으로
		// 구성 (위 buildOrthogonalTokens — 본 fixture 본문 어디에도 완전 토큰
		// literal 부재).
		const tokens = buildOrthogonalTokens();
		for (const token of tokens) {
			const idx = self.indexOf(token);
			expect(
				idx,
				`본 fixture 본문 내 직교 토큰 occurrence 위반 — token=${token} idx=${idx}`,
			).toBe(-1);
		}
	});
});
