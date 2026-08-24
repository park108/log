// TSK-20260824-07-d / REQ-20260824-002 — post-unmount 외부 발화 audit 판정 채널.
//
// spec slug: testing/runtime-fetch-unmount-safety §공개 인터페이스 (M-A)(M-C)
//            + §동작 (I3)(I4)(I6) + §회귀 중점 R-1 · R-3.
//            (spec 경로 literal 미박제 — 아래 "spec 경로" 절 참조.)
//
// 선행 3 회복 task (07-a / 07-b / 07-c) 가 미가드 표면을 0 으로 만든 뒤, 그 0 을
// **고정(pinning)** 하는 채널이다. 회복 자체는 본 채널의 일이 아니다. 가드가
// 사라지거나 신규 컴포넌트가 가드 없이 들어와도 tsc / eslint / vite build 는
// 전부 통과한다 — 그 침묵을 깨는 것이 본 채널의 유일한 목적이다.
//
//   G-A 대상 집합 술어 산출 : 디렉터리 재귀 열거 + 술어. 파일명 하드코딩 0.
//   G-B 가드 보유          : 대상 전수에 unmount 가드 식별자 존재 (spec (M-A) 동치).
//   G-C race fixture 존재   : 대상마다 형제 테스트 + unmount() 왕복 존재.
//   G-D 관측 표면 정합      : fixture 가 **그 대상이 실제로 내는 발화 종류**를 관측한다.
//   G-E 술어 경계 고정      : 확장 표면과의 차집합이 정확히 "effect 미등록" 부류다.
//
// ── G-D 를 둔 이유 (관측 표면 비대칭) ────────────────────────────────────────
// React 18 의 `dispatchSetState` 는 unmount 된 fiber 에서 조용히 bail out 한다 —
// 경고도 콘솔 출력도 없다. 따라서 post-await 발화가 **state setter 뿐인** 표면에서는
// 콘솔 spy 단정이 항상 0 hit 이고, 가드를 제거해도 fixture 가 통과한다 (민감도 0).
// "unmount() 문자열이 있는 테스트가 존재하는가" 만 세면 그 공허한 fixture 를 실효
// 있는 것으로 오판한다. G-D 는 대상의 post-await 발화 종류를 정적으로 분류해
// **setter 전용 표면에는 setter 계수 관측기**를 요구한다.
//
// ── 본 채널이 측정하지 **않는** 것 (측정된 잔여 false-negative) ──────────────
// 아래 두 부류는 착수 시점 실측으로 위반이 실재하며, 그 회복은 본 task 의 scope
// 밖이다 (RULE-06 §expansion 불허). 채널을 그 범위까지 넓히면 첫 실행부터 red 로
// 고착되므로, 넓히지 않고 **경계를 G-E 로 고정 + 후속 이슈로 승계**한다.
//   (1) effect 미등록 async 핸들러 — 클릭·submit 핸들러의 `await` 이후 발화.
//       spec §역할·(M-A) 술어가 `useEffect` 등록 파일로 한정돼 있어 대상에서 빠진다.
//       G-E 가 "차집합 = effect 미등록" 을 고정해 열거 누락과 구별한다.
//   (2) fixture 관측 강도 — G-D 는 "발화 종류에 맞는 관측기 존재" 까지만 본다.
//       콘솔 spy 를 **필터링해** 특정 문구만 세는 형태(현 React 버전에서 도달 불가한
//       경고 문구 필터)는 통과한다. 무필터 0 단정까지 요구하면 선행 시대의 fixture
//       3건이 red 가 된다 (착수 시점 실측) — 그 정상화는 본 task scope 밖이다.
// 두 부류 모두 result.md 에 주입 왕복 출력으로 박제하고 followup 으로 넘겼다.
//
// ── 파일 목록을 상수로 두지 않는 이유 (RULE-06 §열거 고정 금지) ─────────────
// 선행 baseline 은 wrapper 3 파일을 열거해 측정했고, 실제 fetch 는 `lazy()` 로
// 분리된 구현 파일에 있었다. 열거는 어떤 코드 상태에서도 0 hit 을 냈다 — 민감도 0.
// 본 채널의 대상 집합은 전부 디렉터리 재귀 열거 + 술어 산출이며, G-A 가 "lazy 로
// 분리된 구현 파일이 대상에 들어 있고 wrapper 는 들어 있지 않다" 를 함께 고정한다.
//
// ── 자기 무효화 / 경로 제외 부재 ─────────────────────────────────────────────
// 프로덕션 스캔의 제외 규칙은 **spec 술어가 선언한 것뿐**이다 (`.test.` 파일 제외 —
// spec (M-A) 명령의 `grep -v "\.test\."` 동치, `.d.ts` 는 실행 코드 없음). 본 파일
// 경로를 겨냥한 예외는 두지 않으며, G-A 보조 단언이 raw 열거에 본 파일이 포함됨을
// 고정해 "제외 과잉" 이 없음을 보인다.
//
// ── spec 경로 literal 을 적지 않는 이유 ──────────────────────────────────────
// scripts/check-spec-coherence.sh G2 는 src/** 에서 추출한 spec 경로의 디스크 실재를
// 강제한다. 출처 spec 은 green 큐에 있고 승격되면 경로가 바뀐다 — 어느 쪽 경로를
// 적어도 시한폭탄이라 REQ id + slug 로만 식별한다.
//
// ── 발화 채널 (spec (M-C)) ───────────────────────────────────────────────────
// 본 파일은 `src/__tests__/**` 산하이므로 `npm test` 수집 경로에 자동 등재된다 —
// CI (.github/workflows/ci.yml `- name: Test`) 와 .husky/pre-push 두 지점에서
// 발화한다. package.json / ci.yml 무변경.
//
// 멱등성: read-only — readFileSync / readdirSync / statSync 만 사용한다.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative, dirname, basename } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC_DIR = join(REPO_ROOT, "src");
const REL_SELF = join("src", "__tests__", "post-unmount-emission-audit.test.ts");

// 스캔 확장자 — spec (M-A) 명령의 `--include` 는 jsx/tsx 지만, 프로덕션 컴포넌트가
// .js/.ts 로 작성되는 것을 막는 규칙은 없다. 넓게 잡고 완전성은 보조 단언이 본다.
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;
const RE_SCRIPT_LIKE_EXT = /\.[cm]?[jt]sx?$/;
const TEST_EXTENSIONS = [".test.tsx", ".test.jsx", ".test.ts", ".test.js"] as const;

// ── 술어 토큰 ────────────────────────────────────────────────────────────────
// spec (M-A) 의 `grep -q "await \|\.then("` 동치.
const RE_ASYNC_TOKEN = /await\s|\.then\s*\(/;
const RE_EFFECT_REGISTRATION = /useEffect\s*\(/;
// 컴포넌트성 판정 — 훅 호출이 있으면 마운트/언마운트 생명주기를 갖는다.
// **표기 변형 주의**: TS 는 `useState<boolean>(false)` 처럼 타입 인자를 끼워 넣는다.
// `use[A-Z]\w*\s*\(` 로 좁히면 그 표기의 파일이 통째로 확장 표면에서 빠지고,
// 차집합이 공허해져 G-E 가 "경계 없음" 을 보고한다 (실측된 false-negative).
const RE_HOOK_CALL = /\buse[A-Z]\w*\s*(?:<[^()]*>)?\s*\(/;
// spec (M-A) 가드 식별자 집합. 수단은 지정하지 않는다 (flag ref / AbortController / …).
const RE_GUARD_IDENTIFIER = /cancelled|AbortController|isMounted|signal/;

// 발화 분류 — 컴포넌트 경계를 넘는 호출.
const RE_CONSOLE_EMIT = /\blog\s*\(|\breportError\s*\(|\bconsole\.(?:log|error|warn|info)\s*\(/g;
const RE_SETTER_EMIT = /\bset[A-Z]\w*\s*\(/g;

// ── 테스트 측 관측 표면 토큰 ─────────────────────────────────────────────────
const RE_UNMOUNT_CALL = /\bunmount\s*\(\s*\)/;
// `const logSpy = vi.spyOn(console, 'log')` / `const s = vi.spyOn(errorReporter, 'reportError')`
const RE_SPY_BINDING = /(?:const|let)\s+(\w+)\s*=\s*vi\.spyOn\(\s*([\w.]+)\s*,\s*['"](\w+)['"]/g;
const CONSOLE_SPY_METHODS = new Set(["log", "error", "warn", "info", "reportError"]);
// setter 계수 관측기 — ESM namespace 는 non-configurable 이라 `vi.spyOn(React,'useState')`
// 가 불가하다. 모듈 mock 으로 useState 를 감싸는 형태만이 setter 호출을 셀 수 있다.
const RE_REACT_MODULE_MOCK = /vi\.mock\(\s*['"]react['"]/;
const RE_USE_STATE_WRAP = /useState/;
const RE_ZERO_COUNT_ASSERT = /expect\(\s*[\w.]+\s*\)\.toBe\(\s*0\s*\)|toHaveBeenCalledTimes\(\s*0\s*\)|not\.toHaveBeenCalled/;
// lazy 분리 구현 — `lazy(() => import('./X'))`
const RE_LAZY_IMPORT = /lazy\(\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g;

type ScanEntry = { abs: string; rel: string };

/** `grep -r` 동치 재귀 열거. 어떤 경로도 제외하지 않는다. */
function collectFiles(root: string): ScanEntry[] {
	const out: ScanEntry[] = [];
	const stack: string[] = [root];
	while (stack.length > 0) {
		const current = stack.pop();
		if (current === undefined) continue;
		for (const entry of readdirSync(current)) {
			const full = join(current, entry);
			const st = statSync(full);
			if (st.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (!st.isFile()) continue;
			out.push({ abs: full, rel: relative(REPO_ROOT, full) });
		}
	}
	return out;
}

function isProductionFile(rel: string): boolean {
	if (rel.includes(".test.")) return false; // spec (M-A) 의 `grep -v "\.test\."`
	if (rel.endsWith(".d.ts")) return false; // 타입 선언 — 실행 코드 0
	return SCAN_EXTENSIONS.some((ext) => rel.endsWith(ext));
}

export function productionFiles(): ScanEntry[] {
	return collectFiles(SRC_DIR).filter((f) => isProductionFile(f.rel));
}

/**
 * `await` / `.then(` 각 지점부터 **그 지점을 감싼 블록의 끝까지** 를 잘라낸다.
 * 중괄호 깊이 0 에서 만나는 첫 `}` 가 경계다 — 인접 블록으로 새지 않는다
 * (RULE-06 §블록 경계 false-positive). 문자열 literal 안의 중괄호는 구분하지
 * 않는 근사이며, 그 한계는 아래 analyzer 자가 검증이 고정한다.
 */
export function postAsyncRegions(source: string): string[] {
	const regions: string[] = [];
	const finder = new RegExp(RE_ASYNC_TOKEN.source, "g");
	let m: RegExpExecArray | null;
	while ((m = finder.exec(source)) !== null) {
		const start = m.index;
		let depth = 0;
		let end = source.length;
		for (let i = start; i < source.length; i++) {
			const c = source[i];
			if (c === "{") depth += 1;
			else if (c === "}") {
				if (depth === 0) {
					end = i;
					break;
				}
				depth -= 1;
			}
		}
		regions.push(source.slice(start, end));
	}
	return regions;
}

export type EmissionKinds = { consoleLike: number; setterLike: number };

/** post-await 구간에서 컴포넌트 밖으로 나가는 호출을 종류별로 계수한다. */
export function postAsyncEmissions(source: string): EmissionKinds {
	const joined = postAsyncRegions(source).join("\n");
	return {
		consoleLike: (joined.match(RE_CONSOLE_EMIT) ?? []).length,
		setterLike: (joined.match(RE_SETTER_EMIT) ?? []).length,
	};
}

type Target = {
	rel: string;
	source: string;
	emissions: EmissionKinds;
};

/** spec (M-A) 술어 — `useEffect` 등록 + 본문 `await` / `.then(`. */
export function specScopedTargets(files: ScanEntry[]): Target[] {
	const targets: Target[] = [];
	for (const f of files) {
		const source = readFileSync(f.abs, "utf8");
		if (!RE_EFFECT_REGISTRATION.test(source)) continue;
		if (!RE_ASYNC_TOKEN.test(source)) continue;
		targets.push({ rel: f.rel, source, emissions: postAsyncEmissions(source) });
	}
	return targets;
}

/**
 * 확장 표면 — effect 등록 여부를 묻지 않고 "훅을 쓰는 파일 중 post-await 발화가
 * 있는 것" 전수. 핸들러 경로(effect 미등록)까지 포함한다. G-E 의 비교 대상.
 */
export function widenedSurface(files: ScanEntry[]): Target[] {
	const out: Target[] = [];
	for (const f of files) {
		const source = readFileSync(f.abs, "utf8");
		if (!RE_HOOK_CALL.test(source)) continue;
		if (!RE_ASYNC_TOKEN.test(source)) continue;
		const emissions = postAsyncEmissions(source);
		if (emissions.consoleLike + emissions.setterLike === 0) continue;
		out.push({ rel: f.rel, source, emissions });
	}
	return out;
}

export function siblingTestPath(rel: string): string | null {
	const dir = dirname(rel);
	const base = basename(rel).replace(/\.[^.]+$/, "");
	for (const ext of TEST_EXTENSIONS) {
		const candidate = join(dir, base + ext);
		if (existsSync(join(REPO_ROOT, candidate))) return candidate;
	}
	return null;
}

export type Observations = { consoleSurface: boolean; setterSurface: boolean };

/** 테스트 소스가 어떤 발화 표면을 실제로 관측하는지 판정한다. */
export function fixtureObservations(testSource: string): Observations {
	const finder = new RegExp(RE_SPY_BINDING.source, "g");
	let m: RegExpExecArray | null;
	let consoleSurface = false;
	while ((m = finder.exec(testSource)) !== null) {
		const [, name, target, method] = m;
		if (name === undefined || target === undefined || method === undefined) continue;
		const emissionSpy = target === "console" || CONSOLE_SPY_METHODS.has(method);
		if (!emissionSpy) continue;
		// spy 를 바인딩만 하고 쓰지 않으면 관측이 아니다 — 단정 또는 호출 기록 소비를 요구한다.
		const used = new RegExp(`expect\\(\\s*${name}\\b|\\b${name}\\.mock\\.calls`).test(testSource);
		if (used) consoleSurface = true;
	}
	const setterSurface =
		RE_REACT_MODULE_MOCK.test(testSource) &&
		RE_USE_STATE_WRAP.test(testSource) &&
		RE_ZERO_COUNT_ASSERT.test(testSource);
	return { consoleSurface, setterSurface };
}

/** 대상의 발화 종류가 요구하는 관측 표면. */
export function requiredSurfaces(emissions: EmissionKinds): Array<"console" | "setter"> {
	// 콘솔류 발화가 있으면 콘솔 spy 가 비공허하다 (호출이 실제로 spy 에 도달한다).
	if (emissions.consoleLike > 0) return ["console"];
	// setter 뿐이면 콘솔에 흔적이 남지 않는다 — setter 계수 관측기를 요구한다.
	if (emissions.setterLike > 0) return ["setter"];
	return [];
}

function fmt(list: string[]): string {
	return list.map((l) => `  ${l}`).join("\n");
}

describe("post-unmount-emission-audit (TSK-20260824-07-d / REQ-20260824-002)", () => {
	it("G-A: 대상 집합이 디렉터리 열거 + 술어로 산출된다 (파일명 하드코딩 0)", () => {
		const files = productionFiles();
		const targets = specScopedTargets(files);

		expect(files.length, "프로덕션 열거가 비었다 — 게이트 공허 통과 위험").toBeGreaterThan(0);

		// 착수 시점 실측 11. 열거가 조용히 쪼그라들면(디렉터리 누락·확장자 드리프트)
		// 남은 대상만 검사하고 통과하는 사각지대가 생긴다.
		expect(
			targets.length,
			`술어 대상이 11 미만이다 — 열거가 축소됐다:\n${fmt(targets.map((t) => t.rel))}`,
		).toBeGreaterThanOrEqual(11);

		// (I4) wrapper 함정 고정 — fetch 를 하지 않는 wrapper 만 겨냥한 패턴은 어떤
		// 코드 상태에서도 0 을 낸다. 대상 집합은 `lazy()` 로 분리된 **구현 파일**을
		// 포함해야 하고, wrapper 자신은 (async 토큰이 없으므로) 대상이 아니어야 한다.
		const lazyImplRels = new Set<string>();
		const wrapperRels: string[] = [];
		for (const f of files) {
			const source = readFileSync(f.abs, "utf8");
			const finder = new RegExp(RE_LAZY_IMPORT.source, "g");
			let m: RegExpExecArray | null;
			let lazyCount = 0;
			while ((m = finder.exec(source)) !== null) {
				const spec = m[1];
				if (spec === undefined || !spec.startsWith(".")) continue;
				lazyCount += 1;
				const baseAbs = resolve(dirname(f.abs), spec);
				for (const ext of SCAN_EXTENSIONS) {
					const candidate = baseAbs + ext;
					if (existsSync(candidate)) {
						lazyImplRels.add(relative(REPO_ROOT, candidate));
						break;
					}
				}
			}
			if (lazyCount > 0 && !RE_ASYNC_TOKEN.test(source)) wrapperRels.push(f.rel);
		}

		const targetRels = new Set(targets.map((t) => t.rel));
		const lazyTargets = [...lazyImplRels].filter((r) => targetRels.has(r)).sort();
		expect(
			lazyTargets.length,
			"lazy 로 분리된 구현 파일이 대상 집합에 3건 미만이다 — 술어가 wrapper 만 보고 있을 수 있다",
		).toBeGreaterThanOrEqual(3);

		const wrappersInTargets = wrapperRels.filter((r) => targetRels.has(r));
		expect(
			wrappersInTargets,
			`async 토큰이 없는 wrapper 가 대상으로 계수됐다:\n${fmt(wrappersInTargets)}`,
		).toHaveLength(0);
		expect(
			wrapperRels.length,
			"lazy wrapper 가 1건도 없다 — wrapper/구현 분리 구조가 사라졌다면 본 단언의 전제를 재검토해야 한다",
		).toBeGreaterThanOrEqual(1);
	});

	it("G-A 보조: raw 열거에 본 채널 자신이 포함된다 + 스캔 확장자 완전성", () => {
		const raw = collectFiles(SRC_DIR).map((f) => f.rel);
		expect(raw, "raw 열거에서 본 파일이 빠졌다 — 경로 제외가 있다").toContain(REL_SELF);

		const uncovered = collectFiles(SRC_DIR)
			.filter((f) => RE_SCRIPT_LIKE_EXT.test(f.rel))
			.filter((f) => !SCAN_EXTENSIONS.some((ext) => f.rel.endsWith(ext)))
			.map((f) => f.rel);
		expect(
			uncovered,
			`스캔 확장자 집합 밖의 스크립트 파일이 있다 — 그 파일의 위반은 사각지대에 숨는다:\n${fmt(uncovered)}`,
		).toHaveLength(0);
	});

	it("G-B / R-1: 술어 대상 전수에 unmount 가드 식별자가 있다 (spec (M-A) 동치)", () => {
		const targets = specScopedTargets(productionFiles());
		const unguarded = targets.filter((t) => !RE_GUARD_IDENTIFIER.test(t.source)).map((t) => t.rel);
		expect(
			unguarded,
			`가드 없는 async effect 표면:\n${fmt(unguarded)}\n` +
				"await 이후 코드가 unmount 후에도 실행돼 setter · log · reportError 를 발화한다.",
		).toHaveLength(0);
	});

	it("G-C: 술어 대상마다 unmount 왕복 fixture 가 존재한다", () => {
		const targets = specScopedTargets(productionFiles());
		const missing: string[] = [];
		for (const t of targets) {
			const testRel = siblingTestPath(t.rel);
			if (testRel === null) {
				missing.push(`${t.rel} — 형제 테스트 파일 부재`);
				continue;
			}
			const testSource = readFileSync(join(REPO_ROOT, testRel), "utf8");
			if (!RE_UNMOUNT_CALL.test(testSource)) missing.push(`${t.rel} — ${testRel} 에 unmount() 왕복 부재`);
		}
		expect(missing, `race fixture 부재:\n${fmt(missing)}`).toHaveLength(0);
	});

	it("G-D / R-2: fixture 가 그 대상이 실제로 내는 발화 종류를 관측한다 (표면 비대칭 차단)", () => {
		const targets = specScopedTargets(productionFiles());
		const violations: string[] = [];
		let setterOnlyChecked = 0;

		for (const t of targets) {
			const need = requiredSurfaces(t.emissions);
			if (need.length === 0) continue;
			const testRel = siblingTestPath(t.rel);
			if (testRel === null) {
				violations.push(`${t.rel} — 형제 테스트 부재 (G-C 참조)`);
				continue;
			}
			const obs = fixtureObservations(readFileSync(join(REPO_ROOT, testRel), "utf8"));
			if (need.includes("setter")) {
				setterOnlyChecked += 1;
				if (!obs.setterSurface) {
					violations.push(
						`${t.rel} — post-await 발화가 setter 전용(console ${t.emissions.consoleLike} / setter ${t.emissions.setterLike})인데 ` +
							`${testRel} 에 setter 계수 관측기가 없다. 콘솔 spy 단정은 이 표면에서 공허하다.`,
					);
				}
			}
			if (need.includes("console") && !obs.consoleSurface) {
				violations.push(
					`${t.rel} — post-await 콘솔류 발화 ${t.emissions.consoleLike}건인데 ${testRel} 에 소비되는 발화 spy 가 없다.`,
				);
			}
		}

		expect(violations, `관측 표면 불일치:\n${fmt(violations)}`).toHaveLength(0);

		// 규칙이 살아 있는지 — setter 전용 표면이 0 이면 본 게이트는 그 축에서 공허하다.
		// 0 이 되는 것 자체는 위반이 아니므로 실패시키지 않고 분류만 고정한다.
		expect(setterOnlyChecked, "setter 전용 분류가 음수일 수 없다").toBeGreaterThanOrEqual(0);
	});

	it("G-E: 확장 표면과의 차집합이 정확히 'effect 미등록' 부류다 (열거 누락과 구별)", () => {
		const files = productionFiles();
		const targets = specScopedTargets(files);
		const widened = widenedSurface(files);
		const targetRels = new Set(targets.map((t) => t.rel));

		// (1) 발화가 있는 spec 대상은 확장 표면에도 반드시 든다 — 두 술어의 정합.
		const widenedRels = new Set(widened.map((t) => t.rel));
		const escaped = targets
			.filter((t) => t.emissions.consoleLike + t.emissions.setterLike > 0)
			.filter((t) => !widenedRels.has(t.rel))
			.map((t) => t.rel);
		expect(
			escaped,
			`spec 대상이 확장 표면 열거에서 샜다 — 두 술어 중 하나가 고장났다:\n${fmt(escaped)}`,
		).toHaveLength(0);

		// (2) 차집합의 모든 파일이 effect 미등록이어야 한다. 하나라도 effect 를
		//     등록하고 있다면 그것은 "spec 경계" 가 아니라 **G-A 열거 누락**이다.
		const outOfScope = widened.filter((t) => !targetRels.has(t.rel));
		const enumerationBugs = outOfScope
			.filter((t) => RE_EFFECT_REGISTRATION.test(t.source))
			.map((t) => t.rel);
		expect(
			enumerationBugs,
			`effect 를 등록하는데도 대상 집합에서 빠진 파일 — 열거 버그다:\n${fmt(enumerationBugs)}`,
		).toHaveLength(0);
	});

	it("analyzer 자가 검증: 표기 변형 · 블록 경계 · 발화 분류 (RULE-06 §fixture 대표성)", () => {
		// 블록 경계 — post-await 구간이 인접 블록으로 새지 않는다.
		const twoBlocks = [
			"const a = () => {",
			"\tconst r = await f();",
			"\tlog('inside');",
			"};",
			"const b = () => {",
			"\tlog('adjacent');",
			"};",
		].join("\n");
		const regions = postAsyncRegions(twoBlocks);
		expect(regions).toHaveLength(1);
		expect(regions[0]).toContain("inside");
		expect(regions[0], "인접 블록의 발화까지 삼켰다").not.toContain("adjacent");

		// 중첩 블록은 삼키지 않고 통과한다.
		const nested = "async () => {\n\tawait f();\n\tif (ok) {\n\t\tsetValue(1);\n\t}\n\tlog('after');\n}";
		const nestedEmissions = postAsyncEmissions(nested);
		expect(nestedEmissions.setterLike).toBe(1);
		expect(nestedEmissions.consoleLike).toBe(1);

		// 표기 변형 — 탭 들여쓰기 / 컬럼 위치 / then 체인 / 개행 배치.
		const variants = [
			"\t\t\tconst r = await f();\n\t\t\treportError(r);",
			"f().then((r) => {\n  setDone(true);\n})",
			"const r =\n\tawait f();\nconsole.error(r);",
		];
		for (const v of variants) {
			const e = postAsyncEmissions(v);
			expect(e.consoleLike + e.setterLike, `표기 변형에서 발화를 놓쳤다:\n${v}`).toBeGreaterThan(0);
		}

		// 훅 호출 표기 변형 — TS 타입 인자가 끼면 좁은 패턴이 통째로 놓친다.
		expect(RE_HOOK_CALL.test("const [v, setV] = useState<boolean>(false);"), "TS 타입 인자 표기의 훅 호출을 놓쳤다").toBe(true);
		expect(RE_HOOK_CALL.test("const [v, setV] = useState(false);")).toBe(true);
		expect(RE_HOOK_CALL.test("\tuseEffect(() => {}, []);")).toBe(true);
		expect(RE_HOOK_CALL.test("const useThing = 1;"), "훅 호출이 아닌 식별자를 훅으로 계수했다").toBe(false);

		// async 토큰이 없으면 구간도 발화도 0 (wrapper 부류).
		expect(postAsyncRegions("const W = lazy(() => import('./X'));\nexport default W;")).toHaveLength(0);

		// 발화 종류별 요구 표면.
		expect(requiredSurfaces({ consoleLike: 0, setterLike: 3 })).toEqual(["setter"]);
		expect(requiredSurfaces({ consoleLike: 2, setterLike: 3 })).toEqual(["console"]);
		expect(requiredSurfaces({ consoleLike: 0, setterLike: 0 })).toEqual([]);

		// 관측 표면 판정 — 바인딩만 하고 쓰지 않는 spy 는 관측이 아니다.
		const boundUnused = "const s = vi.spyOn(console, 'log');\nunmount();";
		expect(fixtureObservations(boundUnused).consoleSurface).toBe(false);
		const boundUsed = "const s = vi.spyOn(console, 'log');\nexpect(s).not.toHaveBeenCalled();";
		expect(fixtureObservations(boundUsed).consoleSurface).toBe(true);
		const filteredUse = "const s = vi.spyOn(console, 'error');\nconst c = s.mock.calls;\nexpect(c.length).toBe(0);";
		expect(fixtureObservations(filteredUse).consoleSurface).toBe(true);

		// setter 계수 관측기 — 모듈 mock 없이 콘솔 spy 만 있으면 setter 표면은 미관측.
		expect(fixtureObservations(boundUsed).setterSurface).toBe(false);
		const recorder = [
			"vi.mock('react', async (importOriginal) => {",
			"\tconst actual = await importOriginal();",
			"\tconst useState = (i) => actual.useState(i);",
			"\treturn { ...actual, useState };",
			"});",
			"expect(rec.calls).toBe(0);",
		].join("\n");
		expect(fixtureObservations(recorder).setterSurface).toBe(true);
	});
});
