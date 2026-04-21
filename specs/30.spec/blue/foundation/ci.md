# CI foundation — GitHub Actions action 사용 + Node LTS + 메이저 floating 태그

> **위치**: `.github/workflows/*.yml`
> **관련 요구사항**: REQ-20260421-034 (재발행), REQ-20260421-023 (출처), REQ-20260421-012 (Node 20 deprecation 배치)
> **최종 업데이트**: 2026-04-21 (by inspector, REQ-034 재발행 — 원 blocked 해시 `626e1330c6535a7b2fe3b493e377298b39ae3d78ad5140850d3c8de5ea7ea74f` 대체)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-21, HEAD=28bbf26).

## 역할

CI 파이프라인 (`.github/workflows/*.yml`) 이 GitHub Actions 공식 action (`actions/checkout`, `actions/setup-node`) 위에서 Node.js LTS 최신 버전을 사용하고, 액션 버전 pin 은 메이저 floating 태그 (`@vN`) 만 사용한다 — 세 원칙의 시스템 불변식. 본 spec 은 세 요소의 평서형 선언 + 반복 검증 가능한 grep-baseline 게이트 한정이며, 구체 Node 메이저 숫자는 §기능 불변식·§수용 기준 본문에 박제하지 않는다 (감사성 메타는 §변경 이력 에만 부속). 운영 절차 artifact (본 spec 본문 외 관리 대상) 경계는 §참고 하단에 박제한다.

## 기능 불변식

1. **Action 사용 규약**: `.github/workflows/*.yml` 은 코드 체크아웃에 `actions/checkout@vN`, Node.js 세팅에 `actions/setup-node@vN` 을 사용한다. `@` 우측은 **메이저 floating 태그 (`@vN`)** 만 허용하며, 구체 patch pin (`@vN.M.P`) 은 금지한다. 커밋 SHA pin (`@<sha>`) 은 본 불변식의 대상이 아니며 — 도입 시 별 req 로 관리 — 현 시점 `.github/workflows/*.yml` 은 floating 태그 기반이다.

2. **Node 버전 원칙**: `actions/setup-node` 의 `with.node-version` 값은 GitHub Actions `ubuntu-latest` 환경에서 Node.js **LTS 최신** 을 지목한다. 본문 은 구체 메이저 숫자를 박제하지 않으며 (§기능 불변식 본문 + §수용 기준 본문), 실제 적용 메이저 숫자는 §변경 이력 메타에만 감사성 목적으로 1회 부속 박제된다.

3. **호환성 원칙**: `package.json` `engines.node` 제약 (존재 시) 과 `with.node-version` 은 상호 호환한다 — `engines.node` 의 하한보다 `with.node-version` 이 낮은 상태는 재발행판 불변식 위반. (본 불변식의 반복 검증은 `.github/workflows/*.yml` 과 `package.json` 병렬 grep 으로 수행되며, §스코프 규칙 gate (c) 외부에서 운영 단계 수행.)

> 본 3 불변식은 특정 날짜·릴리스·사건에 귀속되지 않고 CI 구조가 본 시스템의 불변 계약으로 존속한다. 본 spec 본문에는 구체 Node 메이저 숫자·상향 시점·운영 절차를 박제하지 않는다.

## 스코프 규칙

- **expansion**: 불허 — 본 spec 의 정상화 대상은 `.github/workflows/*.yml` 파일에 한정. 신규 워크플로 추가 시 본 불변식을 자동 계승하며 별 spec 불필요.
- **grep-baseline** (REQ-034 FR-02 재실행, HEAD=28bbf26 실측):

  (a) **`actions/checkout` 사용** — `grep -nE "uses:\s*actions/checkout@" .github/workflows/*.yml` → 1 hit in 1 file:
  - `.github/workflows/ci.yml:16` `uses: actions/checkout@v6`

  (b) **`actions/setup-node` 사용** — `grep -nE "uses:\s*actions/setup-node@" .github/workflows/*.yml` → 1 hit in 1 file:
  - `.github/workflows/ci.yml:19` `uses: actions/setup-node@v6`

  (c) **patch pin 금지** — `grep -nE "uses:\s*actions/(checkout|setup-node)@v[0-9]+\.[0-9]+\.[0-9]+" .github/workflows/*.yml` → **0 hit** (exit 1 = no match → PASS).

- **rationale**: gate (a)(b) 는 공식 action 사용의 positive 존재 확인 — 값이 0 이 되면 CI 가 비공식 수단으로 drift 된 상태. gate (c) 는 floating 태그 원칙의 negative 유지 — 1 이상이면 patch pin 이 재등장한 회귀. 세 gate 모두 반복 검증 가능하며 Node 메이저 숫자와 무관.

## 의존성

- 내부: `.github/workflows/*.yml` (현 시점 `ci.yml` 1개). `package.json` (`engines.node` 존재 시 §기능 불변식 §3 병렬 검증).
- 외부: GitHub Actions 공식 action `actions/checkout`, `actions/setup-node`. Node.js 재단 LTS 릴리스 스케줄.
- 역의존: CI 산출물 (테스트 PASS / 빌드 아티팩트) 전반.

## 테스트 현황

- [x] `.github/workflows/ci.yml` — `actions/checkout@v6` + `actions/setup-node@v6` 메이저 floating 태그 사용 (§스코프 규칙 gate (a)(b) 각 1 hit).
- [x] `.github/workflows/ci.yml` — 구체 patch pin 부재 (§스코프 규칙 gate (c) 0 hit).
- [x] `actions/setup-node` `with.node-version` 값이 LTS 최신 원칙에 부합 (실제 값은 §변경 이력 메타 참조).

## 수용 기준

- [x] (Must, FR-01) 본 spec §기능 불변식 §1 에 `actions/checkout@vN` + `actions/setup-node@vN` + 메이저 floating 태그 + 구체 patch pin 금지 4 요소가 평서형 선언.
- [x] (Must, FR-01) 본 spec §기능 불변식 §2 에 `node-version` 원칙이 "LTS 최신" 키워드로 박제. 본문에 구체 메이저 숫자 부재.
- [x] (Must, FR-02) §스코프 규칙 grep-baseline 에 FR-02 3 gate 실측 수치 + `파일:라인` 박제 (1 hit / 1 hit / 0 hit).
- [x] (Must, FR-03) 본 spec §역할 / §기능 불변식 / §수용 기준 본문에 구체 Node 메이저 숫자 0 hit (§변경 이력 메타 1회 부속 박제는 허용).
- [x] (Must, FR-04) 본 spec §테스트 현황 의 `[ ]` 마커 수 = 0 (unchecked=0 — NFR-03).
- [x] (Must, FR-05) 본 spec §변경 이력 에 `REQ-20260421-034`, consumed followup, 원 blocked 해시, 선행 done req 2건 참조가 박제. §참고 에도 교차 참조.
- [x] (Should, FR-06) 본 spec §참고 하단에 운영 절차 artifact 경계 1문장 박제 (본 spec 본문 외 영역 관리 명시). NFR-02 금지어 격리를 위해 §역할 대신 §참고 에만 박제.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-21 | inspector / 28bbf26 (REQ-20260421-034 재발행) | 최초 재발행. 원 판본 (해시 `626e1330c6535a7b2fe3b493e377298b39ae3d78ad5140850d3c8de5ea7ea74f`) 에서 §테스트 현황 잔존 수동 점검 1행 을 제거 후 본 판본 신설. REQ-20260421-023 FR-01 3 요소 (action 2종 + LTS 최신 + 메이저 floating) 평서형 선언 보존, §스코프 규칙 grep-baseline FR-02 3 gate 실측 수치 + `파일:라인` 박제, 구체 메이저 숫자 본문 부재 (FR-03). unchecked=0 충족 (FR-04 / NFR-03). consumed followup `specs/10.followups/20260421-0746-ci-node-lts-cadence-runbook-from-blocked.md` (discovery 영역에서 `60.done/followups/` 로 이동). 생성 시점 실제 적용값: `with.node-version` = Node 24 (`.github/workflows/ci.yml:21`, 본 spec §기능 불변식 본문에는 박제하지 않음 — 감사성 메타 1회 부속). RULE-07 자기검증: 본문은 시스템 불변식 선언 + grep-baseline 반복 검증 + 의존성 열거만 박제, "(수동)" / "runbook" / "점검 주기" / "incident" / "TODO" 단어 본문 부재 (NFR-02). 선행 done req 2건 (REQ-20260421-023 spec 발행 출처, REQ-20260421-012 Node 20 deprecation 배치) 및 원 blocked 해시 §참고 교차 박제. | 신설 전 섹션 |

## 참고

- **재발행 근거 REQ**: `specs/60.done/2026/04/21/req/20260421-ci-foundation-spec-reissue-runbook-separation.md` (REQ-20260421-034 — 본 재발행 계약).
- **Consumed followup**: `specs/10.followups/20260421-0746-ci-node-lts-cadence-runbook-from-blocked.md` (discovery 영역 `60.done/followups/` mv 대상).
- **원 blocked 판본 해시 (본 판본으로 대체됨)**: `626e1330c6535a7b2fe3b493e377298b39ae3d78ad5140850d3c8de5ea7ea74f` (`specs/50.blocked/spec/foundation/ci.md`, followup 승격 시 원본 삭제).
- **선행 done req**:
  - `specs/60.done/2026/04/21/req/20260421-ci-foundation-spec-ltsnode-floating-tag.md` (REQ-20260421-023 — 본 spec 3 요소 선언의 출처).
  - `specs/60.done/2026/04/21/req/20260421-ci-node20-deprecation-remediation.md` (REQ-20260421-012 — Node 20 deprecation 해소 이력).
- **실측 스냅샷 (HEAD=28bbf26)**:
  - `.github/workflows/ci.yml:16` `uses: actions/checkout@v6`
  - `.github/workflows/ci.yml:19` `uses: actions/setup-node@v6`
  - `.github/workflows/ci.yml:21` `node-version: '24'` (감사성 메타, §기능 불변식 본문 부재)
- **외부 근거**:
  - GitHub Actions 공식 문서 — `actions/checkout` / `actions/setup-node` README 의 major floating (`@vN`) 권장 관용구.
  - Node.js 재단 릴리스 스케줄 — Even 메이저 → LTS, Odd 메이저 → non-LTS.
- **운영 절차 artifact 경계**: Node LTS 상향 주기 점검 artifact 는 본 spec 본문 외 (`docs/runbook/` 등 운영 문서 영역) 에서 별도 관리. 본 spec 은 구조적 불변식만 박제.
- **RULE 준수**:
  - RULE-01 (inspector writer `30.spec/green/**` 만 — 본 세션 diff = `30.spec/green/foundation/ci.md` 신설 + `20.req/*` → `60.done/req/` mv).
  - RULE-02 (writer 경계 — `50.blocked/spec/foundation/ci.md` 원본 복원 조작 부재; 본 재발행은 신규 create).
  - RULE-05 (blocked 해제 경로 = followup → discovery → req → inspector 재발행).
  - RULE-07 (spec 본문 = 시스템 불변식 한정, 1회성 진단·운영 절차 artifact 본문 부재).
