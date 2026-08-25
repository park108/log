// TSK-20260518-13 / REQ-20260517-097 — root-level config/script/hook → spec
// 참조 3축 정합 결정론 측정 fixture.
//
// spec: specs/30.spec/blue/foundation/root-config-spec-reference-coherence.md
//       §동작 G-A·G-B·G-C·G-G + §수용 기준 (Must FR-01·FR-02·FR-03·NFR-01·NFR-02·NFR-04).
//
// 본 fixture 는 저장소 root 의 빌드/도구/훅/진단 스크립트 7-file 군 내 spec
// 참조의 3축 시스템 불변식을 박제한다:
//   G-A / FR-01: RULE-01 "-spec" suffix 금지 — 자체 진단 exclude rule 적용 후
//                root 7-file 군 내 `-spec(.md)?` regex match === 0 hit.
//   G-A-self / NFR-04: 자체 진단 exclude 전 match count === 7 hit
//                (.husky/pre-commit:3,6 + scripts/check-spec-coherence.sh:2,3,49,201,202).
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
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

// 측정 대상 — 고정 6 file + scripts/*.sh 전수.
//
// scripts 는 하드코딩 목록이었는데, 이후 추가된 스크립트가 목록에 반영되지 않아
// 그 안의 끊긴 spec 참조가 스캔 범위 밖에 숨어 있었다 (2026-08-24 실측: 2건).
// 디렉터리 열거로 바꿔 신규 스크립트가 자동으로 범위에 들어오게 한다.
function rootFilePaths(): readonly string[] {
	const fixed = [
		"vite.config.js",
		"eslint.config.js",
		"tsconfig.json",
		"index.html",
		".husky/pre-commit",
		".husky/pre-push",
	];
	const scripts = readdirSync(join(REPO_ROOT, "scripts"))
		.filter((name) => name.endsWith(".sh"))
		.sort()
		.map((name) => join("scripts", name));
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
// TSK-20260825-08 — check-spec-coherence.sh 의 spec-scope 확장(G4/G5)으로 self-diag
// 라인 집합이 이동·증가했다 (6 -> 7). 수치는 손으로 세지 않고 §task 구현 지시 9 의
// 파생 명령(본 fixture 의 collectSpecSuffixHits 재현) 출력을 그대로 옮겼다.
const EXPECTED_GA_SELF_DIAG_COUNT = 7;
// hit 12 / 고유 path 11 — tooling.md 이 check-eslint-ignores-vacuous-zero.sh 와
// check-vitest-globals-coherence.sh 두 곳에서 참조된다. 본 상수는 hit 수 (= 참조를
// 가진 파일 수) 이고, EXPECTED_GB_EXISTS 는 고유 path 집합이다.
// hit 12 / 고유 path 11 — tooling.md 이 check-eslint-ignores-vacuous-zero.sh 와
// check-vitest-globals-coherence.sh 두 곳에서 참조된다. 본 상수는 hit 수 (= 참조를
// 가진 파일 수) 이고, EXPECTED_GB_EXISTS 는 고유 path 집합이다.
const EXPECTED_GB_PATH_COUNT = 12;
const EXPECTED_GB_MISSING: readonly string[] = [];
const EXPECTED_GB_EXISTS = [
	specPath("blue", "foundation/build-coverage-output-dir-tri-surface-coherence.md"),
	specPath("blue", "foundation/dev-server-port-getUrl-token-coherence.md"),
	specPath("blue", "foundation/eslint-react-hooks-lint-gate.md"),
	specPath("blue", "foundation/multi-agent-commit-message-writer-scope-coherence.md"),
	specPath("blue", "foundation/node-modules-extraneous-coherence.md"),
	specPath("blue", "foundation/node-version-3axis-coherence.md"),
	specPath("blue", "foundation/package-manager-major-coherence.md"),
	specPath("blue", "foundation/src-spec-reference-coherence.md"),
	specPath("blue", "foundation/tooling.md"),
	specPath("blue", "foundation/vite-env-boundary-typing.md"),
	specPath("blue", "styles/css-modules.md"),
] as const;

// G-C baseline — green 큐가 비어 참조된 green path 0. STALE 판정 대상 자체가 없다.
const EXPECTED_GC_GREEN_PATHS: readonly string[] = [];
const EXPECTED_GC_STALE: readonly string[] = [];
const EXPECTED_GC_OK: readonly string[] = [];

// G-A 자체 진단 baseline — exclude rule 매치 라인의 **내용 식별자** 박제
// (NFR-04 정합 / fixture-baseline-position-independence (P-1)).
//
// ── 왜 행 번호를 버렸는가 (TSK-20260825-15) ─────────────────────────────────
// 종전 baseline 은 `{ relPath, line: <숫자> }` 였고 `` `${relPath}:${line}` `` 로
// 대조했다. 그래서 대상 파일에 **주석 한 줄만 추가해도** 이 fixture 가 red 가 됐다 —
// 측정하려는 불변식("exclude 후 `-spec` 토큰 0 hit")은 조금도 위반되지 않았는데도.
// 비용은 두 번 실현됐다: (1) TSK-20260825-07 (`check:spec-coherence` 스코프 확장)
// 이 이 결합 때문에 `50.blocked/task/` 로 격리됐다 — 그 task 는 `expansion: 불허` 에
// 스크립트 1 파일이었고 본 fixture 는 스코프 밖이었다. (2) baseline 재박제
// (COUNT 6→7 · 라인 `19`·`62` → `49`·`201`·`202`).
//
// 지금은 **(파일, 매치 토큰, 라인 내용 앵커)** 3튜플로 지목한다. 셋 다 위치가 아니라
// 정체다 — 파일이 이름을 바꾸거나, 매치 토큰이 달라지거나, 그 라인의 문구가 사라지면
// 판정이 바뀌는 것이 **옳다**. 파일 안에서 라인이 몇 번째인지만 판정에서 빠졌다.
//
// **개수 단언(`EXPECTED_GA_SELF_DIAG_COUNT`)은 유지한다.** 가장 쉬운 "해결" 은
// baseline 을 통째로 지우는 것이고 그러면 위치 종속은 즉시 사라지면서 **검출력도 0**
// 이 된다. 3튜플 대조는 baseline↔관측 **양방향 1:1** 이라 누락도 잉여도 잡는다.
//
// 앵커 선정 규칙: 그 라인에만 있는 문구를 쓰되 `spec` 디렉터리 경로 리터럴은 피한다
// (자매 게이트 `check-spec-coherence.sh` 의 G2 disk-existence 스캔에 잡힌다 —
// 본 파일의 `SPEC_DIR_FRAG_*` 우회가 같은 이유로 존재한다).
interface SelfDiagBaselineEntry {
	/** 대상 파일 — 위치가 아니라 정체다. 이름이 바뀌면 판정이 바뀌는 것이 옳다. */
	relPath: string;
	/** `RE_SPEC_SUFFIX` 가 그 라인에서 뽑아낸 토큰. */
	matched: string;
	/** 그 라인에만 있는 내용 조각. 라인이 이동해도 함께 이동한다. */
	anchor: string;
}

const EXPECTED_GA_SELF_DIAG_HITS: ReadonlyArray<SelfDiagBaselineEntry> = [
	{ relPath: ".husky/pre-commit", matched: "src-spec", anchor: "spec coherence gate" },
	{
		relPath: ".husky/pre-commit",
		matched: "check-spec",
		anchor: "bash scripts/check-spec-coherence.sh",
	},
	{
		relPath: "scripts/check-spec-coherence.sh",
		matched: "check-spec",
		anchor: "# check-spec-coherence.sh",
	},
	{
		relPath: "scripts/check-spec-coherence.sh",
		matched: "src-spec",
		anchor: "§동작 G1·G2",
	},
	{
		relPath: "scripts/check-spec-coherence.sh",
		matched: "check-spec",
		anchor: "src/ not found at",
	},
	{
		relPath: "scripts/check-spec-coherence.sh",
		matched: "check-spec",
		anchor: "G1 0 hit / G2 0 MISSING",
	},
	{
		relPath: "scripts/check-spec-coherence.sh",
		matched: "check-spec",
		anchor: "spec-scope root=",
	},
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
	/**
	 * 관측된 행 번호. **판정에는 쓰이지 않는다** — 위반 리포트에서 사람이 찾아갈 수
	 * 있게 하는 진단 필드다 (fixture-baseline-position-independence (P-1) 은
	 * *baseline* 의 행 번호 박제를 금지하지, 관측의 행 번호 산출을 금지하지 않는다).
	 */
	line: number;
	matched: string;
	/** 매치된 라인의 원문. 내용 앵커 대조의 입력이다. */
	lineText: string;
	selfDiag: boolean;
};

type SourceEntry = { rel: string; src: string };

function rootSources(): SourceEntry[] {
	const entries: SourceEntry[] = [];
	for (const abs of rootFilePaths()) {
		if (!existsSync(abs)) continue;
		entries.push({ rel: relFromRepoRoot(abs), src: readUtf8(abs) });
	}
	return entries;
}

/**
 * 순수 측정 — 디스크가 아니라 **주어진 소스**에서 hit 을 뽑는다.
 *
 * 디스크 읽기와 분리한 이유는 (P-1) 의 위치 비종속성을 **저장소에 상주하는 단언**으로
 * 증명하기 위해서다: 같은 내용을 아래로 밀어 넣은 소스를 먹여도 baseline 대조 결과가
 * 불변임을 재는 테스트가 아래에 있다. 이 분리가 없으면 그 증명은 파일을 실제로 편집하는
 * 1회성 주입으로만 가능하고, 회귀 시점에 아무도 다시 재지 않는다.
 */
function collectSpecSuffixHitsFrom(sources: readonly SourceEntry[]): SpecSuffixHit[] {
	const hits: SpecSuffixHit[] = [];
	for (const { rel, src } of sources) {
		const lines = src.split("\n");
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
					lineText: line,
					selfDiag,
				});
			}
		}
	}
	return hits;
}

function collectSpecSuffixHits(): SpecSuffixHit[] {
	return collectSpecSuffixHitsFrom(rootSources());
}

/**
 * baseline ↔ 관측 **양방향 1:1** 대조. 행 번호를 보지 않는다.
 *
 * `unmatched` 는 baseline 에 있는데 관측되지 않은 항목(= 내용 소실),
 * `leftover` 는 관측됐는데 baseline 이 모르는 항목(= 내용 증가)이다. 둘 다 비어야
 * 통과다 — 한쪽만 보면 "전부 통과시키는 baseline" 또는 "전부 red 를 내는 baseline"
 * 이 그 한쪽을 만족시킨다.
 */
function diffAgainstBaseline(observed: readonly SpecSuffixHit[]): {
	unmatched: string[];
	leftover: string[];
} {
	const consumed = new Set<number>();
	const unmatched: string[] = [];
	for (const expected of EXPECTED_GA_SELF_DIAG_HITS) {
		const idx = observed.findIndex(
			(h, i) =>
				!consumed.has(i) &&
				h.relPath === expected.relPath &&
				h.matched === expected.matched &&
				h.lineText.includes(expected.anchor),
		);
		if (idx < 0) unmatched.push(`${expected.relPath} :: ${expected.matched} :: ${expected.anchor}`);
		else consumed.add(idx);
	}
	const leftover = observed
		.filter((_, i) => !consumed.has(i))
		.map((h) => `${h.relPath}:${h.line} :: ${h.matched} :: ${h.lineText.trim()}`);
	return { unmatched, leftover };
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

	it("G-A-self / NFR-04: 자체 진단 exclude 전 match count === 7 + (파일,토큰,앵커) 박제", () => {
		const selfDiag = collectSpecSuffixHits().filter((h) => h.selfDiag);

		// (P-3) 개수 민감도 — 이 단언을 빼면 baseline 을 비우는 것만으로 위치 종속이
		// 사라지고 검출력도 함께 0 이 된다.
		expect(selfDiag).toHaveLength(EXPECTED_GA_SELF_DIAG_COUNT);

		// 내용 식별자 대조. 라인 위치는 보지 않는다.
		const { unmatched, leftover } = diffAgainstBaseline(selfDiag);
		expect(
			unmatched,
			`자체 진단 baseline 이 관측되지 않았다 (내용 소실):\n${unmatched.map((u) => `  ${u}`).join("\n")}`,
		).toEqual([]);
		expect(
			leftover,
			`baseline 이 모르는 자체 진단 hit (내용 증가):\n${leftover.map((l) => `  ${l}`).join("\n")}`,
		).toEqual([]);
	});

	it("(P-1) 자체 진단 baseline 판정이 **라인 위치에 비종속**이다", () => {
		// 대상 파일 상단에 빈 주석을 밀어 넣어 모든 라인을 아래로 이동시킨다.
		// 실제 파일은 건드리지 않는다 — 순수 측정 함수에 이동된 소스를 먹인다.
		const SHIFT = 3;
		const padding = "# [position-shift probe]\n".repeat(SHIFT);
		const shifted = rootSources().map(({ rel, src }) => ({ rel, src: padding + src }));

		const before = collectSpecSuffixHits().filter((h) => h.selfDiag);
		const after = collectSpecSuffixHitsFrom(shifted).filter((h) => h.selfDiag);

		// (i) 프로브가 공허하지 않다 — 라인 번호가 **실제로** 이동했다. 이 단언이 없으면
		//     padding 이 무시돼도(예: 소스가 비어 있어도) (ii) 가 무조건 참이 된다.
		expect(before.length, "자체 진단 hit 이 0 이다 — 프로브가 공허하다").toBeGreaterThan(0);
		expect(after.map((h) => h.line)).toEqual(before.map((h) => h.line + SHIFT));

		// (ii) 그런데 baseline 대조 결과는 불변이다.
		expect(after).toHaveLength(EXPECTED_GA_SELF_DIAG_COUNT);
		expect(diffAgainstBaseline(after)).toEqual({ unmatched: [], leftover: [] });

		// (iii) 대조군 — 행 번호로 대조하면 같은 이동에서 **전량이 어긋난다**. 이것이
		//       종전 baseline 이 주석 한 줄에 red 가 되던 결합의 실물이며, 위 (ii) 가
		//       우연이 아님을 보인다.
		const positionalBefore = before.map((h) => `${h.relPath}:${h.line}`).sort();
		const positionalAfter = after.map((h) => `${h.relPath}:${h.line}`).sort();
		expect(positionalAfter).not.toEqual(positionalBefore);
	});

	it("G-B / FR-02: root 파일군(고정 6 + scripts/*.sh 전수)에서 spec path 12 hit / 12 file 추출 + 0 MISSING + 11 고유 EXISTS (전수 blue) 집합 박제", () => {
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

	it("G-C / FR-03: green 참조 0 — STALE 판정 대상 부재", () => {
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
