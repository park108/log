# root-level config/script/hook → spec 참조 경로 정합 (RULE-01 `-spec` 금지 + 디스크 실재 + promote 동기화)

> **위치**: 횡단 시스템 불변식 — 저장소 root 의 빌드/도구/훅/진단 파일군 (`vite.config.js`, `eslint.config.js`, `tsconfig.json`, `index.html`, `.husky/*`, `scripts/*.sh`) 내 spec 참조 주석/문자열. 단일 식별자 없음 (게이트는 grep + `test -e` 측정).
> **관련 요구사항**: REQ-20260517-097
> **최종 업데이트**: 2026-05-17 (by inspector — 최초 박제; Phase 2 REQ-097 흡수)

> 본 spec 은 자매 `foundation/src-spec-reference-coherence.md` (REQ-071, `src/**` scope) 의 **root-level 자매 axis** + **승격 동기화 (축 C) 신규**. baseline 격차는 §스코프 규칙 grep-baseline 에 박제 (작성 시 inspector 책임).

## 역할
저장소 root 의 빌드 / 도구 / 훅 / 진단 스크립트 파일 (`vite.config.js`, `eslint.config.js`, `tsconfig.json`, `index.html`, `.husky/pre-commit`, `.husky/pre-push`, `scripts/*.sh`) 의 주석 / 문자열이 `specs/30.spec/**` spec 문서를 참조할 때, 그 참조 경로/slug 는 (a) RULE-01 `-spec` suffix 금지 + (b) 디스크 실재 (`test -e`) + (c) blue↔green 승격 상태와의 정합 **3 축 시스템 불변식** 을 동시 만족해야 한다는 **상시 시스템 계약**. 의도적으로 하지 않는 것: 본 게이트 구현 수단 (현 `check-spec-coherence.sh` 의 root 확장 vs 별도 root gate 신설) 선정, 축 A 위반 hit 의 수렴 방안 (정합 spec 신규 박제 vs 참조 주석 삭제 vs 경로 갱신) 선정, root level 코드 자체의 동작 변경 (CSP 정책 / accessibility 동작), 축 C 의 promote 시점 자동 hook (planner 권한 매트릭스 / RULE-01 변경), `src/**` 내 spec 참조 (REQ-071 자매 spec scope).

## 공개 인터페이스
없음 (런타임 인터페이스 아님). 본 spec 은 측정 게이트 박제만 — root-level 파일군 ↔ `specs/30.spec/**` 간 참조 정합의 결과 효능을 grep + `test -e` 단일 명령으로 검증.

## 동작
1. (G-A) RULE-01 suffix 정합 게이트 — 축 A
   - 명령: `grep -rnE "[a-z0-9-]+-spec(\.md)?" vite.config.js eslint.config.js tsconfig.json index.html .husky/pre-commit .husky/pre-push scripts/*.sh` 에서 자체 진단 문자열 (`check-spec-coherence`, `src-spec-reference-coherence`) 제외 → **0 hit**.
   - 의미: root 파일군 어디에도 `<slug>-spec.md` 형식 참조가 존재하지 않는다 (RULE-01 `-spec` suffix 금지 정합).
2. (G-B) 디스크 실재 게이트 — 축 B
   - 절차: root 파일군에서 `specs/30\.spec/(blue|green)/[^"\` ]*\.md` 패턴 매칭 경로를 모두 추출 → 각 경로에 `test -e` → **전원 EXISTS**.
   - 의미: root 주석이 가리키는 spec 파일이 모두 디스크 상 실재한다 (dead-link 0).
3. (G-C) blue↔green 승격 동기화 게이트 — 축 C
   - 절차: root 파일군에서 `specs/30\.spec/green/[^"\` ]*\.md` 패턴 추출 → 동일 slug 가 `specs/30\.spec/blue/[^"\` ]*\.md` 로 동시 실재하지 않는다 (`test -e green/<slug>.md` ∧ ¬`test -e blue/<slug>.md` 또는 반대 단일 측만 실재).
   - 의미: planner mv `30.spec/green/F → 30.spec/blue/F` 직후 root 측 참조가 stale 로 남지 않는다.
4. (G-D) 발화 채널 존재 게이트
   - root 파일 변경 시점 (pre-commit staged diff `^(vite\.config|eslint\.config|tsconfig|index\.html|\.husky/|scripts/)` 매칭 또는 동등) 또는 promote 시점 (planner mv 직후) 에 G-A ∧ G-B ∧ G-C 단일 명령이 발화 채널을 가진다 — 발화 채널 수단 선정은 task 위임이나 "발화 채널이 존재해야 한다" 는 계약 자체는 박제.
5. (G-E) 시점 비의존
   - G-A ∧ G-B ∧ G-C 는 spec 신규 박제·삭제·이동·rename·green→blue promote 등 어떤 이벤트 직후에도 동일 측정으로 0 hit / 0 MISSING / 0 STALE 유지. 이벤트 발생 시 1 PR 안에 root 주석 동기화 (G-B/G-C 회복) 또는 root 참조 주석 삭제 (G-B/G-C 회피).
6. (G-F) 범위 제한
   - 본 게이트는 저장소 root 한정 파일군 (위 열거). `src/**` 한정 참조는 REQ-071 자매 spec 범위. `docs/**`, `README.md`, 기타 src 외부 + root 외부 spec 참조는 본 게이트 범위 밖.
7. (G-G) 자체 진단 제외 — 결정론 보장
   - guard 자체의 자기 참조 (`check-spec-coherence.sh` 자기 명칭, `src-spec-reference-coherence` 자기 spec 명칭, 본 spec 본문) 는 G-A 위반으로 카운트되지 않는다 — exclude rule 박제. 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 stderr 라인 수.

## 의존성
- 내부: root 파일군 (`vite.config.js`, `eslint.config.js`, `tsconfig.json`, `index.html`, `.husky/pre-commit`, `.husky/pre-push`, `scripts/*.sh`) — 게이트 입력 영역. `specs/30.spec/{blue,green}/**` — G-B / G-C 디스크 검증 대상.
- 외부: 없음 (런타임 의존 0). 게이트 실행은 `grep`, `test`, POSIX shell 만 요구.
- 역의존 (사용처): RULE-01 PIPELINE §파일 이름 규약 (`30.spec/{blue,green}/**/<slug>.md` `-spec` suffix 금지), RULE-07 SPEC CONTENT 양성 기준. CI lint step 또는 pre-commit 훅 또는 `npm run lint` 부속 스텝 (수단은 task 위임).
- 자매 spec: `foundation/src-spec-reference-coherence.md` (blue, REQ-071) — `src/**` scope 동질 2 축 (G1+G2). 본 spec 은 자매 축 (root scope) + 신규 축 C (승격 동기화). 두 spec 은 직교 scope.

## 테스트 현황
- [ ] (G-A) `grep -rnE "[a-z0-9-]+-spec(\.md)?" <root 파일군>` 자체 진단 제외 → 0 hit 게이트 — baseline 2 hit / 2 file (vite.config.js:9 csp-policy-spec, eslint.config.js:3 common/accessibility-spec).
- [ ] (G-B) root 추출 spec 참조 경로 전원 `test -e` 통과 — baseline 1 hit / 1 file MISSING (scripts/check-spec-coherence.sh:3 의 `specs/30.spec/green/foundation/src-spec-reference-coherence.md` green 부재).
- [ ] (G-C) root 추출 green 경로의 동일 slug blue 동시 실재 부재 — baseline 1 hit / 1 STALE (위 동일 path 의 blue 측 실재 → green→blue promote 후 stale).
- [ ] (G-D) 발화 채널 존재 — CI / pre-commit / pre-push / `npm run lint` 부속 스텝 어느 채널이든 본 게이트 실행 hook 박제 (회귀 방지 자동 게이트).
- [ ] (G-E) 시점 비의존 — spec 박제/삭제/이동/rename/green→blue promote 후 1 PR 안에 G-A·G-B·G-C 동시 0 hit / 0 MISSING / 0 STALE 유지 사례 누적.

## 수용 기준
- [ ] (Must FR-01) `grep -rnE "[a-z0-9-]+-spec(\.md)?" vite.config.js eslint.config.js tsconfig.json index.html .husky/pre-commit .husky/pre-push scripts/*.sh` 자체 진단 제외 → 0 hit. baseline 2 hit / 2 file → 회수 후 0 hit (HEAD 실측 박제, inspector Phase 1 ack).
- [ ] (Must FR-02) root 파일군 내 모든 `specs/30\.spec/(blue|green)/.*\.md` 참조는 디스크에 실재한다 (`test -e` 전원 EXISTS). baseline 1 MISSING → 회수 후 0 MISSING (HEAD 실측 박제, inspector Phase 1 ack).
- [ ] (Must FR-03) root 파일군 내 `specs/30\.spec/green/...` 참조는 동일 slug 가 `specs/30\.spec/blue/...` 에 동시 실재하지 않는다. baseline 1 STALE → 회수 후 0 STALE (HEAD 실측 박제, inspector Phase 1 ack).
- [ ] (Must FR-04) 위 3 축 게이트는 단일 명령 (guard script 또는 단일 `grep | while test -e` 파이프) 으로 실행 가능하고, rc=0/1 결정론으로 판정된다 (수단 중립 — 어느 정합 채널을 선택해도 단일 명령 실행 가능성 결과 동일).
- [ ] (Should FR-05) 본 게이트는 root 파일 변경 시점 (pre-commit staged diff `^(vite\.config|eslint\.config|tsconfig|index\.html|\.husky/|scripts/)` 매칭 또는 동등) 또는 promote 시점 (planner mv 직후) 발화 채널을 가진다 — 채널 선정 수단 영역, "발화 채널 존재" 계약 박제.
- [ ] (Must NFR-01 결정론) 동일 HEAD 상에서 본 게이트 N 회 실행 시 N 회 동일 rc + 동일 stderr 라인 수 (race condition / 순서 의존 부재).
- [ ] (Must NFR-02 멱등성) 본 게이트는 read-only — root 파일 / spec 파일 / 디스크 상태를 수정하지 않는다.
- [ ] (Should NFR-03 성능) 단일 명령 실행 시간 < 2 s (CI 단계 부착 시 측정 — root 파일군은 < 20 files 규모).
- [ ] (Must NFR-04 자체 진단 제외) guard 자체의 자기 참조 (`check-spec-coherence.sh` 자기 명칭, `src-spec-reference-coherence` 자기 spec 명칭, 본 spec 본문 `-spec` 패턴 문자열) 는 FR-01 위반으로 검출하지 않는다 — exclude rule 박제.
- [ ] (Must, 시점 비의존 누적) G-E — spec 박제·삭제·이동·rename·green→blue promote 등 이벤트 후 1 PR 안에 G-A·G-B·G-C 동시 0 hit / 0 MISSING / 0 STALE 유지 사례 누적 ≥ 2건.
- [ ] (Must, 범위 제한) `src/**` 한정 참조 (REQ-071 자매 spec scope), `docs/**`, `README.md`, 기타 src·root 외부 spec 참조는 본 게이트 위반으로 카운트되지 않음 — 정의상 항상 참.

## 스코프 규칙
- **expansion**: N/A (본 spec 은 시스템 횡단 게이트 박제 — task 발행 시점에 planner 가 스코프 규칙 재계산).
- **grep-baseline** (HEAD=`2e39db4`, 2026-05-17 — 본 spec 박제 시점 실측, chain rewrite 사후 `659e835` 시점에도 root 파일군 도입 차분 0):
  - (G-A) `grep -rnE "[a-z0-9-]+-spec(\.md)?" vite.config.js eslint.config.js tsconfig.json index.html .husky/pre-commit .husky/pre-push scripts/check-spec-coherence.sh` 에서 `check-spec-coherence` ∪ `src-spec-reference-coherence` 자체 진단 제외 → **2 hits in 2 files**:
    - `vite.config.js:9` → `// csp-policy-spec §3.2 / §5.1 FR-14 — dev 세션에서만 CSP meta 태그 제거.`
    - `eslint.config.js:3` → `// SPEC common/accessibility-spec §3.4.2). Semantic changes: 0.`
  - (G-B) 위 grep 의 spec slug 추출 → `find specs/30.spec -name "csp-policy*"` 0 hit / `find specs/30.spec -name "accessibility*"` 0 hit (common/ 디렉터리 자체 부재) → **2/2 MISSING**.
  - (G-B/path) root 파일군에서 `specs/30\.spec/(blue|green)/[^"\` ]*\.md` 명시 path 추출 → 1 hit / 1 file:
    - `scripts/check-spec-coherence.sh:3` → `specs/30.spec/green/foundation/src-spec-reference-coherence.md`
    - `test -e specs/30.spec/green/foundation/src-spec-reference-coherence.md` → **MISSING**.
  - (G-C) 위 1 hit green path 의 동일 slug blue 측 실재 — `test -e specs/30.spec/blue/foundation/src-spec-reference-coherence.md` → **EXISTS** → **1 STALE** (green→blue promote 완료 후 root 측 참조 갱신 미완).
  - 합계 baseline 격차: 축 A 2 hit + 축 B 2 MISSING (축 A 종속) + 축 B path 1 MISSING + 축 C 1 STALE = **4 distinct hits across 3 files** (vite.config.js:9, eslint.config.js:3, scripts/check-spec-coherence.sh:3; `.husky/pre-commit:3` 은 slug-only 참조로 path-extract grep 미매칭 — 종속 contextual stale).
- **rationale**: G-A/G-B/G-C baseline 은 본 spec 박제 시점 실측 박제 — 향후 회귀 분석 시 위반 hit / MISSING / STALE 수 변화 추적 기준. 4 distinct hits / 3 files / 1 MISSING / 1 STALE 은 §배경 측정값 기록일 뿐, 본 spec 의 §수용 기준은 hit/MISSING/STALE 수 비의존 (RULE-07 정합). 회수 수단 (정합 spec 신규 박제 / 참조 주석 삭제 / 경로 갱신 / guard root 확장 vs 신설) 은 task 위임 (Out-of-Scope).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-17 | inspector (Phase 2, REQ-20260517-097 흡수) / `659e835` | 최초 박제 — root-level 파일군 ↔ `specs/30.spec/**` 참조 경로 정합 3 축 게이트 (RULE-01 suffix 금지 + 디스크 실재 + blue↔green 승격 동기화). baseline 4 distinct hits / 3 files / 1 MISSING / 1 STALE (HEAD `2e39db4` 측정, chain rewrite 사후 `659e835` 시점에도 src/spec/root 도입 차분 0 — 동일 격차 잔존). 자매 axis: `foundation/src-spec-reference-coherence.md` (REQ-071, src scope) — 두 spec 직교 scope. | all |
