// buildArtifactGate 3 상태 판정 + 대상 집합 완전성 보조 단언.
//
// req : REQ-20260824-003 (FR-02 / FR-03 / FR-04)
// task: TSK-20260824-08-a
// spec: foundation/build-artifact-gate-measurement-contract.md §동작 C-2~C-5
//       (spec 경로 literal 은 박제하지 않는다 — 헬퍼 헤더의 "spec 경로" 절 참조)
//
// 두 축을 잠근다.
//
//  (A) 판정 자체 — 미빌드 / stale / 동시대. mtime 은 `utimesSync` 로 심어
//      결정론으로 만든다. 실제 시계나 실제 빌드에 의존하지 않는다.
//  (B) 대상 집합 — build 산출물을 참조하는 픽스처가 **전부** 이 헬퍼를 경유한다.
//      6 이라는 수를 파일 목록으로 박아두면 7 번째가 조용히 새므로 (RULE-06
//      §열거 고정 금지) 목록은 디렉터리 열거 + 내용 술어로 매번 산출한다.
//
// 자체 진단 제외 — 경로 제외를 쓰지 않는다. (B) 의 스캔은 `src/**` 의 테스트
// 파일 전수이고 본 파일도 그 안에 있다. 아래 표기 변형 fixture 는 완전 토큰을
// 런타임 조립해 본 파일 텍스트에 literal 이 남지 않게 한다 — 어떤 파일도
// 스캔에서 빼지 않으면서 자기 자신이 오탐되지 않는다 (선례:
// html-lang-locale-declaration.test.ts 의 FRAG_* 결합 패턴).
//
// 쓰기 범위 — 본 테스트는 OS 임시 디렉터리에만 쓴다 (mkdtemp). 저장소 트리와
// `build/` 는 건드리지 않는다. 헬퍼 자신은 read-only 다 (C-5).

import { describe, it, expect, afterAll, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import {
	probeBuildArtifacts,
	measureBuildArtifacts,
	type BuildArtifactGateContext,
} from "./buildArtifactGate";

const REPO_ROOT = resolve(__dirname, "..", "..");
const TESTS_DIR = join(REPO_ROOT, "src", "__tests__");

// ── (A) 판정 픽스처 ─────────────────────────────────────────────────────────

const scratch = mkdtempSync(join(tmpdir(), "build-artifact-gate-"));

afterAll(() => {
	rmSync(scratch, { recursive: true, force: true });
});

/** epoch 초를 지정해 파일을 만든다 — mtime 비교를 시계와 무관하게 고정한다. */
function seed(relPath: string, body: string, epochSeconds: number): string {
	const full = join(scratch, relPath);
	mkdirSync(join(full, ".."), { recursive: true });
	writeFileSync(full, body, "utf8");
	utimesSync(full, epochSeconds, epochSeconds);
	return full;
}

const T_OLD = 1_700_000_000;
const T_NEW = 1_700_000_900;

/** skip 을 잡아채는 가짜 컨텍스트 — 실제 러너 없이 skip 경로를 관측한다. */
function fakeCtx(): BuildArtifactGateContext & { readonly notes: string[] } {
	const notes: string[] = [];
	return {
		notes,
		skip: ((note?: string): never => {
			notes.push(note ?? "");
			throw new Error("SKIPPED");
		}) as (note?: string) => never,
	};
}

describe("buildArtifactGate — 3 상태 판정 (TSK-20260824-08-a)", () => {
	it("미빌드: 산출물이 없으면 unbuilt — 위반이 아니라 미측정으로 보고한다", () => {
		const source = seed("unbuilt/index.html", "<html lang=\"en\">", T_OLD);
		const probe = probeBuildArtifacts({
			artifacts: [join(scratch, "unbuilt", "build", "index.html")],
			sources: [source],
		});
		expect(probe.state).toBe("unbuilt");
		expect(probe.reason).toContain("미빌드");
		expect(probe.reason).toContain("위반 아님");
		expect(probe.missing).toHaveLength(1);
		expect(probe.mtimeEvidence).toBe("");
	});

	it("부분 산출: 디렉터리는 있고 대상 파일이 없으면 unbuilt (C-2 — 디렉터리 존재는 빌드 완료가 아니다)", () => {
		const source = seed("partial/index.html", "<html lang=\"en\">", T_OLD);
		const buildDir = join(scratch, "partial", "build");
		mkdirSync(buildDir, { recursive: true });
		const probe = probeBuildArtifacts({
			artifacts: [buildDir, join(buildDir, "index.html")],
			sources: [source],
		});
		expect(probe.state).toBe("unbuilt");
		expect(probe.missing.join(",")).toContain("index.html");
	});

	it("stale: 원본이 산출물보다 최신이면 stale — 변형이 아니라 재빌드 필요로 보고한다", () => {
		const source = seed("stale/index.html", "<html lang=\"ko\">", T_NEW);
		const artifact = seed("stale/build/index.html", "<html lang=\"en\">", T_OLD);
		const probe = probeBuildArtifacts({ artifacts: [artifact], sources: [source] });
		expect(probe.state).toBe("stale");
		expect(probe.reason).toContain("재빌드 필요");
		expect(probe.reason).toContain("위반 아님");
		// 내용이 실제로 다르지만 stale 이 변형 판정을 가린다 — 원인 지목의 정확성.
		expect(probe.reason).not.toContain("변형");
		expect(probe.staleArtifacts).toHaveLength(1);
		expect(probe.staleArtifacts[0]).toContain("mtimeMs=");
		expect(probe.mtimeEvidence).toBe("");
	});

	it("동시대: 산출물이 원본과 같거나 최신이면 current — mtimeMs 근거 문자열을 낸다", () => {
		const source = seed("current/index.html", "<html lang=\"en\">", T_OLD);
		const artifact = seed("current/build/index.html", "<html lang=\"en\">", T_NEW);
		const probe = probeBuildArtifacts({ artifacts: [artifact], sources: [source] });
		expect(probe.state).toBe("current");
		expect(probe.reason).toBe("");
		expect(probe.mtimeEvidence).toContain("stale 아님");
		expect(probe.mtimeEvidence).toContain("mtimeMs=");
		expect(probe.staleArtifacts).toHaveLength(0);
	});

	it("동시대 경계: 원본과 산출물의 mtime 이 같으면 stale 이 아니다", () => {
		const source = seed("equal/index.html", "<html lang=\"en\">", T_OLD);
		const artifact = seed("equal/build/index.html", "<html lang=\"en\">", T_OLD);
		expect(probeBuildArtifacts({ artifacts: [artifact], sources: [source] }).state).toBe("current");
	});

	it("다중 원본: 가장 최신인 원본 하나만 늦어도 stale — 나머지가 낡았어도 가려지지 않는다", () => {
		const older = seed("multi/a.txt", "a", T_OLD);
		const newer = seed("multi/b.txt", "b", T_NEW);
		const artifact = seed("multi/build/out.txt", "a", T_OLD + 10);
		const probe = probeBuildArtifacts({ artifacts: [artifact], sources: [older, newer] });
		expect(probe.state).toBe("stale");
		expect(probe.reason).toContain("b.txt");
	});

	it("다중 산출물: 어느 하나라도 낡으면 stale, 전부 최신이면 최고(最古) 산출물이 근거가 된다", () => {
		const source = seed("multiart/index.html", "<html>", T_OLD);
		const first = seed("multiart/build/index.html", "<html>", T_NEW);
		const second = seed("multiart/build/manifest.json", "{}", T_OLD + 10);
		const current = probeBuildArtifacts({ artifacts: [first, second], sources: [source] });
		expect(current.state).toBe("current");
		expect(current.mtimeEvidence).toContain("manifest.json");

		const reversed = probeBuildArtifacts({ artifacts: [second, first], sources: [source] });
		expect(reversed.mtimeEvidence).toContain("manifest.json");

		const late = seed("multiart/build/late.txt", "x", T_OLD - 10);
		const stale = probeBuildArtifacts({ artifacts: [first, late], sources: [source] });
		expect(stale.state).toBe("stale");
		expect(stale.staleArtifacts.join(",")).toContain("late.txt");
	});

	it("경로 표시: 실행 디렉터리 자신이 대상이면 절대 경로를 그대로 보고한다", () => {
		const future = seed("cwd/source.txt", "x", Math.floor(Date.now() / 1000) + 86_400);
		const probe = probeBuildArtifacts({ artifacts: [process.cwd()], sources: [future] });
		expect(probe.state).toBe("stale");
		expect(probe.staleArtifacts.join(",")).toContain(process.cwd());
	});

	it("게이트 오구성은 조용히 넘어가지 않는다 — 빈 입력·원본 부재는 throw", () => {
		const artifact = seed("misconfig/build/index.html", "<html>", T_OLD);
		expect(() => probeBuildArtifacts({ artifacts: [], sources: [artifact] })).toThrow(/artifacts 가 비었다/);
		expect(() => probeBuildArtifacts({ artifacts: [artifact], sources: [] })).toThrow(/sources 가 비었다/);
		expect(() =>
			probeBuildArtifacts({ artifacts: [artifact], sources: [join(scratch, "misconfig", "gone.html")] }),
		).toThrow(/원본 부재/);
	});
});

describe("buildArtifactGate — 미측정의 관측 가능성 (C-4)", () => {
	it("current 는 skip 없이 probe 를 돌려준다", () => {
		const source = seed("obs-current/index.html", "<html>", T_OLD);
		const artifact = seed("obs-current/build/index.html", "<html>", T_NEW);
		const ctx = fakeCtx();
		const gate = measureBuildArtifacts(ctx, { artifacts: [artifact], sources: [source] });
		expect(gate.state).toBe("current");
		expect(ctx.notes).toHaveLength(0);
	});

	it("미빌드는 러너의 skip 경로로 빠지며 사유가 note 로 남는다 (자명 단언 아님)", () => {
		const source = seed("obs-unbuilt/index.html", "<html>", T_OLD);
		const ctx = fakeCtx();
		expect(() =>
			measureBuildArtifacts(ctx, {
				artifacts: [join(scratch, "obs-unbuilt", "build", "index.html")],
				sources: [source],
			}),
		).toThrow(/SKIPPED/);
		expect(ctx.notes).toHaveLength(1);
		expect(ctx.notes[0]).toContain("미빌드");
	});

	it("stale 은 skip note 에 더해 stdout 에도 재빌드 지시를 남긴다", () => {
		const source = seed("obs-stale/index.html", "<html>", T_NEW);
		const artifact = seed("obs-stale/build/index.html", "<html>", T_OLD);
		const ctx = fakeCtx();
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		try {
			expect(() => measureBuildArtifacts(ctx, { artifacts: [artifact], sources: [source] })).toThrow(/SKIPPED/);
			expect(info).toHaveBeenCalledTimes(1);
			expect(String(info.mock.calls[0]?.[0])).toContain("재빌드 필요");
		} finally {
			info.mockRestore();
		}
		expect(ctx.notes[0]).toContain("재빌드 필요");
	});
});

// ── (B) 대상 집합 완전성 ────────────────────────────────────────────────────

// build 산출물 디렉터리를 가리키는 **경로 표현** — `join(<식별자>, "build")`.
// 상수명(`PATH_BUILD` / `BUILD_DIR` / …)에 기대지 않는다. 상수명 기반 규칙은
// 이름이 한 글자만 달라져도 새며, 실제로 현행 6 파일 중 하나(viewport)는
// `BUILD_DIR` 이라는 다른 이름을 쓴다.
const RE_BUILD_DIR_EXPR = /join\(\s*[A-Za-z_$][\w$]*\s*,\s*["']build["']/;

// 상수명 의존 규칙 (spec/task §grep-baseline 이 쓴 것) — 위 규칙보다 좁다.
const RE_CONSTANT_NAMED_RULE = /join\(REPO_ROOT, "build"|join\(PATH_BUILD/;

const RE_HELPER_IMPORT = /from\s+["'][^"']*buildArtifactGate["']/;

const RE_TEST_FILE = /\.(test|spec)\.[jt]sx?$/;

interface ScannedFile {
	readonly rel: string;
	readonly text: string;
}

function collectTestSources(dir: string, acc: ScannedFile[] = []): ScannedFile[] {
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules") continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			collectTestSources(full, acc);
			continue;
		}
		const isTestLike = RE_TEST_FILE.test(entry) || full.startsWith(TESTS_DIR);
		if (!isTestLike) continue;
		acc.push({ rel: full.slice(REPO_ROOT.length + 1), text: readFileSync(full, "utf8") });
	}
	return acc;
}

describe("buildArtifactGate — 대상 집합 완전성 (RULE-06 §열거 고정 금지)", () => {
	const scanned = collectTestSources(join(REPO_ROOT, "src"));

	it("스캔이 실제로 파일을 본다 (공집합 오보고 방지)", () => {
		expect(scanned.length).toBeGreaterThan(20);
		expect(scanned.map((f) => f.rel)).toContain(join("src", "test-utils", "buildArtifactGate.test.ts"));
	});

	it("build 산출물을 참조하는 테스트 파일은 전부 공통 헬퍼를 경유한다", () => {
		const referencing = scanned.filter((f) => RE_BUILD_DIR_EXPR.test(f.text));
		expect(referencing.length).toBeGreaterThanOrEqual(6);
		const bypassing = referencing.filter((f) => !RE_HELPER_IMPORT.test(f.text)).map((f) => f.rel);
		expect(
			bypassing,
			`build 산출물을 재면서 3 상태 판정을 우회하는 픽스처가 있다 — 그 게이트는 stale 을 변형으로 보고한다:\n${bypassing
				.map((b) => `  ${b}`)
				.join("\n")}`,
		).toHaveLength(0);
	});

	it("src/__tests__ 안에서는 두 집합이 정확히 일치한다 (헬퍼 import ↔ build 참조)", () => {
		const inTests = scanned.filter((f) => f.rel.startsWith(join("src", "__tests__")));
		const referencing = inTests.filter((f) => RE_BUILD_DIR_EXPR.test(f.text)).map((f) => f.rel).sort();
		const importing = inTests.filter((f) => RE_HELPER_IMPORT.test(f.text)).map((f) => f.rel).sort();
		expect(importing).toEqual(referencing);
		expect(referencing).toHaveLength(6);
	});

	it("상수명 기반 규칙은 경로 표현 규칙의 부분집합이다 — 좁은 규칙에 집합 도출을 맡기지 않는다", () => {
		const broad = scanned.filter((f) => RE_BUILD_DIR_EXPR.test(f.text)).map((f) => f.rel);
		const narrow = scanned.filter((f) => RE_CONSTANT_NAMED_RULE.test(f.text)).map((f) => f.rel);
		const leaked = narrow.filter((rel) => !broad.includes(rel));
		expect(leaked, `상수명 규칙만 잡는 파일 — 경로 표현 규칙의 사각지대:\n  ${leaked.join("\n  ")}`).toHaveLength(0);
	});

	it("표기 변형 내성: 상수명·공백이 달라도 build 경로 표현을 잡는다", () => {
		// 완전 토큰을 런타임 조립한다 — 본 파일이 자기 스캔에 오탐되지 않도록.
		const Q = String.fromCharCode(34);
		const CALL = "join(";
		const variants: ReadonlyArray<{ label: string; text: string; broad: boolean; narrow: boolean }> = [
			{ label: "현행 표기 (REPO_ROOT)", text: `${CALL}REPO_ROOT, ${Q}build${Q})`, broad: true, narrow: true },
			// 실코드 변형 — viewport 픽스처는 `BUILD_DIR` 이라는 다른 상수명을 쓴다.
			// 그 파일이 좁은 규칙에 걸리는 것은 상수 선언 우변이 우연히 현행 표기와
			// 같아서일 뿐, 상수명 덕이 아니다.
			{ label: "상수명 변형 (ROOT_DIR)", text: `${CALL}ROOT_DIR, ${Q}build${Q})`, broad: true, narrow: false },
			{ label: "공백 다중", text: `${CALL}  REPO_ROOT ,  ${Q}build${Q} )`, broad: true, narrow: false },
			{ label: "single quote", text: `${CALL}root, 'build')`, broad: true, narrow: false },
			{ label: "세그먼트 동반", text: `${CALL}root, ${Q}build${Q}, ${Q}index.html${Q})`, broad: true, narrow: false },
			{ label: "다른 디렉터리", text: `${CALL}root, ${Q}coverage${Q})`, broad: false, narrow: false },
			{ label: "산문 속 언급", text: `// build/index.html 을 본다`, broad: false, narrow: false },
		];
		for (const v of variants) {
			expect(RE_BUILD_DIR_EXPR.test(v.text), `broad 규칙 오판: ${v.label}`).toBe(v.broad);
			expect(RE_CONSTANT_NAMED_RULE.test(v.text), `narrow 규칙 오판: ${v.label}`).toBe(v.narrow);
		}
	});

	// 두 번째 도출 채널 — vite `outDir` 설정에서 산출물 경로를 파생하는 픽스처.
	// `join(<ident>, "build")` 표현이 없어 경로 표현 규칙에도, spec 의 `PATH_BUILD`
	// 규칙에도 걸리지 않는다. 본 task 의 대상 집합(6 파일) 밖이라 헬퍼로 옮기지
	// 않았고, 대신 원장에 등재해 **새로운** 유입을 검출한다.
	const OUTDIR_CHANNEL_LEDGER = [join("src", "__tests__", "build-policy-and-vitest-config-coherence.test.ts")];

	it("outDir 설정에서 산출물 경로를 파생하는 픽스처는 원장 등재분 뿐이다 (두 번째 채널의 새 유입 검출)", () => {
		const derived = scanned
			.filter((f) => /outDir/.test(f.text) && /existsSync\(/.test(f.text))
			.map((f) => f.rel);
		const importing = scanned.filter((f) => RE_HELPER_IMPORT.test(f.text)).map((f) => f.rel);
		const unknown = derived.filter((r) => !OUTDIR_CHANNEL_LEDGER.includes(r) && !importing.includes(r));
		expect(
			unknown,
			`설정 파생 경로로 build 산출물을 재는 픽스처가 새로 생겼다 — 3 상태 판정 밖이다:\n  ${unknown.join("\n  ")}`,
		).toHaveLength(0);
		// 원장이 실재를 가리키는지 — 유령 항목은 검출력을 조용히 갉는다.
		for (const rel of OUTDIR_CHANNEL_LEDGER) {
			expect(derived, `원장 항목이 실재하지 않는다: ${rel}`).toContain(rel);
		}
	});

	it("자명 단언 관용구가 스캔 대상에서 0 이다 (FR-04 의 vitest 측 미러)", () => {
		const idiom = `expect(true).${"toBe"}(true)`;
		const hits = scanned.filter((f) => f.text.includes(idiom)).map((f) => f.rel);
		expect(hits, `미측정을 자명 단언으로 대체한 지점이 남아 있다:\n  ${hits.join("\n  ")}`).toHaveLength(0);
	});
});
