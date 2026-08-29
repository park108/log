// CSP 허용 목록 ↔ 실제 사용 출처 정합.
//
// 본문 이미지가 전부 차단되고 있었다 (2026-08-29 관측). img-src 가
// 'self' data: https://d0.awsstatic.com 뿐이었는데 블로그 이미지는 S3
// 버킷(park108-{image,log}-{dev,prod}.s3...)에서 온다. 이미지는 200 으로
// 살아 있었고 순전히 CSP 가 막고 있었다.
//
// CSP 차단은 **조용하다** — 콘솔에만 남고 화면은 그냥 비어 보인다. 렌더
// 테스트로도 잡히지 않는다 (jsdom 은 CSP 를 집행하지 않는다). 그래서
// 소스에 실재하는 출처가 대응 지시어에 들어 있는지 정적으로 판정한다.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const SRC = join(REPO_ROOT, "src");

// 테스트·픽스처의 가짜 호스트는 판정 대상이 아니다. 실제로 브라우저가
// 요청하지 않는 문서 링크(참고 URL)도 제외한다 — 이들은 <a href> 이며
// CSP 의 fetch 지시어와 무관하다.
const IGNORED = /test|invalid|example|exmaple|w3\.org|mozilla|github|linkedin|web\.dev|bit\.ly|whatismybrowser|iana|park108\.net|localhost/i;

const walk = (dir: string, out: string[] = []): string[] => {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
	}
	return out;
};

const originsInSources = (): Set<string> => {
	const found = new Set<string>();
	for (const f of walk(SRC)) {
		const text = readFileSync(f, "utf8");
		for (const m of text.matchAll(/https:\/\/([a-zA-Z0-9.*-]+\.(?:com|net|org))/g)) {
			const host = m[1]!;
			if (IGNORED.test(host)) continue;
			found.add(host);
		}
	}
	return found;
};

/** `https://*.s3.ap-...` 같은 와일드카드 패턴이 구체 호스트를 덮는지. */
const covers = (allowed: string, host: string): boolean => {
	if (allowed === host) return true;
	if (!allowed.startsWith("*.")) return false;
	return host.endsWith(allowed.slice(1)) || host === allowed.slice(2);
};

/** CSP 문자열을 지시어별 허용 출처 맵으로 쪼갠다. */
const parseDirectives = (csp: string): Map<string, string[]> => {
	const map = new Map<string, string[]>();
	for (const part of csp.split(";")) {
		const tokens = part.trim().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) continue;
		const name = tokens[0]!;
		map.set(name, tokens.slice(1).flatMap((t) => {
			const m = /^https:\/\/([a-zA-Z0-9.*-]+)$/.exec(t);
			return m ? [m[1]!] : [];
		}));
	}
	return map;
};

const readCsp = (): string => {
	const html = readFileSync(PATH_INDEX_HTML, "utf8");
	return /content="([^"]*)"/.exec(html.slice(html.indexOf("Content-Security-Policy")))?.[1] ?? "";
};

/** presigned 업로드가 향하는 S3 출처 — 도메인 fixture 가 그 응답을 모델링한다. */
const presignedUploadOrigins = (): string[] => {
	const hosts = new Set<string>();
	for (const f of walk(SRC)) {
		if (!/__fixtures__/.test(f)) continue;
		for (const m of readFileSync(f, "utf8").matchAll(/https:\/\/([a-zA-Z0-9.-]+\.s3\.[a-zA-Z0-9.-]+)/g)) {
			hosts.add(m[1]!);
		}
	}
	return [...hosts];
};

describe("CSP 허용 목록 ↔ 실제 사용 출처", () => {

	it("소스에 실재하는 외부 출처가 CSP 어딘가에 허용돼 있다", () => {

		const html = readFileSync(PATH_INDEX_HTML, "utf8");
		const csp = /content="([^"]*)"/.exec(html.slice(html.indexOf("Content-Security-Policy")))?.[1] ?? "";

		expect(csp, "index.html 에서 CSP 문자열을 읽지 못했다 — 판정이 공허하다").not.toBe("");

		const allowed = [...csp.matchAll(/https:\/\/([a-zA-Z0-9.*-]+)/g)].map((m) => m[1]!);
		expect(allowed.length, "CSP 에서 허용 출처를 하나도 뽑지 못했다").toBeGreaterThanOrEqual(1);

		const used = [...originsInSources()];
		expect(used.length, "소스에서 외부 출처를 하나도 찾지 못했다 — 스캔이 어긋났다").toBeGreaterThanOrEqual(1);

		const missing = used.filter((host) => !allowed.some((a) => covers(a, host)));

		expect(
			missing,
			`CSP 에 없는 출처를 소스가 사용한다 — 브라우저가 조용히 차단한다: ${missing.join(", ")}`,
		).toEqual([]);
	});

	// 위 케이스는 "CSP **어딘가에** 있는가" 만 본다. 그것만으로는 부족하다 —
	// 2026-08-29 에 S3 가 img-src 에는 있고 connect-src 에는 없어서 파일 업로드가
	// 통째로 막혔는데 위 케이스는 초록이었다. 같은 출처가 표시 대상이면서 동시에
	// 업로드 대상일 수 있으므로 **지시어별로** 판정한다.
	it("presigned 업로드 대상 S3 출처가 connect-src 에 허용돼 있다", () => {

		const csp = readCsp();
		expect(csp, "CSP 문자열을 읽지 못했다 — 판정이 공허하다").not.toBe("");

		// 업로드 흐름이 실재하는지 먼저 확인한다 — 없으면 이 판정은 공허하다.
		const fileApi = readFileSync(join(SRC, "File", "api.ts"), "utf8");
		expect(fileApi, "getPreSignedUrl 흐름이 없다 — 판정 전제가 사라졌다").toContain("getPreSignedUrl");
		expect(fileApi, "PUT 업로드가 없다 — 판정 전제가 사라졌다").toContain('method: "PUT"');

		const uploadHosts = presignedUploadOrigins();
		expect(
			uploadHosts.length,
			"fixture 에서 S3 출처를 하나도 찾지 못했다 — 모집단이 비면 판정이 공허하다",
		).toBeGreaterThanOrEqual(1);

		const connect = parseDirectives(csp).get("connect-src") ?? [];
		expect(connect.length, "connect-src 에서 허용 출처를 뽑지 못했다").toBeGreaterThanOrEqual(1);

		const blocked = uploadHosts.filter((h) => !connect.some((a) => covers(a, h)));

		expect(
			blocked,
			`업로드 대상이 connect-src 에 없다 — 업로드가 통째로 차단된다: ${blocked.join(", ")}`,
		).toEqual([]);
	});

	it("이미지 출처가 img-src 에 허용돼 있다", () => {

		const csp = readCsp();
		const imgSrc = parseDirectives(csp).get("img-src") ?? [];
		expect(imgSrc.length, "img-src 에서 허용 출처를 뽑지 못했다").toBeGreaterThanOrEqual(1);

		const hosts = presignedUploadOrigins();
		expect(hosts.length, "S3 출처 모집단이 비었다").toBeGreaterThanOrEqual(1);

		const blocked = hosts.filter((h) => !imgSrc.some((a) => covers(a, h)));
		expect(
			blocked,
			`이미지 출처가 img-src 에 없다 — 본문 이미지가 조용히 비어 보인다: ${blocked.join(", ")}`,
		).toEqual([]);
	});
});
