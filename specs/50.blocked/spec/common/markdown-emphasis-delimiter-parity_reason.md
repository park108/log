# markdown-emphasis-delimiter-parity — blue 격리 사유

- **격리자**: planner (383차 tick)
- **격리 시각**: 2026-08-31 (KST) · HEAD=`8f76b16`
- **원 경로**: `specs/30.spec/blue/common/markdown-emphasis-delimiter-parity.md`
- **근거 규약**: `RULE-01` 쓰기 권한 매트릭스 (planner `30.spec/** → 50.blocked/spec/`) · `RULE-05` §blocked 해제
- **해제 경로**: `50.blocked → 10.followups/ → discovery → inspector` (원 큐 `30.spec/**` 로 직접 원복 금지)

## 1. 왜 planner 가 격리했는가 — 다른 입구가 없다

대상이 `30.spec/blue/` 라 **inspector 는 편집 권한이 없다** (`RULE-01`: inspector 의 create/edit 는 `30.spec/green/**` 한정). discovery 가 req 를 내면 inspector 앞에서 처리 불가로 멈춘다. `RULE-01` 매트릭스상 이 파일을 움직일 수 있는 유일한 writer 는 planner 이며, 유일한 이동 경로가 `30.spec/** → 50.blocked/spec/` 이다. 따라서 이 격리는 재량이 아니라 **경로 제약의 귀결**이다.

## 2. (I6) 이 거짓인 채로 승격돼 있다

§동작 6번 (I6, 원본 `:36`) 의 문면:

> 홑 별표 `*` 와 물결 `~~` 의 **현 동작은 바뀌지 않는다**.

`~~` 절은 **거짓**이다. 근거 커밋 `854541a` (*fix: 물결 취소선은 공백을 사이에 두면 취소선을 열지 않는다*) 가 등록을 옮겼다 — planner 직접 확인:

```
-	parsed = inlineParsing(parsed, "~~", "del");        // strictFlanking 없음
+	parsed = inlineParsing(parsed, "~~", "del", true);  // strictFlanking 적용
```

관측 가능한 동작 변화 (물결 축 소유 계약 §스코프 규칙 실측표):
`와~~ 좋다 정말 대박~~` 이 `<p>와<del> 좋다 정말 대박</del></p>` → `<p>와~~ 좋다 정말 대박~~</p>`.
"바뀌지 않는다" 가 겨눈 바로 그 자리가 바뀌었다.

**아무 채널도 붉어지지 않는다.** (I6) 을 재는 §수용 기준 항목은 `(I6·비퇴행 baseline)` 하나뿐이고 그 명령은
`bash -c 'npx vitest run src/common/markdownParser.test.ts >/dev/null 2>&1'` 이다 — 파서 스위트 전체 rc 만 재므로
(I6) 의 명제와 무관하게 초록이다. planner 재실측 **rc=0 · Tests 140 passed** (spec 본문 선언은 `115 tests`).
즉 (I6) 은 **산문으로만 존재하는 명제**이며, 거짓이 된 사실이 어떤 자동 채널에도 나타나지 않는다.

부수 확인 — (I6) 이 인수처로 지목한 경로도 죽었다:
`specs/30.spec/green/common/markdown-star-emphasis-space-flanking.md` → **부재**.
그 spec 은 `specs/30.spec/blue/common/markdown-star-emphasis-space-flanking.md` 로 승격됐다.

## 3. §위치 좌표 밀림 — 17 중 11 (직접 재실측)

원본 `:3` §위치 가 인용한 `src/common/markdownParser.ts` 좌표 17개를 현 HEAD 에서 전수 재측정했다.
**11개가 정확히 +19 밀렸고 6개는 무손상**이다 (파일 992 → 1012 줄).

| # | 대상 | spec 선언 | 현 HEAD 실측 | drift |
|---|---|---|---|---|
| 1 | `**` 등록 | `:665` | 665 | 0 |
| 2 | `~~` 등록 | `:666` | 666 | 0 |
| 3 | `*` 등록 | `:670` | **689** | +19 |
| 4 | `__` 등록 | `:678` | **697** | +19 |
| 5 | `_` 등록 | `:679` | **698** | +19 |
| 6 | `inlineParsing` 정의 | `:743` | **762** | +19 |
| 7 | `runCharacter` | `:755` | **774** | +19 |
| 8 | `strictFlanking` 여는 쪽 블록 | `:778-781` | **797-800** | +19 |
| 9 | `strictFlanking` 닫는 쪽 블록 | `:796-799` | **815-818** | +19 |
| 10 | `WORD_CHARACTER_PATTERN` | `:735` | **754** | +19 |
| 11 | `isIntraword` 정의 | `:740` | **759** | +19 |
| 12 | `isIntraword` 호출 (여는) | `:786` | **805** | +19 |
| 13 | `isIntraword` 호출 (닫는) | `:804` | **823** | +19 |
| 14 | `ESCAPABLE` | `:532` | 532 | 0 |
| 15 | `THEMATIC_BREAK_PATTERN` | `:82` | 82 | 0 |
| 16 | 코드 스팬 선추출 | `:548` | 548 | 0 |
| 17 | `stashTag` | `:499` | 499 | 0 |

운영자 최초 신고의 "4곳" 은 과소계상이고, discovery 재실측의 "11곳" 과 planner 재실측이 일치한다.
무손상 6개는 전부 삽입 지점(`:665`~`:666` 등록 블록)보다 **앞**에 있는 좌표다 — 일관된 단일 삽입의 결과이며
개별 오류가 아니다. 본문 다른 절의 좌표(`:134` · `:618` · `:623` · `:632` · `:650` · `:768` · `:863` ·
`sanitizeHtml.ts:8`)는 §위치 밖이라 위 17 에 넣지 않았다 — 재개봉 시 함께 재측정이 필요하다.

## 4. 권고 방향 — 문장을 좁히지 말고 없애라

**축을 하나씩 인계하며 (I6) 을 좁히는 것이 이번이 세 번째다.**

1. 흡수 시점: `*` · `**` · `~~` **셋 모두**의 현 동작 불변 선언.
2. REQ-20260831-058 흡수: `**` 를 `markdown-star-emphasis-space-flanking` 로 인계하고 `*` · `~~` 로 좁힘 (§변경 이력 `:131`).
3. **지금**: `854541a` 로 `~~` 가 거짓이 됨 → `*` 만 남기는 네 번째 좁힘이 다음 수순으로 보인다.

이 되풀이는 문면이 잘못 좁혀져서가 아니라 **문장의 형태가 잘못되어서** 일어난다. (I6) 은 자기가 소유하지 않은
구분자들의 동작을 대신 선언하고 있고, 그 구분자들에 소유 계약이 생길 때마다 반드시 거짓이 된다. 좁히는 처리는
**다음 번을 예약**한다.

**권고**: (I6) 이 다른 구분자의 동작 불변을 **아예 선언하지 않게** 한다. 각 구분자의 동작은 그 구분자를 소유한
계약이 판정한다. (I6) 에 남길 것은 범위 선언뿐이다 — "본 계약은 `_` 계열만 판정한다. 다른 구분자의 동작은
본 계약의 명제가 아니다." 이 문장은 다른 구분자에 무슨 일이 일어나도 참으로 남는다.

**이 권고가 지금 막혀 있는 지점** (재개봉 시 함께 처리해야 한다): 현재 소유 계약 분포는

| 구분자 | 소유 계약 | 상태 |
|---|---|---|
| `**` | `markdown-star-emphasis-space-flanking` | blue |
| `~~` | `markdown-tilde-strikethrough-space-flanking` | blue (본 tick 승격, `b2cfe49`) |
| `__` · `_` | 본 spec | 격리 중 |
| **`*` (홑 별표)** | **없음** | — |

`*` 만 소유 계약이 없다. `grep -rn "홑 별표" specs/30.spec/` 는 2 hit 인데 둘 다 **범위 밖 선언**이다
(본 spec `:36`, star spec `:71`·`:97` 대조 언급). 즉 `*` 는 어느 계약도 소유하지 않은 채 **범위 밖으로만
언급되는 구분자**이며, 그래서 (I6) 이 그 공백을 대신 메우는 문장으로 계속 살아남는다. **이것이 이 문장이
사라지지 않는 진짜 이유로 보인다.** `*` 소유 계약을 세우는 것이 (I6) 을 없애는 선행 조건이다 — 없이 문장만
지우면 `*` 의 현 동작(`:689` `strictFlanking` 적용, `08756f9` 부착)이 아무 계약에도 박제되지 않은 채 남는다.

## 5. 판단이 필요한 별 축 — 줄 번호 좌표 그 자체

§위치 의 17 좌표는 **`markdownParser.ts` 가 한 번 편집될 때마다 통째로 재측정 대상**이 된다. 본 격리의
drift 11 은 단일 삽입 하나가 만든 것이고, 같은 일이 이 파일을 건드리는 모든 task 마다 반복된다. spec 본문은
이미 `> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷` 이라고 적어 두었으나, 그 단서가 있어도 좌표는 계속
박제되고 계속 밀린다 — 단서가 비용을 줄이지 못한다.

**판단 요청**: 좌표를 **패턴 앵커**로 바꿀지 결정이 필요하다.
`:670` `*` 대신 `grep -n 'inlineParsing(parsed, "\*"' src/common/markdownParser.ts` 같은 도출형 참조는
편집에 불변이고 `RULE-06 §열거 고정 금지` 의 취지와도 같은 방향이다. 다만 이는 본 spec 하나의 문제가 아니라
`markdownParser.ts` 를 참조하는 spec **전부**에 걸친 표기 규약 변경이므로, 본 spec 재개봉과 함께 처리할지
별 축으로 세울지는 planner 의 판정 범위 밖이다. discovery 에 넘긴다.

## 6. 재개봉 시 착지 순서 주의

`specs/30.spec/green/foundation/spec-judgement-command-evaluability.md §착지 순서` 가 적용된다.
본 spec 의 `(I6·비퇴행 baseline)` 명령은 파서 스위트 전체 rc 만 재는 **판정력 0 게이트**다 (위 §2).
(I6) 문면을 고치면서 이 게이트를 그대로 두면, §수용 기준 전건 `[x]` 인 문서가 다시 만들어지고
`RULE-07 §promote 조건 2` 를 명목상 통과한다 — **격리 전과 같은 상태로 되돌아간다.**
문면 정정과 게이트 판정력 부여는 **같은 재개봉 안에서** 처리한다.

## 7. planner 측정 재현 절차

전 측정은 `git archive HEAD` 격리 사본(`node_modules` 심볼릭 링크)에서 수행했다 — 메인 워킹트리는 읽기만 했고
변경하지 않았다 (`RULE-02 §교차 작업 파괴`).

```
git show 854541a -- src/common/markdownParser.ts | grep -E '^[-+].*inlineParsing\(parsed'
grep -nE 'inlineParsing\(parsed, "' src/common/markdownParser.ts
grep -n 'strictFlanking &&' src/common/markdownParser.ts
grep -n 'WORD_CHARACTER_PATTERN\|isIntraword\|runCharacter' src/common/markdownParser.ts
npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false
```
