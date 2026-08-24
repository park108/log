// build 산출물 게이트의 측정 계약 헬퍼 — 미빌드 / stale / 동시대 3 상태 판정.
//
// spec: foundation/build-artifact-gate-measurement-contract.md §동작 C-2~C-5
//       (전체 경로 literal 미박제 — 아래 "spec 경로" 절)
// req : REQ-20260824-003 (FR-02 / FR-03 / FR-04)
// task: TSK-20260824-08-a
//
// ── 왜 헬퍼인가 ──────────────────────────────────────────────────────────────
// `build/**` 를 재는 픽스처는 산출물이 없을 때 측정을 건너뛴다. 그 건너뜀이
// 6 파일에 서로를 선례로 인용하며 복제됐고 (`... 의 skip 규약` 주석), 복제된
// 관용구는 셋 다 병리를 갖고 있었다.
//
//   (1) 술어 입도 — 디렉터리 존재를 빌드 완료로 읽으면 `build/` 만 남은 부분
//       산출 상태에서 skip 이 아니라 FAIL 한다. 미측정을 위반으로 보고한다.
//   (2) stale ↔ 변형 혼동 — 원본을 고치고 재빌드하기 전 창(`build/` 가
//       gitignored 인 이상 로컬에서 일상적)에서 산출물은 그냥 낡은 것인데,
//       mtime 입력이 없는 게이트는 "빌드가 변형·소실시켰다" 고 보고한다.
//       원인 지목이 틀리면 조사 방향이 통째로 어긋난다.
//   (3) 미측정의 은폐 — `true` 를 `true` 와 비교하고 return 하는 자명 단언은
//       러너에게 통과한 단언이다. 실행 출력에서 "쟀고 통과했다" 와 구별되지 않는다.
//
// 셋을 한 곳에서 판정하고 한 곳에서 보고 문구를 낸다.
//
// ── 3 상태 ───────────────────────────────────────────────────────────────────
//   unbuilt : 산출물(또는 그 디렉터리) 부재.        위반 아님 · 미측정 (skip).
//   stale   : 원본이 산출물보다 최신.                위반 아님 · 재빌드 필요 (skip).
//   current : 원본과 산출물이 동시대.                측정 가능 — 내용 상이 = 위반.
//
// 위반(변형) 판정은 `current` 에서만 나온다. 그래서 `current` 만이
// `mtimeMs` 근거 문자열(`mtimeEvidence`)을 갖고, 호출부는 그 문자열을 위반
// 메시지에 실어 "이건 stale 이 아니다" 를 실패 출력에 함께 남긴다.
//
// ── read-only (C-5) ──────────────────────────────────────────────────────────
// 본 헬퍼는 existsSync / statSync 만 쓴다. 어떤 파일도 쓰지 않고 빌드를
// 유발하지도 않는다 (산출물 존재 시점의 실행 보장은 CI 경로의 몫이다).
//
// ── spec 경로 literal 을 적지 않는 이유 ──────────────────────────────────────
// scripts/check-spec-coherence.sh G2 는 src/** 에서 추출한 spec 경로의 디스크
// 실재를 강제한다. 본 spec 은 아직 green 큐에 있어 blue 경로는 지금 MISSING 이고
// green 경로는 승격되는 순간 MISSING 이 된다. 어느 쪽도 시한폭탄이라 slug 로만
// 식별한다 (선례: html-lang-locale-declaration.test.ts 헤더).

import { existsSync, statSync } from "node:fs";
import { relative } from "node:path";

/** 산출물 게이트의 3 상태. */
export type BuildArtifactState = "unbuilt" | "stale" | "current";

export interface BuildArtifactGateInput {
	/**
	 * 게이트가 실제로 읽는 산출물 경로. 디렉터리 열거가 필요한 게이트는
	 * 디렉터리 경로와 대상 파일 경로를 **함께** 넣는다 (C-2 — 디렉터리 존재만으로
	 * 빌드 완료를 단정하지 않는다).
	 */
	readonly artifacts: readonly string[];
	/** 산출물의 비교 대상이 되는 원본 경로 (stale 판정 입력). */
	readonly sources: readonly string[];
}

export interface BuildArtifactProbe {
	readonly state: BuildArtifactState;
	/** 미측정 사유 1 행. `current` 이면 빈 문자열. */
	readonly reason: string;
	/**
	 * 동시대성 근거 (`current` 에서만 비어 있지 않다). 위반 메시지에 동반해
	 * stale 오귀속을 차단한다.
	 */
	readonly mtimeEvidence: string;
	/** 부재한 산출물 (상대 경로). */
	readonly missing: readonly string[];
	/** 최신 원본보다 낡은 산출물 (상대 경로). */
	readonly staleArtifacts: readonly string[];
}

/** 측정 가능(동시대) 로 판정된 probe. */
export interface CurrentBuildArtifactProbe extends BuildArtifactProbe {
	readonly state: "current";
}

/**
 * `ctx.skip(note)` 만 요구하는 최소 구조 타입. vitest `TestContext` 가 그대로
 * 대입되며, 단위 테스트는 가짜 ctx 로 skip 경로를 검사할 수 있다.
 */
export interface BuildArtifactGateContext {
	readonly skip: (note?: string) => never;
}

/** 로그·메시지용 상대 경로 (실행 위치 무관하게 짧게). */
function rel(p: string): string {
	const r = relative(process.cwd(), p);
	return r === "" ? p : r;
}

interface Stamp {
	readonly path: string;
	readonly mtimeMs: number;
}

function newest(stamps: readonly Stamp[]): Stamp | null {
	let top: Stamp | null = null;
	for (const s of stamps) {
		if (top === null || s.mtimeMs > top.mtimeMs) top = s;
	}
	return top;
}

function stamp(paths: readonly string[]): Stamp[] {
	return paths.map((p) => ({ path: p, mtimeMs: statSync(p).mtimeMs }));
}

/**
 * 3 상태를 판정한다 (순수 함수 — 부수효과 없음).
 *
 * 판정 순서가 곧 의미다: 부재가 stale 을 가리고, stale 이 변형을 가린다.
 * 낡은 산출물의 내용 차이는 "빌드가 변형했다" 의 근거가 될 수 없기 때문이다.
 */
export function probeBuildArtifacts(input: BuildArtifactGateInput): BuildArtifactProbe {
	const { artifacts, sources } = input;
	if (artifacts.length === 0) {
		throw new Error("probeBuildArtifacts: artifacts 가 비었다 — 측정 대상 없는 게이트는 공허하다.");
	}
	if (sources.length === 0) {
		throw new Error("probeBuildArtifacts: sources 가 비었다 — stale 판정 입력 없이는 3 상태를 가를 수 없다.");
	}

	const missing = artifacts.filter((p) => !existsSync(p)).map(rel);
	if (missing.length > 0) {
		return {
			state: "unbuilt",
			reason: `미측정 (미빌드) — 산출물 부재: ${missing.join(", ")}. 위반 아님 — \`npm run build\` 후에만 측정된다.`,
			mtimeEvidence: "",
			missing,
			staleArtifacts: [],
		};
	}

	// 원본 부재는 미측정이 아니라 게이트 오구성이다. 조용히 넘기지 않는다.
	const missingSources = sources.filter((p) => !existsSync(p)).map(rel);
	if (missingSources.length > 0) {
		throw new Error(`probeBuildArtifacts: 원본 부재 — ${missingSources.join(", ")} (게이트 구성 오류).`);
	}

	const sourceStamps = stamp(sources);
	const artifactStamps = stamp(artifacts);
	const newestSource = newest(sourceStamps) as Stamp;

	const staleArtifacts = artifactStamps
		.filter((a) => a.mtimeMs < newestSource.mtimeMs)
		.map((a) => `${rel(a.path)} (mtimeMs=${a.mtimeMs})`);
	if (staleArtifacts.length > 0) {
		return {
			state: "stale",
			reason:
				`미측정 (stale — 재빌드 필요) — 원본 ${rel(newestSource.path)} (mtimeMs=${newestSource.mtimeMs}) 이 ` +
				`산출물보다 최신이다: ${staleArtifacts.join(", ")}. 위반 아님 — 산출물이 낡았을 뿐이므로 ` +
				"`npm run build` 후 다시 측정한다.",
			mtimeEvidence: "",
			missing: [],
			staleArtifacts,
		};
	}

	const oldestArtifact = artifactStamps.reduce((lo, a) => (a.mtimeMs < lo.mtimeMs ? a : lo), artifactStamps[0] as Stamp);
	return {
		state: "current",
		reason: "",
		mtimeEvidence:
			`[동시대 근거 — stale 아님: 최신 원본 ${rel(newestSource.path)} mtimeMs=${newestSource.mtimeMs} ` +
			`≤ 최고(最古) 산출물 ${rel(oldestArtifact.path)} mtimeMs=${oldestArtifact.mtimeMs}]`,
		missing: [],
		staleArtifacts: [],
	};
}

/**
 * 픽스처용 진입점. 측정 가능하면 probe 를 돌려주고, 아니면 러너의 skip 경로로
 * 빠진다 — 미측정은 자명 단언(`true` 대 `true` 비교) 이 아니라 skip 으로
 * 계수돼야 실행 출력에서 측정과 구별된다 (C-4).
 *
 * `stale` 은 사유를 stdout 에도 남긴다. 미빌드는 CI 의 정상 상태(산출물이
 * 아직 없다)라 skip 계수로 충분하지만, stale 은 로컬에서만 생기는 이상 상태이며
 * 행동(재빌드)을 요구하므로 기본 리포터에서도 보여야 한다.
 */
export function measureBuildArtifacts(
	ctx: BuildArtifactGateContext,
	input: BuildArtifactGateInput,
): CurrentBuildArtifactProbe {
	const probe = probeBuildArtifacts(input);
	if (probe.state === "current") return probe as CurrentBuildArtifactProbe;
	if (probe.state === "stale") console.info(`[build-artifact-gate] ${probe.reason}`);
	return ctx.skip(probe.reason);
}
