import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// spec: specs/30.spec/blue/testing/react-query-test-queryclient-default-options-single-source-coherence.md
//       §수용 기준 FR-01 / FR-05 / FR-07 / FR-09
//
// 테스트 채널의 QueryClient 기본 옵션은 단일 출처(src/test-utils/queryWrapper.tsx)를
// 갖는다. 개별 테스트가 QueryClient 를 직접 생성하면 retry/staleTime/gcTime 이
// 파일마다 갈라져, 한 곳의 목 실패가 이웃 단언으로 새거나 캐시가 테스트 간에
// 남는 형태의 회귀가 조용히 들어온다.
//
// 자체 진단 제외 (§spec NFR-04): 게이트 scope 는 src/**/*.test.* 로 한정하며
// src/__tests__/*.ts (도구 매트릭스 fixture) 는 직교 — 본 fixture 자신이 scope 밖이다.

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const HELPER = join("src", "test-utils", "queryWrapper.tsx");

// FR-07 — 면제 박제 목록. 비어 있으면 FR-01 상한 = 0.
const EXEMPTIONS: readonly string[] = [];

const TEST_FILE = /\.test\.(js|jsx|ts|tsx)$/;

const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap(entry => {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) return walk(full);
		return [full];
	});

const testFiles = (): string[] =>
	walk(SRC)
		.filter(f => TEST_FILE.test(f))
		// FR-09 — src/__tests__/** 는 도구 매트릭스 축이라 본 효능 scope 밖.
		.filter(f => !relative(SRC, f).startsWith("__tests__"))
		.map(f => relative(ROOT, f));

// 행 선두 주석(`//` · `*` · `/*`)은 금지 토큰을 *언급*할 뿐 실행되지 않는다.
// 파일 전문 정규식은 그 산문까지 위반으로 계수하므로 행 단위로 판정한다
// (RULE-06 §정밀 패턴 권고 — 제외는 행 선두 한정이라 본문 호출은 그대로 걸린다).
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;
const INSTANTIATION = /new\s+QueryClient\s*\(/;

const hasDirectInstantiation = (source: string): boolean =>
	source
		.split("\n")
		.some(line => !COMMENT_LINE.test(line) && INSTANTIATION.test(line));

const directInstantiations = (): string[] =>
	testFiles().filter(f => hasDirectInstantiation(readFileSync(join(ROOT, f), "utf8")));

describe("react-query 테스트 채널 QueryClient 단일 출처", () => {

	describe("(FR-01/FR-05) 직접 생성 0", () => {

		it("테스트 파일이 QueryClient 를 직접 생성하지 않는다", () => {
			expect(directInstantiations()).toEqual([...EXEMPTIONS]);
		});

		it("스캔 대상 테스트 파일이 실제로 존재한다 (vacuous PASS 방지)", () => {
			// 스캔이 0 파일을 훑고 통과하면 게이트는 아무것도 보장하지 않는다.
			expect(testFiles().length).toBeGreaterThan(20);
		});
	});

	describe("(FR-07) 면제 박제", () => {

		it("면제 목록이 비어 있어 FR-01 상한이 0 이다", () => {
			expect(EXEMPTIONS).toHaveLength(0);
		});
	});

	describe("단일 출처 헬퍼", () => {

		it("queryWrapper 가 QueryClient 생성의 유일한 지점이다", () => {
			const helper = readFileSync(join(ROOT, HELPER), "utf8");
			expect(/new\s+QueryClient\s*\(/.test(helper)).toBe(true);
		});

		it("헬퍼가 테스트 격리에 필요한 기본 옵션을 박제한다", () => {
			const helper = readFileSync(join(ROOT, HELPER), "utf8");

			// 값 자체가 계약 — retry 가 켜지면 목 실패가 재시도로 번지고,
			// staleTime/gcTime 이 0 이 아니면 캐시가 테스트 사이에 남는다.
			expect(helper).toMatch(/queries:\s*\{[^}]*retry:\s*false/);
			expect(helper).toMatch(/queries:\s*\{[^}]*staleTime:\s*0/);
			expect(helper).toMatch(/queries:\s*\{[^}]*gcTime:\s*0/);
			expect(helper).toMatch(/mutations:\s*\{[^}]*retry:\s*false/);
		});

		it("호출마다 새 QueryClient 를 만들어 캐시 누수를 막는다", () => {
			const helper = readFileSync(join(ROOT, HELPER), "utf8");

			// 모듈 스코프에 단일 인스턴스를 두면 파일 간 캐시가 공유된다.
			const inFactory = /createQueryTestWrapper\s*=\s*\([^)]*\)[^{]*\{[\s\S]*?new\s+QueryClient/;
			expect(inFactory.test(helper)).toBe(true);
		});
	});

	describe("(FR-09) 스코프 경계", () => {

		it("src/__tests__/** 는 scope 밖이다", () => {
			expect(testFiles().some(f => f.includes("__tests__"))).toBe(false);
		});
	});
});
