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

**방어 대상** (`RULE-07 §주제 우선순위 2`): 파서 계약이 바뀌어 저장 요약이 낡았는데 그 사실이 `diverged=0` 으로 **조용히** 기록되는 것. 목록·검색은 저장 요약을 그리므로 독자는 본문과 다른 글자를 본다 (4). 저장소 안에서 그것을 아는 수단은 이 채널뿐이다.

8. **비교쌍의 두 리비전에서 요약 산출 코드가 같으면 채널은 "영향 0" 을 내지 않고 무판정(`exit 2`)이다.** 리비전이 달라도 산출 코드가 같으면 차집합은 정의상 공집합이다 — 같은 리비전 쌍을 무판정으로 보는 것(항진명제)과 같은 원리를 한 단계 굵은 단위로 넓힌다. 다른 writer 가 `specs/` 만 바꾼 커밋을 developer 커밋 뒤에 얹으면 기본쌍(`HEAD~1..HEAD`)이 바로 그런 쌍이 된다.
    - **산출 코드는 `trimmedContents` 가 정적으로 닿는 모듈의 집합이며 두 리비전 각각에서 도출한다.** 열거하지 않는다 — 트리 충실성 확인 목록의 세 경로를 재사용하면 `trimmedContents` 가 옮겨 가는 순간 어긋난다 (`components/log-list-route-excludes-markdown-parser` 동작 3). 동일 판정은 git 객체(blob) 동일성이다. 경로 이름이나 커밋 메시지 접두(`spec(…)`)로 하지 않는다 — 접두는 커밋이 무엇을 바꿨는지 보증하지 않는다.
    - **무판정 출력은 사유와 근거를 박제한다** — 비교쌍 · 산출 코드 동일 판정 · 대조한 모듈 수(`producing-modules=<n>`). 정상 측정의 "영향 0" 문장과 문자열로 구별된다 (6).
    - seam(`SUMMARY_DRIFT_BASE` · `SUMMARY_DRIFT_HEAD`)으로 지정한 쌍도 이 판정을 받는다.
    - 바뀌지 않는 것: 산출 코드가 다른 쌍의 측정(`bea3a3b..e38a118` → rc=0 · `diverged=1`) · 같은 리비전 쌍 · 입력 공집합(6) · 트리 충실성 불일치의 무판정.
9. **리비전을 지정하지 않으면 기본쌍은 HEAD 에서 가장 가까운, 산출 코드를 바꾼 커밋과 그 부모다** (Should). 다른 writer 의 `specs/` 커밋이 뒤에 얹혀도 그 변경을 잰다. 출력에 도출 경위를 남긴다. 8 만으로도 침묵은 막힌다 — 9 는 무판정 대신 측정을 돌려준다.

## 의존성

- `sanitizeHtml.ts` `ALLOWED_TAGS` — (2) 의 도출 원천.
- `markdown-rendering` — 파서 산출이 이 함수의 입력이다. 그 계약이 바뀌면 (5) 가 발동한다.
- `components/log-list-route-excludes-markdown-parser` — `trimmedContents` 를 다른 모듈로 옮길 수 있다. (8) 의 산출 코드 도출과 스크립트의 import 경로(`scripts/check-summary-drift.sh` 의 `./src/Log/api.ts`)가 그 이동을 견뎌야 한다.

## 수용 기준

- [x] 경계 게이트 통과: `bash -c 'npx vitest run src/Log/summaryBoundary.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 요약 스위트 통과: `bash -c 'npx vitest run src/Log/api.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] drift 채널 실재: `bash -c 'test -x scripts/check-summary-drift.sh'` → rc=0

> 아래 넷은 git 리비전을 읽는다 — **저장소 루트 또는 `git clone --local` 사본이 판정 환경이다** (`git archive` 사본에는 `.git` 이 없다). 리비전이 없는 얕은 clone 에서는 스크립트가 rc=2 를 내며 그것은 판정이 아니다 — 각 명령이 먼저 `git cat-file -e` 로 실재를 단언한다.

- [ ] (Must, 8 — 산출 코드가 같은 쌍) `bash -c 'git cat-file -e e38a118^{commit} && git cat-file -e 5a669c7^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=e38a118 SUMMARY_DRIFT_HEAD=5a669c7 bash scripts/check-summary-drift.sh 2>&1); rc=$?; echo "$out" | grep -q "영향 0" && exit 1; echo "$out" | grep -q "무판정" || exit 1; echo "$out" | grep -qE "producing-modules=[1-9]" || exit 1; test $rc -eq 2'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=1 — 스크립트 rc=0 · *"영향 0 — 이 리비전쌍은 저장된 요약을 낡게 만들지 않는다"* (src 차이 0 파일).
- [ ] (Must, 8 — 신고 쌍) `bash -c 'git cat-file -e 2c66119^{commit} && git cat-file -e e39b546^{commit} || exit 2; SUMMARY_DRIFT_BASE=2c66119 SUMMARY_DRIFT_HEAD=e39b546 bash scripts/check-summary-drift.sh >/dev/null 2>&1; test $? -eq 2'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=1 — 스크립트 rc=0 · `diverged=0` (src 차이 0 파일).
- [x] (Must, 8 바뀌지 않는 것 — 대조) `bash -c 'git cat-file -e bea3a3b^{commit} && git cat-file -e e38a118^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=bea3a3b SUMMARY_DRIFT_HEAD=e38a118 bash scripts/check-summary-drift.sh 2>&1); rc=$?; test $rc -eq 0 && echo "$out" | grep -qE "diverged=1( |$)"'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=0 · `corpus=43 diverged=1` (엔티티 행 `"HTML 엔티티는 &amp; 로 쓴다"`).
- [ ] (Should, 9 — 기본쌍) 리비전 미지정 실행이 산출 코드가 다른 쌍을 잰다: `bash -c 'out=$(bash scripts/check-summary-drift.sh 2>&1); rc=$?; test $rc -eq 0 || exit 1; b=$(echo "$out" | grep -oE "base=[0-9a-f]+" | head -1 | cut -d= -f2); h=$(echo "$out" | grep -oE "head=[0-9a-f]+" | head -1 | cut -d= -f2); test -n "$b" && test -n "$h" || exit 2; ! git diff --quiet "$b" "$h" -- src/'` → rc=0. HEAD=`7b66885` (clone 사본) 실측 rc=1 — 기본쌍이 `specs/` 커밋 둘이라 src 차이 0. HEAD 가 developer 커밋이든 다른 writer 의 커밋이든 같은 판정이다. `src/` 차이는 산출 코드 차이의 필요조건으로만 쓴다.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-109 / — | blue→green 재개봉. 8 신설 (산출 코드가 같은 쌍은 무판정 · 근거 박제 · seam 쌍 포함) · 9 신설 (기본쌍 도출, Should). §역할 의 방어 대상을 신선도 흡수 절 머리에 명시했다. req 수용 기준 셋을 명령으로 옮기고 리비전 실재 단언을 붙였다 · 9 의 판정을 HEAD 종류와 무관한 형태로 세웠다. `git clone --local` 사본(HEAD=`7b66885`)에서 req 의 세 쌍을 재현했다 | 동작 8·9 · 의존성 · 수용 기준 · 참고 |

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

### 통합 이력 (2026-09-01)
`stored-summary-parser-drift-measurement` 와 `summary-block-boundary-tag-derivation` 을 합쳤다. 같은 함수의 두 축이라 문서를 나눌 이유가 없었다. 게이트는 삭제하지 않았다.

### 미측정·비판정 항목
- 이미 저장된 요약의 회복(재저장·서버 일괄 재계산)은 **저장소 밖**이다. 글을 한 번 수정하면 그 글은 낫는다.
- drift 채널은 수동 실행이며 CI 에 부착돼 있지 않다.
- 8 의 산출 코드 폐포를 실제 적재 모듈(vite-node 실행 중 목록)로 얻을지 정적 import 를 따라갈지는 수단이다. `git diff --quiet <base> <head> -- src/` 는 테스트 파일만 바뀐 쌍을 "다르다" 로 보므로 8 의 일부만 막는다.
- task DoD 의 `SUMMARY_DRIFT_BASE=<sha>~1 SUMMARY_DRIFT_HEAD=<sha>` 고정은 planner 문면 규율이며 이 계약이 아니다. 8 이 착지하면 그 규율을 잊어도 침묵 대신 rc=2 가 난다.
