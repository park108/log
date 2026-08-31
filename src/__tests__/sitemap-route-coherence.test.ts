// 크롤러 진입점 정합 — `public/sitemap.xml` ↔ 라우트 도출 ↔ `public/robots.txt`.
// spec: specs/30.spec/green/common/document-head.md §동작 4·5·6·13.
//
// 사이트맵은 사람이 보지 않는 표면이다. 라우트가 늘거나 줄어도 화면은 멀쩡하고
// 사이트맵만 조용히 옛 집합에 남는다 — 크롤러에게만 드러나고 그때는 이미 나간 뒤다.
// 그래서 기대 URL 목록을 **열거하지 않고 라우트에서 도출**한다 (§동작 13).
//
// 도출 규칙 (§동작 5):
//   • `src/App.tsx` 최상위 `<Route path>` 에서 시작한다.
//   • 리디렉트 전용(`element` 가 `<Navigate>`)·404(`*`)는 제외.
//   • `/log/*` 같은 wildcard 마운트는 `src/Log/Log.tsx` 의 중첩 경로로 전개한다.
//   • 중첩 경로 중 **모든 `<Routes>` 블록에 공통으로 있는 것만** 취한다. Log.tsx 는
//     인증 분기와 비인증 분기를 각각 `<Routes>` 로 쓰므로, 교집합이 곧 "인증 없이도
//     닿는 경로" 다. `/log/write` 는 인증 분기에만 있으므로 이 교집합에서 빠진다.
//   • 동적 세그먼트(`:timestamp`)는 열거 불가이므로 제외.
//
// 무판정 방지 (§동작 6·13): 도출이 공집합이면 통과가 아니라 실패다. 사이트맵
// 부재도 마찬가지다 — "불일치 0" 으로 읽지 않는다.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_APP_TSX = join(REPO_ROOT, "src", "App.tsx");
const PATH_LOG_TSX = join(REPO_ROOT, "src", "Log", "Log.tsx");
const PATH_COMMON_TS = join(REPO_ROOT, "src", "common", "common.ts");
const PATH_SITEMAP = join(REPO_ROOT, "public", "sitemap.xml");
const PATH_ROBOTS = join(REPO_ROOT, "public", "robots.txt");

const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

const read = (path: string): string => readFileSync(path, "utf8");

/**
 * `<Route ... />` 선언을 앞에서부터 잘라 각 라우트의 자기 텍스트만 남긴다.
 * `split` 이 다음 `<Route` 앞에서 끊으므로 각 조각은 그 라우트의 attribute 와
 * element 식(다음 라우트 시작 전까지)만 담는다.
 */
function routeChunks(source: string): readonly string[] {
	return source.split(/<Route\s+/).slice(1);
}

function pathOf(chunk: string): string | null {
	const matched = /^path="([^"]*)"/.exec(chunk);
	return matched ? (matched[1] ?? null) : null;
}

/** 최상위 라우트 — 리디렉트 전용과 404 를 걷어낸 뒤 (경로, wildcard 여부) 로 환원. */
function topLevelRoutes(appSource: string): readonly string[] {
	const kept: string[] = [];
	for (const chunk of routeChunks(appSource)) {
		const routePath = pathOf(chunk);
		if (routePath === null) continue;
		if (routePath === "*") continue;
		// 리디렉트 전용 — 자기 URL 이 색인 대상이 아니라 다른 URL 로 보내는 경로.
		if (/<Navigate\b/.test(chunk)) continue;
		kept.push(routePath);
	}
	return kept;
}

/** Log.tsx 의 모든 `<Routes>` 블록에서 경로 집합을 뽑는다. */
function nestedRouteBlocks(logSource: string): readonly ReadonlySet<string>[] {
	const blocks: Set<string>[] = [];
	const blockPattern = /<Routes>([\s\S]*?)<\/Routes>/g;
	let matched: RegExpExecArray | null;
	while ((matched = blockPattern.exec(logSource)) !== null) {
		const body = matched[1] ?? "";
		const paths = new Set<string>();
		for (const chunk of routeChunks(body)) {
			const routePath = pathOf(chunk);
			if (routePath !== null) paths.add(routePath);
		}
		blocks.push(paths);
	}
	return blocks;
}

/** 전 블록 교집합 = 인증 분기와 무관하게 닿는 경로. */
function intersect(sets: readonly ReadonlySet<string>[]): ReadonlySet<string> {
	if (sets.length === 0) return new Set<string>();
	const [first, ...rest] = sets as [ReadonlySet<string>, ...ReadonlySet<string>[]];
	const result = new Set<string>(first);
	for (const other of rest) {
		for (const value of [...result]) {
			if (!other.has(value)) result.delete(value);
		}
	}
	return result;
}

function joinPath(mount: string, child: string): string {
	if (child === "/" || child === "") return mount;
	return `${mount}/${child.replace(/^\//, "")}`;
}

/** §동작 5 도출 — 색인 대상 경로 집합. */
function derivePaths(): readonly string[] {
	const appSource = read(PATH_APP_TSX);
	const logSource = read(PATH_LOG_TSX);
	const nested = intersect(nestedRouteBlocks(logSource));

	const derived = new Set<string>();
	for (const routePath of topLevelRoutes(appSource)) {
		if (routePath.endsWith("/*")) {
			const mount = routePath.slice(0, -2);
			for (const child of nested) {
				// 동적 세그먼트는 열거 불가 — 사이트맵에 담을 수 없다.
				if (child.includes(":")) continue;
				if (child === "*") continue;
				derived.add(joinPath(mount, child));
			}
			continue;
		}
		if (routePath.includes(":")) continue;
		derived.add(routePath);
	}
	return [...derived].sort();
}

function prodOrigin(): string {
	const matched = /return\s+"(https:\/\/[^"]+)";/.exec(read(PATH_COMMON_TS));
	const url = matched ? (matched[1] ?? null) : null;
	expect(url, "운영 도메인을 src/common/common.ts 에서 찾지 못했다 — 판정이 공허하다").not.toBeNull();
	return url as string;
}

function sitemapDocument(): Document {
	const parsed = new DOMParser().parseFromString(read(PATH_SITEMAP), "application/xml");
	const failure = parsed.getElementsByTagName("parsererror")[0];
	expect(failure ?? null, `sitemap.xml 파싱 실패 — ${failure?.textContent ?? ""}`).toBeNull();
	return parsed;
}

function sitemapLocations(): readonly string[] {
	const locations = [...sitemapDocument().getElementsByTagName("loc")].map(
		(node) => (node.textContent ?? "").trim(),
	);
	return locations;
}

describe("사이트맵", () => {

	// 부재는 통과가 아니다 (§동작 6).
	it("크롤러 진입점 파일이 실재한다", () => {

		expect(
			existsSync(PATH_SITEMAP),
			"public/sitemap.xml 부재 — 이것은 '불일치 0' 이 아니라 무판정이다",
		).toBe(true);
	});

	it("sitemaps.org 스키마로 파싱된다", () => {

		const root = sitemapDocument().documentElement;

		expect(root.tagName).toBe("urlset");
		expect(root.namespaceURI).toBe(SITEMAP_NS);
		// `<url>` 하나에 `<loc>` 하나 — 짝이 어긋나면 스키마 위반이다.
		expect(sitemapDocument().getElementsByTagName("url").length).toBe(sitemapLocations().length);
	});

	// 도출이 비면 그 뒤 비교는 전부 공허하게 통과한다 (§동작 13).
	it("라우트 도출이 공집합이 아니다", () => {

		expect(derivePaths().length).toBeGreaterThan(0);
	});

	it("URL 집합이 라우트 도출과 같다", () => {

		const origin = prodOrigin();
		const expected = derivePaths().map((p) => new URL(p, origin).toString()).sort();

		expect(sitemapLocations().slice().sort()).toEqual(expected);
	});

	// 로그인해야 닿는 화면을 크롤러에게 알리면 로그인 벽만 색인된다.
	it("인증 분기에만 있는 경로는 담기지 않는다", () => {

		const blocks = nestedRouteBlocks(read(PATH_LOG_TSX));
		// 합집합 − 교집합 = 어떤 분기에는 있고 어떤 분기에는 없는 경로. 블록의
		// 등장 순서에 기대지 않는다.
		const shared = intersect(blocks);
		const union = new Set<string>(blocks.flatMap((block) => [...block]));
		const authOnly = [...union].filter((child) => !shared.has(child));

		expect(authOnly.length, "인증 전용 경로를 하나도 찾지 못했다 — 판정이 공허하다").toBeGreaterThan(0);
		for (const child of authOnly) {
			// 자식 경로는 선행 `/` 를 가질 수도 아닐 수도 있다. 그대로 이어 붙이면
			// `//write` 가 되어 어떤 pathname 과도 일치하지 않는다 — 판정이 조용히
			// 공허해진다.
			const segment = child.replace(/^\//, "");
			expect(
				sitemapLocations().some((loc) => new URL(loc).pathname.endsWith(`/${segment}`)),
				`인증 분기에만 있는 경로가 사이트맵에 담겼다 — ${child}`,
			).toBe(false);
		}
	});

	it("모든 주소의 도메인이 코드의 운영 도메인과 같다", () => {

		const expectedHost = new URL(prodOrigin()).host;

		for (const loc of sitemapLocations()) {
			expect(new URL(loc).host).toBe(expectedHost);
		}
	});

	it("robots.txt 가 사이트맵을 정확히 한 번 가리키고 그 파일이 실재한다", () => {

		const declared = read(PATH_ROBOTS)
			.split("\n")
			.map((line) => /^Sitemap:\s*(\S+)\s*$/i.exec(line))
			.filter((matched): matched is RegExpExecArray => matched !== null)
			.map((matched) => matched[1] as string);

		expect(declared.length, "robots.txt 의 `Sitemap:` 선언은 정확히 1 회여야 한다").toBe(1);

		const declaredUrl = new URL(declared[0] as string);
		expect(declaredUrl.host).toBe(new URL(prodOrigin()).host);
		// 선언한 URL 이 실제 파일에 대응하는가 — 선언만 있고 파일이 없으면 404 다.
		expect(existsSync(join(REPO_ROOT, "public", declaredUrl.pathname))).toBe(true);
	});
});
