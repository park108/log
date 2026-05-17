/**
 * a11y 패턴 B audit — role="button" 전수 검증 (REQ-20260421-033 FR-08, Should).
 *
 * spec `30.spec/green/common/a11y.md` §audit 테스트 구현:
 *  - `src/**\/*.jsx` 의 `role="button"` 포함 JSX 요소를 전수 수집.
 *  - 각 요소에 대해 `tabIndex={0}` + `onKeyDown={activateOnKey(...)}` 동시 부여 검증.
 *  - 미충족 지점이 `a11y.audit.exemptions.js` 의 `PATTERN_B_EXEMPTIONS` 에 등재되어 있지
 *    않으면 **fail** (의도된 회귀 게이트).
 *
 * 구현 선택 근거 (간단형):
 *  - 간단형 (fs.readFile + line-based regex, JSX 요소 경계 = opening tag start/end 탐색)
 *    을 채택. AST 형 (`@babel/parser`) 은 정밀하나 의존성 추가 비용·CI 수행 성능 측면에서
 *    유보 — 본 프로젝트가 JSX 속성을 per-line 배치하는 통상 스타일을 따르므로 간단형으로
 *    충분한 정확도를 확보한다. AST 형 이관 필요 시 별 task 로 carve.
 *
 * native 분류:
 *  - `<button>`, `<a>`, `<input>`, `<textarea>`, `<select>`, `<summary>` 등 브라우저가 키보드
 *    활성을 기본 제공하는 요소는 자동 제외.
 *
 * auto-skip (onClick 부재):
 *  - `role="button"` + `tabIndex={0}` 만 부여된 요소 중 `onClick` 이 부재한 경우 activation
 *    의미가 부재 (예: hover/focus popup trigger) — audit 규칙이 onClick 을 전제로 동작하므로
 *    자동 제외. 관련 선례: M4 `src/Log/LogItemInfo.jsx:87` versions-button.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { PATTERN_B_EXEMPTIONS } from './a11y.audit.exemptions';

// ---------- 경로 상수 ----------

// a11y.audit.test.js 는 src/common/ 에 위치. repo root = 상위 2개 dir.
const SRC_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC_ROOT, '..');

// ---------- 파일 수집 ----------

const NATIVE_TAG_NAMES = new Set(['button', 'a', 'input', 'textarea', 'select', 'summary']);
const CONTEXT_WINDOW_LINES = 24; // opening tag 경계 탐색 안전망 (JSX 속성 per-line 기준 충분)

/**
 * src/ 하위 *.jsx 재귀 수집. `.test.`, `.audit.` 접두 파일 제외.
 * @returns {string[]} 파일 절대경로 목록.
 */
function collectProductionJsx(dir: string = SRC_ROOT, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		const s = statSync(full);
		if (s.isDirectory()) {
			collectProductionJsx(full, acc);
		} else if (s.isFile() && full.endsWith('.jsx')) {
			const base = path.basename(full);
			if (base.includes('.test.') || base.includes('.audit.')) continue;
			acc.push(full);
		}
	}
	return acc;
}

/**
 * `role="button"` 라인 i 를 감싸는 JSX opening tag 범위를 반환.
 *  - start: `<TagName` 이 포함된 가장 가까운 상위 라인.
 *  - end: start 이후 첫 등장하는 opening tag 종결 (`>` 또는 `/>`) 라인.
 * 추출 실패 시 null.
 *
 * @param {string[]} lines
 * @param {number} i role="button" 라인 index (0-based)
 * @returns {{ startLine: number, endLine: number, tagName: string } | null}
 */
function findOpeningTagRange(
	lines: string[],
	i: number,
): { startLine: number; endLine: number; tagName: string } | null {
	let startLine = -1;
	let tagName: string | null = null;
	// 상방 탐색: `<[A-Za-z]` (단, `</` 제외) 포함 라인.
	const upMin = Math.max(0, i - CONTEXT_WINDOW_LINES);
	for (let k = i; k >= upMin; k--) {
		const m = lines[k]!.match(/<([A-Za-z][A-Za-z0-9]*)\b(?![^<]*?\/>\s*$)/);
		if (m && !/<\//.test(lines[k]!.split('<' + m[1])[0] || '')) {
			startLine = k;
			tagName = m[1]!.toLowerCase();
			break;
		}
	}
	if (startLine < 0 || tagName === null) return null;
	// 하방 탐색: opening tag 닫힘 (`>` 또는 `/>`) 첫 라인.
	// 주의: 속성값 내 '>' (예: `data-foo=">"`) 는 통상 JSX 에서 등장 빈도 낮음.
	const downMax = Math.min(lines.length - 1, startLine + CONTEXT_WINDOW_LINES);
	let endLine = -1;
	for (let k = startLine; k <= downMax; k++) {
		// 라인 끝에 `>` 또는 `/>` 가 나타나는 첫 라인 (단, `{...}` 표현 내 `=>` 는 무시).
		// 보수적 매칭: trim 끝이 `>` 또는 `/>` 이거나, 라인 내 `>` 가 tagname 완료 의미.
		const trimmed = lines[k]!.replace(/\s+$/, '');
		if (trimmed.endsWith('/>') || trimmed.endsWith('>')) {
			// `=>` (arrow) 는 tag 종결 아님 → trimmed 가 `=>` 로 끝나면 skip.
			if (trimmed.endsWith('=>')) continue;
			endLine = k;
			break;
		}
	}
	if (endLine < 0) return null;
	return { startLine, endLine, tagName };
}

/**
 * repo 기준 상대경로 (POSIX).
 */
function toRepoRel(abs: string): string {
	return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
}

type Violation = {
	file: string;
	line: number;
	tagName: string;
	hasOnClick: boolean;
	hasTabIndex0: boolean;
	hasActivateKeyDown: boolean;
	testIds: string[];
	snippet: string;
};

/**
 * 위반 1건이 PATTERN_B_EXEMPTIONS 중 하나에 매칭되는지.
 */
function isExempt(violation: Violation): boolean {
	return PATTERN_B_EXEMPTIONS.some((ex) => {
		if (ex.file !== violation.file) return false;
		if (ex.testId && violation.testIds.includes(ex.testId)) return true;
		if (typeof ex.lineHint === 'number' && Math.abs(ex.lineHint - violation.line) <= 3) return true;
		if (!ex.testId && typeof ex.lineHint !== 'number') return true; // 파일 전체 면제
		return false;
	});
}

// ---------- 검증 실행 (모듈 로드 1회) ----------

const PROD_JSX_FILES = collectProductionJsx();

/**
 * @typedef {Object} Violation
 * @property {string} file repo-rel path
 * @property {number} line role="button" 라인 (1-based)
 * @property {string} tagName
 * @property {boolean} hasOnClick
 * @property {boolean} hasTabIndex0
 * @property {boolean} hasActivateKeyDown
 * @property {string[]} testIds 해당 요소 범위에서 발견된 data-testid 값들 (exemption 대조용)
 * @property {string} snippet opening tag 원문
 */

const violations: Violation[] = [];

for (const abs of PROD_JSX_FILES) {
	const src = readFileSync(abs, 'utf-8');
	const lines = src.split('\n');
	const repoRel = toRepoRel(abs);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (!/role="button"/.test(line)) continue;
		const range = findOpeningTagRange(lines, i);
		if (!range) {
			// 경계 식별 실패 — 안전하게 위반 후보로 박제 (수동 검토 필요).
			violations.push({
				file: repoRel,
				line: i + 1,
				tagName: '?unknown',
				hasOnClick: false,
				hasTabIndex0: false,
				hasActivateKeyDown: false,
				testIds: [],
				snippet: line,
			});
			continue;
		}
		// native 자동 제외.
		if (NATIVE_TAG_NAMES.has(range.tagName)) continue;

		const rangeText = lines.slice(range.startLine, range.endLine + 1).join('\n');
		const hasOnClick = /\bonClick=/.test(rangeText);
		const hasTabIndex0 = /\btabIndex=\{0\}/.test(rangeText);
		const hasActivateKeyDown = /\bonKeyDown=\{activateOnKey\b/.test(rangeText);

		// onClick 부재 + role=button 은 activation 의미 부재 (hover/focus popup 류) — auto-skip.
		if (!hasOnClick) continue;

		if (!(hasTabIndex0 && hasActivateKeyDown)) {
			const testIdMatches = [...rangeText.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]!);
			violations.push({
				file: repoRel,
				line: i + 1,
				tagName: range.tagName,
				hasOnClick,
				hasTabIndex0,
				hasActivateKeyDown,
				testIds: testIdMatches,
				snippet: rangeText,
			});
		}
	}
}

const unexempted = violations.filter((v) => !isExempt(v));

// ---------- 테스트 ----------

describe('a11y 패턴 B audit — role="button" 전수 검증 (REQ-20260421-033 FR-08)', () => {
	it('프로덕션 .jsx 파일 inventory 가 비어있지 않다 (회귀 방어: 스캐너 자체 무력화 감지)', () => {
		expect(PROD_JSX_FILES.length).toBeGreaterThan(0);
	});

	it('role="button" 포함 요소 중 패턴 B 미충족 지점이 PATTERN_B_EXEMPTIONS 외에 존재하지 않는다', () => {
		if (unexempted.length > 0) {
			const report = unexempted
				.map(
					(v) =>
						`  - ${v.file}:${v.line} <${v.tagName}> (onClick=${v.hasOnClick}, tabIndex={0}=${v.hasTabIndex0}, onKeyDown=activateOnKey=${v.hasActivateKeyDown}, testIds=[${v.testIds.join(', ')}])`,
				)
				.join('\n');
			throw new Error(
				`a11y 패턴 B audit fail — ${unexempted.length} 위반 지점 발견. ` +
					`각 지점에 role="button" + tabIndex={0} + onKeyDown={activateOnKey(...)} 를 동시 부여하거나, ` +
					`activation 의미가 부재하면 spec §예외 에 등재 후 src/common/a11y.audit.exemptions.js 에 추가하십시오.\n${report}`,
			);
		}
		expect(unexempted).toEqual([]);
	});

	it('activateOnKey 를 import 한 *.jsx 는 실제로 onKeyDown={activateOnKey(...)} 를 1회 이상 사용한다 (dead import 방지)', () => {
		const deadImports: string[] = [];
		for (const abs of PROD_JSX_FILES) {
			const src = readFileSync(abs, 'utf-8');
			const importsActivate = /import\s*\{[^}]*\bactivateOnKey\b[^}]*\}\s*from\s*['"][^'"]+['"]/.test(
				src,
			);
			if (!importsActivate) continue;
			const usesActivate = /onKeyDown=\{activateOnKey\b/.test(src);
			if (!usesActivate) deadImports.push(toRepoRel(abs));
		}
		expect(deadImports).toEqual([]);
	});

	it('PATTERN_B_EXEMPTIONS 의 각 항목은 실제 file 이 존재하고 (testId 가 주어졌다면) 해당 파일 내에 등장한다', () => {
		const stale: string[] = [];
		for (const ex of PATTERN_B_EXEMPTIONS) {
			const abs = path.resolve(REPO_ROOT, ex.file);
			let src: string;
			try {
				src = readFileSync(abs, 'utf-8');
			} catch {
				stale.push(`file-missing: ${ex.file}`);
				continue;
			}
			if (ex.testId && !src.includes(`data-testid="${ex.testId}"`)) {
				stale.push(`testId-missing: ${ex.file} testId="${ex.testId}"`);
			}
		}
		expect(stale).toEqual([]);
	});
});
