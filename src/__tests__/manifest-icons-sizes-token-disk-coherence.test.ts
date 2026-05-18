// TSK-20260518-11 / REQ-20260517-100 — manifest.icons sizes ↔ 디스크 자원 픽셀 집합 정합 결정론 fixture.
// spec: specs/30.spec/blue/foundation/manifest-icons-sizes-token-disk-coherence.md
//       §동작 G-A~G-J + §수용 기준 FR-01~FR-08 / NFR-01~NFR-06.
//
// 본 fixture 는 `public/manifest.json.icons[*]` 의 (sizes, src, type) 3 키 ↔ 디스크 자원의
// 형식별 binary 헤더 (ICO ICONDIR + PNG IHDR) 추출 픽셀 집합 양방향 부분집합 정합 (D = A)
// 시스템 불변식을 결정론 (rc=0/1) 채널로 박제한다:
//   G-A / FR-01: public/manifest.json valid JSON + icons 배열 2 항목 + (src, sizes, type) 3 키 본문
//   G-B / FR-04: icons[i].sizes 공백 split → 집합 D 추출 baseline (D[0]=4 토큰 / D[1]=2 토큰)
//   G-C / FR-02: public/favicon.ico ICONDIR 헤더 파싱 → A[0] = {16x16, 32x32, 48x48, 64x64}
//   G-D / FR-03: public/logo192.png IHDR 헤더 파싱 → A[1] = {192x192}
//   G-E / FR-01: D = A 양방향 부분집합 비교 baseline 위반 상태 박제
//                (icons[0] 양방향 위반 D-A={24x24}+A-D={48x48} / icons[1] 단방향 위반 D-A={512x512})
//
// 멱등성 (§spec NFR-02): read-only — fs.readFileSync (binary + utf8) + JSON.parse +
// Buffer.readUInt16LE/UInt32BE 만 사용, 어떤 production 파일도 수정하지 않는다.
//
// 자체 진단 제외 (§spec NFR-05 / G-I): 본 fixture 본문 내 sizes / 64x64 / 48x48 / 192x192 /
// 512x512 문자열 occurrence 는 G-A grep scope (= public/manifest.json JSON parse) 영향 0 —
// 본 fixture 는 src/__tests__/ 산하, public/ scope 와 직교.
//
// 직교 boundary (RULE-06 expansion 불허): 본 fixture 본문은 선례 4 carve (TSK-07 mount-id /
// TSK-08 meta-description / TSK-09 public-asset / TSK-10 csp) 직교 토큰 각 0 hit — carve
// scope 정합 강제. 구체 토큰은 본 fixture 본문에서 자체 진단 제외 (§spec NFR-05 / G-I) 위해
// 박제하지 않는다 (직교 grep 게이트가 자기 주석을 false-positive 로 매치하지 않도록).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

// 프로젝트 루트는 본 fixture 위치 (`src/__tests__/`) 기준 상위 2 단계
// (선례 TSK-07 / TSK-08 / TSK-09 / TSK-10 동형).
const REPO_ROOT = resolve(__dirname, "..", "..");

const PATH_PUBLIC = join(REPO_ROOT, "public");
const PATH_MANIFEST = join(PATH_PUBLIC, "manifest.json");
const PATH_FAVICON = join(PATH_PUBLIC, "favicon.ico");
const PATH_LOGO192 = join(PATH_PUBLIC, "logo192.png");

// §spec FR-04 sizes 토큰 정규식 — W3C §icons.sizes <W>x<H> 정수 쌍 규약.
const SIZE_TOKEN_RE = /^\d+x\d+$/;

// §spec FR-01 양방향 부분집합 비교 헬퍼.
// setDiff(a, b) = a - b = a 중 b 에 없는 원소.
function setDiff(a: Set<string>, b: Set<string>): Set<string> {
	return new Set([...a].filter((x) => !b.has(x)));
}

// manifest.json icons[*] 항목 타입 (§spec G-A baseline).
interface ManifestIcon {
	src: string;
	sizes: string;
	type: string;
}

interface Manifest {
	icons: ManifestIcon[];
}

describe("manifest-icons-sizes-token-disk-coherence (TSK-20260518-11)", () => {
	it("G-A / FR-01: public/manifest.json valid JSON + icons 배열 2 항목 + (src, sizes, type) 3 키 본문", () => {
		const raw = readFileSync(PATH_MANIFEST, "utf8");
		let parsed: Manifest | undefined;
		expect(() => {
			parsed = JSON.parse(raw) as Manifest;
		}).not.toThrow();

		expect(parsed).toBeDefined();
		const manifest = parsed as Manifest;
		expect(Array.isArray(manifest.icons)).toBe(true);
		expect(manifest.icons.length).toBe(2);

		// 각 항목에 (src, sizes, type) 3 키 전수 존재.
		for (let i = 0; i < manifest.icons.length; i++) {
			const icon = manifest.icons[i];
			expect(icon).toBeDefined();
			const e = icon as ManifestIcon;
			expect(Object.prototype.hasOwnProperty.call(e, "src")).toBe(true);
			expect(Object.prototype.hasOwnProperty.call(e, "sizes")).toBe(true);
			expect(Object.prototype.hasOwnProperty.call(e, "type")).toBe(true);
			expect(typeof e.src).toBe("string");
			expect(typeof e.sizes).toBe("string");
			expect(typeof e.type).toBe("string");
		}

		// baseline 2 항목 정합 (§spec G-A baseline).
		const i0 = manifest.icons[0] as ManifestIcon;
		const i1 = manifest.icons[1] as ManifestIcon;
		expect(i0.src).toBe("favicon.ico");
		expect(i0.type).toBe("image/x-icon");
		expect(i1.src).toBe("logo192.png");
		expect(i1.type).toBe("image/png");
	});

	it("G-B / FR-04: icons[i].sizes 공백 split → 집합 D 추출 baseline 박제 (D[0]=4 토큰 / D[1]=2 토큰)", () => {
		const raw = readFileSync(PATH_MANIFEST, "utf8");
		const manifest = JSON.parse(raw) as Manifest;

		const i0 = manifest.icons[0] as ManifestIcon;
		const i1 = manifest.icons[1] as ManifestIcon;

		const d0 = i0.sizes.split(/\s+/).filter(Boolean).sort();
		const d1 = i1.sizes.split(/\s+/).filter(Boolean).sort();

		// D[0] = {16x16, 24x24, 32x32, 64x64} (4 토큰, lexically sorted).
		expect(d0).toEqual(["16x16", "24x24", "32x32", "64x64"]);
		// D[1] = {192x192, 512x512} (2 토큰, lexically sorted).
		expect(d1).toEqual(["192x192", "512x512"]);

		// 각 토큰 <W>x<H> 정수 쌍 규약 정합.
		for (const tok of d0) {
			expect(SIZE_TOKEN_RE.test(tok)).toBe(true);
		}
		for (const tok of d1) {
			expect(SIZE_TOKEN_RE.test(tok)).toBe(true);
		}
	});

	it("G-C / FR-02: public/favicon.ico ICONDIR 헤더 파싱 → A[0] = {16x16, 32x32, 48x48, 64x64}", () => {
		const buf = readFileSync(PATH_FAVICON);

		// ICONDIR 헤더 (offset 0..5, little-endian): reserved + type + count.
		const reserved = buf.readUInt16LE(0);
		const type = buf.readUInt16LE(2);
		const count = buf.readUInt16LE(4);

		expect(reserved).toBe(0);
		expect(type).toBe(1); // ICO type.
		expect(count).toBe(4); // baseline.

		// per-entry (offset 6 + i*16): byte 0 = width, byte 1 = height; 0 → 256 해석.
		const tokens: string[] = [];
		for (let i = 0; i < count; i++) {
			const off = 6 + i * 16;
			let w = buf.readUInt8(off);
			let h = buf.readUInt8(off + 1);
			if (w === 0) w = 256;
			if (h === 0) h = 256;
			tokens.push(`${w}x${h}`);
		}

		const a0 = tokens.slice().sort();
		expect(a0).toEqual(["16x16", "32x32", "48x48", "64x64"]);
	});

	it("G-D / FR-03: public/logo192.png IHDR 헤더 파싱 → A[1] = {192x192}", () => {
		const buf = readFileSync(PATH_LOGO192);

		// PNG signature 8 byte 단언.
		const sig = buf.subarray(0, 8);
		const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(sig.equals(expectedSig)).toBe(true);

		// IHDR chunk type @ offset 12..15.
		expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");

		// IHDR width (big-endian) @ offset 16 + height @ offset 20.
		const width = buf.readUInt32BE(16);
		const height = buf.readUInt32BE(20);
		expect(width).toBe(192);
		expect(height).toBe(192);

		// PNG 은 single-file multi-size 불가 — A[1] = {192x192} 단일.
		const a1 = [`${width}x${height}`];
		expect(a1).toEqual(["192x192"]);
	});

	it("G-E / FR-01: D = A 양방향 부분집합 비교 baseline 위반 상태 박제 (icons[0] 양방향 위반 + icons[1] 단방향 위반)", () => {
		// G-B 산출 D 집합 재계산.
		const raw = readFileSync(PATH_MANIFEST, "utf8");
		const manifest = JSON.parse(raw) as Manifest;
		const i0 = manifest.icons[0] as ManifestIcon;
		const i1 = manifest.icons[1] as ManifestIcon;
		const d0 = new Set<string>(i0.sizes.split(/\s+/).filter(Boolean));
		const d1 = new Set<string>(i1.sizes.split(/\s+/).filter(Boolean));

		// G-C 산출 A[0] 집합 재계산 (favicon.ico ICONDIR).
		const icoBuf = readFileSync(PATH_FAVICON);
		const count = icoBuf.readUInt16LE(4);
		const a0 = new Set<string>();
		for (let i = 0; i < count; i++) {
			const off = 6 + i * 16;
			let w = icoBuf.readUInt8(off);
			let h = icoBuf.readUInt8(off + 1);
			if (w === 0) w = 256;
			if (h === 0) h = 256;
			a0.add(`${w}x${h}`);
		}

		// G-D 산출 A[1] 집합 재계산 (logo192.png IHDR).
		const pngBuf = readFileSync(PATH_LOGO192);
		const pngW = pngBuf.readUInt32BE(16);
		const pngH = pngBuf.readUInt32BE(20);
		const a1 = new Set<string>([`${pngW}x${pngH}`]);

		// icons[0] favicon.ico: D-A={24x24} + A-D={48x48} (양방향 위반).
		const d0MinusA0 = Array.from(setDiff(d0, a0)).sort();
		const a0MinusD0 = Array.from(setDiff(a0, d0)).sort();
		expect(d0MinusA0).toEqual(["24x24"]);
		expect(a0MinusD0).toEqual(["48x48"]);

		// icons[1] logo192.png: D-A={512x512} + A-D={} (단방향 위반).
		const d1MinusA1 = Array.from(setDiff(d1, a1)).sort();
		const a1MinusD1 = setDiff(a1, d1);
		expect(d1MinusA1).toEqual(["512x512"]);
		expect(a1MinusD1.size).toBe(0);
	});
});
