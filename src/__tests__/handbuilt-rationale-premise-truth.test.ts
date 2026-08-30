import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';

// 손조립 조작부(`role="button"`)를 **유지하는 근거 주석**이 인용하는 `position:` 값은
// 그 파일이 실제로 렌더하는 클래스의 CSS 선언과 일치해야 한다.
//
// 계기: `7cd575a` 가 두 트리거에 "네이티브 button 으로 전환하지 않는다" 는 판단과
// 근거를 박제했고, `520f906` 이 팝업을 `position: fixed` + 좌표 부재에서
// `position: absolute` + 명시 좌표로 바꿨다. 전제는 거짓이 됐는데 어떤 rc 도 바뀌지
// 않았다 — 이 축을 보는 게이트가 하나도 없었기 때문이다. 근거 주석은 미래의 판단을
// **선점**하므로, 거짓이 된 전제는 이미 사라진 위험으로 다음 사람의 전환을 막는다.
//
// ── 검출 경계 (과신 금지) ────────────────────────────────────────────────────
//
// 1. **어느 클래스를 가리킨 인용인지** 는 주석이 클래스를 명시했을 때만 좁혀 본다.
//    주석이 백틱으로 `` `.kebab-class` `` 또는 `styles.ident` 를 적으면 그 클래스의
//    규칙과 대조하고, 아무 클래스도 적지 않으면 **그 파일이 렌더하는 클래스 중
//    최소 1개**가 그 값을 선언하는지만 본다. 후자는 한 파일이 여러 position 값을
//    쓰면 오인의 여지가 있다 (실측: 확대 이미지 지점은 팝업 배경과 확대 이미지가
//    둘 다 `fixed` 다 — 어느 쪽을 가리킨 인용인지 이 게이트는 구분하지 못한다).
// 2. 주석의 **의미** 는 재지 않는다 — 근거가 그 지점에 고유한지(I1), 전제가 바뀐
//    뒤 결론이 함께 정정됐는지(I3) 는 명령으로 rc 판정되지 않는다. 소유 spec 의
//    §참고 §미측정·비판정 항목이 그 방향을 사람 리뷰로 이관해 두었다.
// 3. 좌표·폭·런타임 DOM 조상은 `__tests__/hover-popup-anchoring` 소관이며 여기서
//    중복 측정하지 않는다. 여기서 재는 것은 `position` 값의 인용 정합 하나다.
// 4. 클래스 이름은 전 CSS 를 통틀어 조회한다. 서로 다른 파일이 같은 클래스 이름을
//    쓰면 구분하지 못한다 (현 트리에는 그런 충돌이 없다).
//
// spec: specs/30.spec/green/common/handbuilt-control-rationale-truth.md §동작 (I2)

const REPO_ROOT = resolve(__dirname, '..', '..');
const SRC = join(REPO_ROOT, 'src');

const walk = (dir: string, pred: (p: string) => boolean, out: string[] = []): string[] => {
	for (const name of readdirSync(dir)) {
		if (name.startsWith('.')) continue;
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			if (!/node_modules/.test(p)) walk(p, pred, out);
		} else if (pred(p)) out.push(p);
	}
	return out;
};

const sourceFiles = (): string[] =>
	walk(SRC, (p) => /\.tsx$/.test(p) && !/\.test\./.test(basename(p)));

const allCss = (): string =>
	walk(SRC, (p) => /\.css$/.test(p)).map((f) => readFileSync(f, 'utf8')).join('\n');

/** 클래스 선택자의 규칙 본문을 모두 모은다 (여러 규칙에 흩어져 있을 수 있다). */
const rulesFor = (css: string, className: string): string => {
	const found: string[] = [];
	const re = new RegExp('(^|[,{}\\s])\\.' + className.replace(/[-]/g, '\\-') + '(?=[\\s,{:])', 'g');
	let m: RegExpExecArray | null;
	while ((m = re.exec(css)) !== null) {
		const open = css.indexOf('{', m.index);
		const close = css.indexOf('}', open);
		if (open > -1 && close > open) found.push(css.slice(open + 1, close));
	}
	return found.join('\n');
};

/** 규칙 본문이 선언한 position 값들. */
const positionsIn = (rule: string): string[] =>
	[...rule.matchAll(/position:\s*([A-Za-z-]+)/g)].map((m) => m[1]!);

/** 모집단 — 손조립 조작부를 가진 non-test 소스. 목록을 박지 않고 도출한다. */
const handbuiltFiles = (): string[] =>
	sourceFiles().filter((f) => /role=\{?["']button["']\}?/.test(readFileSync(f, 'utf8')));

/** 연속된 `//` 줄 묶음과 `/* … *\/` 블록을 각각 하나의 주석 블록으로 본다. */
const commentBlocks = (text: string): string[] => {
	const blocks: string[] = [];
	for (const m of text.matchAll(/\/\*[\s\S]*?\*\//g)) blocks.push(m[0]);
	let run: string[] = [];
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (trimmed.startsWith('//')) run.push(trimmed);
		else if (run.length) { blocks.push(run.join('\n')); run = []; }
	}
	if (run.length) blocks.push(run.join('\n'));
	return blocks;
};

/**
 * CSS 모듈 이름 변환은 **정방향만** 쓴다 (`vite.config.js` 의
 * `localsConvention: 'camelCaseOnly'` 와 같은 규칙). 역변환은 `--` 와 `-` 가 모두
 * 대문자로 접혀 모호하다.
 */
const camel = (selector: string): string => selector.replace(/-+(\w)/g, (_, c: string) => (c as string).toUpperCase());

/** 파일이 import 한 `*.module.css` 의 클래스 선택자를 정방향 접어 식별자 → 원 선택자 맵으로. */
const moduleIdentMap = (file: string, text: string): Map<string, string> => {
	const map = new Map<string, string>();
	for (const im of text.matchAll(/from\s+['"]([^'"]+\.module\.css)['"]/g)) {
		const cssPath = resolve(dirname(file), im[1]!);
		let css: string;
		try { css = readFileSync(cssPath, 'utf8'); } catch { continue; }
		for (const sel of css.matchAll(/\.([A-Za-z][\w-]*)(?=[\s,{:.])/g)) {
			map.set(camel(sel[1]!), sel[1]!);
		}
	}
	return map;
};

/** 그 파일이 렌더하는 클래스 이름 집합 (전역 리터럴 토큰 + CSS 모듈 식별자). */
const renderedClasses = (file: string, text: string): Set<string> => {
	const out = new Set<string>();
	for (const m of text.matchAll(/className=\{?[`"']([^`"']*)/g)) {
		for (const token of m[1]!.split(/\s+/)) {
			if (!token || token.includes('$') || token.includes('{')) continue;
			out.add(token);
		}
	}
	const idents = moduleIdentMap(file, text);
	for (const m of text.matchAll(/\b\w+\.([A-Za-z]\w*)\b/g)) {
		const sel = idents.get(m[1]!);
		if (sel) out.add(sel);
	}
	return out;
};

/** 주석이 명시적으로 지목한 클래스 — `` `.kebab` `` 또는 `styles.ident`. */
const namedClasses = (block: string, idents: Map<string, string>): Set<string> => {
	const out = new Set<string>();
	for (const m of block.matchAll(/`\.([A-Za-z][\w-]*)`/g)) out.add(m[1]!);
	for (const m of block.matchAll(/\b\w+\.([A-Za-z]\w*)\b/g)) {
		const sel = idents.get(m[1]!);
		if (sel) out.add(sel);
	}
	return out;
};

interface Quote {
	file: string;
	value: string;
	scoped: string[];
	rendered: string[];
}

const quotes = (): Quote[] => {
	const out: Quote[] = [];
	for (const file of handbuiltFiles()) {
		const text = readFileSync(file, 'utf8');
		const idents = moduleIdentMap(file, text);
		const rendered = [...renderedClasses(file, text)];
		for (const block of commentBlocks(text)) {
			const values = [...block.matchAll(/position:\s*([A-Za-z-]+)/g)].map((m) => m[1]!);
			if (values.length === 0) continue;
			const named = [...namedClasses(block, idents)].filter((c) => rendered.includes(c));
			for (const value of values) out.push({ file, value, scoped: named, rendered });
		}
	}
	return out;
};

const rel = (p: string): string => p.replace(REPO_ROOT + '/', '');

describe('손조립 근거 주석의 CSS 인용은 현 HEAD 에서 참이다', () => {

	// 공허 통과 차단 (RULE-06 §추출 실패 검출) — 도출이 비면 "위반 0" 은 무조건 참이다.
	it('모집단과 렌더 클래스 도출이 공허하지 않다', () => {

		const scanned = sourceFiles();
		expect(scanned.length, 'tsx 스캔 대상이 없다 — walk 경로가 깨졌다').toBeGreaterThan(10);

		const files = handbuiltFiles();
		expect(
			files.length,
			'role="button" 손조립이 한 건도 안 잡혔다 — 표기가 바뀌었거나 추출이 깨졌다',
		).toBeGreaterThan(0);

		for (const file of files) {
			const text = readFileSync(file, 'utf8');
			expect(
				renderedClasses(file, text).size,
				rel(file) + ' 의 렌더 클래스 추출이 0 건이다 — 대조할 것이 없어 판정이 공허해진다',
			).toBeGreaterThan(0);
		}

		expect(allCss().length, 'CSS 를 한 글자도 읽지 못했다').toBeGreaterThan(0);
	});

	it('근거 주석에 position 인용이 실재한다', () => {

		const found = quotes();
		expect(
			found.length,
			'손조립 파일 전체에서 position 인용이 0 건이다 — 인용이 통째로 사라졌다면'
				+ ' 근거가 검증 불가능한 서술로 퇴화한 것이므로 통과로 읽지 않는다',
		).toBeGreaterThan(0);
	});

	it('인용된 position 값을 그 파일이 렌더하는 클래스가 실제로 선언한다', () => {

		const css = allCss();
		const failures: string[] = [];

		for (const q of quotes()) {
			// 주석이 클래스를 지목했으면 그 클래스로 좁힌다. 아니면 렌더 클래스 전체.
			const targets = q.scoped.length > 0 ? q.scoped : q.rendered;
			const declared = new Map<string, string[]>();
			for (const cls of targets) {
				const rule = rulesFor(css, cls);
				if (rule !== '') declared.set(cls, positionsIn(rule));
			}

			if (declared.size === 0) {
				failures.push(
					rel(q.file) + ': `position: ' + q.value + '` 인용의 대조 대상 클래스 규칙을'
						+ ' 하나도 찾지 못했다 (대상: ' + targets.join(', ') + ') — 판정이 공허하다',
				);
				continue;
			}

			const hit = [...declared.entries()].some(([, values]) => values.includes(q.value));
			if (!hit) {
				const detail = [...declared.entries()]
					.map(([cls, values]) => '.' + cls + ' → ' + (values.length ? values.join('/') : '(position 선언 없음)'))
					.join(', ');
				failures.push(
					rel(q.file) + ': 주석이 `position: ' + q.value + '` 를 인용하나 실제 CSS 는 ['
						+ detail + '] 다 — 근거의 전제가 거짓이다',
				);
			}
		}

		expect(
			failures.join('\n'),
			'근거 주석의 CSS 인용이 현 HEAD 와 어긋난다. 주석을 현 사실로 정정하거나'
				+ ' (근거가 사라졌다면) 그 근거가 지키던 손조립을 없애야 한다',
		).toBe('');
	});
});
