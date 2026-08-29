import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

// 네이티브 <button> 에 커스텀 클래스를 주면서 **브라우저 기본 표기 리셋을
// 빠뜨리는** 실수가 2026-08-29~30 사이에 세 번 반복됐다.
//
//   1. 푸터 로그인 — 이름처럼 보여야 하는데 테두리 있는 버튼이 됐다
//   2. 글 상단 Delete — 옆의 Edit(텍스트)와 다른 물건처럼 보였다
//   3. Writer [IMG]·모드 토글 — 같은 증상
//
// span[role=button] → button 전환이 계속 이어지므로 개별 대응으로는 부족하다.
// 리셋 없이 새 지점이 생기면 여기서 붉어진다.

const REPO_ROOT = resolve(__dirname, '..', '..');
const SRC = join(REPO_ROOT, 'src');

const walk = (dir: string, pred: (p: string) => boolean, out: string[] = []): string[] => {
	for (const name of readdirSync(dir)) {
		if (name.startsWith('.')) continue;
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			if (!/node_modules|__fixtures__/.test(p)) walk(p, pred, out);
		} else if (pred(p)) out.push(p);
	}
	return out;
};

/** <button> 의 className 에 등장하는 커스텀 클래스. 버튼 시스템(btn*)은 자체 표기를 가지므로 제외. */
const buttonClasses = (): Set<string> => {
	const found = new Set<string>();
	for (const f of walk(SRC, (p) => /\.tsx$/.test(p) && !/\.test\./.test(basename(p)))) {
		const text = readFileSync(f, 'utf8');
		for (const tag of text.matchAll(/<button[\s\S]{0,320}?>/g)) {
			const cm = /className=\{?[`"']([^`"'}]+)/.exec(tag[0]);
			if (!cm) continue;
			for (const c of cm[1]!.split(/\s+/)) {
				if (!c || c === 'button' || c.startsWith('btn') || c.startsWith('${')) continue;
				found.add(c.replace(/^styles\./, ''));
			}
		}
	}
	return found;
};

const allCss = (): string =>
	walk(SRC, (p) => /\.css$/.test(p)).map((f) => readFileSync(f, 'utf8')).join('\n');

// 리셋으로 인정하는 선언. 배경·테두리를 **직접 정하는** 경우도 의도된 표기이므로 통과시킨다.
const RESET = /appearance\s*:|background\s*:|border\s*:|font\s*:|font-family\s*:/;

describe('네이티브 button 은 기본 표기를 리셋한다', () => {

	it('button 에 쓰인 커스텀 클래스가 CSS 에 실재하고 리셋을 갖는다', () => {

		const classes = [...buttonClasses()].filter((c) => c !== 'span' && c !== 'div');

		// 공허 통과 차단 — 도출이 비면 "누락 0" 은 무조건 참이다.
		expect(
			classes.length,
			'button 커스텀 클래스를 하나도 찾지 못했다 — 스캔이 어긋났다',
		).toBeGreaterThanOrEqual(3);

		const css = allCss();
		const missing: string[] = [];

		for (const c of classes) {
			const rule = new RegExp('\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
			const m = rule.exec(css);
			if (!m) { missing.push(c + ' (CSS 규칙 없음)'); continue; }
			if (!RESET.test(m[1]!)) missing.push(c);
		}

		expect(
			missing,
			`네이티브 button 인데 기본 표기 리셋이 없다 — 옆의 텍스트 조작부와 다른 물건처럼 보인다: ${missing.join(', ')}`,
		).toEqual([]);
	});
});
