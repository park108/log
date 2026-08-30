import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// 입력 칸은 접근 이름을 가져야 한다.
//
// `placeholder` 는 그 자리를 대신하지 못한다 — 실측: CommentForm 의 이름 칸과
// 본문 칸의 접근 이름이 둘 다 "" 였다 (`computeAccessibleName`). 낭독기는 무엇을
// 넣는 칸인지 알리지 못하고, 입력이 시작되면 화면에서도 문구가 사라진다.
//
// 렌더 테스트로는 그 시점에 화면에 있는 칸만 덮는다. 이 게이트는 소스 전체를
// 훑어 새로 추가되는 칸도 같은 규칙 아래 둔다.

const SRC = join(process.cwd(), 'src');

const walk = (dir: string, out: string[] = []): string[] => {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) out.push(p);
	}
	return out;
};

/** 중괄호·따옴표를 세면서 여는 태그의 속성부를 잘라낸다 — 중첩 표현식이 흔하다. */
const openingTags = (text: string, names: string[]): Array<{ tag: string; attrs: string; line: number }> => {
	const found: Array<{ tag: string; attrs: string; line: number }> = [];
	const re = new RegExp('<(' + names.join('|') + ')(?=[\\s/>])', 'g');
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		let i = m.index + m[0].length;
		let depth = 0;
		let quote: string | null = null;
		while (i < text.length) {
			const c = text[i]!;
			if (quote) { if (c === quote) quote = null; }
			else if ('"' === c || "'" === c) quote = c;
			else if ('{' === c) depth += 1;
			else if ('}' === c) depth -= 1;
			else if ('>' === c && 0 === depth) break;
			i += 1;
		}
		found.push({
			tag: m[1]!,
			attrs: text.slice(m.index + m[0].length, i),
			line: text.slice(0, m.index).split('\n').length,
		});
	}
	return found;
};

describe('입력 칸의 접근 이름', () => {

	it('placeholder 만 가진 입력 칸이 없다', () => {

		const files = walk(SRC);
		expect(files.length, '스캔 대상이 0건이다 — 판정이 공허하다').toBeGreaterThan(10);

		const seen: string[] = [];
		const unnamed: string[] = [];

		for (const file of files) {
			const text = readFileSync(file, 'utf8');
			const labelledFor = new Set(
				[...text.matchAll(/htmlFor=(?:"([\w-]+)"|\{(\w+)\})/g)].map((m) => m[1] ?? m[2]!));

			for (const { tag, attrs, line } of openingTags(text, ['input', 'textarea', 'select'])) {
				if (/type=["']hidden/.test(attrs)) continue;
				seen.push(file + ':' + line);

				const id = /\bid=(?:"([\w-]+)"|\{(\w+)\})/.exec(attrs);
				const named = attrs.includes('aria-label')
					|| attrs.includes('aria-labelledby')
					|| Boolean(id && labelledFor.has(id[1] ?? id[2]!));

				if (!named) unnamed.push(file.replace(SRC, 'src') + ':' + line + ' <' + tag + '>');
			}
		}

		expect(seen.length, '입력 칸을 하나도 찾지 못했다 — 스캐너가 어긋났다').toBeGreaterThanOrEqual(6);
		expect(unnamed, '접근 이름 없는 입력 칸: ' + unnamed.join(', ')).toEqual([]);
	});
});

// 문서 언어. 글도 댓글도 한국어인데 `lang="en"` 이면 화면 낭독기가 한국어 본문을
// 영어 음성으로 읽는다. UI 문구 일부는 영어지만 분량은 본문이 압도한다.
describe('문서 언어 선언', () => {

	it('index.html 이 한국어를 선언한다', () => {

		const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
		const lang = /<html[^>]*\slang="([^"]*)"/.exec(html)?.[1];

		expect(lang, 'index.html 에서 <html lang> 을 읽지 못했다 — 판정이 공허하다').toBeDefined();
		expect(lang).toBe('ko');
	});
});
