/**
 * a11y `:focus-visible` 회귀 fixture — WCAG 2.4.7 결과 효능 정적 검증
 *  (REQ-20260420-021, REQ-20260517-076 FR-04, Should-04-b — TSK-20260518-05).
 *
 * spec `30.spec/green/common/accessibility.md` §동작 (I5) 위임 측정 채널:
 *  - (F1) 규칙 존재 — `.div--monitor-pillar:focus-visible` + `.div--monitor-statusbar:focus-visible`
 *         규칙이 `src/Monitor/Monitor.css` 에 보존된다 ((I1)(I5) 게이트).
 *  - (F2) outline ≥ 2px — 동일 규칙 블록 본문에 `outline: <N>px solid ...` 가 존재하고 N ≥ 2
 *         ((I2) 게이트, WCAG 2.4.7 visible focus indicator).
 *  - (F3) `:focus` 단독 부재 — `Monitor.css` 에 `:focus-visible` 외 `:focus` 단독 selector 가
 *         0 hit ((I4) 게이트 — 마우스 click 시각 노이즈 차단 계약).
 *  - (F4) 회귀 mutation 차단 — 가공 CSS 에서 `:focus-visible` → `:focus` 치환 시 (F3) 게이트가
 *         fail 신호를 박제 (사이클 검증).
 *
 * scope:
 *  - 본 fixture 는 spec §의존성 정합 — `src/Monitor/Monitor.css` 단일 scope baseline.
 *  - 신규 도메인 (`Log`, `Comment`, `Search`, `File`, `Image`) 에 `div` 기반 popup trigger 도입
 *    시 별 task 회수 영역 (본 fixture 는 Monitor 도메인 한정 측정).
 *
 * dependencies (외부 라이브러리 0): node:fs + vitest globals 만 사용.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

// a11y.focus-visible.test.ts 는 src/common/ 에 위치. repo root = 상위 2개 dir.
const SRC_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC_ROOT, '..');
const MONITOR_CSS_PATH = path.resolve(REPO_ROOT, 'src/Monitor/Monitor.css');

const MONITOR_CSS = readFileSync(MONITOR_CSS_PATH, 'utf-8');

// `:focus` 단독 selector — `-visible` suffix 미포함 (negative lookahead).
const FOCUS_BARE_PATTERN = /:focus(?!-visible)/g;
// `.div--monitor-(pillar|statusbar):focus-visible` 규칙 selector.
const FOCUS_VISIBLE_RULE_PATTERN = /\.div--monitor-(pillar|statusbar):focus-visible/g;
// outline: Npx solid ...  (N 캡처).
const OUTLINE_WIDTH_PATTERN = /outline:\s*(\d+)px\s+solid/;

describe(':focus-visible 회귀 fixture — Monitor 도메인 div 기반 popup trigger (WCAG 2.4.7)', () => {
	it('(F1) `.div--monitor-pillar:focus-visible` + `.div--monitor-statusbar:focus-visible` 규칙이 2 hit 로 보존된다', () => {
		const matches = MONITOR_CSS.match(FOCUS_VISIBLE_RULE_PATTERN) ?? [];
		expect(matches.length).toBe(2);
		expect(matches).toContain('.div--monitor-pillar:focus-visible');
		expect(matches).toContain('.div--monitor-statusbar:focus-visible');
	});

	it('(F2) `:focus-visible` 규칙 블록 본문에 `outline: Npx solid ...` 가 존재하고 N ≥ 2 다 (WCAG visible focus indicator)', () => {
		// 규칙 블록 추출: 첫 selector 시작 ~ 첫 `}` 까지.
		const ruleBlockMatch = MONITOR_CSS.match(
			/\.div--monitor-pillar:focus-visible[\s\S]*?\{([\s\S]*?)\}/,
		);
		expect(ruleBlockMatch).not.toBeNull();
		const blockBody = ruleBlockMatch![1] ?? '';
		const outlineMatch = blockBody.match(OUTLINE_WIDTH_PATTERN);
		expect(outlineMatch).not.toBeNull();
		const widthPx = Number.parseInt(outlineMatch![1]!, 10);
		expect(widthPx).toBeGreaterThanOrEqual(2);
	});

	it('(F3) `:focus` 단독 selector 가 `src/Monitor/Monitor.css` 에 0 hit 다 (마우스 click 시각 노이즈 차단)', () => {
		const bareHits = MONITOR_CSS.match(FOCUS_BARE_PATTERN) ?? [];
		expect(bareHits.length).toBe(0);
	});

	it('(F4) 가공 CSS 에서 `:focus-visible` → `:focus` 치환 시 (F3) 게이트가 fail 신호를 박제한다 (사이클 검증)', () => {
		const mutated = MONITOR_CSS.replace(/:focus-visible/g, ':focus');
		const bareHitsInMutated = mutated.match(FOCUS_BARE_PATTERN) ?? [];
		// mutation 시 :focus 단독 hit 가 발생 → (F3) 위반 신호.
		expect(bareHitsInMutated.length).toBeGreaterThan(0);
	});
});
