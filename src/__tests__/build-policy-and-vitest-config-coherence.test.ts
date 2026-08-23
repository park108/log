import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// 본 fixture 는 그동안 자동 발화 채널이 없던 4 spec 의 게이트를 함께 박제한다.
// 네 축 모두 `vite.config.js` 정책 토큰 ↔ 디스크/산출물 실재의 양면 정합이며,
// 측정 표면이 겹쳐(같은 config + 같은 build outDir) 파일을 나눌 실익이 없다.
//
// spec: specs/30.spec/blue/foundation/prod-bundle-dev-only-code-residue-zero.md
//       specs/30.spec/blue/foundation/vite-build-sourcemap-disabled-bundle-residue-zero.md
//       specs/30.spec/blue/foundation/vitest-setupfiles-token-disk-coherence.md
//       specs/30.spec/blue/foundation/vitest-coverage-exclude-pattern-vacuous-zero-axis.md

const ROOT = resolve(__dirname, "..", "..");
const VITE_CONFIG = readFileSync(join(ROOT, "vite.config.js"), "utf8");
const OUT_DIR = /outDir:\s*'([^']+)'/.exec(VITE_CONFIG)?.[1] ?? "build";
const BUILD = join(ROOT, OUT_DIR);
const ASSETS = join(BUILD, "assets");

// build artifact 측정은 `npm run build` 산출물에 의존한다. 산출물이 없으면
// 통과시키는 대신 건너뛴다 — 없는 것을 0 hit 으로 읽으면 vacuous PASS 가 된다.
const hasBuild = (): boolean => existsSync(ASSETS);

const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap(entry => {
		const full = join(dir, entry);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});

const srcFiles = (): string[] => walk(join(ROOT, "src"));

// glob 중 본 spec 들이 쓰는 형태만 해석한다 — `**`, `*`, `{a,b}`.
const globToRegExp = (glob: string): RegExp => {
	const body = glob
		.replace(/[.+^$()|[\]\\]/g, "\\$&")
		.replace(/\{([^}]+)\}/g, (_m, alts: string) => `(${alts.split(",").join("|")})`)
		// `**/` 를 자리표시자로 먼저 빼둔다 — 뒤의 `*` 치환이 삼키지 않게.
		.replace(/\*\*\//g, "\u0000")
		.replace(/\*/g, "[^/]*")
		.replace(/\u0000/g, "(?:.*/)?");
	return new RegExp(`^${body}$`);
};

describe("build 정책 · vitest 설정 ↔ 실재 정합", () => {

	describe("prod bundle dev-only 잔여 0", () => {

		// dev-only 진입점은 isDev() 가드 안에서만 쓰이므로 production 에서
		// import.meta.env.DEV 가 false literal 로 치환되며 tree-shake 된다.
		const CATALOG = ["ReactQueryDevtools"] as const;

		it("catalog 식별자가 src/** 에 실제로 발화한다 (vacuous 방지)", () => {
			const sources = srcFiles().filter(f => /\.(js|jsx|ts|tsx)$/.test(f));
			for (const id of CATALOG) {
				const hits = sources.filter(f => readFileSync(f, "utf8").includes(id));
				expect(hits.length, `${id} 발화 0 — catalog baseline 갱신 신호`).toBeGreaterThan(0);
			}
		});

		it.skipIf(!hasBuild())("production 산출물에 catalog 식별자가 남지 않는다", () => {
			const bundles = walk(ASSETS).filter(f => f.endsWith(".js"));
			expect(bundles.length).toBeGreaterThan(0);

			for (const id of CATALOG) {
				const residue = bundles.filter(f => readFileSync(f, "utf8").includes(id));
				expect(residue, `${id} DCE 실패 — 산출물 잔존`).toEqual([]);
			}
		});
	});

	describe("sourcemap 비활성 정책", () => {

		it("vite.config.js 가 build.sourcemap 을 명시적으로 false 로 선언한다", () => {
			// 키를 지우고 기본값에 기대면 Vite 메이저 bump 때 조용히 뒤집힌다.
			expect(/build:\s*\{[^}]*sourcemap:\s*false/s.test(VITE_CONFIG)).toBe(true);
		});

		it.skipIf(!hasBuild())("산출물에 .map 파일이 없다", () => {
			expect(walk(BUILD).filter(f => f.endsWith(".map"))).toEqual([]);
		});

		it.skipIf(!hasBuild())("산출물에 sourceMappingURL 주석이 없다", () => {
			// 외부 .map 이 없어도 인라인 base64 형태로 새어나갈 수 있다.
			const leaked = walk(ASSETS)
				.filter(f => /\.(js|css)$/.test(f))
				.filter(f => readFileSync(f, "utf8").includes("sourceMappingURL"));

			expect(leaked).toEqual([]);
		});
	});

	describe("vitest setupFiles 토큰 ↔ 디스크 정합", () => {

		const token = (): string => {
			const m = /setupFiles:\s*'([^']+)'/.exec(VITE_CONFIG);
			expect(m, "setupFiles 토큰 미발견 — 단일 string baseline 변동 신호").not.toBeNull();
			return (m as RegExpExecArray)[1] as string;
		};

		it("setupFiles 토큰이 가리키는 파일이 디스크에 실재한다", () => {
			expect(existsSync(join(ROOT, token()))).toBe(true);
		});

		it("setup 파일이 env stub cleanup 을 전역 등록한다", () => {
			// 파일이 존재해도 본문이 비면 boot 는 통과하고 env stub 이
			// 테스트 사이로 새는 silent regression 이 된다.
			const body = readFileSync(join(ROOT, token()), "utf8");

			// 콜백 본문 한정 패턴 — `[^)]*` 는 화살표 함수의 `()` 에서 끊기고,
			// `[\s\S]*?` 는 블록 경계를 넘어 인접 등록까지 매치한다 (RULE-06 §정밀 패턴).
			const registered = /afterEach\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[^{}]*unstubAllEnvs/;
			expect(registered.test(body)).toBe(true);
		});
	});

	describe("coverage exclude 패턴 vacuous-zero 부재", () => {

		const patterns = (): string[] => {
			const block = /coverage:\s*\{[\s\S]*?exclude:\s*\[([\s\S]*?)\]/.exec(VITE_CONFIG)?.[1] ?? "";
			return [...block.matchAll(/'([^']+)'/g)].map(m => m[1] as string);
		};

		it("exclude 배열이 5 패턴을 박제한다", () => {
			expect(patterns()).toHaveLength(5);
		});

		it("각 패턴이 src/** 에서 1건 이상 매치한다 (선언↔실재 격차 0)", () => {
			const rels = srcFiles().map(f => f.slice(ROOT.length + 1));
			const vacuous = patterns().filter(p => !rels.some(r => globToRegExp(p).test(r)));

			expect(vacuous, "매치 0 인 패턴 — coverage 제외 선언이 실재와 어긋남").toEqual([]);
		});
	});
});
