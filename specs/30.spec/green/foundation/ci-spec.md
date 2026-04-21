# CI foundation — GitHub Actions 구성 불변식

> **위치**: `.github/workflows/*.yml` (현 `ci.yml`).
> **관련 요구사항**: REQ-20260421-023
> **최종 업데이트**: 2026-04-21 (by inspector, 신규 등록)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=29d9da0).

## 역할
CI (GitHub Actions) 워크플로우의 **구성 불변식** — action 선택, Node.js 버전 정책, action 참조 태그 pinning 정책 — 을 박제한다. 의도적으로 하지 않는 것: 구체 Node 메이저 숫자 고정, 배포/릴리스 워크플로우 정의 (별 req), CI step 세부 구현 (task 계층).

## 공개 인터페이스
- 소비 파일: `.github/workflows/*.yml` (현 시점 `ci.yml` 1파일).
- 사용 action: `actions/checkout`, `actions/setup-node`.
- 주입 입력: `node-version` (setup-node 입력 필드).

## 동작
CI 워크플로우는 다음 3개 불변식을 만족한다.

### 1. Action 구성 불변식 (REQ-023 FR-01)
CI (GitHub Actions) 워크플로우는 `actions/checkout`, `actions/setup-node` 2개 공식 액션을 사용한다. 비공식 포크·커스텀 로컬 액션으로의 치환은 금지 (보안·유지보수 계약).

### 2. Node.js 버전 정책 불변식 (REQ-023 FR-01)
`setup-node` 에 주입되는 `node-version` 은 **LTS 최신** — 해당 시점 Node.js 재단이 Active LTS 로 지정한 최신 메이저 — 을 사용한다. 구체 메이저 숫자 (예: `22`) 는 spec 에 박제하지 않으며 운영자가 LTS 릴리스 주기에 따라 상향한다.

### 3. Action 참조 태그 pinning 불변식 (REQ-023 FR-01)
`uses: actions/<name>@<ref>` 의 `<ref>` 는 **메이저 floating 태그** (`@v4`, `@v5`, `@v6` 등) 만 사용한다. 구체 minor/patch pinning (`@v6.1.0`, `@v6.1.2` 등) 은 금지. GitHub Actions 공식 문서의 major-floating 권장 관용구를 따른다.

### 회귀 중점
- 메이저 floating 태그는 action publisher 의 메이저 버전 호환성 계약에 의존 — 메이저 bump 시 breaking 발생 가능하므로 운영자가 변경 로그 모니터링.
- Node LTS 상향은 의존성 호환성 (engines / vitest / msw 등) 과 정합 확인 필요.

## 의존성
- 외부: GitHub Actions marketplace (`actions/checkout`, `actions/setup-node`).
- 내부: `package.json` `engines.node` (있다면 LTS 최신과 정합).
- 역의존: PR 게이트 (test/lint/build) 가 본 CI 구성에 의존.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 grep 게이트 계약 문서가 아니며 baseline 실측만 박제).
- **grep-baseline** (inspector 발행 시점, HEAD=29d9da0 실측):
  - (a) `grep -nE "uses:\s*actions/checkout@" .github/workflows/*.yml` → 1 hit (`.github/workflows/ci.yml:16` → `actions/checkout@v6`).
  - (b) `grep -nE "uses:\s*actions/setup-node@" .github/workflows/*.yml` → 1 hit (`.github/workflows/ci.yml:19` → `actions/setup-node@v6`).
  - (c) `grep -nE "uses:\s*actions/(checkout|setup-node)@v[0-9]+\.[0-9]+\.[0-9]+" .github/workflows/*.yml` → 0 hit (구체 patch pin 금지 — OK).
- **rationale**: gate (a)/(b) 는 공식 2 액션 사용 확인 (1+ hit = OK). gate (c) 는 minor/patch pinning 부재 확인 (0 hit = OK). `node-version` 현 실측 값은 `'24'` 로 spec 의 "LTS 최신" 정책과 정합 여부는 운영자 판단 대상 — §변경 이력 메타 참조.

## 테스트 현황
- [x] (자동) CI 워크플로우 자체가 매 PR 에서 실행되며 action 참조 해결 실패 0.
- [ ] (수동) Node LTS 상향 주기 시점 engine 호환성 확인 (별 task 대상).

## 수용 기준
- [x] (Must, FR-01) 액션 구성 불변식 문장 박제.
- [x] (Must, FR-01) Node.js LTS 최신 정책 문장 박제.
- [x] (Must, FR-01) 메이저 floating 태그 정책 문장 박제.
- [x] (Must, FR-02) §스코프 규칙 grep-baseline 에 3개 gate 실측 수치 박제.
- [x] (Should, FR-03) §변경 이력 에 실측 Node LTS 메이저 메타 박제 (아래).
- [x] (Must, FR-04) §변경 이력 에 `REQ-20260421-023` + consumed followup 경로 참조.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 29d9da0 | 최초 등록 (REQ-20260421-023). `ci-node20-deprecation-remediation-spec` followup (RULE-07 반려된 1회성 3-라인 patch spec) 의 잔존 불변식 1건을 평서형 응축. consumed followup: `specs/10.followups/20260421-0541-ci-node20-deprecation-remediation-spec-from-blocked.md`. 선행 done req: `specs/60.done/2026/04/21/req/20260421-ci-node20-deprecation-remediation.md` (Node 20 deprecation 배치 완료). 실측 Node LTS 메이저 메타 (2026-04-21 시점): Active LTS = Node 22 (Jod), Maintenance LTS = Node 20 (Iron). 현 `ci.yml:21` `node-version: '24'` — Node 24 는 Odd 메이저로 LTS 지정 대상 아님; 본 spec 의 "LTS 최신" 정책과의 정합성은 운영자/task 계층 판정 대상 (spec 박제 범위 외). | 신규 전 섹션 |

## 참고
- **REQ 원문 (완료 처리)**: `specs/60.done/2026/04/21/req/20260421-ci-foundation-spec-ltsnode-floating-tag.md`.
- **Consumed followup**: `specs/10.followups/20260421-0541-ci-node20-deprecation-remediation-spec-from-blocked.md`.
- **선행 done req**: `specs/60.done/2026/04/21/req/20260421-ci-node20-deprecation-remediation.md`.
- **외부 근거**:
  - GitHub Actions 공식 문서 `actions/checkout`, `actions/setup-node` README (major floating 권장 관용구).
  - Node.js 재단 릴리스 스케줄 (LTS 지정 메이저는 Even 번호).
- **RULE 준수**:
  - RULE-07: 불변식 한정, 1회성 3-라인 patch 배제.
  - RULE-01: inspector writer 영역만 (`30.spec/green/foundation/`).
  - RULE-06: `grep-baseline` 정밀 패턴 승계.
