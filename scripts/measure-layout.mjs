#!/usr/bin/env node
//
// 실제 브라우저로 레이아웃을 재는 수동 도구.
//
// ## 왜 있나
//
// jsdom 은 레이아웃을 계산하지 않는다. 그래서 "이 팝업이 어디에 뜨는가",
// "모바일에서 가로로 넘치는가", "두 조작부의 글자가 같은 줄에 있는가" 같은
// 물음은 테스트로 판정할 수 없었고, 그때마다 눈으로 확인해 달라고 미뤘다.
//
// 이 도구는 시스템에 이미 있는 Chrome 을 CDP 로 몰아 그 물음에 답한다.
// 의존성을 더하지 않는다 — Node 의 전역 `fetch` 와 `WebSocket` 만 쓴다.
//
// 실제로 잡은 것 (2026-08-30):
//   • 호버 팝업에 `position: relative` 만 주면 shrink-to-fit 가용 폭이 트리거
//     폭으로 좁아져 글자가 세로로 접힌다 (version 팝업 높이 77 → 194).
//     followup 이 권고한 형태 그대로였고, 재보지 않았으면 그대로 나갔다.
//   • Edit 와 Delete 의 박스가 다르다(높이 17 vs 26.6)는 이유로 "어긋났다" 고
//     판단할 뻔했으나, **글자** 위치를 재니 셋 다 정확히 같은 자리였다.
//     `<button>` 이 inline-block 이라 line-height 여백을 박스에 포함할 뿐이다.
//     멀쩡한 것을 고치지 않은 것도 이 도구의 성과다.
//
// ## 왜 CI 에 없나
//
// 헤드리스 브라우저가 의존성에 없고, 넣으면 설치 시간과 버전 드리프트를
// 떠안는다. 배치 계약은 정적 게이트로 지키고 (`__tests__/hover-popup-anchoring`),
// 이 도구는 그 계약을 **정할 때** 쓴다.
//
// ## 쓰는 법
//
//   node scripts/measure-layout.mjs <파일경로|URL> [옵션]
//
//     --width 375,900     뷰포트 폭. 쉼표로 여러 개 (기본 375)
//     --select "a,b"      선택자별 박스·계산 스타일·글자 위치
//     --overflow          뷰포트를 가로로 넘는 요소 나열
//     --json              JSON 그대로 출력
//
// 측정 대상 HTML 은 보통 손으로 만든다 — 컴포넌트를 jsdom 에서 렌더해
// `container.innerHTML` 을 덤프하고, 실제 CSS(`src/**.css` + `build/assets/*.css`)를
// 함께 실으면 실물과 같은 조건이 된다. CSS 모듈 클래스는 jsdom 과 빌드의 해시가
// 다르므로 사람이 읽는 부분으로 짝지어 바꿔야 한다 — 그러지 않으면 모듈 규칙이
// 아예 적용되지 않은 채로 재게 된다 (실제로 그렇게 한 번 어긋났다).

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME_CANDIDATES = [
	process.env['CHROME_PATH'],
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
].filter(Boolean);

const findChrome = () => {
	for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
	return null;
};

const parseArgs = (argv) => {
	const target = argv[0];
	const opt = { widths: [375], select: [], overflow: false, json: false };
	for (let i = 1; i < argv.length; i++) {
		if ('--width' === argv[i]) opt.widths = String(argv[++i]).split(',').map(Number);
		else if ('--select' === argv[i]) opt.select = String(argv[++i]).split(',').map((s) => s.trim()).filter(Boolean);
		else if ('--overflow' === argv[i]) opt.overflow = true;
		else if ('--json' === argv[i]) opt.json = true;
	}
	return { target, opt };
};

// 페이지 안에서 도는 측정식. 박스만 보지 않는다 — 사람이 보는 것은 글리프이므로
// 텍스트 노드의 Range 도 함께 잰다.
const expression = (selectors, wantOverflow) => `(() => {
	const round = (n) => Math.round(n * 100) / 100;
	const box = (el) => { const r = el.getBoundingClientRect();
		return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) }; };
	const glyph = (el) => {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode();
		while (node && !node.textContent.trim()) node = walker.nextNode();
		if (!node) return null;
		const range = document.createRange();
		range.selectNodeContents(node);
		const r = range.getBoundingClientRect();
		return { top: round(r.top), bottom: round(r.bottom), text: node.textContent.trim().slice(0, 24) };
	};
	const vw = document.documentElement.clientWidth;
	const out = { viewport: vw, docScrollWidth: document.documentElement.scrollWidth, nodes: [] };

	for (const sel of ${JSON.stringify(selectors)}) {
		const el = document.querySelector(sel);
		if (!el) { out.nodes.push({ selector: sel, found: false }); continue; }
		const c = getComputedStyle(el);
		out.nodes.push({ selector: sel, found: true, tag: el.tagName.toLowerCase(),
			box: box(el), glyph: glyph(el),
			style: { display: c.display, position: c.position, lineHeight: c.lineHeight,
				verticalAlign: c.verticalAlign, fontSize: c.fontSize, fontWeight: c.fontWeight,
				color: c.color, backgroundColor: c.backgroundColor,
				border: c.borderTopWidth + ' ' + c.borderTopStyle,
				padding: c.paddingTop + ' ' + c.paddingRight + ' ' + c.paddingBottom + ' ' + c.paddingLeft,
				overflowX: c.overflowX, width: c.width } });
	}

	if (${wantOverflow ? 'true' : 'false'}) {
		out.overflow = [];
		for (const el of document.querySelectorAll('*')) {
			const r = el.getBoundingClientRect();
			if (0 === r.width && 0 === r.height) continue;
			if (r.x + r.width > vw + 0.5 || r.x < -0.5) {
				out.overflow.push({ tag: el.tagName.toLowerCase(),
					cls: String(el.className || '').slice(0, 60), box: box(el),
					overflowX: getComputedStyle(el).overflowX,
					text: (el.textContent || '').trim().slice(0, 40) });
			}
		}
		out.overflow = out.overflow.slice(0, 20);
	}
	return JSON.stringify(out);
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const measure = async (chrome, url, width, selectors, wantOverflow) => {

	const port = 9400 + Math.floor(width % 100);
	const profile = mkdtempSync(join(tmpdir(), 'measure-layout-'));

	const proc = spawn(chrome, [
		'--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
		'--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank',
	], { stdio: 'ignore' });

	try {
		let targets = null;
		for (let i = 0; i < 80; i++) {
			await sleep(250);
			try {
				const res = await fetch('http://127.0.0.1:' + port + '/json/list');
				targets = await res.json();
				if (targets.length) break;
			}
			catch { /* 아직 안 떴다 */ }
		}
		if (!targets || !targets.length) throw new Error('Chrome 연결 실패 (포트 ' + port + ')');

		const page = targets.find((t) => 'page' === t.type);
		const ws = new WebSocket(page.webSocketDebuggerUrl);
		let id = 0;
		const pending = new Map();
		const send = (method, params = {}) => new Promise((res) => {
			const n = ++id;
			pending.set(n, res);
			ws.send(JSON.stringify({ id: n, method, params }));
		});
		ws.onmessage = (e) => {
			const m = JSON.parse(e.data);
			if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
		};
		await new Promise((res) => { ws.onopen = res; });

		await send('Page.enable');
		// `--window-size` 는 페이지의 clientWidth 에 반영되지 않는다 (실측: 320 을
		// 줘도 500). 뷰포트는 에뮬레이션으로 못 박는다.
		await send('Emulation.setDeviceMetricsOverride', {
			width, height: 1400, deviceScaleFactor: 1, mobile: width < 500,
		});
		await send('Page.navigate', { url });
		await sleep(1200);

		const r = await send('Runtime.evaluate', {
			expression: expression(selectors, wantOverflow), returnByValue: true,
		});
		ws.close();
		if (!r || !r.result || 'string' !== typeof r.result.value) {
			throw new Error('측정식이 값을 내지 못했다: ' + JSON.stringify(r));
		}
		return JSON.parse(r.result.value);
	}
	finally {
		proc.kill();
		try { rmSync(profile, { recursive: true, force: true }); } catch { /* 임시 경로다 */ }
	}
};

const report = (width, data) => {
	console.log('== ' + width + 'px ==');
	console.log('   문서 scrollWidth ' + data.docScrollWidth
		+ (data.docScrollWidth > data.viewport ? '  ← 가로 스크롤 발생' : ''));

	for (const n of data.nodes) {
		if (!n.found) { console.log('   ' + n.selector + '  없음'); continue; }
		console.log('   ' + n.selector + '  <' + n.tag + '>');
		console.log('      박스 x=' + n.box.x + ' y=' + n.box.y + ' w=' + n.box.w + ' h=' + n.box.h);
		if (n.glyph) console.log('      글자 top=' + n.glyph.top + ' bottom=' + n.glyph.bottom + '  ' + JSON.stringify(n.glyph.text));
		console.log('      ' + n.style.display + ' / ' + n.style.position + ' / line-height ' + n.style.lineHeight
			+ ' / ' + n.style.fontSize + ' ' + n.style.fontWeight);
		console.log('      color ' + n.style.color + '  bg ' + n.style.backgroundColor
			+ '  border ' + n.style.border + '  padding ' + n.style.padding);
	}

	if (data.overflow) {
		if (!data.overflow.length) console.log('   가로로 넘치는 요소 없음');
		for (const o of data.overflow) {
			console.log('   넘침 <' + o.tag + '> ' + o.cls);
			console.log('      x=' + o.box.x + ' w=' + o.box.w + ' overflowX=' + o.overflowX + '  ' + JSON.stringify(o.text));
		}
	}
};

const main = async () => {

	const { target, opt } = parseArgs(process.argv.slice(2));

	if (!target) {
		console.error('사용법: node scripts/measure-layout.mjs <파일경로|URL> [--width 375,900] [--select "a,b"] [--overflow] [--json]');
		process.exit(2);
	}

	const chrome = findChrome();
	if (!chrome) {
		console.error('Chrome 을 찾지 못했다. CHROME_PATH 로 지정한다.');
		console.error('찾아본 곳: ' + CHROME_CANDIDATES.join(', '));
		process.exit(2);
	}

	const url = /^https?:\/\//.test(target) ? target : 'file://' + resolve(target);
	const results = {};

	for (const width of opt.widths) {
		const data = await measure(chrome, url, width, opt.select, opt.overflow);
		results[width] = data;
		if (!opt.json) report(width, data);
	}

	if (opt.json) console.log(JSON.stringify(results, null, 2));
};

main().catch((err) => { console.error(String(err && err.message ? err.message : err)); process.exit(1); });
