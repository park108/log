# 요약 파생 계약

> **위치**: `src/Log/api.ts` `trimmedContents` · 소비처 `LogList`(목록) · `Search`(검색 미리보기) · `LogSingle`(meta description)
> **게이트**: `src/Log/summaryBoundary.test.ts` · `src/Log/api.test.ts` · `scripts/check-summary-drift.sh`
> **최종 업데이트**: 2026-09-01 (운영자 — 요약 계약 2건 통합)
> **재개봉**: 2026-10-13 (inspector — REQ-20261013-109 흡수, §변경 이력). 1~7 의 번호는 바꾸지 않는다 — 신설 항은 8 부터 붙인다.

## 역할

요약은 본문의 평문 축약이며 **경계가 보존된다.** 태그를 걷어낸 자리에 낱말이 붙어 나오지 않는다.

**방어 대상**: 블록 경계가 사라져 `하나둘셋` 처럼 붙어 나가는 회귀. 목록·검색 미리보기는 독자가 본문보다 **먼저** 보는 화면이다.

## 동작 — 경계

1. **블록 태그는 경계를 공급하고 인라인 태그는 공급하지 않는다.** `trimmedContents("# 하나\n# 둘")` 은 `"하나 둘"` 이고, `trimmedContents("**굵게**한 낱말")` 은 `"굵게한 낱말"` 이다 — 없던 공백이 생기지 않는다.

2. **판정 대상은 `ALLOWED_TAGS` 에서 도출한다.** 하드코딩 재열거는 같은 결함을 한 겹 옮기는 것이다. 새 태그가 정제 정책에 올라오면 별도 손질 없이 판정 대상이 된다.

3. **경계 공급은 동작으로 잰다.** 각 블록 태그마다 그 태그가 **유일한 경계 공급자**인 입력을 두고, 태그가 빠지면 요약이 붙어 나오는 것을 검출한다. 두 목록을 비교만 하는 게이트는 `h[1-6]` 같은 구멍을 못 본다 — 목록은 이웃이 경계를 대주기 때문이다.

## 동작 — 신선도

4. **같은 함수가 두 시점에 계산돼 서로 다른 신선도로 화면에 닿는다.** 저장 시점 계산분(`postLog`·`putLog` → 서버 `summary` → 목록·검색)과 렌더 시점 계산분(`LogSingle` meta description)이 갈릴 수 있다. **저장된 요약은 저장 시점 파서에 고정된다.**

5. **파서 계약을 바꾸는 변경은 요약에 미치는 영향을 잰다.** 판정은 단일 HEAD 의 옳고 그름이 아니라 **변경 전후 산출의 차집합**이다 — 옳음의 기준이 곧 파서 계약이므로 단일 리비전 판정은 항진명제가 된다.

6. **측정 입력은 열거하지 않고 게이트 픽스처에서 도출한다.** 입력 도출이 공집합이면 통과가 아니라 **무판정 실패**다 — 영향 0 과 미측정은 서로 다른 산출을 낸다.

7. **갈라진 부류는 사용자 관측 표면의 언어로 기록한다** — *"목록·검색에서 기존 글이 무엇으로 보이는가"*.

### 신선도 — 2026-10-13 흡수

**방어 대상** (`RULE-07 §주제 우선순위 2`): 파서 계약이 바뀌어 저장 요약이 낡았는데 그 사실이 `diverged=0` 으로 **조용히** 기록되는 것. 목록·검색은 저장 요약을 그리므로 독자는 본문과 다른 글자를 본다 (4). 저장소 안에서 그것을 아는 수단은 이 채널뿐이다. 그 침묵은 비교쌍(8 · 9)과 측정 모집단(10) 두 원인에서 온다.

8. **비교쌍의 두 리비전에서 요약 산출 코드가 같으면 채널은 "영향 0" 을 내지 않고 무판정(`exit 2`)이다.** 리비전이 달라도 산출 코드가 같으면 차집합은 정의상 공집합이다 — 같은 리비전 쌍을 무판정으로 보는 것(항진명제)과 같은 원리를 한 단계 굵은 단위로 넓힌다. 다른 writer 가 `specs/` 만 바꾼 커밋을 developer 커밋 뒤에 얹으면 기본쌍(`HEAD~1..HEAD`)이 바로 그런 쌍이 된다.
    - **산출 코드는 `trimmedContents` 가 정적으로 닿는 모듈의 집합이며 두 리비전 각각에서 도출한다.** 열거하지 않는다 — 트리 충실성 확인 목록의 세 경로를 재사용하면 `trimmedContents` 가 옮겨 가는 순간 어긋난다 (`components/log-list-route-excludes-markdown-parser` 동작 3). 동일 판정은 git 객체(blob) 동일성이다. 경로 이름이나 커밋 메시지 접두(`spec(…)`)로 하지 않는다 — 접두는 커밋이 무엇을 바꿨는지 보증하지 않는다.
    - **무판정 출력은 사유와 근거를 박제한다** — 비교쌍 · 산출 코드 동일 판정 · 대조한 모듈 수(`producing-modules=<n>`). 정상 측정의 "영향 0" 문장과 문자열로 구별된다 (6).
    - seam(`SUMMARY_DRIFT_BASE` · `SUMMARY_DRIFT_HEAD`)으로 지정한 쌍도 이 판정을 받는다.
    - 바뀌지 않는 것: 산출 코드가 다른 쌍의 측정(`bea3a3b..e38a118` → rc=0 · `diverged` ≥ 1 — 10 의 원천이 더해지면 1 보다 크다) · 같은 리비전 쌍 · 입력 공집합(6) · 트리 충실성 불일치의 무판정.
9. **리비전을 지정하지 않으면 기본쌍은 HEAD 에서 가장 가까운, 산출 코드를 바꾼 커밋과 그 부모다** (Should). 다른 writer 의 `specs/` 커밋이 뒤에 얹혀도 그 변경을 잰다. 출력에 도출 경위를 남긴다. 8 만으로도 침묵은 막힌다 — 9 는 무판정 대신 측정을 돌려준다.
10. **측정 모집단은 파서 계약 게이트의 입력을 원천으로 담는다.** 파서 계약 게이트는 `markdownToHtml` 의 산출을 판정하는 테스트다. 그 입력은 열거하지 않고 두 리비전 각각의 게이트 파일에서 도출해 합집합을 쓴다 (6) — head 쪽에 새로 생긴 게이트 파일의 입력도 든다. 기존 원천(`PLAIN_PROSE` · 로그 픽스처 `contents`)은 그대로 둔다. 기존 원천은 스스로 *"마크다운 문법이 없는 평문"* 을 선언했으므로 파서 계약 변경과 정의상 서로소이고, 그 모집단만으로는 요약을 바꾼 파서 변경에도 *"영향 0"* 이 난다 — 2026-10-13 요약 산출 코드 변경 21쌍 중 20쌍이 그랬고, 같은 쌍을 게이트 입력으로 재면 12쌍이 갈린다 (REQ-20261013-130 실측).
    - **원천마다 도출 건수가 0 이면 무판정(`exit 2`)이다** — 사유와 원천 이름을 출력한다. 전체 공집합의 무판정(6)과 같은 판정 함수를 부른다. 원천이 사라지면 모집단은 다시 평문만 남는다 — 그것이 조용히 일어나지 않게 한다.
    - **결과 줄의 형태는 바꾸지 않는다** — `check-summary-drift: base=… head=… corpus=… diverged=…`. 파서 task DoD 와 수용 기준이 이 줄을 grep 한다. 원천별 건수는 별도 줄이다.
    - **`diverged=0` 의 문장은 모집단 범위 안의 판정임을 드러낸다** (Should) — 모집단 밖의 글에 대해 *"낡게 만들지 않는다"* 고 단정하지 않는다. 모집단은 유한하므로 원천을 더해도 이 문장은 남는다.
    - 갈라진 행은 독자가 목록·검색에서 보던 기존 요약 글자로 나온다 (7) — `71f68e4..4784051` 에서 `"- a\n# 제목"` 의 기존 요약 `a # 제목`.
    - 바뀌지 않는 것: 8 · 9 의 판정 · 두 리비전 합집합 규칙 · 비교쌍 선택.

## 의존성

- `sanitizeHtml.ts` `ALLOWED_TAGS` — (2) 의 도출 원천.
- `markdown-rendering` · `markdown-rendering-links` — 파서 산출이 이 함수의 입력이다. 그 계약이 바뀌면 (5) 가 발동한다. 두 문서의 게이트 파일이 (10) 의 원천이다.
- `components/log-list-route-excludes-markdown-parser` — `trimmedContents` 를 다른 모듈로 옮길 수 있다. (8) 의 산출 코드 도출과 스크립트의 import 경로(`scripts/check-summary-drift.sh` 의 `./src/Log/api.ts`)가 그 이동을 견뎌야 한다.

## 수용 기준

- [x] 경계 게이트 통과: `bash -c 'npx vitest run src/Log/summaryBoundary.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 요약 스위트 통과: `bash -c 'npx vitest run src/Log/api.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] drift 채널 실재: `bash -c 'test -x scripts/check-summary-drift.sh'` → rc=0

> 아래 넷은 git 리비전을 읽는다 — **저장소 루트 또는 `git clone --local` 사본이 판정 환경이다** (`git archive` 사본에는 `.git` 이 없다). 리비전이 없는 얕은 clone 에서는 스크립트가 rc=2 를 내며 그것은 판정이 아니다 — 각 명령이 먼저 `git cat-file -e` 로 실재를 단언한다.

- [ ] (Must, 8 — 산출 코드가 같은 쌍) `bash -c 'git cat-file -e e38a118^{commit} && git cat-file -e 5a669c7^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=e38a118 SUMMARY_DRIFT_HEAD=5a669c7 bash scripts/check-summary-drift.sh 2>&1); rc=$?; echo "$out" | grep -q "영향 0" && exit 1; echo "$out" | grep -q "무판정" || exit 1; echo "$out" | grep -qE "producing-modules=[1-9]" || exit 1; test $rc -eq 2'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=1 — 스크립트 rc=0 · *"영향 0 — 이 리비전쌍은 저장된 요약을 낡게 만들지 않는다"* (src 차이 0 파일).
- [ ] (Must, 8 — 신고 쌍) `bash -c 'git cat-file -e 2c66119^{commit} && git cat-file -e e39b546^{commit} || exit 2; SUMMARY_DRIFT_BASE=2c66119 SUMMARY_DRIFT_HEAD=e39b546 bash scripts/check-summary-drift.sh >/dev/null 2>&1; test $? -eq 2'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=1 — 스크립트 rc=0 · `diverged=0` (src 차이 0 파일).
- [x] (Must, 8 바뀌지 않는 것 — 대조) `bash -c 'git cat-file -e bea3a3b^{commit} && git cat-file -e e38a118^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=bea3a3b SUMMARY_DRIFT_HEAD=e38a118 bash scripts/check-summary-drift.sh 2>&1); rc=$?; test $rc -eq 0 && echo "$out" | grep -qE "diverged=[1-9]"'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=0 · `corpus=43 diverged=1` (엔티티 행 `"HTML 엔티티는 &amp; 로 쓴다"`). 기대값을 `diverged=1( |$)` 에서 `diverged=[1-9]` 로 넓혔다 — 10 의 원천이 더해지면 같은 쌍의 건수가 늘어난다 (REQ-20261013-130 NFR-03 · 후보 모집단 17; 입력 쌍은 그대로). HEAD=`d4b8ef0` (clone 사본) 재실행 rc=0.
- [ ] (Should, 9 — 기본쌍) 리비전 미지정 실행이 산출 코드가 다른 쌍을 잰다: `bash -c 'out=$(bash scripts/check-summary-drift.sh 2>&1); rc=$?; test $rc -eq 0 || exit 1; b=$(echo "$out" | grep -oE "base=[0-9a-f]+" | head -1 | cut -d= -f2); h=$(echo "$out" | grep -oE "head=[0-9a-f]+" | head -1 | cut -d= -f2); test -n "$b" && test -n "$h" || exit 2; ! git diff --quiet "$b" "$h" -- src/'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=1 — 기본쌍이 `specs/` 커밋 둘이라 src 차이 0. HEAD 가 developer 커밋이든 다른 writer 의 커밋이든 같은 판정이다. `src/` 차이는 산출 코드 차이의 필요조건으로만 쓴다. **HEAD 가 `src/` 를 바꾼 커밋이면 종전 스크립트도 이 명령에 rc=0 이다** — HEAD=`677a6d1` (clone 사본) 실측 기본쌍 `base=501db45 head=677a6d1` · rc=0. 그 HEAD 의 rc=0 은 ack 근거가 아니고, 9 를 세우는 task 는 `specs/` 만 바꾼 HEAD 에서 이 명령을 재야 한다.
- [ ] (Must, 10 — 신고 쌍 1 · TSK-20261013-22 `71f68e4`) `bash -c 'git cat-file -e b5e0112^{commit} && git cat-file -e 71f68e4^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=b5e0112 SUMMARY_DRIFT_HEAD=71f68e4 bash scripts/check-summary-drift.sh 2>&1); test $? -eq 0 && echo "$out" | grep -qE "diverged=[1-9]"'` → rc=0. HEAD=`d4b8ef0` (clone 사본) 실측 rc=1 — 스크립트 rc=0 · `corpus=42 diverged=0` · *"영향 0"*. 같은 쌍을 게이트 입력 후보 모집단으로 재면 9행이 갈린다 (req — `"![그림 [1]](https://example.com/x.png)"` 의 요약이 원문 그대로 → 빈 글자).
- [ ] (Must, 10 — 신고 쌍 2 · TSK-20261013-30 `4784051`) `bash -c 'git cat-file -e 71f68e4^{commit} && git cat-file -e 4784051^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=71f68e4 SUMMARY_DRIFT_HEAD=4784051 bash scripts/check-summary-drift.sh 2>&1); test $? -eq 0 && echo "$out" | grep -qE "diverged=[1-9]"'` → rc=0. HEAD=`d4b8ef0` (clone 사본) 실측 rc=1 — `corpus=42 diverged=0`. 후보 모집단 8행 (req).
- [ ] (Must, 10 — 세 번째 관측 · TSK-20261013-31 `b63a383`) `bash -c 'git cat-file -e 80c7ae7^{commit} && git cat-file -e b63a383^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=80c7ae7 SUMMARY_DRIFT_HEAD=b63a383 bash scripts/check-summary-drift.sh 2>&1); test $? -eq 0 && echo "$out" | grep -qE "diverged=[1-9]"'` → rc=0. HEAD=`d4b8ef0` (clone 사본) 실측 rc=1 — `corpus=42 diverged=0`. 후보 모집단 9행 (req · TSK-31 result.md 관찰 이슈 2 의 5행).
- [ ] (Must, 10 · 7 — 갈라진 행이 독자의 글자로 나온다) `bash -c 'git cat-file -e 71f68e4^{commit} && git cat-file -e 4784051^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=71f68e4 SUMMARY_DRIFT_HEAD=4784051 bash scripts/check-summary-drift.sh 2>&1); test $? -eq 0 && echo "$out" | grep -qF "a # 제목"'` → rc=0. HEAD=`d4b8ef0` (clone 사본) 실측 rc=1. 신고 쌍 2 의 갈라진 행 `"- a\n# 제목"` 의 기존 요약이 `a # 제목` 이다.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-109 / — | blue→green 재개봉. 8 신설 (산출 코드가 같은 쌍은 무판정 · 근거 박제 · seam 쌍 포함) · 9 신설 (기본쌍 도출, Should). §역할 의 방어 대상을 신선도 흡수 절 머리에 명시했다. req 수용 기준 셋을 명령으로 옮기고 리비전 실재 단언을 붙였다 · 9 의 판정을 HEAD 종류와 무관한 형태로 세웠다. `git clone --local` 사본(HEAD=`7b66885`)에서 req 의 세 쌍을 재현했다 | 동작 8·9 · 의존성 · 수용 기준 · 참고 |
| 2026-10-13 | REQ-20261013-130 / — | 10 신설 — 측정 모집단은 파서 계약 게이트의 입력을 원천으로 담는다 (FR-01 Must) · 원천별 공집합 무판정 (FR-02 Must · NFR-02 — 6 과 같은 판정 함수) · 결과 줄 형태 불변 (FR-03 Must) · `diverged=0` 문장의 범위 (FR-04 Should 채택). FR-05 (Could, 갈라진 행 출력 상한) 는 수단이라 계약하지 않았다. 신선도 흡수 절 머리의 방어 대상에 모집단 원인을 이었다 (§주제 우선순위 2 — 방어 대상 명시). req 수용 기준 넷을 명령으로 옮겼고 (셋째 쌍 · 글자 행 포함 — "같은 명령에서 쌍을 바꾼다" 문면은 req 파일에서 추출한 명령을 치환해 펼쳤다), 다섯째(대조)는 8 의 대조 줄과 같은 쌍이라 그 줄의 기대값을 `diverged=[1-9]` 로 넓혀 합쳤다 (NFR-03 — `RULE-06 §계약을 뒤집는 task`, 입력 불변). `markdown-rendering` 분할로 원천 문서가 둘이다. HEAD=`d4b8ef0` clone 사본에서 req 명령 다섯을 재현했다 (Must 4/4 rc=1 · 대조 rc=0) | 동작 8·10 · 의존성 · 수용 기준 · 참고 |
| 2026-10-13 | inspector reconcile (tick 중 HEAD 이동) / `677a6d1` | 9 기본쌍 명령이 HEAD=`677a6d1` (developer src 커밋) clone 사본에서 rc=0 — 소유 task 미착지인데 기본쌍 `HEAD^..HEAD` 가 우연히 src 차이를 가졌다. marker 유지, 그 줄에 HEAD 의존성 박제. `[x]` 4 rc=0 (git 판정 2 clone) · 8 `[ ]` 2 rc=1 불변 | 수용 기준 |

## 참고

### 실측 (REQ-20261013-109 재현 — `git clone --local` 사본, HEAD=`7b66885`, src = `cb354da`)

| 쌍 | src 차이 파일 | rc | 출력 |
|---|---|---|---|
| `bea3a3b..e38a118` (변경 자신) | 4 | 0 | `corpus=43 diverged=1` |
| `e38a118..5a669c7` (그 위 specs 커밋) | 0 | 0 | `corpus=42 diverged=0` · *"영향 0 — …"* |
| `2c66119..e39b546` (신고 쌍) | 0 | 0 | `corpus=42 diverged=0` · *"영향 0 — …"* |

- 9 의 판정 명령은 HEAD 가 산출 코드를 바꾼 커밋일 때 현 스크립트에서도 rc=0 이다 (clone 사본을 `cb354da` 로 옮겨 실측 — 기본쌍 `b018cd7..cb354da`). 지금 rc=1 인 것은 기본쌍이 `specs/` 커밋 둘이기 때문이다. 명령이 충족 불가능한 꼴이 아님을 확인한 대조다.
- 2026-10-13 파서 task 중 drift 를 잰 6건에서 다른 writer 의 커밋이 2건 끼었다 (REQ-109 §빈도). TSK-20261013-06 은 뒤에 끼어 항진이었고 developer 가 리비전을 고정해 다시 쟀다 — 채널이 아니라 사람이 잡았다.

### 주입·대조 (`RULE-06 §게이트 실효 검증` — 8 을 세우는 task 의 DoD)

§수용 기준의 8 두 항목이 주입 방향(rc=2 기대)이고 대조 항목이 음성 대조(rc=0 기대)다. 셋 다 과거 커밋을 쓰므로 현 HEAD 에서 그대로 돈다. 추가 방향: 동일 판정을 경로 이름(예: `src/` 아래 파일 목록 비교)으로 바꾼 변형 → `trimmedContents` 를 옮긴 쌍에서 오판해야 한다 — 구성이 어려우면 `control: n/a (<사유>)` 로 적는다.

### 주입 이관 (10 을 세우는 task 의 DoD)

- **(10 원천 공집합)** 파서 게이트 원천의 도출이 0건이 되는 트리에서 채널은 rc=2 를 내고 *"영향 0"* 을 내지 않는다. 구성 예: 격리 clone 에서 그 원천 파일들을 지운 합성 커밋을 head 로 지정한다 — 원천은 두 리비전 합집합이므로 base 쪽에서도 지워야 공집합이 된다 (REQ-130 이관 문면). 대조: 파서 게이트 원천의 파일 하나만 지운 합성 커밋 → rc=0 (그 원천의 다른 파일이 남는다).
- **계약을 뒤집는 지점**: 8 대조 줄의 기대값(`diverged=1`)은 10 이 착지하면 1 보다 커진다 — 이 문서의 줄은 `[1-9]` 로 넓혔다. 발행분 TSK-20261013-24 의 Ctrl-1 · TSK-20261013-29 의 C2 는 같은 쌍에 `diverged=1` 을 기대한다 — 10 을 세우는 task 가 그 둘보다 먼저 착지하면 그 기대가 깨진다. 발행 순서는 planner 몫이다 (같은 `scripts/check-summary-drift.sh`).

### 통합 이력 (2026-09-01)
`stored-summary-parser-drift-measurement` 와 `summary-block-boundary-tag-derivation` 을 합쳤다. 같은 함수의 두 축이라 문서를 나눌 이유가 없었다. 게이트는 삭제하지 않았다.

### 미측정·비판정 항목
- 이미 저장된 요약의 회복(재저장·서버 일괄 재계산)은 **저장소 밖**이다. 글을 한 번 수정하면 그 글은 낫는다.
- drift 채널은 수동 실행이며 CI 에 부착돼 있지 않다.
- 8 의 산출 코드 폐포를 실제 적재 모듈(vite-node 실행 중 목록)로 얻을지 정적 import 를 따라갈지는 수단이다. `git diff --quiet <base> <head> -- src/` 는 테스트 파일만 바뀐 쌍을 "다르다" 로 보므로 8 의 일부만 막는다.
- task DoD 의 `SUMMARY_DRIFT_BASE=<sha>~1 SUMMARY_DRIFT_HEAD=<sha>` 고정은 planner 문면 규율이며 이 계약이 아니다. 8 이 착지하면 그 규율을 잊어도 침묵 대신 rc=2 가 난다.
