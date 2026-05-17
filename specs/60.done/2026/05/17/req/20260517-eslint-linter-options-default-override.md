# ESLint flat-config `linterOptions` 디폴트 override 단일성 — `reportUnusedDisableDirectives` 명시 박제 + ESLint v9+ default drift fail-safe 상시 불변식

> **ID**: REQ-20260517-068
> **작성일**: 2026-05-17
> **상태**: Draft

## 개요
프로젝트의 `eslint.config.js:17-20` 은 ESLint v9+ flat-config 가 `linterOptions.reportUnusedDisableDirectives` 의 기본값을 v8 의 `false` 에서 v9 의 `'warn'` 으로 변경한 사실에 대응하여 `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }` 단일 블록을 명시 등록한다. 본 블록은 **rule 의미가 아닌 linter-level 옵션** 이며 (REQ-028 `tooling.md` §동작 1~6 의 `rules` 축과 직교), 본 명시 박제 부재 시 ESLint 메이저 bump 또는 v9 minor bump 가 default 를 추가 변경 (예: `'error'` 승격) 할 경우 lint output noise · CI fail 채널이 잠재 회귀로 노출된다. 본 req 는 1회성 v8→v9 migration 인계가 아니라 **반복 검증 가능한 상시 불변식** — (a) `linterOptions` 블록 단일 등록 + (b) `reportUnusedDisableDirectives` 명시 값 박제 + (c) 본 블록의 배열상 위치 (rule 블록보다 앞에 위치 — flat-config last-write-wins 와 무관, linterOptions 는 rule key 와 별도 키) + (d) ESLint 메이저/마이너 bump 후 default 추가 변경 fail-safe 효능 — 을 spec 으로 박제할 것을 요청한다.

## 배경
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측, 동일 작업 트리)**:
  - `eslint.config.js:17-19` 의도 주석: "v9 flat-config defaults enable `reportUnusedDisableDirectives: 'warn'`; legacy v8 default was `false`. Pin to `off` to preserve equivalence (§3.3, §5.3 regression ±0). Scope: linter-level, not a rule-semantic change."
  - `eslint.config.js:20` 단일 선언: `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }`.
  - `grep -cE "linterOptions" eslint.config.js` → **1 hit** (단일 블록 등록 baseline).
  - `grep -nE "reportUnusedDisableDirectives" eslint.config.js` → 2 hits (`:17` 주석, `:20` 선언).
  - `grep -rnE "eslint-disable" src` → **1 hit** (`src/common/errorReporter.ts:10` `// eslint-disable-next-line no-console`) — 본 directive 의 `no-console` rule 이 본 line 에서 활성 사용 중이므로 `reportUnusedDisableDirectives: 'warn'` 으로 toggle 시 noise 0 expected. 그러나 미래 directive 추가 시 unused 신호 차단 의미가 spec 박제 부재 상태에서 lint output 분기 가능.
  - `package.json:43` `"eslint": "^9.39.4"` — ESLint 메이저 9 (v9+ default 변경 적용 대상). REQ-058 영역.
- **이력 박제**:
  - `30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint flat-config 의 rule 의미 축 (files 패턴 단일성 + 파서 단일성 + `no-unused-vars` rule swap + flat-config last-write-wins) 박제. **본 req 는 `linterOptions` 축으로 직교** — `rules` 키와 `linterOptions` 키는 별도 키이며 last-write-wins semantics 가 동일 키 기준 적용. REQ-058 의 §동작 6 last-write-wins 가 rule key 한정 박제이므로 `linterOptions` 키 자체는 미박제 영역.
  - REQ-022 (`.eslintrc.yml` → flat-config 1:1 포팅, TSK-20260420-26) — `eslint.config.js:1-3` 헤더 주석에 박제. 본 req 는 v9 default 변경에 대한 명시 override 의 상시 효능 박제 — 1:1 포팅 이력 자체는 incident 귀속.
- **drift 발생 가능 시나리오 (구체)**:
  - (a) ESLint v9.x → v9.y minor bump 가 `reportUnusedDisableDirectives` default 를 `'warn'` → `'error'` 승격 (가설). 본 spec 박제 부재 시 미래 unused directive 출현 시 CI `npm run lint` rc≠0 fail-fast — 정합 의도일 수도 있지만, 본 spec 박제 부재면 의도 vs 회귀 구분 불가.
  - (b) ESLint v10 메이저 bump 가 `linterOptions` 블록의 위치 의존성 변경 — 본 req 는 위치 비박제 (linterOptions 는 rule key 와 직교 키이므로 flat-config last-write-wins 와 무관) 이나 v10 변경 시 본 spec 갱신 신호.
  - (c) 본 블록의 의도하지 않은 중복 등록 — flat-config 가 동일 `linterOptions` 키를 복수 블록에서 선언할 경우 last-write-wins 적용 (rule key 와 동일 semantics). 본 req §스코프 규칙 grep-baseline `linterOptions` 등록 수 = 1 박제로 중복 도입 감지.
  - (d) `reportUnusedDisableDirectives` 값을 `'off'` → `'warn'` → `'error'` 로 의도적 변경 시 spec 갱신 신호 (baseline 변경 감지).
  - (e) `linterOptions` 의 다른 키 (예: `noInlineConfig`) 가 신규 도입될 경우 — 본 req 는 `reportUnusedDisableDirectives` 한정 명시 박제. `noInlineConfig` 등 다른 키는 별 req.
- **본 req 가 박제하지 않는 것 (RULE-07 정합)**:
  - `reportUnusedDisableDirectives` 의 의도된 값 결정 (`'off'` 유지 vs `'warn'` 승격 vs `'error'` — 수단 중립, 현 baseline 박제만).
  - ESLint 메이저 bump 결정 (v9 → v10 — `dependency-bump-gate` 직교).
  - `eslint-disable` directive 잔존 코드 (`src/common/errorReporter.ts:10`) 의 제거 결정 (별 task — REQ-028 영역의 lint 의미 축).
  - `linterOptions` 의 다른 키 (`noInlineConfig` 등) 박제 (별 req).
  - v8 → v9 1:1 포팅 이력 (REQ-022 영역, incident 귀속).
  - `eslint.config.js:11-14` `**/*.d.ts` ignores 제거 이력 (TSK-20260420-33, REQ-20260420-006 영역, incident 귀속).
- **선행 spec / req 와의 차별 (직교 축)**:
  - `30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint files 패턴 / 파서 / rule swap / last-write-wins (`rules` 키 한정). **본 req 는 `linterOptions` 키 축으로 직교**.
  - `30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage threshold. 본 req 는 lint output 의미 축으로 직교 (`npm run lint` rc 의 출력 noise 분기).
  - `30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. 본 req 는 ESLint 메이저 bump 시 default 변경 fail-safe 의 명시 박제 — bump-gate 의 exit 0 조건이 본 req 의 default override 박제 없이도 vacuous 통과 가능 (현재 unused directive 0 hit 이므로). 본 req 의 효능은 미래 directive 추가 시점에 명확해진다.
  - `20.req/20260517-test-discovery-population-coherence.md` (REQ-067) — 도구 4축 모집단 매트릭스. 본 req 의 linter 옵션 축과 직교.
  - `20.req/20260517-vite-jsx-transform-channel-coherence.md` (REQ-066) — vite JSX 변환 채널. 본 req 의 ESLint linter 옵션 축과 직교.
  - `30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재. 본 req 의 옵션 박제 축과 직교 (단, `node_modules/eslint` 부재 시 `npm run lint` 자체 실행 불가 — precondition 관계).
  - `30.spec/green/foundation/path-alias-resolver-coherence.md` (REQ-065) — vite alias ↔ tsconfig paths 동치. 본 req 의 linter 옵션 축과 직교.

## 목표
- In-Scope:
  - `eslint.config.js` 에 `linterOptions.reportUnusedDisableDirectives` 가 **명시 박제** + 단일 블록 등록 (등록 수 = 1) 박제.
  - ESLint v8 default `false` ↔ v9 default `'warn'` 의 의미적 차이가 spec 본문 §동작 에 평서형 박제.
  - 현 baseline 값 `'off'` 가 §스코프 규칙 grep-baseline 에 박제 — 값 변경 시 fail 신호.
  - `linterOptions` 블록의 배열상 위치가 `rules` 키와 직교 키이므로 last-write-wins (REQ-058 §동작 6) 와 무관함이 spec 본문에 평서형 박제.
  - ESLint 메이저/마이너 bump 후 본 옵션의 default 추가 변경 (예: `'warn'` → `'error'`) 시 fail-safe — `eslint.config.js` 의 명시 박제가 default 변경에 무관하게 의도된 값 보존.
- Out-of-Scope:
  - `reportUnusedDisableDirectives` 값 결정 (`'off'` 유지 vs `'warn'` 승격 — 수단 중립).
  - ESLint 메이저 bump 결정 (v9 → v10 — `dependency-bump-gate` 직교).
  - `eslint-disable` directive 잔존 코드 제거 결정 (`src/common/errorReporter.ts:10` — 별 task).
  - `linterOptions` 의 다른 키 (`noInlineConfig` 등) 박제 (별 req).
  - `eslint.config.js:11-14` 의 `ignores` 패턴 박제 (`'build/**'`, `'coverage/**'`, `'node_modules/**'`, `'**/__test__/*.js'`, `'**/api.js'` — 별 req).
  - v8 → v9 1:1 포팅 이력 자체 (REQ-022 영역).

## 기능 요구사항
| ID | 설명 | 우선순위 |
|----|------|---------|
| FR-01 | `eslint.config.js` 에 `linterOptions` 키를 선언하는 블록이 **정확히 1건** 존재한다. 등록 수 변경 (2 이상 추가 또는 0 으로 제거) 은 spec 갱신 필요 신호. 현 baseline: `grep -cE "linterOptions" eslint.config.js` = 1. | Must |
| FR-02 | 본 블록은 `reportUnusedDisableDirectives` 옵션을 **명시 박제** 한다. 옵션 부재 (`linterOptions: {}` 등) 는 ESLint v9 default `'warn'` 으로 fallthrough 되므로 본 req 박제 위반. 현 baseline 값: `'off'` (v8 default `false` 와 의미 동치). | Must |
| FR-03 | 본 spec §동작 본문은 ESLint v8 default `false` ↔ v9 default `'warn'` 의 의미적 차이가 **linter-level 옵션** 임을 평서형 박제 — `rules` 키의 의미 (rule 의 활성/severity) 와 직교. 본 옵션 변경은 lint output 의 `--unused-disable-directives` 분기 효능에만 영향. | Must |
| FR-04 | 본 spec §동작 본문은 `linterOptions` 키의 배열상 위치가 `rules` 키의 last-write-wins (REQ-058 §동작 6) 와 **직교 키 semantics** 임을 평서형 박제 — 동일 `linterOptions.reportUnusedDisableDirectives` 키를 복수 블록에서 선언할 경우에도 last-write-wins 가 적용되지만, `rules` 키의 last-write-wins 와 무관한 별도 키 채널. 현 baseline 은 단일 블록 (FR-01) 이므로 last-write-wins 트리거 부재. | Should |
| FR-05 | 본 spec 의 박제는 ESLint 메이저/마이너 bump (예: v9.39 → v9.40, v9 → v10) 가 `reportUnusedDisableDirectives` default 를 추가 변경 (예: `'warn'` → `'error'`) 할 경우 **fail-safe** — `eslint.config.js` 의 명시 박제가 default 변경에 무관하게 의도된 `'off'` 값 보존. ESLint 메이저 bump 후 본 옵션의 의도된 값이 `'off'` 외 다른 값으로 변경되어야 한다면 spec 갱신 신호. | Should |
| FR-06 | 본 spec 의 박제는 `npm run lint` (`eslint.config.js:20` baseline 적용 시) 의 unused `eslint-disable` directive 출력이 0 hit 임을 효능 박제 — 현 baseline `src/common/errorReporter.ts:10` `// eslint-disable-next-line no-console` directive 는 본 line 에서 `console.error` 호출이 실재하므로 unused 신호 0. directive 추가/제거 시 본 효능은 baseline `'off'` 값으로 인해 lint output 에 노이즈 분기 부재. `'warn'` / `'error'` 승격 결정 시 본 효능 평서문 갱신 필요. | Should |
| FR-07 | 본 spec 은 `linterOptions` 의 다른 키 (`noInlineConfig`, 미래 추가 키) 에 비박제 — `reportUnusedDisableDirectives` 한정 명시 박제. 다른 키 도입 시 별 req 발행. | Should |

## 비기능 요구사항
| ID | 카테고리 | 측정 기준 |
|----|---------|----------|
| NFR-01 | 검증 가능성 | 본 req 의 모든 FR 은 `eslint.config.js` 의 정적 read + `grep` 단일 명령으로 검증 가능. CI/로컬 어디서든 외부 네트워크 의존 없음. |
| NFR-02 | 시점 비의존 | 본 req 의 효능 평서문은 특정 ESLint 메이저 (9) / 마이너에 무관 — baseline 수치·옵션 값은 §스코프 규칙 grep-baseline 에만 박제. 효능 표현은 "linterOptions 블록 등록 수 = 1" / "reportUnusedDisableDirectives 명시 박제" 등 시점 비의존 형식. |
| NFR-03 | 수단 중립 | 본 req 는 `reportUnusedDisableDirectives` 값 (`'off'` / `'warn'` / `'error'`) 결정에 라벨 ("기본값" / "권장" / "우선" / "default" / "best practice" / "root cause" / "가장 효과적") 을 박제하지 않는다 — 명시 박제 + default override 효능만. |
| NFR-04 | 차원 분리 | 본 req 는 ESLint flat-config 의 `linterOptions` 키 박제 만 박제하며, (a) `rules` 키 의미 (REQ-028 / REQ-053 / REQ-058 — `tooling.md`), (b) `files` 패턴 (REQ-028 영역), (c) `ignores` 패턴 (별 req), (d) tsconfig path alias 동치 (REQ-065 — `path-alias-resolver-coherence`), (e) coverage threshold 수치 (REQ-037 — `regression-gate.md`), (f) coverage 측정 결정론 (REQ-041 / REQ-043 — `coverage-determinism.md`) 의 축에 비박제. |
| NFR-05 | 멱등성 | 본 req 의 게이트는 `eslint.config.js` 내용 동일 상태에서 반복 적용 시 동일 결과 (RULE-02 멱등 정합). |
| NFR-06 | 자동 추종 | 본 spec 의 옵션 박제는 `eslint.config.js` 의 baseline 박제로 표현되며, 옵션 추가/제거 또는 값 변경 시 baseline 변경 자체가 fail 신호. 특정 ESLint 메이저 default 표현의 본문 효능 평서문 하드코딩 부재 (effects: "default override 명시" 자체만 박제). |

## 수용 기준
- [ ] Given `eslint.config.js:20`, When `grep -cE "linterOptions" eslint.config.js` 실행, Then 1 hit — `linterOptions` 블록 등록 수 = 1 (FR-01).
- [ ] Given `eslint.config.js:20`, When `grep -nE "reportUnusedDisableDirectives" eslint.config.js` 실행, Then 2 hits (`:17` 주석 + `:20` 선언) — 명시 박제 (FR-02).
- [ ] Given `eslint.config.js:20`, When `grep -nE "reportUnusedDisableDirectives\s*:\s*'off'" eslint.config.js` 실행, Then 1 hit (`:20` 선언) — 현 baseline 값 `'off'` 박제 (FR-02).
- [ ] Given `eslint.config.js:17-19` 의도 주석, When `grep -nE "v9.*defaults.*reportUnusedDisableDirectives|v8.*default.*false" eslint.config.js` 실행, Then ≥1 hit — v8/v9 default 차이 명시 박제 (FR-03 구현부 근거).
- [ ] Given `npm run lint`, When 실행 (현 baseline 적용), Then unused `eslint-disable` directive 출력 0 hit (현재 `src/common/errorReporter.ts:10` directive 는 활성 사용 — FR-06).
- [ ] Given 미래 ESLint v9.x → v9.y minor bump, When 동일 `eslint.config.js` 로 `npm run lint` 실행, Then `'off'` 값이 default 변경에 무관하게 유지되어 lint output 의 unused directive 채널 0 hit (FR-05 fail-safe 효능).
- [ ] Given 미래 PR (예: `linterOptions: { reportUnusedDisableDirectives: 'off', noInlineConfig: true }` 신규 키 추가), When `grep -cE "linterOptions" eslint.config.js` 실행, Then 1 hit (블록 등록 수 불변), `grep -nE "reportUnusedDisableDirectives" eslint.config.js` 2 hits 유지. `noInlineConfig` 키 박제는 별 req 발행 신호 (FR-07).

## 참고
- **현장 근거 (HEAD=`b42e36f`, 2026-05-17 실측)**:
  - `eslint.config.js:17-19` 의도 주석 — "v9 flat-config defaults enable `reportUnusedDisableDirectives: 'warn'`; legacy v8 default was `false`. Pin to `off` to preserve equivalence (§3.3, §5.3 regression ±0). Scope: linter-level, not a rule-semantic change."
  - `eslint.config.js:20` 단일 선언 — `{ linterOptions: { reportUnusedDisableDirectives: 'off' } }`.
  - `package.json:43` `"eslint": "^9.39.4"` (ESLint 메이저 9).
  - `src/common/errorReporter.ts:10` `// eslint-disable-next-line no-console` — 본 line 의 `console.error` 호출 실재 (line 11) → directive 활성 사용 → unused 신호 0.
- 직교 참조:
  - `specs/30.spec/blue/foundation/tooling.md` (REQ-028 / REQ-053 / REQ-058) — ESLint flat-config 의 `rules` 키 의미 축. 본 req 와 `linterOptions` 키 축 직교.
  - `specs/30.spec/blue/foundation/regression-gate.md` (REQ-037) — CI typecheck + coverage threshold. 본 req 와 lint output noise 축 직교.
  - `specs/30.spec/blue/foundation/dependency-bump-gate.md` (REQ-035) — bump 직후 4 scripts exit 0. 본 req 의 default override 박제가 ESLint bump 시 fail-safe (간접 결합).
  - `specs/30.spec/green/foundation/path-alias-resolver-coherence.md` (REQ-065) — vite alias ↔ tsconfig paths 동치. 본 req 와 linter 옵션 축 직교.
  - `specs/30.spec/green/foundation/devbin-install-integrity.md` (REQ-064) — devbin install 존재. 본 req 의 precondition (eslint binary resolve).
  - `specs/30.spec/green/foundation/vite-jsx-transform-channel-coherence.md` (REQ-066) — vite JSX 변환 채널. 본 req 와 ESLint linter 옵션 축 직교.
  - `specs/20.req/20260517-test-discovery-population-coherence.md` (REQ-067) — 도구 4축 모집단 매트릭스. 본 req 와 linter 옵션 축 직교.
- 외부 레퍼런스:
  - ESLint v9 release notes — `linterOptions.reportUnusedDisableDirectives` default 가 v8 `false` 에서 v9 `'warn'` 으로 변경. flat-config 의 권장 명시 override 패턴.
  - ESLint flat config — `linterOptions` 는 `rules` 와 별도 키이며 동일 키 last-write-wins 가 적용되지만 rule key 와 직교.
- HEAD: `b42e36f` (실측 시점, 2026-05-17).
