// 공유 카드 그림이 소비 가능한 규격인가 — `index.html` og:image ↔ 실제 픽셀.
// spec: specs/30.spec/green/common/document-head.md §동작 10.
//
// 카드 그림은 화면 어디에도 나오지 않는다. 카카오톡·슬랙·트위터가 링크를 펼칠
// 때만 쓰이고, 규격을 못 맞추면 그 자리에서 잘리거나 아예 빠진다 — 그리고 그때는
// 이미 나간 뒤다.
//
// 재는 것 셋:
//   • 양 축 ≥ 200px. 권장이 아니라 문서화된 최소치다.
//   • 선언한 `og:image:width|height` 가 실제 픽셀과 같은가. 선언은 크롤러가
//     받아보기 전에 믿는 값이므로 틀리면 레이아웃이 어긋난 채로 잡힌다.
//   • 종횡비와 `twitter:card` 가 한 벌인가. 1.91:1 그림에 `summary` 를 쓰면
//     가운데가 정사각으로 잘려 넓은 카드를 만든 의미가 없어진다.
//
// PNG 헤더는 IHDR 청크 고정 위치에서 직접 읽는다 — 이미지 라이브러리를 들이지
// 않는다. 재는 것이 폭과 높이 둘뿐이라 의존성을 살 이유가 없다.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const PATH_INDEX_HTML = join(REPO_ROOT, "index.html");
const PATH_PUBLIC = join(REPO_ROOT, "public");

/** §동작 10 — 문서화된 최소치. */
const MIN_EDGE_PX = 200;

/** 정사각 판정 허용 오차 — 1:1 에서 이만큼 벗어나면 넓은 카드로 본다. */
const SQUARE_TOLERANCE = 0.05;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const html = (): string => readFileSync(PATH_INDEX_HTML, "utf8");

function metaContent(source: string, key: "name" | "property", value: string): string | null {
	const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const matched = new RegExp(
		`<meta[^>]*\\s${key}=["']${escaped}["'][^>]*\\scontent=["']([^"']*)["']`,
		"i",
	).exec(source);
	return matched ? (matched[1] ?? null) : null;
}

/** PNG IHDR 에서 폭·높이를 읽는다 (signature 8 byte + length 4 + "IHDR" 4 다음). */
function pngSize(path: string): { width: number; height: number } {
	const buf = readFileSync(path);
	expect(
		buf.subarray(0, 8).equals(PNG_SIGNATURE),
		`${path} 는 PNG 가 아니다 — 규격 판정이 공허하다`,
	).toBe(true);
	expect(buf.toString("ascii", 12, 16), "첫 청크가 IHDR 이 아니다").toBe("IHDR");
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** og:image 가 가리키는 저장소 안 실제 파일. */
function cardPath(): string {
	const declared = metaContent(html(), "property", "og:image");
	expect(declared, "og:image 선언 부재 — 판정이 공허하다").not.toBeNull();
	const asset = new URL(declared as string).pathname;
	const path = join(PATH_PUBLIC, asset);
	expect(existsSync(path), `og:image 가 없는 파일을 가리킨다 — ${asset}`).toBe(true);
	return path;
}

describe("공유 카드 그림", () => {

	it("양 축이 최소치 이상이다", () => {

		const { width, height } = pngSize(cardPath());

		expect(width, `공유 카드 폭이 최소치 미만 — ${width}px`).toBeGreaterThanOrEqual(MIN_EDGE_PX);
		expect(height, `공유 카드 높이가 최소치 미만 — ${height}px`).toBeGreaterThanOrEqual(MIN_EDGE_PX);
	});

	it("선언한 치수가 실제 픽셀과 같다", () => {

		const source = html();
		const declaredWidth = metaContent(source, "property", "og:image:width");
		const declaredHeight = metaContent(source, "property", "og:image:height");

		// 선언은 선택이다. 선언하지 않았으면 잴 것이 없다 — 그러나 한쪽만
		// 선언하는 것은 실수이므로 짝을 요구한다.
		expect(
			declaredWidth === null,
			"og:image:width|height 는 짝으로 선언하거나 둘 다 빼야 한다",
		).toBe(declaredHeight === null);
		if (declaredWidth === null || declaredHeight === null) return;

		const { width, height } = pngSize(cardPath());
		expect(Number(declaredWidth), "선언한 폭이 실제 픽셀과 다르다").toBe(width);
		expect(Number(declaredHeight), "선언한 높이가 실제 픽셀과 다르다").toBe(height);
	});

	it("종횡비와 트위터 카드 종류가 한 벌로 움직인다", () => {

		const { width, height } = pngSize(cardPath());
		const ratio = width / height;
		const card = metaContent(html(), "name", "twitter:card");

		expect(card, "twitter:card 선언 부재 — 판정이 공허하다").not.toBeNull();

		const isSquare = Math.abs(ratio - 1) <= SQUARE_TOLERANCE;
		expect(
			card,
			isSquare
				? `정사각(${width}×${height}) 그림에는 summary 가 맞다`
				: `${width}×${height} (${ratio.toFixed(2)}:1) 그림에 summary 를 쓰면 가운데가 정사각으로 잘린다`,
		).toBe(isSquare ? "summary" : "summary_large_image");
	});
});
