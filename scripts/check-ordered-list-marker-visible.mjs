#!/usr/bin/env node
//
// 본문 번호 목록의 표지(`2024.` 등)가 잘리지 않는지 **실제 레이아웃**으로 판정한다.
// spec: `logitem-ordered-list-marker-visible` §동작 1·2 · §수용 기준 1.
//
// ## 왜 있나
//
// 바깥 표지(`list-style-position` 기본값)는 `li` 왼쪽 바깥에 그려진다. 그 자리는
// article 패딩 1em + ol 패딩 1.4em = 38.4px(16px) 뿐이고, 더 넓은 표지는
// `overflow: auto` 인 `main.main--main-contents` 의 왼쪽 끝에서 잘린다 — `2024. 회고`
// 로 시작하는 글에서 독자는 `024.` 를 본다. jsdom 에는 레이아웃이 없어 어떤 렌더
// 테스트도 이것을 보지 못한다. CI 쪽 방어는 정적 대리 게이트
// (`src/__tests__/ordered-list-marker-not-clipped.test.ts`) 가 지고, 그 수치 근거가
// 이 스크립트의 출력이다. CI 에 헤드리스 브라우저를 넣지 않는 이유는
// `scripts/measure-layout.mjs` 머리말과 같다.
//
// ## 무엇을 싣나
//
// 입력 넷 (spec §수용 기준 1):
//   넓은 둘  `2024. 회고\n2025. 계획` · `20241231. x`
//   좁은 둘  `1. 하나\n2. 둘` · `10. 열\n11. 열하나`
// 각각 `sanitizeHtml(markdownToHtml(x))` 를 만들어 실제 CSS(`src/styles/index.css` 와
// 그 `@import`)와 래퍼 체인
//   main.main--main-contents > div > article.article--main-item > section.section--logitem-contents
// 에 싣고 폭 375 · 1280 에서 잰다.
//
// 글꼴 조건 둘 — 표지 폭은 숫자 폭이 정하고 숫자 폭은 글꼴이 정한다.
//   as-is          CSS 그대로, 요청도 막지 않는다. 웹폰트가 실리면 `webfont=loaded`.
//                  Pretendard 가 시스템에 설치된 기계에서는 웹폰트 없이도 Pretendard 로
//                  그려진다 (이 저장소의 작업 기계가 그렇다 — 실측).
//   no-pretendard  외부 요청을 전부 막고, 측정 영역의 계산 `font-family` 에서 Pretendard
//                  항목만 걷어 낸 나머지 체인을 덮어 씌운다 — 웹폰트도 로컬 설치본도
//                  없는 독자의 조건이다. 체인은 하드코딩하지 않고 계산값에서 도출한다.
//
// 파서·정제는 Node 에서 돈다. `src/**/*.ts` 는 Node 의 타입 걷기(type stripping)로
// 직접 import 하고, 확장자 없는 상대 import 는 아래 resolve 훅이 `.ts` 를 붙인다.
// `DOMPurify` 는 DOM 이 필요하므로 이미 devDependency 인 `jsdom` 창을 전역에 둔다.
// Chrome 은 `scripts/measure-layout.mjs` 와 같이 시스템의 것을 CDP 로 몬다 —
// 의존성을 더하지 않는다 (Node 전역 `fetch` · `WebSocket`).
//
// ## 표지 위치 근사식과 그 한계 (spec §참고 §판정면의 한계)
//
// 표지 박스(`::marker`)는 DOM API 로 직접 잴 수 없다. 그래서
//
//   outside  marker-left = li 내용 왼쪽 끝 − "N. " 폭
//   inside   marker-left = li 내용 왼쪽 끝
//
// 로 근사한다 (main 왼쪽 끝 기준). "N. " 폭은 그 `li` 안에 둔 보이지 않는 절대 위치
// span 으로 잰다 — 계산 글꼴을 그대로 물려받고, UA 의 `::marker` 기본 스타일
// (`font-variant-numeric: tabular-nums` · `white-space: pre`)을 따라 맞춘다.
// N 은 `start` + 항목 순번이다.
//
//   한계 1  바깥 표지의 오른쪽 끝이 li 내용 시작에 붙는다는 UA 배치를 가정한다.
//   한계 2  박스 기준이다. 글자 잉크는 첫 숫자의 왼쪽 여백(side bearing)만큼 안쪽에
//           있으므로 이 식은 잘림 쪽으로 보수적이다 (실제보다 먼저 잘렸다고 본다).
//   한계 3  `list-style-type` 이 decimal 이 아니면 문자열이 달라진다 — 출력에 찍는다.
//
//   보정 실측 (2026-10-13, Chrome headless, 16px): `main` 의 클리핑을 풀고 같은 목록 넷을
//   그려 스크린샷의 잉크 왼쪽 끝과 이 근사를 비교했다. 항목 14개 × 글꼴 조건 둘에서
//   잉크 − 근사 = +0.52 ~ +2.34px — 근사는 언제나 잉크보다 왼쪽이었다 (한계 2 의 방향).
//   잉크 오른쪽 끝은 li 내용 시작보다 5~6px 왼쪽이었다 — 뒤따르는 공백 폭이다 (한계 1).
//
// 오차 여유 TOL = 0.5px. 판정:
//   clipped  어느 항목이든 marker-left < −TOL                     (입력 넷 모두)
//   moved    li-left 가 38.4px 에서 TOL 넘게 벗어난다             (좁은 둘만 — 동작 2)
// li-left 는 레이아웃 단위(1/64px) 때문에 38.39 로 찍힌다 — TOL 안이다.
//
// ## 출력과 종료 코드
//
//   html start=<N> <정제된 HTML>                                         입력마다 1줄
//   mode=<m> webfont=<loaded|absent> width=<w> start=<N> class=<c> padding=<p> ch=<px>
//     marker="<가장 왼쪽 표지>" marker-w=<px> marker-left=<px> li-left=<px>
//     list-style=<position>/<type> verdict=<ok|clipped|moved>            입력 × 폭 × 조건
//   clipped=<N> moved=<N> measured=<n>/<기대>                            요약 1줄
//
//   exit 0  위반 0
//   exit 1  위반 1건 이상
//   exit 2  무판정 — Chrome 이 없다 · 파서/정제를 못 불렀다 · CSS 가 실리지 않았다 ·
//           Pretendard 를 걷지 못했다 · 잰 줄이 기대 수와 다르다. **통과가 아니다.**
//
// ## seam
//
//   ORDERED_LIST_MARKER_CHROME  Chrome 실행 파일 경로. 지정했는데 그 파일이 없으면
//                               다른 후보로 넘어가지 않고 exit 2 한다 — 지정이 조용히
//                               무시되면 무판정 경로를 잴 수 없다.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SEAM = 'ORDERED_LIST_MARKER_CHROME';
const CHROME_CANDIDATES = [
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
];

const CASES = [
	{ markdown: '2024. 회고\n2025. 계획', kind: 'wide' },
	{ markdown: '20241231. x', kind: 'wide' },
	{ markdown: '1. 하나\n2. 둘', kind: 'narrow' },
	{ markdown: '10. 열\n11. 열하나', kind: 'narrow' },
];
const WIDTHS = [375, 1280];
const MODES = ['as-is', 'no-pretendard'];

const TOL = 0.5;
const NARROW_LI_LEFT = 38.4;

class NoVerdict extends Error {}

const findChrome = () => {
	const seam = process.env[SEAM];
	if (undefined !== seam && '' !== seam) return existsSync(seam) ? seam : null;
	for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
	return null;
};

// ── 파서 · 정제 (Node) ──────────────────────────────────────────────────────

const loadRenderer = async () => {
	registerHooks({
		resolve(specifier, context, nextResolve) {
			try {
				return nextResolve(specifier, context);
			}
			catch (err) {
				const fromTs = context.parentURL && context.parentURL.endsWith('.ts');
				if (fromTs && specifier.startsWith('.')) return nextResolve(specifier + '.ts', context);
				throw err;
			}
		},
	});
	const { JSDOM } = await import('jsdom');
	globalThis.window = new JSDOM('').window;
	const parser = await import(pathToFileURL(join(ROOT, 'src/common/markdownParser.ts')).href);
	const sanitizer = await import(pathToFileURL(join(ROOT, 'src/common/sanitizeHtml.ts')).href);
	return (markdown) => sanitizer.default(parser.markdownToHtml(markdown));
};

const pageHtml = (body) => '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
	+ '<meta name="viewport" content="width=device-width, initial-scale=1">'
	+ '<link rel="stylesheet" href="' + pathToFileURL(join(ROOT, 'src/styles/index.css')).href + '">'
	+ '</head><body><div id="root"><main class="main main--main-contents"><div>'
	+ '<article class="article article--main-item" role="listitem">'
	+ '<section class="section section--logitem-contents">' + body + '</section>'
	+ '</article></div></main></div></body></html>';

// ── 페이지 안 측정식 ────────────────────────────────────────────────────────

const expression = (stripPretendard) => `(async () => {
	const main = document.querySelector('main.main--main-contents');
	const section = main && main.querySelector('section.section--logitem-contents');
	const ol = section && section.querySelector(':scope > ol');
	if (!ol) return JSON.stringify({ error: 'ol 없음' });

	if (${stripPretendard ? 'true' : 'false'}) {
		const chain = getComputedStyle(section).fontFamily;
		const rest = chain.split(',').map((s) => s.trim()).filter((s) => !/pretendard/i.test(s)).join(', ');
		if (!rest || rest === chain) return JSON.stringify({ error: 'Pretendard 를 걷지 못했다: ' + chain });
		const style = document.createElement('style');
		style.textContent = 'main.main--main-contents, main.main--main-contents * { font-family: '
			+ rest + ' !important; }';
		document.head.appendChild(style);
	}

	document.body.offsetWidth;
	await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]);
	await new Promise((r) => setTimeout(r, 50));

	const cssApplied = 'auto' === getComputedStyle(main).overflowX
		&& 'break-word' === getComputedStyle(section).overflowWrap;
	const mainLeft = main.getBoundingClientRect().left + main.clientLeft;

	const chProbe = document.createElement('span');
	chProbe.style.cssText = 'position:absolute;visibility:hidden;width:1ch;';
	ol.appendChild(chProbe);
	const ch = chProbe.getBoundingClientRect().width;
	chProbe.remove();

	const startAttr = ol.getAttribute('start');
	const start = BigInt(null === startAttr ? '1' : startAttr);
	const items = [...ol.children].filter((el) => 'LI' === el.tagName).map((li, i) => {
		const cs = getComputedStyle(li);
		const r = li.getBoundingClientRect();
		const contentLeft = r.left + li.clientLeft + parseFloat(cs.paddingLeft);
		const probe = document.createElement('span');
		probe.textContent = String(start + BigInt(i)) + '. ';
		probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;'
			+ 'font-variant-numeric:tabular-nums;text-transform:none;';
		li.appendChild(probe);
		const w = probe.getBoundingClientRect().width;
		probe.remove();
		const inside = 'inside' === cs.listStylePosition;
		return { marker: probe.textContent, markerW: w, liLeft: contentLeft - mainLeft,
			markerLeft: (inside ? contentLeft : contentLeft - w) - mainLeft,
			position: cs.listStylePosition, type: cs.listStyleType };
	});
	const webfont = [...document.fonts].some((f) => /pretendard/i.test(f.family) && 'loaded' === f.status);
	return JSON.stringify({ cssApplied, webfont: webfont ? 'loaded' : 'absent', ch,
		olClass: ol.className, olPadding: getComputedStyle(ol).paddingInlineStart, items });
})()`;

// ── CDP ─────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const launch = async (chrome, profile) => {
	const proc = spawn(chrome, [
		'--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
		'--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
	], { stdio: 'ignore' });
	const exited = new Promise((r) => proc.once('exit', r));

	// 포트를 고정하지 않는다 — 동시에 도는 다른 측정과 부딪치지 않게 Chrome 이 고른
	// 포트를 `DevToolsActivePort` 에서 읽는다.
	let port = null;
	for (let i = 0; i < 80 && null === port; i++) {
		await sleep(250);
		try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf-8').split('\n')[0].trim() || null; }
		catch { /* 아직 안 떴다 */ }
	}
	return { proc, exited, port };
};

const connect = async (port) => {
	let targets = [];
	for (let i = 0; i < 40 && !targets.some((t) => 'page' === t.type); i++) {
		try { targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); }
		catch { await sleep(250); }
	}
	const page = targets.find((t) => 'page' === t.type);
	if (!page) throw new Error('page 대상을 찾지 못했다');

	const ws = new WebSocket(page.webSocketDebuggerUrl);
	let id = 0;
	const pending = new Map();
	const listeners = new Map();
	ws.onmessage = (e) => {
		const m = JSON.parse(e.data);
		if (m.id && pending.has(m.id)) {
			const { res, rej } = pending.get(m.id);
			pending.delete(m.id);
			if (m.error) rej(new Error(m.error.message)); else res(m.result);
		}
		else if (m.method && listeners.has(m.method)) {
			for (const fn of listeners.get(m.method).splice(0)) fn(m.params);
		}
	};
	await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket 연결 실패')); });

	const send = (method, params = {}) => new Promise((res, rej) => {
		const n = ++id;
		pending.set(n, { res, rej });
		ws.send(JSON.stringify({ id: n, method, params }));
	});
	const once = (method, ms) => new Promise((res) => {
		const timer = setTimeout(() => res(false), ms);
		if (!listeners.has(method)) listeners.set(method, []);
		listeners.get(method).push(() => { clearTimeout(timer); res(true); });
	});
	return { ws, send, once };
};

const measureAll = async (chrome, pages) => {
	const profile = mkdtempSync(join(tmpdir(), 'ol-marker-chrome-'));
	const { proc, exited, port } = await launch(chrome, profile);
	let cdp = null;
	try {
		if (null === port) throw new Error('Chrome 의 디버깅 포트를 읽지 못했다');
		cdp = await connect(port);
		await cdp.send('Page.enable');
		await cdp.send('Network.enable');

		const results = [];
		for (const mode of MODES) {
			const strip = 'no-pretendard' === mode;
			// 차단 패턴이다 — 특정 호스트를 가리키지 않는다.
			await cdp.send('Network.setBlockedURLs', { urls: strip ? ['http://*', 'https://*'] : [] });
			for (const width of WIDTHS) {
				await cdp.send('Emulation.setDeviceMetricsOverride', {
					width, height: 900, deviceScaleFactor: 1, mobile: width < 500,
				});
				for (const p of pages) {
					const loaded = cdp.once('Page.loadEventFired', 20000);
					await cdp.send('Page.navigate', { url: p.url });
					await loaded;
					const r = await cdp.send('Runtime.evaluate', {
						expression: expression(strip), awaitPromise: true, returnByValue: true,
					});
					if (!r || !r.result || 'string' !== typeof r.result.value) {
						throw new Error('측정식이 값을 내지 못했다: ' + JSON.stringify(r));
					}
					results.push({ mode, width, page: p, data: JSON.parse(r.result.value) });
				}
			}
		}
		return results;
	}
	finally {
		if (cdp) {
			try { await Promise.race([cdp.send('Browser.close'), sleep(2000)]); } catch { /* 아래에서 죽인다 */ }
			try { cdp.ws.close(); } catch { /* 이미 닫혔다 */ }
		}
		if (null === proc.exitCode && null === proc.signalCode) proc.kill('SIGTERM');
		const done = await Promise.race([exited.then(() => true), sleep(5000).then(() => false)]);
		if (!done) { proc.kill('SIGKILL'); await Promise.race([exited, sleep(2000)]); }
		try { rmSync(profile, { recursive: true, force: true }); } catch { /* 임시 경로다 */ }
	}
};

// ── 판정 ────────────────────────────────────────────────────────────────────

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);

const judge = (results) => {
	let clipped = 0;
	let moved = 0;
	let measured = 0;
	for (const { mode, width, page, data } of results) {
		const where = 'start=' + page.start + ' width=' + width + ' mode=' + mode;
		if (data.error) throw new NoVerdict(where + ': ' + data.error);
		if (!data.cssApplied) throw new NoVerdict('실제 CSS 가 실리지 않았다 (' + where + ')');
		if (!data.items.length) throw new NoVerdict('li 가 없다 (' + where + ')');

		const leftmost = data.items.reduce((a, b) => (b.markerLeft < a.markerLeft ? b : a));
		const isClipped = leftmost.markerLeft < -TOL;
		const isMoved = 'narrow' === page.kind
			&& data.items.some((it) => Math.abs(it.liLeft - NARROW_LI_LEFT) > TOL);
		if (isClipped) clipped++;
		if (isMoved) moved++;
		measured++;

		const verdict = [isClipped ? 'clipped' : '', isMoved ? 'moved' : ''].filter(Boolean).join(',') || 'ok';
		console.log('mode=' + mode + ' webfont=' + data.webfont + ' width=' + width + ' start=' + page.start
			+ ' class=' + (data.olClass || '-') + ' padding=' + data.olPadding + ' ch=' + fmt(data.ch)
			+ ' marker=' + JSON.stringify(leftmost.marker) + ' marker-w=' + fmt(leftmost.markerW)
			+ ' marker-left=' + fmt(leftmost.markerLeft) + ' li-left=' + fmt(leftmost.liLeft)
			+ ' list-style=' + leftmost.position + '/' + leftmost.type
			+ ' verdict=' + verdict);
	}
	return { clipped, moved, measured };
};

const run = async () => {

	const chrome = findChrome();
	if (!chrome) {
		const seam = process.env[SEAM];
		throw new NoVerdict(seam
			? SEAM + '=' + seam + ' 가 없다 — 다른 후보로 넘어가지 않는다'
			: 'Chrome 을 찾지 못했다 (' + CHROME_CANDIDATES.join(', ') + ')');
	}

	let render;
	try { render = await loadRenderer(); }
	catch (err) { throw new NoVerdict('파서·정제를 불러오지 못했다: ' + (err && err.message ? err.message : err)); }

	const dir = mkdtempSync(join(tmpdir(), 'ol-marker-pages-'));
	try {
		const pages = CASES.map((c, i) => {
			const html = render(c.markdown);
			if (!/^<ol[\s>]/.test(html)) throw new NoVerdict('정제 산출이 번호 목록이 아니다: ' + JSON.stringify(html));
			const start = (/^<ol[^>]*\sstart="(\d+)"/.exec(html) || [null, '1'])[1];
			console.log('html start=' + start + ' ' + html);
			const file = join(dir, 'case-' + i + '.html');
			writeFileSync(file, pageHtml(html));
			return { ...c, start, url: pathToFileURL(file).href };
		});

		let results;
		try { results = await measureAll(chrome, pages); }
		catch (err) { throw new NoVerdict('측정 실패: ' + (err && err.message ? err.message : err)); }

		const expected = CASES.length * WIDTHS.length * MODES.length;
		const { clipped, moved, measured } = judge(results);
		console.log('clipped=' + clipped + ' moved=' + moved + ' measured=' + measured + '/' + expected);
		if (measured !== expected) throw new NoVerdict('잰 줄이 기대 수와 다르다');
		return (clipped + moved) > 0 ? 1 : 0;
	}
	finally {
		rmSync(dir, { recursive: true, force: true });
	}
};

run().then(
	(code) => { process.exitCode = code; },
	(err) => {
		const message = err && err.message ? err.message : String(err);
		console.error('check-ordered-list-marker-visible: 무판정 — ' + message + ' (통과가 아니다)');
		process.exitCode = 2;
	},
);
