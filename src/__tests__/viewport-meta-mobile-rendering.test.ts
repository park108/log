// TSK-20260824-04 / REQ-20260518-022 — viewport 메타 ↔ 모바일 렌더 계약 발화 채널.
//
// spec: foundation/viewport-meta-mobile-rendering-contract.md §동작 G-A~G-E
//       + §회귀 중점 R-1~R-5 (전체 경로 literal 미박제 — 아래 "spec 경로" 절).
//
// 본 fixture 는 spec 5 게이트를 vitest 결정론 채널(rc=0/1)로 박제한다. 부착
// 시점에 5 게이트는 이미 전수 rc=0 이므로 본 fixture 는 회복이 아니라
// **고정(pinning)** 이다 — viewport 메타 1줄이 사라지거나(R-1) 배율이 바뀌거나(R-3)
// 확대 차단 토큰이 유입돼도(R-2) tsc / eslint / vitest / vite build 는 전부
// 통과한다. 그 침묵을 깨는 것이 본 채널의 유일한 목적이다.
//
//   G-A 선언 단일성   : index.html 의 name="viewport" + content="..." 메타 === 1
//   G-B content 동치  : content 가 기기폭 + 배율 1 조합 (width=device-width, initial-scale=1)
//   G-C 확대 차단 0   : index.html 에 확대 차단 토큰 3 종 0 hit — §역할 방어 대상 (2) 직접 채널
//   G-D 산출물 보존   : 동시대 build/index.html 의 viewport element 가 원본과 동일
//                       (미빌드·stale 은 미측정 skip — TSK-20260824-08-a)
//   G-E standalone    : public/manifest.json 의 display 가 standalone (G-A~G-C 필수성 근거)
//
// 손상의 결과: 메타 소실 시 모바일 브라우저는 데스크톱 가정 폭(약 980 CSS px)으로
// 렌더 후 축소해 넣는다 (마이크로 텍스트 + 가로 스크롤). 확대 차단 토큰 유입 시
// 저시력 사용자의 pinch-zoom 이 봉쇄된다 (WCAG 2.1 §1.4.4 AA / §1.4.10 AA).
//
// ── 관측 표면 (RULE-06 §관측 표면) ───────────────────────────────────────────
// 판정은 디스크의 실파일(index.html / build/index.html / public/manifest.json)을
// 읽는다. 기대 문자열을 fixture 에 복제해 그 복제본을 검사하는 형태는 쓰지 않는다
// — 그렇게 하면 원본이 바뀌어도 게이트가 통과한다.
//
// ── 자체 진단 제외 (자기 무효화 회피) ────────────────────────────────────────
// 본 fixture 의 스캔 대상은 index.html / build/index.html / public/manifest.json
// 으로 닫혀 있고 `src/**` 를 포함하지 않으므로 오늘 자기 hit 은 성립하지 않는다.
// 다만 확대 차단 토큰을 소스에 literal 로 적어 두면 스캔 범위가 넓어지는 순간
// 본 fixture 가 자기 자신을 hit 시켜 G-C 를 영구 FAIL 로 만든다. 그래서 토큰을
// **런타임 조립**한다 (선례: html-lang-locale-declaration.test.ts / TSK-20260824-03).
// **경로 제외는 쓰지 않는다** — 제외는 과해질 여지만 남기고 그 적정성을 검증할
// 수단이 없다. 본 fixture 는 어떤 파일도 스캔에서 빼지 않는다. 이 사실은 아래
// "자체 진단" 케이스가 자기 소스를 직접 읽어 0 hit 으로 고정한다.
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
// 멱등성: read-only — readFileSync / existsSync / readdirSync / statSync + 공통
// 헬퍼(../test-utils/buildArtifactGate — 3 상태 판정 수렴처) 만 사용한다.
// 어떤 production 파일도 수정하지 않으며 `npm run build` 를 강제하지 않는다.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { measureBuildArtifacts } from "../test-utils/buildArtifactGate";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계
// (선례 csp-meta-build-artifact-preservation / html-lang-locale-declaration 동형).
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const BUILD_DIR = join(REPO_ROOT, "build");
const PATH_BUILD_INDEX_HTML = join(BUILD_DIR, "index.html");
const PATH_MANIFEST = join(REPO_ROOT, "public", "manifest.json");
const PATH_SELF = join(REPO_ROOT, "src", "__tests__", "viewport-meta-mobile-rendering.test.ts");

// ── grep 동치 공백류 ─────────────────────────────────────────────────────────
// spec 명령은 `[[:space:]]` 를 쓰지만 grep 은 라인 단위로 매칭하므로 클래스 안의
// 개행은 도달 불가다. JS 정규식은 파일 전체를 한 문자열로 보기 때문에 `\s` 를
// 그대로 쓰면 grep 보다 넓게 매치한다 (`<meta\n  name="viewport" ...>` 를 grep 은
// 못 잡고 JS 는 잡는다). 개행을 뺀 공백류로 좁혀 두 표면의 판정을 일치시킨다.
const WS = "[^\\S\\r\\n]";

// G-A — spec §동작 1 명령 `<meta[[:space:]]+name="viewport"[[:space:]]+content="[^"]*"` 미러.
// `[^"]*` 는 인용부호를 넘지 못하므로 인접 메타를 삼키는 greedy 확산이 없다
// (§구현 지시 4 — 표기 변형 케이스가 이를 고정한다).
const RE_VIEWPORT_DECL = new RegExp(`<meta${WS}+name="viewport"${WS}+content="[^"]*"`, "g");

// G-B — spec §동작 2 명령 미러. content 값의 `, ` 는 spec 이 literal 로 쓴 그대로
// 둔다 (공백류 클래스로 느슨하게 풀면 shell 게이트보다 넓어진다).
const RE_VIEWPORT_CONTRACT = new RegExp(
	`<meta${WS}+name="viewport"${WS}+content="width=device-width, initial-scale=1"${WS}*/?>`,
);

// G-D — spec §동작 4 의 `grep -oE '<meta[[:space:]]+name="viewport"[^>]*>'` 미러.
// `[^>]` 가 `>` 를 넘지 못하므로 self-closing `/>` 와 비-self-closing `>` 를
// 모두 각각의 element 로 잘라낸다.
const RE_VIEWPORT_ELEMENT = new RegExp(`<meta${WS}+name="viewport"[^>]*>`, "g");

// G-E — spec §동작 5 명령 `"display":[[:space:]]*"standalone"` 미러.
const RE_DISPLAY_STANDALONE = new RegExp(`"display":${WS}*"standalone"`);

// ── G-C 확대 차단 토큰 (런타임 조립) ─────────────────────────────────────────
// spec §동작 3 명령이 열거한 3 종 대안 (user-scalable 부정 / 상한 배율 고정 /
// 하한 배율 고정) 을 조각에서 결합한다. 결합 결과가 spec 명령의 3 종과 일치하는지는
// 아래 "자체 진단" 케이스가 단언한다. 소스 텍스트에 완전 토큰 literal 이 부재하므로
// 스캔 범위가 넓어져도 본 fixture 는 자기 자신을 hit 시키지 않는다
// (위 "자체 진단 제외" 절 — 경로 제외 대신 택한 수단).
const FRAG_SCAL = "sc" + "al";
const TOKEN_USER_SCALABLE = "user-" + FRAG_SCAL + "able=" + "no";
const TOKEN_MAXIMUM_SCALE = "maxi" + "mum-" + FRAG_SCAL + "e=";
const TOKEN_MINIMUM_SCALE = "mini" + "mum-" + FRAG_SCAL + "e=";
const ZOOM_BLOCKER_TOKENS = [TOKEN_USER_SCALABLE, TOKEN_MAXIMUM_SCALE, TOKEN_MINIMUM_SCALE] as const;
const RE_ZOOM_BLOCKERS = new RegExp(ZOOM_BLOCKER_TOKENS.join("|"), "g");

function countMatches(source: string, pattern: RegExp): number {
	return (source.match(pattern) ?? []).length;
}

function readIndexHtml(): string {
	return readFileSync(PATH_INDEX_HTML, "utf8");
}

function extractViewportElements(source: string): string[] {
	return source.match(RE_VIEWPORT_ELEMENT) ?? [];
}

/**
 * 디렉터리 직하의 `.html` 파일명을 열거한다 (RULE-06 §열거 고정 금지 — 측정
 * 대상을 하드코딩하지 않고 디렉터리 열거로 산출). **어떤 파일도 제외하지 않는다.**
 */
function listHtmlFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((name) => name.endsWith(".html"))
		.filter((name) => statSync(join(dir, name)).isFile())
		.sort();
}

describe("viewport-meta-mobile-rendering (TSK-20260824-04)", () => {
	it("G-A / R-1·R-4: index.html 의 viewport 선언 메타 === 1 (삭제·중복 검출)", () => {
		const count = countMatches(readIndexHtml(), RE_VIEWPORT_DECL);
		expect(
			count,
			"G-A 위반 — viewport 메타가 사라졌거나(R-1) 2 회 이상 선언됐다(R-4). 소실 시 모바일 브라우저는 약 980 CSS px 데스크톱 폭으로 렌더 후 축소한다.",
		).toBe(1);
	});

	it("G-B / R-2·R-3: content 가 기기폭 + 배율 1 조합 (width=device-width, initial-scale=1)", () => {
		const source = readIndexHtml();
		const declarations = source.match(RE_VIEWPORT_DECL) ?? [];
		expect(
			RE_VIEWPORT_CONTRACT.test(source),
			`G-B 위반 — content 토큰이 계약과 다르다 (배율 변경 R-3 / 확대 차단 토큰 추가 R-2). 실측 선언: ${JSON.stringify(declarations)}`,
		).toBe(true);
	});

	it("G-C / R-2: index.html 에 확대 차단 토큰 3 종 0 hit (WCAG 2.1 §1.4.4 / §1.4.10)", () => {
		const source = readIndexHtml();
		const hits: string[] = [];
		const lines = source.split("\n");
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line === undefined) continue;
			if (countMatches(line, RE_ZOOM_BLOCKERS) > 0) {
				hits.push(`index.html:${i + 1}`);
			}
		}
		expect(
			hits,
			`G-C 위반 — 저시력 사용자의 확대를 차단하는 토큰이 유입됐다:\n${hits.map((h) => `  ${h}`).join("\n")}`,
		).toHaveLength(0);
	});

	it("G-D / R-5: 동시대 build/index.html 의 viewport element 가 원본과 동일 (미빌드·stale 은 skip)", (ctx) => {
		const source = extractViewportElements(readIndexHtml());
		// skip 술어는 **파일 단위** 다 (spec §동작 4 의 `[ -f build/index.html ] || exit 0`
		// 동치). 디렉터리 단위 술어를 쓰면 build/ 만 있고 index.html 이 아직 없는
		// 부분 빌드 상태에서 skip 대신 FAIL 한다. 미측정을 원본 극 단언으로
		// 대체하지도 않는다 — 산출물을 재지 않은 초록은 측정과 구별되지 않는다.
		const gate = measureBuildArtifacts(ctx, {
			artifacts: [PATH_BUILD_INDEX_HTML],
			sources: [PATH_INDEX_HTML],
		});
		const artifact = extractViewportElements(readFileSync(PATH_BUILD_INDEX_HTML, "utf8"));
		expect(
			artifact,
			`G-D 위반 — 빌드 파이프라인이 head 를 재작성해 viewport element 를 변형·소실시켰다 (prod 표면에서만 관측되는 회귀). ${gate.mtimeEvidence}`,
		).toEqual(source);
	});

	it("G-D 보조: 동시대 산출물의 html 열거가 게이트 측정 대상을 벗어나지 않는다 (사각지대 부재)", (ctx) => {
		// G-D 본 케이스와 동일 술어 — 디렉터리와 완료 앵커 파일을 함께 요구한다.
		const gate = measureBuildArtifacts(ctx, {
			artifacts: [BUILD_DIR, PATH_BUILD_INDEX_HTML],
			sources: [PATH_INDEX_HTML],
		});
		// 측정 대상은 열거 산출이다. 산출물에 index.html 밖의 html 진입점이
		// 생기면 그 문서의 viewport 선언은 G-D 사각지대에 숨는다.
		const uncovered = listHtmlFiles(BUILD_DIR).filter((name) => name !== "index.html");
		expect(
			uncovered,
			`G-D 측정 밖 산출물 html 진입점이 존재한다 — 게이트 확장 필요:\n${uncovered.map((u) => `  build/${u}`).join("\n")}\n${gate.mtimeEvidence}`,
		).toHaveLength(0);
	});

	it("G-E: public/manifest.json 의 display 가 standalone (G-A~G-C 필수성 근거)", () => {
		const manifest = readFileSync(PATH_MANIFEST, "utf8");
		expect(
			RE_DISPLAY_STANDALONE.test(manifest),
			"G-E 위반 — standalone 의도가 사라졌다. standalone 창은 브라우저 chrome 이 없어 페이지 자신의 viewport 선언에 전적으로 의존한다 (본 spec 은 display enum 값 자체를 판정하지 않고 동행만 본다).",
		).toBe(true);
	});

	it("열거 완전성: 원본 html 진입점 열거가 게이트 측정 대상과 일치한다 (제외 과잉·사각지대 부재)", () => {
		const rootHtml = listHtmlFiles(REPO_ROOT);

		// 열거가 공허하면 G-A~G-C 는 아무것도 안 보고도 통과한다.
		expect(rootHtml.length, "루트 html 열거가 비었다 — 게이트 공허 통과 위험").toBeGreaterThan(0);

		// G-A~G-C 의 측정 대상은 index.html 단일 파일이다 (spec §공개 인터페이스).
		// 루트에 다른 html 진입점이 생기면 그 문서의 viewport 계약은 미판정으로 남는다.
		const uncovered = rootHtml.filter((name) => name !== "index.html");
		expect(
			uncovered,
			`측정 밖 html 진입점이 존재한다 — 게이트 확장 필요:\n${uncovered.map((u) => `  ${u}`).join("\n")}`,
		).toHaveLength(0);
	});

	it("자체 진단: 본 fixture 소스는 스캔에서 제외되지 않으며 토큰 런타임 조립으로 자기 hit 이 0 이다", () => {
		const self = readFileSync(PATH_SELF, "utf8");

		// 본 fixture 는 발화 채널 등재의 근거이므로 축 토큰 자체는 소스에 존재한다.
		expect(self, "본 fixture 가 축 토큰을 담고 있지 않다 — 채널 식별 불가").toContain("view" + "port");

		// 확대 차단 토큰은 런타임 조립이므로 소스 텍스트에는 완전 토큰이 없다.
		// 경로 제외를 쓰지 않고도 자기 무효화를 피한 사실을 여기서 고정한다 —
		// 누군가 편의로 토큰을 literal 로 풀어 쓰면 이 단언이 즉시 깨진다.
		expect(
			countMatches(self, RE_ZOOM_BLOCKERS),
			"본 fixture 소스에 확대 차단 토큰 literal 이 등장한다 — 스캔 범위 확장 시 자기 hit 으로 G-C 가 영구 FAIL 이 된다. 토큰은 런타임 조립을 유지하라.",
		).toBe(0);

		// 조립 결과가 실제로 spec 이 지정한 3 종인지 (조각 결합 오타 방지).
		expect([...ZOOM_BLOCKER_TOKENS]).toEqual([
			"user-scalable=" + "no",
			"maximum-scale" + "=",
			"minimum-scale" + "=",
		]);
	});

	it("매처 표기 변형 내성: 들여쓰기·종결 표기·공백 수가 달라도 판정이 grep 게이트와 일치한다", () => {
		// index.html 은 실제로 표기가 균질하지 않다 — robots 메타만 탭 들여쓰기 +
		// 비-self-closing `>` 이고 나머지는 공백 4 칸 + `/>` 다. viewport 메타도 같은
		// 드리프트를 겪을 수 있으므로 매처가 표기 변형에 어떻게 반응하는지 고정한다.
		const CONTRACT = 'content="width=device-width, initial-scale=1"';
		const cases: ReadonlyArray<{
			label: string;
			html: string;
			decl: number;
			contract: boolean;
			blockers: number;
		}> = [
			{
				label: "공백 4 칸 + self-closing (현행 index.html:5 표기)",
				html: `    <meta name="viewport" ${CONTRACT} />`,
				decl: 1,
				contract: true,
				blockers: 0,
			},
			{
				label: "탭 들여쓰기 + 비-self-closing (index.html:8 robots 표기 변형)",
				html: `\t<meta name="viewport" ${CONTRACT}>`,
				decl: 1,
				contract: true,
				blockers: 0,
			},
			{
				label: "속성 구분 공백 다중",
				html: `<meta   name="viewport"   ${CONTRACT}   />`,
				decl: 1,
				contract: true,
				blockers: 0,
			},
			{
				label: "R-1 element 삭제 (인접 메타만 잔존)",
				html: '    <meta name="theme-color" content="#000000" />',
				decl: 0,
				contract: false,
				blockers: 0,
			},
			{
				label: "R-3 배율 변경 (initial-scale=0.5) — G-A 는 통과, G-B 만 걸린다",
				html: '<meta name="viewport" content="width=device-width, initial-scale=0.5" />',
				decl: 1,
				contract: false,
				blockers: 0,
			},
			{
				label: "R-2 확대 차단 토큰 유입 — G-B FAIL + G-C 1 hit 동시",
				html: `<meta name="viewport" content="width=device-width, initial-scale=1, ${TOKEN_USER_SCALABLE}" />`,
				decl: 1,
				contract: false,
				blockers: 1,
			},
			{
				label: "R-2 상한 배율 고정 (maximum-scale)",
				html: `<meta name="viewport" content="width=device-width, initial-scale=1, ${TOKEN_MAXIMUM_SCALE}1" />`,
				decl: 1,
				contract: false,
				blockers: 1,
			},
			{
				label: "R-2 하한 배율 고정 (minimum-scale)",
				html: `<meta name="viewport" content="width=device-width, initial-scale=1, ${TOKEN_MINIMUM_SCALE}1" />`,
				decl: 1,
				contract: false,
				blockers: 1,
			},
			{
				label: "R-4 중복 선언 — greedy 확산 없이 정확히 2 로 센다",
				html: `    <meta name="viewport" ${CONTRACT} />\n\t<meta name="viewport" content="width=device-width, initial-scale=2">`,
				decl: 2,
				contract: true,
				blockers: 0,
			},
			{
				label: "인접 메타 혼재 — viewport 만 센다 (greedy 삼킴 부재)",
				html: [
					'    <meta charset="utf-8" />',
					`    <meta name="viewport" ${CONTRACT} />`,
					'    <meta name="theme-color" content="#000000" />',
					'\t<meta name="robots" content="index, follow">',
				].join("\n"),
				decl: 1,
				contract: true,
				blockers: 0,
			},
			// grep 은 라인 단위라 속성이 다음 줄로 내려가면 못 잡는다. JS 정규식이
			// 개행을 넘어 매치하면 두 표면의 판정이 갈리므로 여기서 고정한다.
			{
				label: "개행 분리 (grep 라인 단위 동치)",
				html: `<meta\n  name="viewport" ${CONTRACT} />`,
				decl: 0,
				contract: false,
				blockers: 0,
			},
		];

		for (const c of cases) {
			expect(countMatches(c.html, RE_VIEWPORT_DECL), `G-A count 불일치 — ${c.label}`).toBe(c.decl);
			expect(RE_VIEWPORT_CONTRACT.test(c.html), `G-B 판정 불일치 — ${c.label}`).toBe(c.contract);
			expect(countMatches(c.html, RE_ZOOM_BLOCKERS), `G-C hit 불일치 — ${c.label}`).toBe(c.blockers);
		}

		// G-D 추출은 element 경계를 넘지 않는다 — self-closing / 비-self-closing 혼재에서
		// 각각 1 element 로 잘리고 뒤따르는 메타를 삼키지 않는다.
		const mixed = [
			`    <meta name="viewport" ${CONTRACT} />`,
			'\t<meta name="robots" content="index, follow">',
		].join("\n");
		expect(extractViewportElements(mixed)).toEqual([
			`<meta name="viewport" ${CONTRACT} />`,
		]);
	});
});
