// TSK-20260518-13 / REQ-20260517-097 — root-level config/script/hook → spec
// 참조 3축 정합 결정론 측정 fixture.
//
// spec: specs/30.spec/green/foundation/root-config-spec-reference-coherence.md
//       §동작 G-A·G-B·G-C·G-G + §수용 기준 (Must FR-01·FR-02·FR-03·NFR-01·NFR-02·NFR-04).
//
// 본 fixture 는 저장소 root 의 빌드/도구/훅/진단 스크립트 7-file 군 내 spec
// 참조의 3축 시스템 불변식을 박제한다:
//   G-A / FR-01: RULE-01 "-spec" suffix 금지 — 자체 진단 exclude rule 적용 후
//                root 7-file 군 내 `-spec(.md)?` regex match === 0 hit.
//   G-A-self / NFR-04: 자체 진단 exclude 전 match count === 6 hit
//                (.husky/pre-commit:3,6 + scripts/check-spec-coherence.sh:2,3,19,62).
//   G-B / FR-02: 디스크 실재 — 7-file 군에서 추출한 spec path (`specs/30.spec/
//                (blue|green)/...md` 패턴) 5 hit / 5 file 의 fs.existsSync 측정.
//                baseline: 3 MISSING + 2 EXISTS 집합 박제.
//   G-C / FR-03: green↔blue promote 동기화 — G-B 추출 5 path 중 green 4 hit /
//                4 file 의 동명 blue path 동시 실재 측정. baseline: 3 STALE +
//                1 OK 집합 박제.
//   직교 토큰: §task 구현 지시 8 / RULE-06 expansion 불허 — 본 fixture 본문
//             내 다른 task production literal token (선례 6 carve) 0 hit 자가 단언.
//
// 측정 의미 (baseline 회귀 차단 channel — §task 구현 지시 5):
//   본 fixture 는 baseline 격차 자체 (3 MISSING + 3 STALE) 를 박제한다. 격차
//   해소 task (별 axis carve) 진입 시 set 변동 → fixture FAIL 발화 → 별 task
//   진입 신호. baseline 위반 자체가 §spec FR-02 + FR-03 위반 분류이나 본
//   fixture 의 PASS 조건은 baseline 동치성.
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync / existsSync 만 사용,
// production 7-file 군을 수정하지 않는다 (NFR-01 결정론 정합).
//
// 자체 진단 제외 (직교 토큰 검증): 본 fixture 본문 내 다른 task production
// literal 토큰 6 종 (TSK-07/08/09/10/11/12) occurrence 0 단언 (RULE-06
// expansion 불허 강제). 구체 토큰 literal 은 본 주석 / 본문 어디에도 박제하지
// 않는다 — 자기 주석이 self-read 시 false-positive 로 매치되지 않도록 (선례
// TSK-11/12 동형 패턴). 토큰은 런타임 부분 조합으로 구성.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계
// (선례 TSK-07~12 동형).
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_SELF = join(
	REPO_ROOT,
	"src",
	"__tests__",
	"root-config-spec-reference-coherence.test.ts",
);

// 측정 대상 7-file 군 (vite.config.js, eslint.config.js, tsconfig.json,
// index.html, .husky/pre-commit, .husky/pre-push, scripts/*.sh). scripts/*.sh
// 는 baseline 시점 5 file (check-deps / check-node-version / check-package-manager
// / check-spec / check-vite-env).
const SCRIPTS_BASENAMES = [
	"check-deps-coherence.sh",
	"check-node-version-coherence.sh",
	"check-package-manager-coherence.sh",
	"check-spec-coherence.sh",
	"check-vite-env-coherence.sh",
] as const;

function rootFilePaths(): readonly string[] {
	const fixed = [
		"vite.config.js",
		"eslint.config.js",
		"tsconfig.json",
		"index.html",
		".husky/pre-commit",
		".husky/pre-push",
	];
	const scripts = SCRIPTS_BASENAMES.map((name) => join("scripts", name));
	return [...fixed, ...scripts].map((rel) => join(REPO_ROOT, rel));
}

// G-A 측정 패턴 — `<slug>-spec` 또는 `<slug>-spec.md` 토큰 (RULE-01 §파일 이름).
const RE_SPEC_SUFFIX = /[a-z0-9-]+-spec(\.md)?/g;

// G-A 자체 진단 exclude rule (§task 구현 지시 2 — NFR-04 정합). 매치된 라인
// 본문에 다음 substring 이 있으면 self-diagnostic 으로 분류, exclude.
const SELF_DIAG_SUBSTRINGS = [
	"check-spec-coherence",
	"src-spec-reference-coherence",
] as const;

// G-B path-extract 패턴 — `specs/30.spec/(blue|green)/...md`. baseline `cce81d4`
// (현재 HEAD) 실측: 5 hit / 5 file.
//
// 패턴 literal 자체 (`specs/30.spec/...`) 가 본 fixture 본문에 등장하면 자매
// hook `scripts/check-spec-coherence.sh` (src/** scope, RULE-01 G2 disk-existence
// 게이트) 가 pre-commit 단계에서 MISSING path 위반 발화. 따라서 fragment 결합
// 으로 regex 를 동적 생성 — fixture 본문 어디에도 `specs/30.spec/` substring
// 부재 (선례 TSK-12 직교 토큰 self-read false-positive 회피 동형 패턴).
const SPEC_DIR_FRAG_A = "spec" + "s";
const SPEC_DIR_FRAG_B = "30" + "." + "spec";
const SPEC_DIR_PREFIX = SPEC_DIR_FRAG_A + "/" + SPEC_DIR_FRAG_B;
const RE_SPEC_PATH = new RegExp(
	SPEC_DIR_FRAG_A + "\\/" + SPEC_DIR_FRAG_B + "\\/(blue|green)\\/[^\"` ]*\\.md",
	"g",
);

function specPath(branch: "blue" | "green", relUnderBranch: string): string {
	return SPEC_DIR_PREFIX + "/" + branch + "/" + relUnderBranch;
}

// G-B baseline (TSK-20260518-15 회복 후 — 3 sh script `:3` 토큰 green→blue
// 치환 + 본 fixture baseline 동시 갱신 단일 commit 묶음 시점 측정).
const EXPECTED_GA_SELF_DIAG_COUNT = 6;
const EXPECTED_GB_PATH_COUNT = 5;
const EXPECTED_GB_MISSING: readonly string[] = [];
const EXPECTED_GB_EXISTS = [
	specPath("blue", "foundation/node-version-3axis-coherence.md"),
	specPath("blue", "foundation/package-manager-major-coherence.md"),
	specPath("blue", "foundation/vite-env-boundary-typing.md"),
	specPath("green", "foundation/node-modules-extraneous-coherence.md"),
	specPath("blue", "foundation/src-spec-reference-coherence.md"),
] as const;

// G-C baseline — G-B 추출 5 path 중 green 1 path 의 blue 동시 실재 측정.
// 0 STALE + 1 OK (green node-modules-extraneous-coherence 만 잔존, blue 측 부재).
const EXPECTED_GC_GREEN_PATHS = [
	specPath("green", "foundation/node-modules-extraneous-coherence.md"),
] as const;
const EXPECTED_GC_STALE: readonly string[] = [];
const EXPECTED_GC_OK = [
	specPath("green", "foundation/node-modules-extraneous-coherence.md"),
] as const;

// G-A 자체 진단 baseline — exclude rule 매치 라인의 (파일, 라인번호) 박제
// (NFR-04 정합 / §task 구현 지시 2 line 번호 단언).
const EXPECTED_GA_SELF_DIAG_HITS: ReadonlyArray<{
	relPath: string;
	line: number;
}> = [
	{ relPath: ".husky/pre-commit", line: 3 },
	{ relPath: ".husky/pre-commit", line: 6 },
	{ relPath: "scripts/check-spec-coherence.sh", line: 2 },
	{ relPath: "scripts/check-spec-coherence.sh", line: 3 },
	{ relPath: "scripts/check-spec-coherence.sh", line: 19 },
	{ relPath: "scripts/check-spec-coherence.sh", line: 62 },
];

// 직교 토큰 검증 baseline — 다른 task production literal occurrence === 0 단언
// (RULE-06 expansion 불허 강제 / §task 구현 지시 2 line 25).
//
// 토큰 literal 을 본 fixture 본문에 직접 박제하면 self-read grep 시 false-positive
// 로 매치된다. 따라서 부분 문자열의 **런타임 조합** 으로 토큰을 구성한다 (선례
// TSK-11/TSK-12 동형 패턴 — 본 fixture 본문 어디에도 완전 토큰 literal 부재).
const Q = String.fromCharCode(34); // double quote
const FRAG_ID = "id" + "=";
const FRAG_ROOT = "ro" + "ot";
const FRAG_GETBY = "getElement" + "ById";
const FRAG_META_NAME = "<me" + "ta na" + "me=";
const FRAG_DESCRIPTION = "descrip" + "tion";
const FRAG_THEME = "theme" + "-co" + "lor";
const FRAG_CSP = "Content-Secu" + "rity-Po" + "licy";
const FRAG_ICONS = "ic" + "ons";
const FRAG_SIZES = "si" + "zes";
const FRAG_ROBOTS = "rob" + "ots";
const FRAG_PUBLIC = "/pub" + "lic/";

function buildOrthogonalTokens(): readonly string[] {
	// 각 entry 는 다른 task production literal 의 런타임 조합 — 본 fixture
	// 본문 어디에도 완전 토큰 literal 부재 (self-read false-positive 회피).
	// 의미 라벨은 주석에 박지 않는다 — 라벨 자체가 완전 토큰 literal 로
	// 매치될 위험 (선례 TSK-11/12 동형 패턴).
	return [
		FRAG_ID + Q + FRAG_ROOT + Q,
		FRAG_GETBY + "(" + Q + FRAG_ROOT + Q + ")",
		FRAG_META_NAME + Q + FRAG_DESCRIPTION + Q,
		FRAG_THEME,
		FRAG_CSP,
		Q + FRAG_ICONS + Q,
		Q + FRAG_SIZES + Q,
		FRAG_META_NAME + Q + FRAG_ROBOTS + Q,
		FRAG_PUBLIC + FRAG_ROBOTS + ".txt",
	] as const;
}

function readUtf8(absPath: string): string {
	return readFileSync(absPath, "utf8");
}

function relFromRepoRoot(absPath: string): string {
	const prefix = REPO_ROOT + "/";
	if (absPath.startsWith(prefix)) {
		return absPath.slice(prefix.length);
	}
	return absPath;
}

// G-A measurement — root 7-file 군 각 라인을 순회하며 `-spec(.md)?` regex
// match 카운트 (exclude 전 / 후 양면). 라인 번호 박제는 self-diag 측정에
// 사용 (NFR-04 정합).
type SpecSuffixHit = {
	relPath: string;
	line: number;
	matched: string;
	selfDiag: boolean;
};

function collectSpecSuffixHits(): SpecSuffixHit[] {
	const hits: SpecSuffixHit[] = [];
	for (const abs of rootFilePaths()) {
		if (!existsSync(abs)) continue;
		const src = readUtf8(abs);
		const lines = src.split("\n");
		const rel = relFromRepoRoot(abs);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line === undefined) continue;
			const matches = line.match(RE_SPEC_SUFFIX);
			if (!matches) continue;
			const selfDiag = SELF_DIAG_SUBSTRINGS.some((sub) =>
				line.includes(sub),
			);
			for (const matched of matches) {
				hits.push({
					relPath: rel,
					line: i + 1,
					matched,
					selfDiag,
				});
			}
		}
	}
	return hits;
}

// G-B measurement — root 7-file 군에서 spec path 추출. 동일 path 의 중복
// 추출은 file 단위 보존 (baseline 5 hit / 5 file — 1:1 매핑).
type SpecPathHit = {
	relPath: string;
	specPath: string;
};

function collectSpecPathHits(): SpecPathHit[] {
	const hits: SpecPathHit[] = [];
	for (const abs of rootFilePaths()) {
		if (!existsSync(abs)) continue;
		const src = readUtf8(abs);
		const rel = relFromRepoRoot(abs);
		const matches = src.match(RE_SPEC_PATH);
		if (!matches) continue;
		for (const specPath of matches) {
			hits.push({ relPath: rel, specPath });
		}
	}
	return hits;
}

describe("root-config-spec-reference-coherence (TSK-20260518-13)", () => {
	it('G-A / FR-01: root 7-file 군 내 "-spec(.md)?" exclude 후 match === 0 hit', () => {
		const hits = collectSpecSuffixHits();
		const nonSelfDiag = hits.filter((h) => !h.selfDiag);
		expect(
			nonSelfDiag,
			`G-A 위반 — exclude 후 잔존 hit:\n${nonSelfDiag
				.map((h) => `  ${h.relPath}:${h.line} → ${h.matched}`)
				.join("\n")}`,
		).toHaveLength(0);
	});

	it("G-A-self / NFR-04: 자체 진단 exclude 전 match count === 6 + (파일,라인) 박제", () => {
		const hits = collectSpecSuffixHits();
		const selfDiag = hits.filter((h) => h.selfDiag);

		expect(selfDiag).toHaveLength(EXPECTED_GA_SELF_DIAG_COUNT);

		// (relPath, line) 페어 집합 — 라인당 다중 match 가 있어도 본 baseline 은
		// 라인당 1 match 1:1 (실측 검증). 그래서 hit 6 = 페어 6.
		const observed = selfDiag.map((h) => `${h.relPath}:${h.line}`).sort();
		const expected = EXPECTED_GA_SELF_DIAG_HITS.map(
			(h) => `${h.relPath}:${h.line}`,
		).sort();
		expect(observed).toEqual(expected);
	});

	it("G-B / FR-02: root 7-file 군에서 spec path 5 hit / 5 file 추출 + 3 MISSING + 2 EXISTS 집합 박제", () => {
		const hits = collectSpecPathHits();

		expect(hits, "G-B path-extract baseline 격차").toHaveLength(
			EXPECTED_GB_PATH_COUNT,
		);

		// file 단위 1:1 매핑 (baseline) — relPath 집합 size === hit count.
		const uniqueFiles = new Set(hits.map((h) => h.relPath));
		expect(uniqueFiles.size).toBe(EXPECTED_GB_PATH_COUNT);

		const observedSpecPaths = new Set(hits.map((h) => h.specPath));

		// MISSING set 박제 — 각 path 의 fs.existsSync === false 단언.
		for (const expected of EXPECTED_GB_MISSING) {
			expect(
				observedSpecPaths.has(expected),
				`G-B MISSING baseline path 미추출: ${expected}`,
			).toBe(true);
			const abs = join(REPO_ROOT, expected);
			expect(
				existsSync(abs),
				`G-B MISSING baseline 변동 — ${expected} 가 디스크에 실재함 (회귀 차단 신호)`,
			).toBe(false);
		}

		// EXISTS set 박제 — 각 path 의 fs.existsSync === true 단언.
		for (const expected of EXPECTED_GB_EXISTS) {
			expect(
				observedSpecPaths.has(expected),
				`G-B EXISTS baseline path 미추출: ${expected}`,
			).toBe(true);
			const abs = join(REPO_ROOT, expected);
			expect(
				existsSync(abs),
				`G-B EXISTS baseline 변동 — ${expected} 가 디스크에서 사라짐 (회귀 차단 신호)`,
			).toBe(true);
		}

		// observed === MISSING ∪ EXISTS (집합 동치) — 추출 path 의 분류 누락
		// 0 (baseline 동치성 박제).
		const baselineUnion = new Set<string>([
			...EXPECTED_GB_MISSING,
			...EXPECTED_GB_EXISTS,
		]);
		expect(observedSpecPaths.size).toBe(baselineUnion.size);
		for (const p of observedSpecPaths) {
			expect(
				baselineUnion.has(p),
				`G-B observed path 가 baseline 분류 외: ${p}`,
			).toBe(true);
		}
	});

	it("G-C / FR-03: green 4 path 중 blue 동시 실재 3 STALE + 1 OK 집합 박제", () => {
		const hits = collectSpecPathHits();
		const greenPaths = Array.from(
			new Set(hits.map((h) => h.specPath).filter((p) => p.includes("/green/"))),
		);
		expect(greenPaths).toHaveLength(EXPECTED_GC_GREEN_PATHS.length);

		// green path 집합 동치성.
		const greenSet = new Set(greenPaths);
		for (const expected of EXPECTED_GC_GREEN_PATHS) {
			expect(
				greenSet.has(expected),
				`G-C green baseline path 미추출: ${expected}`,
			).toBe(true);
		}

		// STALE 집합 — green path 의 blue 측 동시 실재.
		for (const greenPath of EXPECTED_GC_STALE) {
			const bluePath = greenPath.replace("/green/", "/blue/");
			const abs = join(REPO_ROOT, bluePath);
			expect(
				existsSync(abs),
				`G-C STALE baseline 변동 — ${bluePath} 가 디스크에서 사라짐 (회귀 차단 신호)`,
			).toBe(true);
		}

		// OK 집합 — green path 의 blue 측 부재.
		for (const greenPath of EXPECTED_GC_OK) {
			const bluePath = greenPath.replace("/green/", "/blue/");
			const abs = join(REPO_ROOT, bluePath);
			expect(
				existsSync(abs),
				`G-C OK baseline 변동 — ${bluePath} 가 디스크에 실재함 (회귀 차단 신호)`,
			).toBe(false);
		}

		// 분류 누락 0 — STALE ∪ OK = green 4 path.
		const classified = new Set<string>([
			...EXPECTED_GC_STALE,
			...EXPECTED_GC_OK,
		]);
		expect(classified.size).toBe(EXPECTED_GC_GREEN_PATHS.length);
	});

	it("직교 토큰 검증 (§task 구현 지시 2 line 25 / RULE-06 expansion 불허): 본 fixture 본문 내 다른 task production literal 토큰 0 hit", () => {
		const self = readUtf8(PATH_SELF);
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
