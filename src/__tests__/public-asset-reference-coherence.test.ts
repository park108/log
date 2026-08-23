// TSK-20260518-09 / REQ-20260517-099 — public 정적 자원 3 축 정합 + manifest 양면 동치 fixture.
// spec: specs/30.spec/blue/foundation/index-html-public-asset-reference-coherence.md
//       §동작 G-A~G-J + §수용 기준 FR-01~FR-08 / NFR-01~NFR-06.
//
// 본 fixture 는 `index.html` ↔ `public/**` ↔ `build/**` 3 축 정합 + `manifest.json`
// 의 `icons[*].src` / `theme_color` 양면 의미 동치를 결정론 채널로 박제한다:
//   G-A / FR-01: index.html 4 종 자원 참조 grep count === 4
//   G-B / FR-02: public/** 4 파일 디스크 실재
//   G-C / FR-03: build/** 산출 자원 보존 (build 존재 시 measure / 부재 시 skip)
//   G-D / FR-04: <meta name="theme-color"> content ↔ manifest.json.theme_color 양면 동치
//   G-E / FR-05: manifest.json.icons[*].src 전수 디스크 실재
//   G-F / FR-06: manifest.json valid JSON + build artifact byte-equal
//   G-G / FR-07: 3 채널 양면 의도 분리 박제 (apple-icon-precomposed.png ∉ icons / favicon.ico ∈ icons)
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync / existsSync / JSON.parse 만
// 사용, 어떤 production 파일도 수정하지 않는다. `npm run build` 강제 부재 (G-C/G-F
// 조건부 skip 분기 박제).
//
// 자체 진단 제외 (§spec NFR-05 / G-J): 본 fixture 본문 내 `manifest.json` /
// `favicon.ico` / `apple-icon-precomposed.png` / `theme-color` 문자열 occurrence
// 는 G-A grep count 영향 0 — G-A scope 는 `index.html` 단일 파일 한정, 본 fixture
// 는 `src/__tests__/` 산하.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

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

	it("G-C / FR-03: build/** 산출 자원 보존 — build 존재 시 measure / 부재 시 skip", () => {
		if (!existsSync(PATH_BUILD)) {
			// §spec NFR-02 — 본 fixture 는 `npm run build` 강제하지 않음.
			// build 부재 시 read-only no-op (skip 동치).
			expect(true).toBe(true);
			return;
		}
		for (const name of BUILD_ASSET_NAMES) {
			const full = join(PATH_BUILD, name);
			expect(existsSync(full), `build/${name} 산출 부재`).toBe(true);
		}
		// build/index.html 라인 카운트 === 4 (§spec FR-03 의 src ↔ dist 보존 양면 동치).
		const buildHtml = readFileSync(PATH_BUILD_INDEX_HTML, "utf8");
		const buildHtmlCount = countMatchingLines(buildHtml, RE_INDEX_HTML_ASSET_REF);
		expect(buildHtmlCount).toBe(4);
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

	it("G-F / FR-06: manifest.json valid JSON + build artifact byte-equal — build 존재 시 measure", () => {
		// (i) valid JSON parse — throw 0 단언.
		const publicRaw = readFileSync(PATH_PUBLIC_MANIFEST, "utf8");
		expect(() => JSON.parse(publicRaw)).not.toThrow();

		// (ii) build artifact 존재 시 byte-equal 단언.
		if (!existsSync(PATH_BUILD_MANIFEST)) {
			expect(true).toBe(true);
			return;
		}
		const buildRaw = readFileSync(PATH_BUILD_MANIFEST, "utf8");
		expect(buildRaw).toBe(publicRaw);
	});

	it("G-G / FR-07: 3 채널 양면 의도 분리 — apple-icon-precomposed.png ∉ icons / favicon.ico ∈ icons", () => {
		const manifestRaw = readFileSync(PATH_PUBLIC_MANIFEST, "utf8");
		const manifest = JSON.parse(manifestRaw) as Manifest;
		const srcs: string[] = manifest.icons.map((i) => i.src);

		expect(srcs).toContain("favicon.ico");
		expect(srcs).not.toContain("apple-icon-precomposed.png");
	});
});
