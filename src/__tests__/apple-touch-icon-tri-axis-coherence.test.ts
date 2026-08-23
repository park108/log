import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// spec: specs/30.spec/blue/foundation/apple-touch-icon-rel-filename-disk-sizes-tri-axis-coherence.md
//       §동작 동의어 매핑 표 + 게이트 절차 의사코드 + §수용 기준 FR-01~FR-05, NFR-01~NFR-04
//
// apple-touch-icon 계열 <link> 가 가리키는 자산은 (a) rel 토큰, (b) href 파일명 어미,
// (c) 디스크 PNG IHDR 사이즈 — 세 축이 같은 의미를 박제해야 한다. 동음이의
// (모던 rel + 레거시 어미 + 비표준 사이즈) 잔존 시 fail-fast.
//
// 자체 진단 제외 (§spec NFR-04): 본 fixture 는 index.html 단일 파일 + public/ 디렉터리만
// 읽는다. 본문의 rel 토큰 문자열 occurrence 는 게이트 입력이 아니다.

const ROOT = process.cwd();
const PATH_INDEX = join(ROOT, "index.html");
const DIR_PUBLIC = join(ROOT, "public");

// ── 동의어 매핑 표 — spec §동작 의 2행 × 3축을 그대로 옮긴 것 ───────────────────
// 사이즈 표준 단일 출처: 180x180 (Apple HIG iPhone @3x).
// 192x192 는 Android/PWA logo192.png 축이며 iOS 자산 축과 분리된다.
const STANDARD_SIZE = 180;

const MAPPING = {
	"apple-touch-icon": {
		// 모던 iOS 7+. 어미는 무접미 또는 -precomposed 둘 다 호환.
		allowedSuffixes: ["none", "-precomposed"],
		size: STANDARD_SIZE,
	},
	"apple-touch-icon-precomposed": {
		// 레거시 iOS <= 6. 사전 합성 완료 — 어미 -precomposed 권장.
		allowedSuffixes: ["-precomposed"],
		size: STANDARD_SIZE,
	},
} as const;

type RelToken = keyof typeof MAPPING;
const REL_TOKENS = Object.keys(MAPPING) as RelToken[];

interface IconLink { rel: RelToken; href: string }
interface Violation { code: string; observed: [string, string, string, string] }

// ── PNG IHDR 결정론 경로 (spec §PNG IHDR / FR-04) ────────────────────────────
// node:fs 로 24 byte 헤더를 읽고 offset 16..23 을 BE u32 x 2 로 파싱한다.
// ImageMagick / sharp / probe-image-size 등 외부 도구 비의존.
const readPngSize = (path: string): { width: number; height: number } => {
	const head = readFileSync(path).subarray(0, 24);
	return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
};

const parseIconLinks = (html: string): IconLink[] => {
	const links: IconLink[] = [];
	for (const m of html.matchAll(/<link\s+[^>]*>/g)) {
		const tag = m[0];
		const rel = /rel="([^"]+)"/.exec(tag)?.[1];
		const href = /href="([^"]+)"/.exec(tag)?.[1];
		if (rel && href && (REL_TOKENS as string[]).includes(rel)) {
			links.push({ rel: rel as RelToken, href });
		}
	}
	return links;
};

const suffixOf = (basename: string): string =>
	basename.endsWith("-precomposed.png") ? "-precomposed" : "none";

// 게이트 절차 — spec §동작 의사코드 1~4. 순수 함수로 두어 위반 분기를 합성 입력으로
// 검증할 수 있게 한다 (실제 저장소를 깨뜨리지 않고 fail 경로를 통과시키기 위함).
const evaluate = (
	html: string,
	exists: (path: string) => boolean,
	pngSize: (path: string) => { width: number; height: number },
): Violation[] => {
	const links = parseIconLinks(html);
	const violations: Violation[] = [];

	for (const link of links) {
		const basename = link.href.replace(/^\/+/, "");
		const suffix = suffixOf(basename);
		const diskPath = join(DIR_PUBLIC, basename);

		if (!exists(diskPath)) {
			violations.push({
				code: "FR-05-iii",
				observed: [link.rel, suffix, "—", `expected ${MAPPING[link.rel].size}`],
			});
			continue;
		}

		const { width, height } = pngSize(diskPath);
		if (width !== STANDARD_SIZE || height !== STANDARD_SIZE) {
			// 180 표준 위반. 모던 rel + 레거시 어미 모순이면 (i), 그 외 (ii).
			const code =
				link.rel === "apple-touch-icon" && suffix === "-precomposed"
					? "FR-05-i"
					: "FR-05-ii";
			violations.push({
				code,
				observed: [link.rel, suffix, String(width), `expected ${STANDARD_SIZE}`],
			});
		}
	}

	for (const rel of REL_TOKENS) {
		const count = links.filter(l => l.rel === rel).length;
		if (count > 1) {
			violations.push({
				code: "FR-05-iv",
				observed: [rel, String(count), "—", "expected 1"],
			});
		}
	}

	return violations;
};

const realEvaluate = (html: string): Violation[] =>
	evaluate(html, existsSync, readPngSize);

// 합성 입력용 — 디스크를 건드리지 않고 위반 분기를 통과시킨다.
const fakeDisk = (size: number) => ({
	exists: () => true,
	pngSize: () => ({ width: size, height: size }),
});

// 인덱스 접근을 좁히는 헬퍼 — 비어 있으면 단언 실패 지점을 명확히 남긴다.
const first = <T,>(xs: readonly T[]): T => {
	expect(xs.length).toBeGreaterThan(0);
	return xs[0] as T;
};

const linkTag = (rel: string, href: string): string =>
	`<link rel="${rel}" href="${href}" />`;

describe("apple-touch-icon rel ↔ href 어미 ↔ 디스크 sizes 3축 정합", () => {

	describe("(FR-01) 매핑 표 단일 출처", () => {

		it("2행 × 3축이 완전 박제되고 사이즈 표준은 180 단일 출처다", () => {
			expect(REL_TOKENS).toEqual(["apple-touch-icon", "apple-touch-icon-precomposed"]);
			expect(Object.values(MAPPING).map(r => r.size)).toEqual([STANDARD_SIZE, STANDARD_SIZE]);
			expect(STANDARD_SIZE).toBe(180);

			// 모던 rel 은 두 어미 모두 호환, 레거시 rel 은 -precomposed 만.
			expect(MAPPING["apple-touch-icon"].allowedSuffixes).toEqual(["none", "-precomposed"]);
			expect(MAPPING["apple-touch-icon-precomposed"].allowedSuffixes).toEqual(["-precomposed"]);
		});
	});

	describe("(FR-04) PNG IHDR 결정론 경로", () => {

		it("node:fs 24-byte 헤더 읽기만으로 사이즈를 얻는다", () => {
			const links = parseIconLinks(readFileSync(PATH_INDEX, "utf8"));
			expect(links.length).toBeGreaterThan(0);

			const basename = first(links).href.replace(/^\/+/, "");
			const { width, height } = readPngSize(join(DIR_PUBLIC, basename));

			expect(width).toBe(STANDARD_SIZE);
			expect(height).toBe(STANDARD_SIZE);
		});
	});

	describe("PASS 경로", () => {

		it("현재 index.html + public/ 상태가 3축 정합을 만족한다", () => {
			expect(realEvaluate(readFileSync(PATH_INDEX, "utf8"))).toEqual([]);
		});

		it("apple-touch-icon 계열 link 는 정확히 1개다", () => {
			expect(parseIconLinks(readFileSync(PATH_INDEX, "utf8"))).toHaveLength(1);
		});
	});

	describe("위반 분기", () => {

		it("(FR-05-i) 모던 rel + -precomposed 어미 + 비표준 사이즈 → fail-fast", () => {
			// 본 회수 이전의 실제 저장소 상태 (rel 모던 / 어미 레거시 / 192px).
			const d = fakeDisk(192);
			const v = evaluate(linkTag("apple-touch-icon", "/apple-icon-precomposed.png"), d.exists, d.pngSize);

			expect(v).toHaveLength(1);
			expect(first(v).code).toBe("FR-05-i");
			// NFR-04 — (관측 rel, 관측 어미, 관측 사이즈, 기대 매핑 행) 4-tuple 박제.
			expect(first(v).observed).toEqual(["apple-touch-icon", "-precomposed", "192", "expected 180"]);
		});

		it("(FR-05-ii) 무접미 어미 + 비표준 사이즈 → fail-fast", () => {
			const d = fakeDisk(192);
			const v = evaluate(linkTag("apple-touch-icon", "/apple-touch-icon.png"), d.exists, d.pngSize);

			expect(v).toHaveLength(1);
			expect(first(v).code).toBe("FR-05-ii");
			expect(first(v).observed).toEqual(["apple-touch-icon", "none", "192", "expected 180"]);
		});

		it("(FR-05-ii) 레거시 rel + 사이즈 180 아님 → fail-fast", () => {
			const d = fakeDisk(180);
			const ok = evaluate(linkTag("apple-touch-icon-precomposed", "/apple-icon-precomposed.png"), d.exists, d.pngSize);
			expect(ok).toEqual([]);

			const bad = fakeDisk(152);
			const v = evaluate(linkTag("apple-touch-icon-precomposed", "/apple-icon-precomposed.png"), bad.exists, bad.pngSize);
			expect(first(v).code).toBe("FR-05-ii");
			expect(first(v).observed).toEqual(["apple-touch-icon-precomposed", "-precomposed", "152", "expected 180"]);
		});

		it("(FR-05-iii) href 가 가리키는 디스크 PNG 부재 → fail-fast", () => {
			const v = evaluate(
				linkTag("apple-touch-icon", "/does-not-exist.png"),
				() => false,
				() => { throw new Error("도달 불가 — 부재 시 IHDR 를 읽지 않는다"); },
			);

			expect(v).toHaveLength(1);
			expect(first(v).code).toBe("FR-05-iii");
			expect(first(v).observed).toEqual(["apple-touch-icon", "none", "—", "expected 180"]);
		});

		it("(FR-05-iv) 동일 rel 의 link 가 2개 이상 → fail-fast (다중 자산 모호성)", () => {
			const d = fakeDisk(STANDARD_SIZE);
			const html = linkTag("apple-touch-icon", "/a.png") + "\n" + linkTag("apple-touch-icon", "/b.png");
			const v = evaluate(html, d.exists, d.pngSize);

			expect(v).toHaveLength(1);
			expect(first(v).code).toBe("FR-05-iv");
			expect(first(v).observed).toEqual(["apple-touch-icon", "2", "—", "expected 1"]);
		});
	});

	describe("(NFR-01) 결정론", () => {

		it("동일 입력 5회 반복 시 출력 분기 0", () => {
			const html = readFileSync(PATH_INDEX, "utf8");
			const runs = Array.from({ length: 5 }, () => JSON.stringify(realEvaluate(html)));

			expect(new Set(runs).size).toBe(1);
		});
	});
});
