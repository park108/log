# Task: `stripCspMetaInDev` 2회 연속 동작 멱등 fixture 신규 박제 (G-D (b) FR-04 (b))

> **Task ID**: TSK-20260517-31
> **출처 spec**: `specs/30.spec/green/foundation/csp-meta-dev-strip-prod-preserve.md` §동작 4 (G-D), §수용 기준 FR-04 (b), §grep-baseline G-D
> **관련 요구사항**: REQ-20260517-098
> **depends_on**: []
> **supersedes**: (없음 — 신규 발행)

## 배경
REQ-098 / `csp-meta-dev-strip-prod-preserve` spec 의 §G-D 멱등 single-match 게이트는 3 조건 동시 만족 — (a) CSP meta 부재 입력 noop, (b) **CSP meta 1 hit 입력 2회 연속 동작 시 1회 동작 결과와 동일**, (c) 다중 hit 입력 첫 hit 만 제거. 현 `vite.config.test.js` 6 it 박제는 (a) `is a no-op when HTML has no CSP meta tag (idempotent)` (line 45-58) + (c) `removes only the first match when multiple CSP meta tags are present (single regex match)` (line 60-74) 2 case 만 박제 — (b) `applied twice consecutively` 멱등 fixture **미박제**. spec §grep-baseline G-D 명시 ("2회 연속 동작 멱등 (case (b)) 는 unit fixture 신규 박제 후보 (현 미박제 — task 영역)") + §테스트 현황 G-D 명시 ("2회 연속 동작 멱등 (case (b)) 는 unit fixture 신규 박제 후보 (현 미박제 — task 영역)"). 본 task 는 fixture 박제 1건 추가로 G-D (b) marker 회수.

## 변경 범위
| 파일 | 동작 | 핵심 |
|------|------|------|
| `vite.config.test.js` | 수정 (it 1건 추가) | `describe('stripCspMetaInDev (vite plugin)', ...)` 본문 말미 (line 74 닫는 `})` 직전) 에 신규 it 1건 추가 — `'is idempotent when applied twice consecutively (single CSP meta input)'`. CSP meta 1 hit HTML 입력 → `handler` 1회 호출 결과 `r1` → `r1` 재입력으로 `handler` 재호출 결과 `r2` → `expect(r2).toBe(r1)` (멱등). 보조: `expect(r1).not.toContain('Content-Security-Policy')` (1회 strip 효능 박제). |

## 구현 지시
1. `vite.config.test.js` line 74 (`})` `single regex match` it 의 닫는 중괄호) 와 line 75 (`describe` 닫는 `})`) 사이에 빈 줄 1줄 + 신규 it 블록 1건 삽입 — describe scope 내 7번째 it 로 추가. 들여쓰기 = describe 내 동급 (tab 또는 spec 파일 기존 컨벤션 일치 — 기존 6 it 의 indent 정확히 모방, line 8 / 13 / 18 / 23 / 45 / 60 의 indent 와 동일).
2. 신규 it 본문 — 5 줄 이내 단위 fixture:
   - `it('is idempotent when applied twice consecutively (single CSP meta input)', () => { ... })` 형태.
   - `const plugin = stripCspMetaInDev()`.
   - 입력 HTML: line 25-35 (`removes the CSP meta tag line ...`) 의 html 변수와 동일 구조 (5 줄, `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';">` 1 hit 포함) — 재사용 또는 동일 내용 inline.
   - `const r1 = plugin.transformIndexHtml.handler(html)` (1회 strip).
   - `const r2 = plugin.transformIndexHtml.handler(r1)` (2회째 strip — 입력은 strip 결과).
   - `expect(r2).toBe(r1)` (멱등 — 2회째 동작은 동일 결과 반환).
   - 보조: `expect(r1).not.toContain('Content-Security-Policy')` (1회 strip 효능 박제).
3. 기존 6 it 은 모두 무변동 (line 7-74 텍스트 보존). 추가만 — 삭제·수정 0.
4. `vite.config.js` plugin 정의 자체 (`stripCspMetaInDev` 함수 본문 line 13-27) 는 무변동. spec §G-D §FR-04 (b) 은 현 plugin regex flag (`m` 만, `g` 비사용) 와 single-match 정책 하에 2회 연속 동작이 멱등임을 보장하므로 plugin 코드 변경 불필요 — fixture 박제만으로 marker 회수.

## 테스트
- 신규 it 1건: `stripCspMetaInDev (vite plugin)` describe 내 7번째 it 로 등장. 회귀 기준: `npm test -- vite.config.test.js` 또는 `npx vitest run vite.config.test.js` 시 7 it PASS (기존 6 PASS + 신규 1 PASS).
- 회귀 검출: `vite.config.js:20-22` regex flag `m` 을 `g` 로 변경 시 신규 it 의 `expect(r2).toBe(r1)` 가 깨지지 않음 (single match 한정 — case (c) it 와 직교). 본 it 는 멱등성 자체 박제 — flag 변경 검출은 case (c) 의 책임.
- 보조 회귀: `vite.config.js:13-27` 의 `stripCspMetaInDev` 함수 정의 또는 `vite.config.js:30-36` plugin 등록 삭제 시 7 it 중 신규 it 도 함께 실패 (`stripCspMetaInDev is not a function` 또는 `plugin.transformIndexHtml.handler is not a function`) — FR-02 / FR-04 위반 검출 채널 확장.

## 검증/DoD
<!-- grep 게이트: 본 task 완료 후 vite.config.test.js 의 it count + idempotent twice 토큰 hit count 측정 -->
- [ ] `grep -cE "^[[:space:]]*it\(" vite.config.test.js` → **7** (rc=0). 기존 6 + 신규 1.
- [ ] `grep -nE "twice|consecutive" vite.config.test.js` → **≥ 1 hit** (신규 it 명 또는 본문에서 `twice` 또는 `consecutive` 토큰 1건 이상 등장 — spec §G-D (b) "2회 연속 동작" 의 영문 표현 박제).
- [ ] `grep -nE "is idempotent when applied twice" vite.config.test.js` → **1 hit** (신규 it 명 정확히 1건 박제).
- [ ] `npm test -- vite.config.test.js` 또는 `npx vitest run vite.config.test.js` → 7 it 전수 PASS (rc=0).
- [ ] `npm run lint` (해당 시 — `vite.config.test.js` 가 eslint 대상이면) → rc=0 (warning / error 0).
- [ ] `npm run build` → rc=0 (CSP meta build artifact preserve 영향 0 — fixture 추가 만, plugin 코드 무변동).
- [ ] 수동 검증: `vite.config.test.js` line 75 이전 `})` 정합 (describe 닫는 `})` 보존) + 신규 it 의 indent / 따옴표 컨벤션 일치 (기존 6 it 과 동일 스타일).

## 스코프 규칙
- **expansion**: 불허 (단일 파일 단일 it 추가 — `vite.config.test.js` 외 변경 0).
- **grep-baseline** (HEAD=`ac30437`, 2026-05-17 — 본 task 발행 시점 실측):
  - `grep -cE "^[[:space:]]*it\(" vite.config.test.js` → **6 hits** in 1 file (line 8 / 13 / 18 / 23 / 45 / 60 — 6 it 박제 baseline).
  - `grep -nE "\bidempotent\b" vite.config.test.js` → **1 hit** in 1 file:
    - `vite.config.test.js:45` (`is a no-op when HTML has no CSP meta tag (idempotent)` — G-D (a) no-op fixture).
  - `grep -nE "\btwice\b" vite.config.test.js` → **0 hits** in 0 files (G-D (b) 2회 연속 멱등 fixture 부재 박제).
  - `grep -nE "\bconsecutive\b" vite.config.test.js` → **0 hits** in 0 files (G-D (b) consecutive 토큰 부재 박제).
  - `grep -nE "applied twice|2회 연속" vite.config.test.js` → **0 hits** in 0 files (G-D (b) 직접 표현 부재 박제).
  - 본 baseline 은 spec §grep-baseline G-D ("`vite.config.test.js:45-58` 1 it (`is a no-op ...`) + `vite.config.test.js:60-74` 1 it (`removes only the first match ...`) — 2 it 박제. 2회 연속 동작 멱등 (case (b)) 신규 fixture 박제 미완 (task 영역).") 와 일치 — 본 task 가 그 미완 fixture 박제 회수.
- **rationale**: 본 task 는 vite plugin 의 멱등성 fixture 1건 추가 한정 — `vite.config.test.js` 외 변경 0 + plugin 정의 (`vite.config.js`) 변경 0 + spec 본문 변경 0 (spec §변경 이력 박제는 inspector / planner 영역). expansion 불허 — 만일 lint / build 회귀 발생 시 다른 파일 변경 필요한 경우 `50.blocked/task/` 격리 후 followup 분기.

## 롤백
단일 `git revert <sha>` 로 가능 — `vite.config.test.js` 신규 it 1 블록 (약 7~10 줄) 삭제 효능. 다른 파일 영향 0.

## 범위 밖
- spec §변경 이력 갱신 (REQ-098 (G-D) marker 회수 박제) — inspector 영역 (hook-ack 분기 surface).
- spec §테스트 현황 G-D 의 unchecked → checked flip — inspector 영역.
- G-A / G-B / G-C / G-E / G-F / G-G 다른 marker 회수 — 별 task 분기 (선결: 본 task 회수).
- G-E 발화 채널 신설 (pre-push / CI / `check:csp-artifact` script) — 수단 영역 (결정 의존, planner 영역 밖).
- `vite.config.js` plugin 정의 변경 — 본 task scope 밖 (불허).
- `index.html:8` CSP directive 값 변경 — 본 task scope 밖 (불허).
- REQ-097 axis A (vite.config.js:9 csp-policy-spec 참조 주석 redirect) — 별 task 분기 (inspector 영역 의존 또는 결정 영역).
