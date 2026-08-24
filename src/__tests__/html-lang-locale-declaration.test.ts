// TSK-20260824-03 / REQ-20260518-025 — `<html lang>` 문서 로케일 선언 계약 발화 채널.
//
// spec: foundation/html-lang-locale-declaration-contract.md §동작 G-A~G-E
//       + §회귀 중점 R-1~R-5 (전체 경로 literal 미박제 — 아래 "spec 경로" 절).
//
// 본 fixture 는 spec 5 게이트를 vitest 결정론 채널(rc=0/1)로 박제한다. 부착
// 시점에 5 게이트는 이미 전수 rc=0 이므로 본 fixture 는 회복이 아니라
// **고정(pinning)** 이다 — 루트 요소의 로케일 선언이 사라지거나(R-1) 비거나(R-2)
// 형식이 무너져도(R-3) tsc / eslint / vitest / vite build 는 전부 통과한다.
// 그 침묵을 깨는 것이 본 채널의 유일한 목적이다.
//
//   G-A 선언 단일성      : index.html 의 lang 속성을 가진 <html> 시작 태그 === 1
//   G-B BCP 47 형식 적합 : 추출값이 ^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$ 를 만족
//   G-C 루트 요소 단일성 : index.html 의 <html> 시작 태그 자체 === 1
//   G-D 런타임 재정의 부재: src/** (.ts/.tsx/.js/.jsx) 전수 스캔 0 hit
//   G-E 산출물 보존      : build/index.html 존재 시 루트 선언이 원본과 동일 / 부재 시 skip
//
// ── 자체 진단 제외 (G-D 자기 무효화 회피 — 필수) ─────────────────────────────
// G-D 의 스캔 대상은 `src/**` 전수이고 본 fixture 자신이 그 안에 있다. 스캔
// 토큰을 소스에 literal 로 적으면 fixture 가 자기 자신을 hit 시켜 G-D 를 영구
// FAIL 로 만든다.
//
// 회피 수단으로 **경로 제외를 쓰지 않는다.** 자기 파일을 스캔에서 빼는 순간
// 그 제외 규칙이 과해질 여지(다른 파일의 위반까지 삼킴)가 생기고, 제외의
// 적정성을 검증할 수단이 남지 않는다. 대신 토큰을 **런타임 조립**한다 — 본
// fixture 는 어떤 파일도 스캔에서 빼지 않으며 자기 자신도 다른 파일과 완전히
// 동일하게 측정된다. 소스 텍스트에 완전 토큰 literal 이 부재해 hit 이 0 일 뿐이다.
// 선례: root-config-spec-reference-coherence.test.ts 의 FRAG_* 결합 패턴.
//
// ── spec 경로 literal 을 적지 않는 이유 ──────────────────────────────────────
// scripts/check-spec-coherence.sh G2 는 src/** 에서 추출한 spec 경로의 디스크
// 실재를 강제한다. 본 spec 은 아직 green 큐에 있으므로 blue 경로를 적으면 지금
// MISSING 이고, green 경로를 적으면 승격되는 순간 MISSING 이 된다. 어느 쪽도
// 시한폭탄이라 slug 로만 식별한다.
//
// ── 발화 채널 ────────────────────────────────────────────────────────────────
// 본 파일은 `src/__tests__/**` 산하이므로 `npm test` 수집 경로에 자동 등재된다
// — CI (.github/workflows/ci.yml `- name: Test`) 와 .husky/pre-push 두 지점에서
// 발화한다. 신규 채널 등록 표면 0 (package.json / ci.yml 무변경).
//
// 멱등성: read-only — readFileSync / existsSync / readdirSync / statSync 만 사용한다.
// 어떤 production 파일도 수정하지 않으며 `npm run build` 를 강제하지 않는다.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계
// (선례 csp-meta-build-artifact-preservation / mount-id-token-coherence 동형).
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_BUILD_INDEX_HTML = join(REPO_ROOT, "build", "index.html");
const SRC_DIR = join(REPO_ROOT, "src");
const REL_SELF = join("src", "__tests__", "html-lang-locale-declaration.test.ts");

// ── grep 동치 공백류 ─────────────────────────────────────────────────────────
// spec 명령은 `[[:space:]]` 를 쓰지만 grep 은 라인 단위로 매칭하므로 클래스 안의
// 개행은 도달 불가다. JS 정규식은 파일 전체를 한 문자열로 보기 때문에 `\s` 를
// 그대로 쓰면 grep 보다 넓게 매치한다 (`<html\n  lang="en">` 를 grep 은 못 잡고
// JS 는 잡는다). 개행을 뺀 공백류로 좁혀 두 표면의 판정을 일치시킨다.
const WS = "[^\\S\\r\\n]";

// G-A / G-E — lang 속성을 가진 루트 시작 태그. 값이 비면 `[^"]+` 가 미매치라
// count 가 0 으로 떨어진다 (R-2 공백화의 직접 검출 지점).
const RE_ROOT_WITH_LANG = new RegExp(`<html${WS}+lang="[^"]+"`, "g");
const RE_ROOT_LANG_CAPTURE = new RegExp(`<html${WS}+lang="([^"]+)"`);

// G-C — lang 유무와 무관한 루트 시작 태그. `</html>` 은 `<` 다음이 `/` 라 미매치.
const RE_ROOT_TAG = new RegExp(`<html(?:${WS}|>)`, "g");

// G-B — RFC 5646 primary-subtag 문법 (spec §동작 2 명령의 grep -E 패턴 그대로).
const RE_BCP47 = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// ── G-D 스캔 토큰 (런타임 조립) ──────────────────────────────────────────────
// spec G-D 명령은 `grep -rn 'documentEl<X>ent.lang'` 형태의 BRE 이며 `.` 는
// 이스케이프되지 않은 **임의 1 문자** 다. 아래 RegExp 도 동일하게 `.` 를
// 와일드카드로 둬 shell 게이트와 판정을 일치시킨다.
const FRAG_DOC = "document";
const FRAG_ELEM = "Elem" + "ent";
const FRAG_PROP = "la" + "ng";
const RE_RUNTIME_LOCALE_WRITE = new RegExp(FRAG_DOC + FRAG_ELEM + "." + FRAG_PROP, "g");

// spec G-D 명령의 `--include` 4 종 미러. **파일 목록은 상수가 아니다** — 아래
// collectFiles 가 디렉터리를 재귀 열거한다 (RULE-06 §열거 고정 금지). 확장자
// 집합 자체의 드리프트는 G-D 보조 단언이 잡는다.
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;

// 스크립트류 확장자 전체 (.mjs / .cts / .mts / .cjs 포함) — SCAN_EXTENSIONS 의
// 완전성 보조 단언용. src/ 에 스캔 밖 스크립트 확장자가 생기면 그 파일의 위반은
// 게이트 사각지대에 숨는다.
const RE_SCRIPT_LIKE_EXT = /\.[cm]?[jt]sx?$/;

type ScanEntry = { abs: string; rel: string };

/**
 * `grep -r` 동치 — root 이하 전 파일을 재귀 열거한다. **어떤 파일도 제외하지
 * 않는다** (본 fixture 자신 포함). 자기 무효화는 토큰 런타임 조립으로 회피했다.
 */
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

function scannedFiles(): ScanEntry[] {
	return collectFiles(SRC_DIR).filter((f) =>
		SCAN_EXTENSIONS.some((ext) => f.rel.endsWith(ext)),
	);
}

function countMatches(source: string, pattern: RegExp): number {
	return (source.match(pattern) ?? []).length;
}

function extractLangDeclarations(source: string): string[] {
	return source.match(RE_ROOT_WITH_LANG) ?? [];
}

function readIndexHtml(): string {
	return readFileSync(PATH_INDEX_HTML, "utf8");
}

describe("html-lang-locale-declaration (TSK-20260824-03)", () => {
	it("G-A / R-1·R-2: index.html 의 lang 선언을 가진 루트 시작 태그 === 1 (속성 삭제·공백화 검출)", () => {
		const count = countMatches(readIndexHtml(), RE_ROOT_WITH_LANG);
		expect(
			count,
			"G-A 위반 — 루트 요소의 로케일 선언이 사라졌거나(R-1) 값이 비었다(R-2). WCAG 2.1 §3.1.1 Level A.",
		).toBe(1);
	});

	it("G-B / R-3: 추출된 로케일 값이 BCP 47 (RFC 5646) primary-subtag 문법을 만족", () => {
		const match = RE_ROOT_LANG_CAPTURE.exec(readIndexHtml());
		expect(match, "G-B 선행 조건 위반 — 로케일 값 캡처 실패 (G-A 참조)").not.toBeNull();
		const value = match?.[1];
		expect(value, "G-B 캡처 그룹 미획득").toBeDefined();
		expect(
			RE_BCP47.test(value ?? ""),
			`G-B 위반 — BCP 47 부적합 값 "${value}". UA 는 오형식 태그를 조용히 무시한다 (english / en_US / EN- 부류).`,
		).toBe(true);
	});

	it("G-C: index.html 의 루트 시작 태그 자체 === 1 (lang 없는 <html> 추가 검출)", () => {
		const count = countMatches(readIndexHtml(), RE_ROOT_TAG);
		expect(
			count,
			"G-C 위반 — 루트 시작 태그가 1 개가 아니다. G-A 와 함께 두어 'lang 없는 루트가 하나 더 있다' 형태를 배제한다.",
		).toBe(1);
	});

	it("G-D / R-4: src/** (.ts/.tsx/.js/.jsx) 전수 스캔 — 런타임 로케일 재정의 0 hit", () => {
		const hits: string[] = [];
		for (const file of scannedFiles()) {
			const source = readFileSync(file.abs, "utf8");
			const lines = source.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line === undefined) continue;
				if (countMatches(line, RE_RUNTIME_LOCALE_WRITE) > 0) {
					hits.push(`${file.rel}:${i + 1}`);
				}
			}
		}
		expect(
			hits,
			`G-D 위반 — 런타임이 정적 선언을 덮어쓴다 (이중 진실 공급원):\n${hits.map((h) => `  ${h}`).join("\n")}`,
		).toHaveLength(0);
	});

	it("G-D 보조: 스캔 목록이 디렉터리 열거 산출이고 본 fixture 자신도 포함한다 (제외 과잉 부재)", () => {
		const files = scannedFiles();

		// 열거가 공허하면 G-D 는 아무것도 안 보고도 통과한다.
		expect(files.length, "G-D 스캔 목록이 비었다 — 게이트 공허 통과 위험").toBeGreaterThan(0);

		// 본 fixture 는 자기 자신을 스캔에서 빼지 않는다. 토큰 런타임 조립이
		// 유효한 회피임을 이 단언이 고정한다 (경로 제외를 썼다면 여기서 깨진다).
		expect(
			files.map((f) => f.rel),
			"본 fixture 자신이 G-D 스캔 대상에서 빠졌다 — 자기 제외가 과하다",
		).toContain(REL_SELF);

		// 확장자 집합 완전성 — src/ 에 스캔 밖 스크립트 확장자가 있으면 그 파일의
		// 위반은 게이트 사각지대에 숨는다 (RULE-06 §열거 고정 금지 보조 단언).
		const uncovered = collectFiles(SRC_DIR)
			.filter((f) => RE_SCRIPT_LIKE_EXT.test(f.rel))
			.filter((f) => !SCAN_EXTENSIONS.some((ext) => f.rel.endsWith(ext)))
			.map((f) => f.rel);
		expect(
			uncovered,
			`G-D 스캔 확장자 집합 밖의 스크립트 파일이 존재한다:\n${uncovered.map((u) => `  ${u}`).join("\n")}`,
		).toHaveLength(0);
	});

	it("G-E / R-5: build/index.html 존재 시 루트 로케일 선언이 원본과 동일 (부재 시 skip)", () => {
		const source = extractLangDeclarations(readIndexHtml());
		if (!existsSync(PATH_BUILD_INDEX_HTML)) {
			// build/ 는 gitignored — 본 fixture 는 `npm run build` 를 강제하지 않는다.
			// 부재 시 read-only no-op (spec §동작 5 의 `[ -f ... ] || exit 0` 동치).
			// 선례: csp-meta-build-artifact-preservation.test.ts 의 skip 규약.
			expect(source.length).toBe(1);
			return;
		}
		const artifact = extractLangDeclarations(readFileSync(PATH_BUILD_INDEX_HTML, "utf8"));
		expect(
			artifact,
			"G-E 위반 — 빌드가 루트 요소의 로케일 선언을 변형·소실시켰다 (prod 표면에서만 관측되는 회귀).",
		).toEqual(source);
	});

	it("매처 표기 변형 내성: 들여쓰기·공백 수·개행 배치가 달라도 판정이 grep 게이트와 일치한다", () => {
		// index.html 은 실제로 표기가 균질하지 않다 — robots 메타만 탭 들여쓰기 +
		// 비-self-closing 종결이고 나머지는 공백 4 칸 + `/>` 다. 루트 요소도 같은
		// 드리프트를 겪을 수 있으므로 매처가 표기 변형에 어떻게 반응하는지 고정한다.
		const cases: ReadonlyArray<{ label: string; html: string; withLang: number; rootTag: number; value: string | null }> = [
			{ label: "공백 1 (현행 표기)", html: '<html lang="en">', withLang: 1, rootTag: 1, value: "en" },
			{ label: "탭 들여쓰기 + 탭 구분", html: '\t<html\tlang="en">', withLang: 1, rootTag: 1, value: "en" },
			{ label: "공백 다중 + region subtag", html: '<html   lang="en-US">', withLang: 1, rootTag: 1, value: "en-US" },
			{ label: "R-1 속성 삭제", html: "<html>", withLang: 0, rootTag: 1, value: null },
			{ label: "R-2 값 공백화", html: '<html lang="">', withLang: 0, rootTag: 1, value: null },
			{ label: "R-3 오형식 (english)", html: '<html lang="english">', withLang: 1, rootTag: 1, value: "english" },
			{ label: "R-3 오형식 (언더스코어)", html: '<html lang="en_US">', withLang: 1, rootTag: 1, value: "en_US" },
			{ label: "R-3 오형식 (빈 subtag)", html: '<html lang="EN-">', withLang: 1, rootTag: 1, value: "EN-" },
			{ label: "종료 태그는 미매치", html: "</html>", withLang: 0, rootTag: 0, value: null },
			// grep 은 라인 단위라 속성이 다음 줄로 내려가면 못 잡는다. JS 정규식이
			// 개행을 넘어 매치하면 두 표면의 판정이 갈리므로 여기서 고정한다.
			{ label: "개행 분리 (grep 라인 단위 동치)", html: '<html\n  lang="en">', withLang: 0, rootTag: 0, value: null },
		];

		for (const c of cases) {
			expect(countMatches(c.html, RE_ROOT_WITH_LANG), `withLang 불일치 — ${c.label}`).toBe(c.withLang);
			expect(countMatches(c.html, RE_ROOT_TAG), `rootTag 불일치 — ${c.label}`).toBe(c.rootTag);
			const m = RE_ROOT_LANG_CAPTURE.exec(c.html);
			expect(m?.[1] ?? null, `캡처값 불일치 — ${c.label}`).toBe(c.value);
		}

		// R-3 3 종은 G-A 는 통과하고 G-B 에서만 걸린다 — 두 게이트의 역할 분담 고정.
		for (const bad of ["english", "en_US", "EN-"]) {
			expect(RE_BCP47.test(bad), `BCP 47 오형식이 통과했다 — ${bad}`).toBe(false);
		}
		for (const good of ["en", "ko", "en-US", "zh-Hant-TW"]) {
			expect(RE_BCP47.test(good), `BCP 47 적합값이 거부됐다 — ${good}`).toBe(true);
		}
	});
});
