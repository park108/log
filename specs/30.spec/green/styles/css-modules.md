# CSS Modules stage-1 enum + Skeleton.css 글로벌 classnames 의도 불변식

> **위치**: `src/**/*.module.css` (stage-1 enum) + `src/common/Skeleton.css` (stage-1 비포함 의도).
> **관련 요구사항**: REQ-20260517-076 FR-05
> **최종 업데이트**: 2026-05-17 (by inspector — REQ-076 흡수 최초 박제)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`893cdea`).

## 역할
CSS Modules 도입 **stage-1 대상 enum** 박제 + **`src/common/Skeleton.css` 가 stage-1 비포함 (글로벌 classnames 유지)** 의도 박제. 의도적으로 하지 않는 것: stage-2/3 확장 계획 (별 req — 단계적 마이그레이션 우선순위 결정 영역), CSS Modules 의 다른 정책 (예: `:global()` 사용 정책 / classnames hash 알고리즘 / SSR 정합 등 — 필요 시 별 spec), 글로벌 classnames 명명 컨벤션 (`.skeleton__block` 등 BEM 변형 — caller 영역), CSS-in-JS 도입 / 전환 (out-of-scope).

## 공개 인터페이스
- 없음 (CSS 계층 계약). 본 spec 은 측정 게이트 박제만 — `find src -name "*.module.css"` 결과 enum + `src/common/Skeleton.css` 헤더 주석 박제.

## 동작
1. **(I1) stage-1 enum 박제**: `find src -name "*.module.css"` 결과는 현 시점 다음 4개로 한정:
   - `src/Toaster/Toaster.module.css`
   - `src/Comment/Comment.module.css`
   - `src/Image/ImageSelector.module.css`
   - `src/Search/Search.module.css`
2. **(I2) Skeleton.css 글로벌 의도 박제**: `src/common/Skeleton.css` 는 CSS Module 이 아니다 (`.module.css` 접미사 미보유). 글로벌 classnames `.skeleton` / `.skeleton--<variant>` / `.skeleton__block` 사용. 이 의도는 파일 헤더 주석 (`/* Intentionally not a CSS Module — not part of the stage-1 modules targets. */` 형태) 으로 박제.
3. **(I3) stage-1 enum 변경 정합 계약**: 신규 `*.module.css` 추가 / 기존 모듈화 / Skeleton.css 모듈 전환 시 본 spec §동작 (I1) enum + §변경 이력 동기 갱신. enum 과 실 disk 상태 불일치 시 즉시 회귀 표면.
4. **(I4) Skeleton.css 모듈 전환 시 보고 계약**: `src/common/Skeleton.css` 가 `.module.css` 로 전환되면 (I2) 헤더 주석 + 본 spec §역할 갱신 + caller (`<div className="skeleton">` 등 글로벌 className 사용처) 전수 회수. 단순 파일명 변경 금지.
5. **(I5) 범위 제한**: 본 게이트는 `src/**/*.css` (글로벌) + `src/**/*.module.css` (모듈) 한정. `node_modules/**` / 빌드 산출물 / 외부 라이브러리 CSS 는 본 게이트 범위 밖. CSS 의 다른 측면 (animation / color / responsive 등) 은 별 spec.

### 회귀 중점
- `find src -name "*.module.css"` 결과가 §동작 (I1) enum 과 불일치 시 (I3) 위반 — enum 갱신 누락 / 신규 모듈 추가 / 기존 모듈 삭제 시점에 본 spec §변경 이력 박제 누락.
- `src/common/Skeleton.css` 가 `.module.css` 로 rename 되며 caller 측 className 사용처 회수 누락 시 (I4) 위반 — 글로벌 className 의 빈 매칭으로 스타일 미적용.
- `src/common/Skeleton.css` 헤더의 "stage-1 비포함" 의도 주석 제거 시 (I2) 위반 — 의도 박제 소실.

## 의존성
- 내부: `src/**/*.module.css` (stage-1 enum 입력), `src/common/Skeleton.css` (글로벌 의도 박제).
- 외부: Vite CSS Modules 빌드 (자동 인식 — `.module.css` 접미사 기반), `find` (enum 측정).
- 역의존 (사용처): stage-1 enum 의 4 모듈을 import 하는 JSX/TSX 컴포넌트 (각 컴포넌트 내부 `import styles from './X.module.css'`).
- 직교: `tooling.md` (ESLint), `accessibility.md` (focus-visible — 본 spec 과 직교 cosmetic 영역).

## 테스트 현황
- [x] (I1) stage-1 enum: `find src -name "*.module.css"` → 4 hits (`src/Toaster/Toaster.module.css` / `src/Comment/Comment.module.css` / `src/Image/ImageSelector.module.css` / `src/Search/Search.module.css`). HEAD=`893cdea` 실측 PASS.
- [x] (I2) Skeleton.css 글로벌 의도 박제: `head -5 src/common/Skeleton.css` → "Intentionally not a CSS Module — not part of the stage-1 modules targets." 주석 박제. HEAD=`893cdea` 실측 PASS.
- [ ] (I3) enum 변경 정합: 신규 `*.module.css` 추가 / 삭제 이벤트 발생 시 본 spec §변경 이력 박제. 차기 이벤트 대기.
- [ ] (I4) Skeleton.css 모듈 전환 시 보고: 전환 이벤트 발생 시 본 spec §역할 + caller 회수 동기. 차기 이벤트 대기.
- [x] (I5) 범위 제한: 정의상 항상 참.

## 수용 기준
- [x] (Must, FR-05-a) CSS Modules stage-1 enum 박제 — §동작 (I1) + 4 hits 실측.
- [x] (Must, FR-05-b) `src/common/Skeleton.css` 가 stage-1 비포함 (글로벌 classnames `.skeleton` / `.skeleton--<variant>` / `.skeleton__block`) 박제 — §동작 (I2).
- [ ] (Should) enum 변경 / Skeleton.css 모듈 전환 시 본 spec §변경 이력 박제 — 차기 이벤트 대기.
- [x] (Must, 범위 제한) `node_modules/**` / 빌드 산출물 / 외부 라이브러리 CSS / CSS 다른 측면은 본 게이트 범위 밖.

## 스코프 규칙
- **expansion**: N/A.
- **grep-baseline** (HEAD=`893cdea`, 2026-05-17):
  - `find src -name "*.module.css"` → **4 hits** (enum 박제):
    - `src/Toaster/Toaster.module.css`,
    - `src/Comment/Comment.module.css`,
    - `src/Image/ImageSelector.module.css`,
    - `src/Search/Search.module.css`.
  - `grep -nE "Intentionally not a CSS Module|stage-1 modules targets" src/common/Skeleton.css` → 1+ hit @:3 (글로벌 의도 박제). PASS.
  - `grep -nE "\.skeleton|\.skeleton--|\.skeleton__" src/common/Skeleton.css` → multi-hit (글로벌 classnames 박제 확인 — 본 spec §역할 참조).
  - `find src -name "*.css" -not -name "*.module.css" | wc -l` → 글로벌 CSS 파일 수 (참고 — 향후 stage 확장 baseline).
- **rationale**: (I1)(I2)(I5) 본 spec 박제 시점 PASS. (I3)(I4) 는 이벤트 대기 marker — 차기 `*.module.css` 추가 / 삭제 또는 Skeleton.css 전환 시 본 spec §변경 이력 갱신.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-076 흡수) / pending | 최초 박제 — CSS Modules stage-1 enum 4 모듈 + Skeleton.css 글로벌 의도 5 축 (I1~I5) 게이트. baseline: `*.module.css` 4 hits (Toaster/Comment/ImageSelector/Search) / Skeleton.css 헤더 의도 주석 박제. | all |

## 참고
- **REQ 원문**: REQ-20260517-076 (본 세션 mv 후).
- **관련 spec**:
  - `specs/30.spec/blue/components/common.md` (Skeleton variant 영역 — 본 spec 과 직교 cosmetic 정책).
- **RULE 준수**:
  - RULE-07: 5 불변식 (I1~I5) 모두 시점 비의존 평서문 + `find` / `grep` 단일 명령 재현 가능.
  - RULE-06: grep-baseline 4 gate 실측 박제.
  - RULE-01: inspector writer 영역만 (`30.spec/green/styles/css-modules.md` create).
