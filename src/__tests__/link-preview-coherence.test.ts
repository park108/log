import fs from 'node:fs';
import path from 'node:path';

// 글 주소를 공유하면 카카오톡·슬랙·트위터가 이 문서의 메타 태그를 읽는다.
// 태그가 없던 동안 미리보기는 제목도 설명도 그림도 없이 나갔다.
//
// **글마다 다르게 만들 수는 없다.** 이 사이트는 클라이언트에서 렌더하므로 크롤러가
// 받는 것은 이 정적 문서뿐이고, `setMetaDescription` 이 런타임에 바꾸는 값은 JS 를
// 실행하지 않는 크롤러에게 도달하지 않는다. 그래서 이 게이트가 지키는 것은
// "미리보기가 글을 설명한다" 가 아니라 **"미리보기가 한 목소리로 말한다"** 이다.
//
// 방어 대상 (RULE-07 §주제 우선순위 2 — 명시):
//   • 설명이 두 벌이라 한쪽만 고쳐져 검색 결과와 공유 미리보기가 다른 말을 하는 것.
//   • 운영 도메인이 코드에서 바뀌었는데 `og:url` 이 옛 도메인에 남는 것.
// 두 경우 모두 기존 자동 게이트로는 검출되지 않는다.

const read = (relative: string): string =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

const attr = (html: string, key: 'name' | 'property', value: string): string | null => {
	const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const matched = new RegExp(
		`<meta[^>]*\\s${key}=["']${escaped}["'][^>]*\\scontent=["']([^"']*)["']`, 'i'
	).exec(html);
	return matched ? (matched[1] ?? null) : null;
};

describe('링크 미리보기', () => {

	const html = () => read('index.html');

	it.each([
		['og:type'],
		['og:site_name'],
		['og:title'],
		['og:description'],
		['og:url'],
		['og:image'],
	])('%s 가 있다', (key) => {

		const value = attr(html(), 'property', key);

		expect(value, `${key} 가 없다 — 미리보기의 그 칸이 빈 채로 나간다`).not.toBeNull();
		expect(value).not.toBe('');
	});

	it('트위터 카드 종류를 밝힌다', () => {

		expect(attr(html(), 'name', 'twitter:card')).not.toBeNull();
	});

	// 설명은 한 벌이어야 한다 — 두 벌이면 한쪽만 고쳐진다.
	it('공유 설명과 검색 설명이 같은 문장이다', () => {

		const source = html();

		expect(attr(source, 'property', 'og:description')).toBe(attr(source, 'name', 'description'));
	});

	it('공유 제목과 문서 제목이 같다', () => {

		const source = html();
		const title = /<title>([^<]*)<\/title>/i.exec(source)?.[1] ?? null;

		expect(title, '<title> 을 찾지 못했다 — 판정이 공허하다').not.toBeNull();
		expect(attr(source, 'property', 'og:title')).toBe(title);
	});

	// 도메인은 코드가 알고 있다. 문서가 옛 도메인에 남으면 미리보기가 죽은
	// 주소를 가리킨다.
	it('공유 주소의 도메인이 코드의 운영 도메인과 같다', () => {

		const prodUrl = /return\s+"(https:\/\/[^"]+)";/.exec(read('src/common/common.ts'))?.[1] ?? null;
		expect(prodUrl, '운영 도메인을 코드에서 찾지 못했다 — 판정이 공허하다').not.toBeNull();

		const ogUrl = attr(html(), 'property', 'og:url');
		expect(ogUrl).not.toBeNull();
		expect(new URL(ogUrl as string).host).toBe(new URL(prodUrl as string).host);
	});

	// 그림은 실제로 있는 파일을 가리켜야 한다.
	it('공유 그림이 실재하는 파일을 가리킨다', () => {

		const ogImage = attr(html(), 'property', 'og:image');
		expect(ogImage).not.toBeNull();

		const asset = new URL(ogImage as string).pathname;
		expect(fs.existsSync(path.join(process.cwd(), 'public', asset))).toBe(true);
	});
});
