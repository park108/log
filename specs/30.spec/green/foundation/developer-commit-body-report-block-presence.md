# developer 커밋 body 의 RULE-04 보고 블록 존재는 기계 판정된다

> **위치**: 커밋 메시지 표면 — `git log -1 --format=%b <hash>` (body) + `git log -1 --format=%s <hash>` (writer 라벨 도출). 발화 채널은 `package.json scripts.check:commit-writer-coherence` → `scripts/check-commit-writer-coherence.sh` → `.github/workflows/ci.yml:58`.
> **관련 요구사항**: REQ-20260827-032
> **최종 업데이트**: 2026-08-27 (by inspector — 최초 등록)

## 역할

**developer writer 로 판정된 커밋의 body 에 `RULE-04` 보고 블록이 존재한다** 는 불변식. `RULE-04` 는 보고 3채널 중 stdout 을 소멸 채널로, `.claude/reports/**` 를 gitignored 로 규정하므로 **영속 감사 채널은 커밋 body 가 유일**하다.

**방어 대상 (RULE-07 §주제 우선순위 2)** — 이 spec 이 막는 silent regression 은 **task 의 검증 증거가 어떤 영속 채널에도 남지 않은 채 task 가 닫히는 것**이다. 조용한 이유는 세 겹이다: (a) stdout 은 세션 종료와 함께 소멸하고, (b) `.claude/reports/`(`.gitignore:36`) 와 `specs/60.done`(`.gitignore:33`) 는 추적되지 않으며, (c) 그럼에도 파이프라인은 정상으로 보인다 — task 는 `60.done` 으로 이동했고 커밋은 존재하며 훅은 전부 초록이다. **현 HEAD 에서 커밋 body 를 판정 입력으로 삼는 게이트는 0건**이므로 블록 부재는 위반이 아니라 측정 대상 밖이다 (§동작 (B-0) 실측).

의도적으로 하지 않는 것:

- (i) **과거 이력의 소급 교정을 요구하지 않는다.** `RULE-02 §금지` 가 `--amend`·`reset --hard` 를 금지하므로 미기재 증거는 복구 불가다. 본 계약은 **적용 경계 이후 커밋** 에만 효력을 갖는다 ((B-4)).
- (ii) **블록 *내용*의 정확성을 판정하지 않는다.** 수치가 참인지는 별 축이며, 존재 판정과 독립이다.
- (iii) **판정 수단을 특정하지 않는다.** 기존 게이트 확장·신규 script·훅 배선 중 무엇이든 무방하다 (REQ §Out-of-Scope — planner·developer 영역). 다만 writer 라벨 도출은 **재구현하지 않는다** ((B-1)) — 동일 사실의 두 번째 구현은 두 번째 진실 공급원이 된다.
- (iv) **커밋이 아예 발생하지 않는 경우를 다루지 않는다.** 산출물이 전량 gitignored 라 스테이지가 비면 `RULE-02 §커밋` 에 따라 커밋이 만들어지지 않고, 존재하지 않는 커밋에는 메시지가 없다. 이 구멍은 `RULE-01` 레이아웃 또는 `rules/` 개정이 필요하며 **운영자 전용 writer 영역**이다 (§참고 §운영자 판단 필요).
- (v) **`.gitignore` 의 `specs/60.done` 추적 전환 여부**를 결정하지 않는다 — 동일 사유.

## 공개 인터페이스

없음 (런타임 인터페이스 아님 — 측정 게이트 계약). 관측 표면은 셋이다: 커밋 body (`%b`), 커밋 subject (`%s`), 그리고 게이트 script 텍스트.

## 동작

- **(B-0) 현 HEAD 실측 (baseline · 시점 의존)**: 최근 120 커밋 모집단에서 developer prefix 커밋 **47**, 블록 보유 **4**, 블록 부재 **43**, body 공백 **2** (HEAD=`b5e6e81` 측정). 이 수치는 슬라이딩 윈도로 매 커밋 이동하므로 **체크박스가 아니라 baseline** 이다 (REQ 원문의 49/5/44/1 은 discovery 측정 시점 HEAD 기준이며 그 이후 inspector 커밋 2건이 윈도를 밀었다). 판정은 수치가 아니라 아래 (B-1)~(B-5) 의 구조 명제가 진다.
- **(B-1) writer 라벨 도출 재사용**: 판정 대상 여부는 `scripts/check-commit-writer-coherence.sh` `G-C1` 의 prefix→label 매핑이 정한다. developer 라벨(`^(feat|fix|refactor|chore|test|docs)(\(...\))?:` · `^followup\(developer\):`) 만 모집단이다.
- **(B-2) body 를 판정 입력으로 읽는다**: 판정 표면은 `%b`(또는 `%B`) 를 실제로 읽는다. 현 HEAD 의 두 훅은 body 를 참조조차 하지 않는다 — `.husky/commit-msg:4` 는 `head -1` 로 subject 만, `check-commit-writer-coherence.sh` 는 subject prefix 와 변경 path 만 본다.
- **(B-3) 위반 진단은 해시를 열거한다**: "N 건 위반" 만으로는 교정 대상을 특정할 수 없다. 단일 커밋과 `<base>..HEAD` 범위 양면에서 위반 커밋의 해시가 stderr 에 열거된다 (`G-C4` 가 이미 두 형태를 지원한다).
- **(B-4) 적용 경계**: 발화 채널의 호출 형태가 **이력 전수를 대상으로 삼지 않는다**. 43건의 과거 위반이 모든 실행을 붉히면 게이트는 즉시 무시되거나 우회된다 — (i) 과 정합해야 한다.
- **(B-5) 블록 판정 토큰의 도출**: 존재 판정 토큰은 `RULE-04` 가 정의한 필수 필드에서 도출한다. 임의 문자열 1개를 하드코딩하면 규약 개정 시 게이트가 조용히 공허해진다 (`RULE-06 §열거 고정 금지`).

## 의존성

- 내부: `scripts/check-commit-writer-coherence.sh` (판정 표면) · `package.json scripts.check:commit-writer-coherence` · `.github/workflows/ci.yml:58` (발화 채널) · `.husky/commit-msg` (subject 전용 — 본 축의 사각).
- 외부: `git` (`log --format=%b|%s`).
- 역의존 (사용처): `foundation/multi-agent-commit-message-writer-scope-coherence` (blue — 같은 script 를 소유하는 인접 계약. §비-중복 근거 참조).

## 테스트 현황

- [x] (특이도 대조군) 블록 **보유** developer 커밋은 현 게이트에서 통과한다 — `bash -c 'bash scripts/check-commit-writer-coherence.sh 7465638^..7465638'` → 현 HEAD rc=0. 본 계약 충족 후에도 이 값이 보존되어야 한다 (오탐 0).
- [x] (특이도 대조군) developer 가 아닌 커밋은 대상 밖이다 — `bash -c 'bash scripts/check-commit-writer-coherence.sh dfe3632^..dfe3632'` → 현 HEAD rc=0 (`spec(inspector)` — `G-C3` skip). 본 계약 충족 후에도 보존.
- [x] (모집단 비공허) 판정 모집단이 실재한다 — `bash -c 'n=0; for h in $(git log --format=%H -n 120); do git log -1 --format=%s "$h" | grep -qE "^(feat|fix|refactor|chore|test|docs)(\(.*\))?:" && n=$((n+1)); done; echo "$n"; [ "$n" -ge 1 ]'` → HEAD=`b5e6e81` 출력 `47` / rc=0. 모집단 추출은 (B-1) 과 동일한 `G-C1` prefix 정규식을 쓴다. 판정은 `-ge 1` 이므로 슬라이딩 윈도로 수치가 이동해도 안정적이다. 이 대조군이 통과한다는 사실이 아래 수용 기준의 미충족이 **모집단 부재가 아니라 실제 판정 부재**임을 보인다.
- (민감도 · 체크박스 아님) body 가 통째로 빈 developer 커밋의 검출 여부는 아래 §수용 기준 2번 항이 판정한다 — 중복 계수를 피해 체크박스로 두지 않는다. 현 HEAD 미충족.

## 수용 기준

- [ ] (Must · B-2) 판정 표면이 커밋 body 를 읽는다 — `bash -c 'f=scripts/check-commit-writer-coherence.sh; test -s "$f" || exit 2; n=$(grep -cE "format=%b|format=%B|--format=%b" "$f"); echo "$n"; [ "$n" -ge 1 ]'` → 현 HEAD 출력 `0` / rc=1. 비어있음 가드(`-s`)는 판정 표면이 사라진 상태를 통과가 아니라 무판정(`exit 2`)으로 끝낸다.
- [ ] (Must · B-2·B-3) 블록 부재 developer 커밋이 검출되고 해시가 열거된다 — `bash -c 'o=$(bash scripts/check-commit-writer-coherence.sh badcfe2^..badcfe2 2>&1); rc=$?; [ "$rc" -ne 0 ] || exit 1; printf "%s" "$o" | grep -q "badcfe2"'` → 현 HEAD rc=1 (게이트가 `commits=1 violations=0 PASS` 로 통과시킨다). `badcfe2` 는 body 가 공집합인 실 이력 커밋이므로 가정 주입이 아니다.
- [ ] (Must · B-3) 범위 판정에서 위반 전건이 열거된다 — `bash -c 'o=$(bash scripts/check-commit-writer-coherence.sh 5531a50^..b3cda49 2>&1); rc=$?; [ "$rc" -ne 0 ] || exit 1; printf "%s" "$o" | grep -q "5531a50" && printf "%s" "$o" | grep -q "b3cda49"'` → 현 HEAD rc=1. 그 범위의 developer 커밋 2건은 **둘 다** 블록 부재다 — 1건만 열거하면 push 시 중간 커밋이 빠진다.
- [ ] (Should · B-5) 존재 판정 토큰이 `RULE-04` 정의에서 도출된다 — `bash -c 'f=scripts/check-commit-writer-coherence.sh; test -s "$f" || exit 2; n=$(grep -cE "RULE-04-REPORT|no-op:|last-productive:|backpressure:" "$f"); echo "$n"; [ "$n" -ge 2 ]'` → 현 HEAD 출력 `0` / rc=1. 단일 문자열 하드코딩(`-ge 1`)이 아니라 복수 필드 도출(`-ge 2`)을 요구한다.
- [x] (Must · B-4) 발화 채널이 실재하며 이력 전수를 대상으로 삼지 않는다 — `bash -c 'grep -qE "\"check:commit-writer-coherence\"" package.json || exit 1; l=$(grep -nE "run: npm run check:commit-writer-coherence" .github/workflows/ci.yml); [ -n "$l" ] || exit 2; printf "%s" "$l" | grep -qE "\.\." && exit 1; exit 0'` → 현 HEAD rc=0 (`package.json:46` · `ci.yml:58`, range 인자 없음 = HEAD 단독). `RULE-07 §promote 조건 4` 의 채널 실경로 요건을 이 항이 진다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-27 | REQ-20260827-032 / `b5e6e81`+ | 최초 등록 (inspector Phase 3 흡수) | all |

## 참고

### 비-중복 근거 (인접 spec 열거)

- `foundation/multi-agent-commit-message-writer-scope-coherence` (blue) — **같은 script 를 소유하지만 축이 다르다.** 그 §동작 (C1)~(C5) 의 판정 입력은 **메시지 prefix 와 변경 path 집합** 뿐이며 body 는 어디에도 등장하지 않는다. 본 계약은 그 판정 입력을 **body 존재 축으로 확장**하며, writer 라벨 도출은 (B-1) 이 그 spec 의 `G-C1` 을 재사용하도록 명시해 진실 공급원 이중화를 막는다.
- `foundation/declared-gate-firing-channel-totality` (blue) — 선언된 게이트가 **발화 채널을 갖는지** 를 판정한다. 본 계약은 채널 보유가 아니라 **판정 입력의 범위**를 규정하므로 층이 다르다. (B-4) 는 그 spec 의 채널 실재 결과를 입력으로 소비한다.
- 실측: `grep -rln "format=%b\|커밋 body\|commit body" specs/30.spec/` → 본 spec 등록 직전 **0 hit**. 어떤 spec 도 body 축을 덮지 않았다.
- 표기: 위 인접 spec 은 lifecycle 경로(`30.spec/{blue,green}/…`) 가 아니라 **slug** 로 지칭한다 — 승격으로 경로가 바뀌어도 참조가 끊기지 않아야 하기 때문이다 (RULE-01 §파일 이름).

### 미측정·비판정 항목

- **과거 43건의 소급 교정.** `RULE-02 §금지` 가 `--amend`·rebase 를 금지하므로 어느 시점에도 참이 될 수 없다. 기존 이력은 baseline 으로만 쓴다 (REQ §Out-of-Scope).
- **블록 내용의 정확성** (수치가 참인지). 존재 판정과 별 축이며 본 계약의 모집단 밖이다.
- **(B-0) 의 47/4/43/2 수치.** 슬라이딩 윈도 의존이라 어느 값도 안정적으로 `[x]` 가 되지 않는다 — 평서 baseline 으로만 박제한다.
- **판정 대상 집합 공집합 시의 무판정(`rc≠0`).** REQ FR-03 이 요구하나 **인접 blue spec §동작 (C4) 가 "K=0 일 때만 rc=0" 을 명시**하고 현 script 는 빈 범위에 `commits=0 violations=0 PASS` / rc=0 을 출력한다. 두 계약이 직접 충돌하므로 green 단독으로 해소할 수 없다 (blue 편집 writer 부재) — §운영자 판단 필요.
- **커밋이 발생하지 않는 경우.** §역할 (iv) — 메시지 판정 게이트는 존재하는 커밋의 메시지만 볼 수 있다.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)

(B-2)(B-3)(B-5) 를 재는 게이트 **수정** task 는 아래 방향을 각각 주입해 `rc≠0` 을 확인하고 원복 후 `rc=0` 을 확인한 뒤 `result.md` 에 명령과 출력을 박제한다 (`RULE-04` notes `injection: N/N detect`).

1. **블록 부재 방향** — developer prefix + body 에 `RULE-04` 필수 필드 0개인 픽스처 커밋 → `rc≠0` + 해시 열거.
2. **body 공백 방향** — developer prefix + body 공집합 픽스처 → `rc≠0` (1 과 별 방향: 공백은 필드 부분 보유와 다른 경로다).
3. **대상 밖 오탐 방향** — `spec(inspector)` / `req(discovery)` prefix + body 공집합 픽스처 → `rc=0` (skip 이 유지된다).

정상 변형 대조: 위 §테스트 현황의 두 특이도 대조군(`7465638` · `dfe3632`) 이 게이트 수정 후에도 `rc=0` 을 유지해야 한다.

### 운영자 판단 필요 (파이프라인 writer 경계 밖)

1. **empty-range 무판정** — 위 §미측정 항목의 blue (C4) 충돌. 해소하려면 blue spec §동작 개정이 필요하고 blue 는 편집 writer 가 없다 (planner mv 전용).
2. **커밋 미발생 구멍** — 구현이 선행 세션에 착지하고 마지막 세션이 DoD 판정만 수행하면 산출물이 전량 gitignored 라 스테이지가 비어 커밋이 만들어지지 않는다. `RULE-01` 레이아웃(`60.done` 추적 전환) 또는 planner 의 task 분할 기준 개정이 필요하며 둘 다 `rules/` — **운영자 전용 writer** 다. REQ §운영자 판단 필요 를 그대로 승계해 신호를 보존한다.
