# ESLint flat-config `linterOptions` 디폴트 override 단일성 — `reportUnusedDisableDirectives` 명시 박제 + 메이저 bump default drift fail-safe

> **위치**: `eslint.config.js:20` 의 `linterOptions` 블록 (보조: line 17-19 의도 주석)
> **관련 요구사항**: REQ-20260517-068 (eslint-linter-options-default-override)
> **최종 업데이트**: 2026-05-17 (by inspector)

> 참조 코드는 **식별자 우선**, 라인 번호 보조 (REQ-068 발행 HEAD=`b42e36f`, 본 spec 박제 HEAD=`64babbd`).
> **ID 충돌 주의**: discovery 측 발행 시점에 `log-island-convergence` 와 `REQ-20260517-068` ID 중복 — 본 spec 은 eslint-linter-options 축, log-island-convergence 와는 직교 영역. 차기 discovery 세션에서 ID 재배정 또는 메타 정정 신호.

## 역할
ESLint v9+ flat-config 가 `linterOptions.reportUnusedDisableDirectives` 의 기본값을 v8 의 `false` 에서 v9 의 `'warn'` 으로 변경한 사실에 대응한 **명시 override 박제**. `eslint.config.js:20` 의 `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }` 단일 블록 등록 단일성 + 옵션 명시 박제 + 메이저/마이너 bump 후 default 추가 변경 (예: `'warn'` → `'error'`) fail-safe 효능 박제. 본 spec 은 `linterOptions` 의 **다른 키** (`noInlineConfig` 등) 또는 `rules` 키 의미 (REQ-028 / REQ-053 / REQ-058 — `tooling.md`) 와 직교.

## 동작
1. **블록 등록 단일성 (FR-01)**: `eslint.config.js` 에 `linterOptions` 키를 선언하는 블록이 **정확히 1건** 존재. 등록 수 변경 (2 이상 추가 또는 0 으로 제거) 은 본 spec 갱신 신호. 현 baseline: `grep -cE "linterOptions" eslint.config.js` = **1**.
2. **`reportUnusedDisableDirectives` 명시 박제 (FR-02)**: 본 블록은 `reportUnusedDisableDirectives` 옵션을 **명시 박제** — 옵션 부재 (`linterOptions: {}` 등) 는 ESLint v9 default `'warn'` 으로 fallthrough 되므로 본 spec 위반. 현 baseline 값 `'off'` (v8 default `false` 와 의미 동치) 는 §스코프 규칙 grep-baseline 에 박제. 값 변경 (`'off'` → `'warn'` → `'error'`) 은 본 spec 갱신 신호.
3. **linter-level vs rule-level 직교 (FR-03)**: ESLint v8 default `false` ↔ v9 default `'warn'` 의 의미적 차이는 **linter-level 옵션** — `rules` 키 의미 (rule 의 활성/severity) 와 직교. 본 옵션 변경은 lint output 의 `--unused-disable-directives` 분기 효능에만 영향. `tooling.md` (REQ-028 / REQ-053 / REQ-058) 의 `rules` 키 박제와 본 spec 의 `linterOptions` 키 박제는 **별도 키 채널** 로 독립.
4. **last-write-wins 직교 키 semantics (FR-04)**: `linterOptions` 키의 배열상 위치가 `rules` 키의 last-write-wins (REQ-058 §동작 6) 와 **직교 키 semantics** — 동일 `linterOptions.reportUnusedDisableDirectives` 키를 복수 블록에서 선언할 경우에도 last-write-wins 가 적용되지만, `rules` 키의 last-write-wins 와 무관한 별도 키 채널. 현 baseline 은 단일 블록 (FR-01) 이므로 last-write-wins 트리거 부재.
5. **메이저/마이너 bump fail-safe (FR-05)**: 본 spec 의 박제는 ESLint 메이저/마이너 bump (예: v9.39 → v9.40, v9 → v10) 가 `reportUnusedDisableDirectives` default 를 추가 변경할 경우 **fail-safe** — `eslint.config.js:20` 의 명시 박제가 default 변경에 무관하게 의도된 `'off'` 값 보존. 본 옵션의 의도된 값이 `'off'` 외 다른 값으로 변경되어야 한다면 본 spec 갱신 신호. 본 효능은 `dependency-bump-gate.md` (REQ-035) 의 4 scripts exit 0 게이트가 본 spec 박제 부재 상태에서 vacuous 통과할 가능성 차단.
6. **lint output noise 차단 효능 (FR-06)**: `npm run lint` (`eslint.config.js:20` baseline 적용 시) 의 unused `eslint-disable` directive 출력이 0 hit. 현 baseline `src/common/errorReporter.ts:10` `// eslint-disable-next-line no-console` directive 는 본 line 의 `console.error` 호출이 실재하므로 unused 신호 0. directive 추가/제거 시 본 효능은 baseline `'off'` 값으로 lint output 에 노이즈 분기 부재 — `'warn'` / `'error'` 승격 결정 시 본 효능 평서문 갱신 필요.
7. **다른 `linterOptions` 키 비박제 (FR-07)**: 본 spec 은 `linterOptions` 의 다른 키 (`noInlineConfig`, 미래 추가 키) 에 비박제 — `reportUnusedDisableDirectives` 한정 명시 박제. 다른 키 도입 시 별 req 발행 신호. 본 baseline 의 블록은 단일 키 `reportUnusedDisableDirectives` 만 포함.
8. **수단 중립 자기 검증 (RULE-07)**: 본 spec 본문에 `reportUnusedDisableDirectives` 값 결정 (`'off'` 유지 vs `'warn'` 승격 vs `'error'`) / ESLint 메이저 bump 결정 (v9 → v10) / `eslint-disable` directive 잔존 코드 제거 결정 / `linterOptions` 다른 키 도입 결정에 라벨 ("기본값" / "권장" / "우선" / "default" / "best" / "root cause" / "가장 효과적") 박제 부재.
   - (8.1) `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/eslint-linter-options-default-override.md` 매치는 다음 카테고리 한정 — (i) 본 § 동작 8 의 정의 본문 (수단 라벨 셋 박제), (ii) 자기 검증 게이트 본문 (수용 기준 / 회귀 중점 / 변경 이력 정책 명시), (iii) 외부 라이브러리 API 동작 인용 (예: ESLint v9 default `'warn'` 변경 사실, v8 default `false` 사실, flat config 동일 키 last-write-wins semantics 인용), (iv) 템플릿 메타 텍스트 ("식별자 우선"). 본 카테고리 외 매치 (예: § 동작 본문 효능 평서문이 "권장 값" / "default override" 를 의도 라벨로 사용) 는 § 동작 8.1 위반.

## 의존성
- 내부 (직교 축 spec):
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint flat-config 의 `rules` 키 의미 축 (files 패턴 / 파서 / `no-unused-vars` rule swap / last-write-wins). 본 spec 의 `linterOptions` 키 축과 직교 (별도 키 채널).
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage threshold. 본 spec 의 lint output noise 축과 직교.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. 본 spec 의 default override 박제가 ESLint 메이저 bump 시 fail-safe (간접 결합) — 본 spec 박제 부재 시 bump 후 신규 default 가 4 scripts exit 0 통과를 vacuous 화 가능.
  - `specs/30.spec/green/foundation/test-discovery-population-coherence.md` (REQ-067) — 도구 4축 모집단 매트릭스. 본 spec 의 linter 옵션 축과 직교.
  - `specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` (REQ-066) — vite JSX 변환 채널. 본 spec 의 ESLint linter 옵션 축과 직교.
  - `specs/50.blocked/spec/foundation/devbin-install-integrity.md` (REQ-064 격리) — `node_modules/eslint` 부재 시 `npm run lint` 자체 실행 불가 — precondition 관계.
  - `specs/50.blocked/spec/foundation/path-alias-resolver-coherence.md` (REQ-065 격리) — alias ↔ paths 동치. 본 spec 의 linter 옵션 축과 직교.
- 외부 (도구):
  - ESLint v9+ flat config — `linterOptions.reportUnusedDisableDirectives` default 가 v8 `false` 에서 v9 `'warn'` 으로 변경 (release notes).
  - ESLint flat config — `linterOptions` 는 `rules` 와 별도 키이며 동일 키 last-write-wins 가 적용되나 rule key 와 직교.
  - `package.json:43` `"eslint": "^9.39.4"` — ESLint 메이저 9 (v9+ default 변경 적용 대상). REQ-058 영역.
- 역의존: 본 spec 위반 시 영향 — `dependency-bump-gate.md` (ESLint 메이저 bump 시 신규 default 변경 무감지로 4 scripts exit 0 vacuous 통과), `regression-gate.md` (CI `npm run lint` 의 unused directive 채널 노이즈 분기).

## 테스트 현황
- [x] `eslint.config.js:17-19` 의도 주석 박제 (v8 default `false` ↔ v9 default `'warn'` 차이 + `'off'` pin 의도).
- [x] `eslint.config.js:20` 단일 선언 박제 — `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }`.
- [x] `grep -cE "linterOptions" eslint.config.js` = 1 (블록 등록 단일성).
- [x] `grep -nE "reportUnusedDisableDirectives" eslint.config.js` = 2 hits (`:17` 주석, `:20` 선언).
- [x] `src/common/errorReporter.ts:10` `// eslint-disable-next-line no-console` directive 의 `console.error` 호출 line 11 실재 (활성 사용 — unused 신호 0).
- [ ] `npm run lint` 의 unused directive 출력 0 hit 실측 (precondition: `node_modules/eslint` 존재 — REQ-064 충족 후 활성).
- [ ] ESLint v9.x → v9.y minor bump 시 `'off'` 값 default 변경 무관 유지 (§ 동작 5 — 미래 bump 시 활성).
- [ ] 본 spec § 동작 8.1 수단 라벨 매치 § 동작 8 카테고리 (i)~(iv) 내부 한정.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 옵션 명시 박제 spec — task 발행 시 본 baseline 을 §스코프 규칙 grep-baseline 으로 복제).
- **grep-baseline**:
  - `grep -cE "linterOptions" eslint.config.js` → **1** (블록 등록 단일성).
  - `grep -nE "linterOptions" eslint.config.js` → **1 hit**:
    - `eslint.config.js:20` `{ linterOptions: { reportUnusedDisableDirectives: 'off' } },`
  - `grep -nE "reportUnusedDisableDirectives" eslint.config.js` → **2 hits in 1 file**:
    - `eslint.config.js:17` `// v9 flat-config defaults enable \`reportUnusedDisableDirectives: 'warn'\`;`
    - `eslint.config.js:20` `{ linterOptions: { reportUnusedDisableDirectives: 'off' } },`
  - `grep -nE "reportUnusedDisableDirectives\s*:\s*'off'" eslint.config.js` → **1 hit in 1 file**:
    - `eslint.config.js:20` (현 baseline 값 `'off'` 박제).
  - `grep -nE "v9.*defaults.*reportUnusedDisableDirectives|v8.*default.*false" eslint.config.js` → **2 hits in 1 file** (v8/v9 default 차이 의도 주석):
    - `eslint.config.js:17` `// v9 flat-config defaults enable \`reportUnusedDisableDirectives: 'warn'\`;`
    - `eslint.config.js:18` `// legacy v8 default was \`false\`. Pin to \`off\` to preserve equivalence (§3.3,`
  - `grep -rnE "eslint-disable" src` → **1 hit in 1 file**:
    - `src/common/errorReporter.ts:10` `// eslint-disable-next-line no-console` (활성 사용 — directive 다음 line 의 `console.error` 호출 실재).
  - `grep -nE "\"eslint\"" package.json` → **1 hit**:
    - `package.json:43` `"eslint": "^9.39.4"` (ESLint 메이저 9 baseline — REQ-058 영역).
  - `grep -rnE "기본값|권장|우선|default|best|root cause|가장 효과적" specs/30.spec/green/foundation/eslint-linter-options-default-override.md` — 본 spec 박제 시점 매치는 § 동작 8 정의 본문 / 자기 검증 게이트 본문 / 외부 라이브러리 API 인용 (ESLint v8/v9 default 변경 사실, flat config last-write-wins semantics) / 템플릿 메타 텍스트 카테고리 한정 — § 동작 8.1 자기 검증 baseline.
- **rationale**: `linterOptions` 키는 ESLint flat config 의 별도 키이며 동일 키 last-write-wins 가 적용되나 `rules` 키 last-write-wins (REQ-058) 와는 직교 채널. 본 baseline 박제 부재 시 ESLint v9 default `'warn'` 으로 fallthrough → 미래 directive 추가 시 lint output noise 분기 / v10 메이저 bump 가 `'error'` 승격 시 CI fail-fast — 본 spec 박제 부재면 의도 vs 회귀 구분 불가. `grep -cE "linterOptions"` count 는 import / 주석 / 변수명 매치 가능성 0 (본 키 표현은 `eslint.config.js` 외 매치 부재).

## 수용 기준
- [ ] (Must, FR-01) `linterOptions` 블록 등록 수 = 1 (`grep -cE "linterOptions" eslint.config.js` = 1) — § 동작 1.
- [ ] (Must, FR-02) `reportUnusedDisableDirectives` 명시 박제 + 현 baseline 값 `'off'` (`grep -nE "reportUnusedDisableDirectives\s*:\s*'off'" eslint.config.js` = 1 hit) — § 동작 2.
- [ ] (Must, FR-03) v8 default `false` ↔ v9 default `'warn'` 차이가 **linter-level 옵션** 임을 평서문 박제 — § 동작 3.
- [ ] (Should, FR-04) `linterOptions` 키의 last-write-wins 가 `rules` 키 last-write-wins (REQ-058) 와 **직교 키 semantics** 임을 평서문 박제 — § 동작 4.
- [ ] (Should, FR-05) ESLint 메이저/마이너 bump 후 default 추가 변경 fail-safe — 명시 박제가 `'off'` 보존 — § 동작 5.
- [ ] (Should, FR-06) `npm run lint` unused `eslint-disable` directive 출력 0 hit (현 baseline `src/common/errorReporter.ts:10` directive 활성 사용) — § 동작 6.
- [ ] (Should, FR-07) `linterOptions` 의 다른 키 (`noInlineConfig` 등) 비박제 — 별 req 발행 신호 — § 동작 7.
- [ ] (Must, RULE-07) § 동작 8.1 자기 grep — § 동작 8 카테고리 (i)~(iv) 내부 한정 매치 — § 동작 8.
- [ ] (NFR-01) 본 spec 본문에 특정 ESLint 메이저 default 표현이 효능 평서문에 하드코딩되지 않음 — baseline 값은 §스코프 규칙 grep-baseline 에만 박제.
- [ ] (NFR-02) 본 효능 박제는 단일 진단 명령 (`grep` 1-line) 으로 위반 카테고리 식별 가능.
- [ ] (NFR-03) 결과 효능 (블록 등록 단일성 + 옵션 명시 + linter-level 직교 + last-write-wins 직교 키 + bump fail-safe + lint output noise 차단 + 다른 키 비박제 동시 성립) 만 박제. 1회성 v8→v9 migration 운영 task 배제.
- [ ] (NFR-04) `tooling.md` (`rules` 키 의미 / REQ-028/053/058) / `regression-gate.md` (CI 회귀 / REQ-037) / `dependency-bump-gate.md` (bump 직후 / REQ-035) / `test-discovery-population-coherence.md` (모집단 매트릭스 / REQ-067) / `vite-jsx-transform-channel-coherence.md` (변환 채널 / REQ-066) 와 모두 직교 축.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector / (this commit) | 최초 등록 (REQ-20260517-068 eslint-linter-options-default-override 흡수). `eslint.config.js:20` `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }` 단일 블록의 (a) 등록 단일성 + (b) 옵션 명시 박제 + (c) linter-level vs rule-level 직교 + (d) `linterOptions` 키의 last-write-wins 직교 키 semantics + (e) ESLint 메이저/마이너 bump 후 default 추가 변경 fail-safe + (f) lint output noise 차단 효능 + (g) 다른 `linterOptions` 키 비박제 + (h) 수단 중립 자기 검증 상시 불변식 박제 (§ 동작 1~8). REQ-022 (v8→v9 1:1 포팅) / REQ-058 (`rules` last-write-wins) 와 직교 — 본 spec 은 `linterOptions` 키 축. baseline 실측 @HEAD=`64babbd` (REQ-068 발행 HEAD=`b42e36f` 와 `eslint.config.js` 영향 0): `linterOptions` 블록 등록 1건 / `reportUnusedDisableDirectives` 2 hits (`:17` 주석 + `:20` 선언) / 현 값 `'off'` 1 hit / v8/v9 default 차이 주석 2 hits / `src` 내 `eslint-disable` 1 hit (`errorReporter.ts:10` 활성 사용) / `"eslint": "^9.39.4"` 메이저 9. consumed req: `specs/20.req/20260517-eslint-linter-options-default-override.md` → `specs/60.done/2026/05/17/req/` mv. 영향 spec 군 (역의존): `tooling.md` (REQ-028/053/058, `rules` 키 직교), `regression-gate.md` (REQ-037, lint output noise 축 직교), `dependency-bump-gate.md` (REQ-035, ESLint bump 시 fail-safe 간접 결합), `test-discovery-population-coherence.md` (REQ-067, 직교), `vite-jsx-transform-channel-coherence.md` (REQ-066, 직교), `50.blocked/spec/foundation/{devbin-install-integrity,path-alias-resolver-coherence}.md` (격리, precondition 관계). RULE-07 자기검증 — § 동작 1~8 모두 평서형·반복 검증 가능 (`grep` 1-line)·시점 비의존 (특정 ESLint 메이저 default 표현은 §스코프 규칙 baseline 에만 박제, 효능 평서문은 "블록 등록 = 1" / "default override 명시" 자체)·incident 귀속 부재 (linter-level 옵션 명시는 상시 성질, v8→v9 migration 자체는 REQ-022 영역 incident)·수단 중립 (옵션 값 결정 / ESLint bump 결정 / directive 제거 결정 / 다른 키 도입 결정 어느 수단도 라벨 미박제). RULE-06 §스코프 규칙 gate 7건 (linterOptions count 1 + linterOptions line 1 + reportUnusedDisableDirectives 2 + 'off' value 1 + v8/v9 의도 주석 2 + src eslint-disable 1 + package.json eslint 1) 실측 박제. RULE-01 inspector writer 영역 (`30.spec/green/foundation/eslint-linter-options-default-override.md` 신규 create + `20.req/* → 60.done/req/` mv). RULE-02 단일 커밋. ID 충돌 주의: discovery 측 동일 세션 발행 `log-island-convergence` 도 `REQ-20260517-068` 메타 박제 — ID 중복. 본 spec 직접 영향 0 (각 spec 영역 직교), 차기 discovery 세션에서 ID 재배정 신호. | 전 섹션 (신규) |
