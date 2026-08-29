// TSK-20260518-09 / REQ-20260517-099 — public 정적 자원 3 축 정합 + manifest 양면 동치 fixture.
// spec: specs/30.spec/blue/foundation/index-html-public-asset-reference-coherence.md
//       §동작 G-A~G-J + §수용 기준 FR-01~FR-08 / NFR-01~NFR-06.
//
// 본 fixture 는 `index.html` ↔ `public/**` ↔ `build/**` 3 축 정합 + `manifest.json`
// 의 `icons[*].src` / `theme_color` 양면 의미 동치를 결정론 채널로 박제한다:
//   G-A / FR-01: index.html 4 종 자원 참조 grep count === 4
//   G-B / FR-02: public/** 4 파일 디스크 실재
//   G-C / FR-03: build/** 산출 자원 보존 (동시대 산출물 measure / 미빌드·stale 은 skip)
//   G-D / FR-04: <meta name="theme-color"> content ↔ manifest.json.theme_color 양면 동치
//   G-E / FR-05: manifest.json.icons[*].src 전수 디스크 실재
//   G-F / FR-06: manifest.json valid JSON + build artifact byte-equal
//   G-G / FR-07: 3 채널 양면 의도 분리 박제 (apple-icon-precomposed.png ∉ icons / favicon.ico ∈ icons)
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync / existsSync / JSON.parse +
// 공통 헬퍼의 statSync 만 사용, 어떤 production 파일도 수정하지 않는다.
// `npm run build` 강제 부재 — G-C/G-F 의 3 상태 판정(미빌드/stale/동시대)은
// ../test-utils/buildArtifactGate 1 곳에 수렴한다 (TSK-20260824-08-a /
// REQ-20260824-003 FR-02~04).
//
// 자체 진단 제외 (§spec NFR-05 / G-J): 본 fixture 본문 내 `manifest.json` /
// `favicon.ico` / `apple-icon-precomposed.png` / `theme-color` 문자열 occurrence
// 는 G-A grep count 영향 0 — G-A scope 는 `index.html` 단일 파일 한정, 본 fixture
// 는 `src/__tests__/` 산하.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { measureBuildArtifacts } from "../test-utils/buildArtifactGate";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계.
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_PUBLIC = join(REPO_ROOT, "public");
const PATH_PUBLIC_MANIFEST = join(PATH_PUBLIC, "manifest.json");
const PATH_BUILD = join(REPO_ROOT, "build");
const PATH_BUILD_MANIFEST = join(PATH_BUILD, "manifest.json");
const PATH_BUILD_INDEX_HTML = join(PATH_BUILD, "index.html");

// §spec FR-02 4 종 public 자원 baseline.
const PUBLIC_ASSET_NAMES = [
	"manifest.json",
	"favicon.ico",
	"apple-icon-precomposed.png",
	"logo192.png",
] as const;

// §spec FR-03 5 종 build artifact baseline (index.html 포함).
const BUILD_ASSET_NAMES = [
	"manifest.json",
	"favicon.ico",
	"apple-icon-precomposed.png",
	"logo192.png",
	"index.html",
] as const;

// G-A 패턴 — §spec 명령 `grep -cE "manifest|favicon|apple.touch.icon|theme.color" index.html`
// 와 동치 (라인 단위 매치 카운트). baseline = 4 라인 (line 6 theme-color / line 10 manifest /
// line 11 favicon / line 12 apple-touch-icon). `grep -c` 는 매칭된 라인 수 반환 —
// 같은 라인 내 다중 occurrence (예: `<link rel="manifest" href="/manifest.json">` 2 hit)
// 는 1 라인으로 집계 (spec baseline 의 게이트 명령 의미 정합).
const RE_INDEX_HTML_ASSET_REF = /(manifest|favicon|apple[.-]touch[.-]icon|theme[.-]color)/i;

function countMatchingLines(source: string, pattern: RegExp): number {
	const lines = source.split(/\r?\n/);
	let total = 0;
	for (const line of lines) {
		if (pattern.test(line)) total += 1;
	}
	return total;
}

// G-D H 측 — index.html `<meta name="theme-color" content="…">` content 캡처.
const RE_THEME_COLOR_META = /meta\s+name="theme-color"\s+content="([^"]*)"/;

interface ManifestIcon {
	src: string;
	sizes?: string;
	type?: string;
	purpose?: string;
}

interface Manifest {
	icons: ManifestIcon[];
	theme_color: string;
	[k: string]: unknown;
}

describe("public-asset-reference-coherence (TSK-20260518-09)", () => {
	it("G-A / FR-01: index.html 4 종 자원 참조 라인 카운트 === 4", () => {
		const src = readFileSync(PATH_INDEX_HTML, "utf8");
		const count = countMatchingLines(src, RE_INDEX_HTML_ASSET_REF);
		expect(count).toBe(4);
	});

	it("G-B / FR-02: public/** 4 파일 디스크 실재 (manifest / favicon / apple-icon / logo192)", () => {
		for (const name of PUBLIC_ASSET_NAMES) {
			const full = join(PATH_PUBLIC, name);
			expect(existsSync(full), `public/${name} 디스크 부재`).toBe(true);
		}
	});

	it("G-C / FR-03: build/** 산출 자원 보존 — 동시대 산출물만 measure (미빌드·stale 은 skip)", (ctx) => {
		// 술어 입도 — 디렉터리 존재를 빌드 완료로 읽지 않는다. `build/` 는 남았는데
		// `build/index.html` 이 없는 상태(중단된 `vite build` · outDir 변경 잔재)는
		// 위반이 아니라 미측정이다. 디렉터리와 완료 앵커 파일을 **함께** 요구한다.
		//
		// 앵커가 동시대로 확인된 뒤의 자산 부재는 미측정이 아니라 위반이다 —
		// 완료된 빌드가 자산을 떨궜다는 뜻이므로 아래 열거는 측정 대상으로 남긴다.
		const gate = measureBuildArtifacts(ctx, {
			artifacts: [PATH_BUILD, PATH_BUILD_INDEX_HTML],
			sources: [PATH_INDEX_HTML, ...PUBLIC_ASSET_NAMES.map((name) => join(PATH_PUBLIC, name))],
		});
		for (const name of BUILD_ASSET_NAMES) {
			const full = join(PATH_BUILD, name);
			expect(existsSync(full), `build/${name} 산출 부재. ${gate.mtimeEvidence}`).toBe(true);
		}
		// build/index.html 라인 카운트 === 4 (§spec FR-03 의 src ↔ dist 보존 양면 동치).
		const buildHtml = readFileSync(PATH_BUILD_INDEX_HTML, "utf8");
		const buildHtmlCount = countMatchingLines(buildHtml, RE_INDEX_HTML_ASSET_REF);
		expect(
			buildHtmlCount,
			`G-C 위반 — 빌드가 자원 참조 라인을 변형·소실시켰다. ${gate.mtimeEvidence}`,
		).toBe(4);
	});

	it("G-D / FR-04: <meta theme-color> content ↔ manifest.json.theme_color byte-for-byte 동치", () => {
		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const hMatch = html.match(RE_THEME_COLOR_META);
		expect(hMatch, "index.html `<meta name=\"theme-color\" content=\"…\">` 캡처 실패").not.toBeNull();
		const H = (hMatch as RegExpMatchArray)[1];

		const manifestRaw = readFileSync(PATH_PUBLIC_MANIFEST, "utf8");
		const manifest = JSON.parse(manifestRaw) as Manifest;
		const M = manifest.theme_color;

		// 양면 byte-for-byte 동치 + baseline `"#000000"` 박제.
		expect(H).toBe(M);
		expect(H).toBe("#000000");
		expect(M).toBe("#000000");
	});

	it("G-E / FR-05: manifest.json.icons[*].src 전수 디스크 실재", () => {
		const manifestRaw = readFileSync(PATH_PUBLIC_MANIFEST, "utf8");
		const manifest = JSON.parse(manifestRaw) as Manifest;
		expect(Array.isArray(manifest.icons), "manifest.icons 배열 부재").toBe(true);
		expect(manifest.icons.length).toBeGreaterThanOrEqual(1);
		for (const icon of manifest.icons) {
			expect(typeof icon.src, "icon.src 문자열 부재").toBe("string");
			const full = join(PATH_PUBLIC, icon.src);
			expect(existsSync(full), `public/${icon.src} 디스크 부재 (manifest.icons[*].src 위반)`).toBe(true);
		}
	});

	it("G-F / FR-06: manifest.json valid JSON + 동시대 build artifact byte-equal (미빌드·stale 은 skip)", (ctx) => {
		// (i) valid JSON parse — throw 0 단언 (원본 극, 산출물과 무관).
		const publicRaw = readFileSync(PATH_PUBLIC_MANIFEST, "utf8");
		expect(() => JSON.parse(publicRaw)).not.toThrow();

		// (ii) 산출물 극 — 동시대일 때만 byte-equal 을 단언한다. 산출물이 원본보다
		// 낡았다면 내용 차이는 "빌드가 변형했다" 가 아니라 "아직 재빌드 안 했다" 다.
		const gate = measureBuildArtifacts(ctx, {
			artifacts: [PATH_BUILD_MANIFEST],
			sources: [PATH_PUBLIC_MANIFEST],
		});
		const buildRaw = readFileSync(PATH_BUILD_MANIFEST, "utf8");
		expect(
			buildRaw,
			`G-F 위반 — 빌드가 manifest.json 을 변형시켰다. ${gate.mtimeEvidence}`,
		).toBe(publicRaw);
	});

	it("G-G / FR-07: 3 채널 양면 의도 분리 — apple-icon-precomposed.png ∉ icons / favicon.ico ∈ icons", () => {
		const manifestRaw = readFileSync(PATH_PUBLIC_MANIFEST, "utf8");
		const manifest = JSON.parse(manifestRaw) as Manifest;
		const srcs: string[] = manifest.icons.map((i) => i.src);

		expect(srcs).toContain("favicon.ico");
		expect(srcs).not.toContain("apple-icon-precomposed.png");
	});
});

// G-K: index.html 의 모듈 진입점이 디스크에 실재한다.
//
// TS 전환 후에도 index.html 이 `/src/index.jsx` 를 가리키고 있었다. Vite 는
// dev·build 양쪽에서 확장자를 보정해 해석하므로 빌드도 dev 서버도 통과했고,
// 존재하지 않는 파일을 가리키는 참조가 조용히 남았다. 번들러의 관용에 기대지
// 않고 선언과 디스크를 직접 대조한다.
describe("index.html 모듈 진입점 실재 (entry-point-disk-coherence)", () => {

	it("G-K: <script type=module src> 가 가리키는 파일이 디스크에 있다", () => {

		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const matches = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)];

		// 공허 통과 차단 — 진입점 선언이 0건이면 "결손 0" 은 무조건 참이다.
		expect(
			matches.length,
			"index.html 에 module script 진입점 선언이 없다 — 판정이 공허하다",
		).toBeGreaterThanOrEqual(1);

		const missing = matches
			.map((m) => m[1] as string)
			.filter((src) => src.startsWith("/"))
			.filter((src) => !existsSync(join(REPO_ROOT, src.replace(/^\//, ""))));

		expect(
			missing,
			`index.html 진입점이 디스크에 없다: ${missing.join(", ")}`,
		).toEqual([]);
	});
});

