# `div` 기반 popup trigger `:focus-visible` 표시 불변식 (WCAG 2.4.7)

> **위치**: `src/Monitor/Monitor.css:120-126` (`.div--monitor-pillar:focus-visible` / `.div--monitor-statusbar:focus-visible`).
> **관련 요구사항**: REQ-20260420-021, REQ-20260517-076 FR-04
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-076 흡수 최초 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea`).

## 역할
의미적으로 interactive 한 (`tabindex` 부여 + `onKeyDown` / `onClick` 핸들러 보유) `div` 기반 popup trigger (예: `.div--monitor-pillar`, `.div--monitor-statusbar`) 는 **`:focus-visible` 시 visible focus indicator (outline ≥ 2px)** 를 가진다는 WCAG 2.1 SC 2.4.7 (Focus Visible) 준수 불변식. 의도적으로 하지 않는 것: WCAG 전반 정책 (별 spec — `a11y-audit` 영역, `src/common/a11y.audit.test.ts` referer), `button` / `a` 등 native interactive element 의 focus 표시 (브라우저 기본 보존 — 본 spec 범위 밖), keyboard navigation 순서 (별 spec — focus management 영역), screen reader 동작 (별 spec — ARIA 영역), color contrast (별 spec — WCAG SC 1.4.11 영역).

## 공개 인터페이스
- 없음 (CSS 계층 계약). 본 spec 은 측정 게이트 박제만 — `src/**/*.css` 의 `:focus-visible` 규칙 존재 + outline 속성 측정.

## 동작
1. **(I1) `div` 기반 popup trigger 식별**: `src/**/*.css` 의 `.div--*` (또는 동등 의미 — `tabindex` 부여된 div) selector 가 적용되는 element 는 `:focus-visible` pseudo-class 시 visible focus indicator 를 가진다.
2. **(I2) outline ≥ 2px 계약**: visible focus indicator 는 `outline: ≥2px solid <color>` (또는 등가 `outline-width: ≥2px`). 색상은 `var(--color-focus-ring, currentColor)` 또는 명시 색상 — `transparent` / `none` 금지.
3. **(I3) outline-offset 보조 계약 (Should)**: focus 표시의 시각적 분리를 위해 `outline-offset: ≥1px` 보조 (Monitor 현 구현 `outline-offset: 2px`). 본 보조는 cosmetic — Must 아님.
4. **(I4) `:focus` vs `:focus-visible` 분리 계약**: `:focus-visible` (키보드 / 명시 focus 입력 한정 — 마우스 click 시 비표시) 사용. `:focus` 전반 (마우스 click 포함) 사용 시 마우스 사용자 시각 노이즈 — 본 spec 은 `:focus-visible` 한정 박제.
5. **(I5) WCAG SC 2.4.7 결과 효능**: `tabindex=0` 부여된 모든 `div` trigger 가 키보드 Tab 순회 시 시각적으로 식별 가능한 focus 표시를 가짐 — WCAG 2.1 AA 충족.
6. **(I6) 범위 제한**: 본 게이트는 `src/**/*.css` 한정. native interactive element (`button`, `a`, `input` 등) 의 focus 표시는 브라우저 기본 보존 — 본 게이트 범위 밖. 외부 라이브러리 (React Router 등) 의 focus 표시는 caller 측 영역.

### 회귀 중점
- `.div--monitor-pillar:focus-visible` / `.div--monitor-statusbar:focus-visible` 규칙 제거 시 (I1)(I5) 위반 — 키보드 사용자가 popup trigger focus 위치 식별 불가.
- `outline: none` 또는 `outline: 0` 으로 변경 시 (I2) 위반 — visible indicator 부재.
- `:focus-visible` 을 `:focus` 로 변경 시 (I4) 위반 — 마우스 사용자 시각 노이즈.
- 신규 `div` 기반 popup trigger 도입 시 `:focus-visible` 규칙 누락 — (I1) 위반, 별 task 회수 대상.

## 의존성
- 내부: `src/Monitor/Monitor.css:120-126` (현 박제 위치).
- 외부: 브라우저 `:focus-visible` pseudo-class (Chromium 86+ / Firefox 85+ / Safari 15.4+ 지원 — `caniuse` 정합).
- 역의존 (사용처): `src/Monitor/**` 의 `div--monitor-pillar` / `div--monitor-statusbar` 클래스를 가진 JSX element (popup trigger).
- 직교: `tooling.md` (ESLint 영역), `src/common/a11y.audit.test.ts` (WCAG 전반 audit — 본 spec 보다 광범위).

## 테스트 현황
- [x] (I1) `div` 기반 popup trigger `:focus-visible` 규칙 존재: `grep -rnE ":focus-visible" src --include="*.css"` → 2 hits @`src/Monitor/Monitor.css:122,123`. HEAD=`893cdea` 실측 PASS.
- [x] (I2) outline ≥ 2px: `src/Monitor/Monitor.css:124` `outline: 2px solid var(--color-focus-ring, currentColor)` 박제. HEAD=`893cdea` 실측 PASS.
- [x] (I3) outline-offset (Should): `src/Monitor/Monitor.css:125` `outline-offset: 2px` 박제.
- [x] (I4) `:focus-visible` 한정 (`:focus` 전반 미사용): `grep -nE ":focus[^-]" src/Monitor/Monitor.css` → 0 hit (조건 — `:focus` 단독 사용 없음). HEAD=`893cdea` 실측 PASS.
- [ ] (I5) WCAG SC 2.4.7 결과 효능: `src/common/a11y.audit.test.ts` 또는 별 회귀 fixture 가 키보드 Tab 순회 후 focus indicator 시각 측정. 별 task / 별 spec 위임.
- [x] (I6) 범위 제한: 정의상 항상 참.

## 수용 기준
- [x] (Must, FR-04-a) `div` 기반 popup trigger 가 `:focus-visible` 시 visible focus indicator (outline ≥ 2px) 를 가진다는 평서문 박제. §역할 + §동작 (I1)(I2).
- [x] (Should, FR-04-b) WCAG 2.1 SC 2.4.7 (Focus Visible) 준수 결과 효능 박제 — §역할 + §동작 (I5).
- [x] (Should) `:focus` vs `:focus-visible` 분리 박제 — §동작 (I4).
- [x] (Must, 범위 제한) native interactive element / 외부 라이브러리 / WCAG 전반 정책은 본 게이트 범위 밖.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17):
  - `grep -rnE ":focus-visible" src --include="*.css"` → 2 hits in 1 file:
    - `src/Monitor/Monitor.css:122` (`.div--monitor-pillar:focus-visible,`),
    - `src/Monitor/Monitor.css:123` (`.div--monitor-statusbar:focus-visible {`).
  - `grep -nE "outline" src/Monitor/Monitor.css` → 2 hits @:124-125 (`outline: 2px solid var(--color-focus-ring, currentColor); outline-offset: 2px;`).
  - `grep -nE "REQ-20260420-021" src/Monitor/Monitor.css` → 1 hit @:121 (의도 주석 — 본 spec referer).
  - `grep -rnE ":focus[^-]" src/Monitor/Monitor.css` → 0 hit (`:focus` 단독 사용 없음 — (I4) PASS).
- **rationale**: (I1)~(I4)(I6) 본 spec 박제 시점 PASS. (I5) WCAG audit 측정은 별 task 위임 — 본 spec 은 결과 효능 박제만. 현 박제는 Monitor 도메인 한정 — 다른 도메인 (`Log` / `Comment` / `Search` 등) 에 `div` 기반 popup trigger 도입 시 동일 계약 확장 필요 (별 task carve 대상).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — `div` 기반 popup trigger `:focus-visible` 표시 6 축 (I1~I6) 게이트. baseline: `src/Monitor/Monitor.css:122-126` 박제 + `:focus` 단독 0 hit (I4) PASS. 원전 REQ-20260420-021 보존 (Monitor 도메인 한정). | all |

## 참고
- **REQ 원문**: REQ-20260420-021 (Monitor a11y), REQ-20260517-076 (본 세션 mv 후).
- **관련 spec**:
  - `specs/30.spec/blue/components/common.md` (Skeleton + ErrorFallback 영역 — 본 spec 과 직교, 다른 a11y 측면).
- **외부 레퍼런스**: WCAG 2.1 SC 2.4.7 Focus Visible (`https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html`).
- **RULE 준수**:
  - RULE-07: 6 불변식 (I1~I6) 모두 시점 비의존 평서문 + `grep` 단일 명령 재현 가능.
  - RULE-06: grep-baseline 4 gate 실측 박제.
  - RULE-01: inspector writer 영역만.
