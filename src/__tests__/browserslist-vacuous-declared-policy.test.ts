import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// spec: specs/30.spec/blue/foundation/package-json-browserslist-vacuous-declared-policy-axis.md
//       §동작 (I1)~(I8) + §수용 기준 FR-01~FR-05
//
// 선언된 정책 토큰은 실재 소비 채널을 동반해야 한다. 소비자 없이 남은 선언은
// 아무 산출물에도 영향을 주지 못하면서 정책이 살아 있는 것처럼 읽히는 silent
// policy island 가 된다.
//
// 자체 진단 제외 (§spec (I7)): 게이트 scope 는 package.json / vite.config.js /
// .browserslistrc 세 표면으로 한정한다. 본 fixture 본문의 문자열 occurrence 는
// 게이트 입력이 아니다.

const ROOT = process.cwd();

const readPackageJson = (): Record<string, unknown> =>
	JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as Record<string, unknown>;

// standard browserslist consumer — 설치되어 있으면 선언을 실제로 읽는 모듈들.
const CONSUMER_MODULES = [
	"@babel/preset-env",
	"autoprefixer",
	"postcss-preset-env",
	"eslint-plugin-compat",
] as const;

interface Surfaces {
	declaredInPackageJson: boolean;
	browserslistrcExists: boolean;
	consumerDeps: string[];
	viteReadsBrowserslist: boolean;
}

const countConsumerChannels = (s: Surfaces): number =>
	s.consumerDeps.length + (s.viteReadsBrowserslist ? 1 : 0);

// (I3) 선언이 있으면 소비 채널 합 >= 1 이어야 한다. 선언이 없으면 vacuous 자체가
// 성립하지 않으므로 무조건 PASS.
const isVacuousDeclaredPolicy = (s: Surfaces): boolean =>
	(s.declaredInPackageJson || s.browserslistrcExists) && countConsumerChannels(s) === 0;

const observe = (): Surfaces => {
	const pkg = readPackageJson();
	const devDeps = Object.keys((pkg["devDependencies"] ?? {}) as Record<string, unknown>);
	const deps = Object.keys((pkg["dependencies"] ?? {}) as Record<string, unknown>);
	const all = [...devDeps, ...deps];
	const viteConfig = readFileSync(join(ROOT, "vite.config.js"), "utf8");

	return {
		declaredInPackageJson: "browserslist" in pkg,
		browserslistrcExists: existsSync(join(ROOT, ".browserslistrc")),
		consumerDeps: CONSUMER_MODULES.filter(m => all.includes(m)),
		// Vite 는 build.target 을 명시적으로 browserslist 에서 파생시킬 때만 소비자다.
		// 기본 target 은 browserslist 를 참조하지 않는다.
		viteReadsBrowserslist: /browserslist/.test(viteConfig),
	};
};

describe("browserslist vacuous-declared-policy 부재", () => {

	describe("현 상태", () => {

		it("package.json 에 browserslist 정책 표면이 없다", () => {
			// 2021-03-01 CRA 초기화 커밋이 남긴 선언이었고, Vite 이관 후 어떤 채널도
			// 읽지 않았다. 제거 전후 build/** 산출물이 바이트 동일함을 실측했다.
			expect(observe().declaredInPackageJson).toBe(false);
		});

		it(".browserslistrc 외부화 파일도 없다", () => {
			expect(observe().browserslistrcExists).toBe(false);
		});

		it("vacuous-declared-policy 상태가 아니다", () => {
			expect(isVacuousDeclaredPolicy(observe())).toBe(false);
		});
	});

	describe("(I3) 재도입 조건", () => {

		const base: Surfaces = {
			declaredInPackageJson: false,
			browserslistrcExists: false,
			consumerDeps: [],
			viteReadsBrowserslist: false,
		};

		it("선언만 되살리고 소비자가 없으면 vacuous 로 검출된다", () => {
			expect(isVacuousDeclaredPolicy({ ...base, declaredInPackageJson: true })).toBe(true);
		});

		it(".browserslistrc 외부화만 도입해도 소비자가 없으면 vacuous 다", () => {
			expect(isVacuousDeclaredPolicy({ ...base, browserslistrcExists: true })).toBe(true);
		});

		it("devDeps consumer 를 동반하면 vacuous 가 아니다 (C-1)", () => {
			expect(isVacuousDeclaredPolicy({
				...base, declaredInPackageJson: true, consumerDeps: ["autoprefixer"],
			})).toBe(false);
		});

		it("Vite build.target 을 browserslist 에서 파생하면 vacuous 가 아니다 (C-2)", () => {
			expect(isVacuousDeclaredPolicy({
				...base, declaredInPackageJson: true, viteReadsBrowserslist: true,
			})).toBe(false);
		});

		it("선언이 없으면 소비자 0 이어도 위반이 아니다", () => {
			expect(isVacuousDeclaredPolicy(base)).toBe(false);
		});
	});

	describe("(I8) 브라우저 타깃 정책 단일 출처", () => {

		it("vite.config.js 가 build.target 을 명시하지 않아 Vite 기본 정책을 따른다", () => {
			const viteConfig = readFileSync(join(ROOT, "vite.config.js"), "utf8");
			expect(/^\s*target:/m.test(viteConfig)).toBe(false);
		});

		it("tsconfig target 은 별 toolchain 축이며 browserslist 와 직교한다", () => {
			const tsconfig = readFileSync(join(ROOT, "tsconfig.json"), "utf8");
			// JSONC — 주석 제거 후 파싱.
			const parsed = JSON.parse(tsconfig.replace(/\/\/.*$/gm, "")) as {
				compilerOptions: { target: string };
			};

			expect(parsed.compilerOptions.target).toBe("ES2020");
			expect(observe().declaredInPackageJson).toBe(false);
		});
	});
});
