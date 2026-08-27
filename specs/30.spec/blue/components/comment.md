# Comment 컴포넌트 (로그 단건 코멘트 스레드 / 폼)

> **위치**: `src/Comment/` (Comment.tsx, CommentItem.tsx, CommentForm.tsx, api.ts, api.mock.ts, Comment.module.css)
> **관련 요구사항**: REQ-20260422-045, REQ-20260827-034
> **최종 업데이트**: 2026-08-27 (by inspector, REQ-20260827-034 흡수 — §동작 7 조회 실패 표면 계약 신설)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (2026-04-20).

## 역할
특정 로그(`logTimestamp`) 에 달린 코멘트 스레드를 접힘/펼침 UI 로 노출하고, 신규 작성 · 답글을 서버에 POST 한다. 토글 버튼 텍스트는 로딩 상태 · 개수에 따라 "... comments" / "Add a comment" / "1 comment" / "N comments" 로 바뀐다. 성공/실패 토스트 (`Toaster position="bottom"`) 로 사용자에 피드백을 준다. `React.memo` 로 export.

## 공개 인터페이스
- `Comment` (default export, `React.memo` 래핑).
  - props: `{ logTimestamp: number }` (필수).
- 하위 컴포넌트:
  - `CommentItem` — 단일 코멘트 + 답글 폼 토글.
    - props: `{ isAdminComment, message, name, logTimestamp, commentTimestamp, timestamp, isHidden, openReplyForm(fn), reply(postFn) }`.
  - `CommentForm` — 신규 코멘트 입력.
    - props: `{ logTimestamp, post(fn), isPosting: bool }`.
- API (`src/Comment/api.js`): `getComments(logTimestamp, isAdmin)`, `postComment(comment)`, (숨김 처리 / 삭제 API 가 `api.js` 에 존재할 수 있음 — 구현이 진실).

## 동작
1. 마운트 시 토글은 접힘 (`isShow=false`), 버튼 텍스트 "... comments". 최초 `reload=true` 로 `getComments(logTimestamp, isAdmin())` 호출.
2. 응답 `body.Items` 를 `sortKey` 오름차순 정렬 후 `comments` 상태에 저장.
3. 로딩·개수 변화 시 버튼 텍스트 업데이트 (0 → "Add a comment", 1 → "1 comment", N → "N comments").
4. 사용자가 토글 버튼 클릭 → `isShow=true` 시 `commentThread` 컴포넌트 트리 lazy 렌더. 다시 클릭하면 언마운트.
5. `isShow=true && !isOpenReplyForm` 인 동안 `CommentForm` 이 표시된다. 하위 `CommentItem` 이 `openReplyForm(true)` 로 올리면 폼을 숨긴다 (한 번에 하나의 입력창 규약).
6. `postNewComment(comment)` 실행 시 POST → 성공이면 `reload=true` 로 리페치 + 성공 토스트, 실패/네트워크 오류는 에러 토스트.
7. **조회(`getComments`) 가 실패하면 렌더 결과가 "댓글 0건 성공" 상태와 구별되는 상태로 전이한다** (REQ-20260827-034 FR-01). 실패 갈래는 둘이며(`errorType` 갈래 · `catch` 갈래) **둘 다** 이 전이를 낸다 (FR-03). 전이는 접근성 트리에서 관측 가능해야 한다 — `role="alert"` 발화(기존 `<Toaster>` 경유 포함) 또는 `aria-live` (FR-02). 시각 전용 변화(class 교체만)는 충족이 아니다.
   - **수단은 계약하지 않는다.** 토스터 / 인라인 배너 / 라벨 문구 분기 중 어느 것이든 무방하다. 계약이 배제하는 것은 **빈 상태와의 표면 동일성** 하나다.
   - 조회 실패 문구는 작성 실패 문구(`"The comment posted failed."` · `"The comment posted failed for network issue."`)를 **재사용하지 않는다** (FR-06) — 사용자가 원인을 오인한다.
   - 조회가 **성공하고 0건**인 경우에는 이 표면이 나타나지 않는다 (FR-05, 특이도). 이 방향이 없으면 "상시 표시되는 오류 배너" 가 FR-01 을 형식 통과한다.
   - **비대칭이 현 위반의 근거다** — §동작 6 의 쓰기 경로는 이 전이를 이미 갖고 있고(2/2), 읽기 경로만 0/2 다. 통지 채널(`<Toaster>` 마운트 · `toasterMessage`/`toasterType`/`isShowToaster` 상태)은 이미 전부 존재하므로 신설 인터페이스가 0 이다.

### 회귀 중점
- StrictMode 하 mount 시 cleanup `setIsLoading(false)` (`Comment.jsx:67-69`) 가 React 19 에서 예상대로 트리거되는지.
- `Suspense` 내 `CommentItem` lazy 로드 지연 동안 polling 중복 호출 방지.
- `Toaster` 의 `show` 1↔2 라이프사이클 재진입 (연속 post 시 토스트 재노출).
- **기존 GET 실패 테스트가 §동작 7 위반에 의존하고 있다 — 계약을 세우면 그 테스트가 깨진다. 그것이 정상이다** (REQ-20260827-034 §배경).
  - `Comment.test.tsx:187-189` 주석은 실패 상태를 `error UI (no comment list)` 라 서술하면서, 같은 주석에서 `same "N comment" button renders 0 when GET fails` 라며 **라벨 충돌 자체를 폼 진입 수단으로 이용**한다(`:190` `findByText(/comment/)`). §동작 7 을 만족시키면 이 진입 경로의 전제가 바뀌므로 해당 케이스는 **의도적으로 갱신 대상**이다.
  - `Comment.test.tsx:105-111` · `:117-123` 두 케이스는 `render(<Comment />)` 만 하고 `expect(` 가 **0 건**이다. GET 실패 경로를 실행하지만 아무것도 판정하지 않는다.
  - `:346-418` 의 `reportError` 호출 수 단언은 현 구현에서 **이미 참**이라 §동작 7 의 관측으로 계수하지 않는다. 그것을 관측으로 인정하면 기준이 HEAD 에서 이미 충족되어 아무것도 요구하지 않는다.
  - 단언은 새 인프라 없이 `src/test-utils/toaster.ts` 의 `waitForToasterVisible` / `waitForToasterHidden` / `getToasterElement` 를 경유한다. 직접 `document.querySelector` 는 그 파일 헤더가 금지한다.
  - unmount 후 **무발화** 계약(`Comment.test.tsx:429-`, REQ-20260517-093 / `cancelledFetchRef`·`cancelledPostRef`) 과는 **직교**한다 — §동작 7 은 마운트 상태에서만 발화를 요구한다.

### 접근성 (REQ-20260422-045 FR-01)
- 토글·답글·폼 제출 등 `div`/`span` 기반 클릭 핸들러는 키보드 활성화 경로로 공통 헬퍼 `activateOnKey` (패턴 B) 를 경유한다. 헬퍼 본체 및 Enter/Space 키 계약 박제 위치: `components/common.md` §a11y (`a11y.js`) (선행 done: REQ-20260421-033).
- 토스트 경유 상태 변화는 접근성 경로와 독립이며, `activateOnKey` 는 `<input>`/`<textarea>` 에는 사용하지 않는다 (호출부 책임; `components/common.md` §수용 기준 Should).

## 의존성
- 외부: `react`, `prop-types`.
- 내부: `common/common` (`log`, `hasValue`, `isAdmin`), `Toaster/Toaster` (lazy), `./api` (`getComments`, `postComment`), `Comment.module.css`.
- 역의존: `Log/LogSingle.jsx` 가 로그 단건 하단에 마운트.

## 테스트 현황
- [x] `src/Comment/Comment.test.jsx` — 토글, 개수 라벨, 에러 흡수, Toaster 전이.
- [x] `src/Comment/CommentItem.test.jsx` — 답글 폼 노출·닫힘, isAdminComment 분기.
- [x] `src/Comment/__fixtures__/` 에 API 응답 박제.

## 수용 기준 (현재 상태)
- [x] (Must) `logTimestamp` prop 이 없으면 PropTypes 경고 (필수 선언은 아님, `PropTypes.number`).
- [x] (Must) 마운트 직후 한 번 `getComments` 호출. `reload` flip 시에만 재호출.
- [x] (Must) 정렬은 `sortKey` 오름차순.
- [x] (Must) 토글 버튼 텍스트는 {로딩, 0, 1, N} 4가지 분기.
- [x] (Must) POST 성공 시 성공 토스트 + 목록 리페치, 실패 시 에러 토스트.
- [x] (Should) 답글 폼 활성화 중에는 상단 `CommentForm` 을 숨긴다.
- [x] (Should) `Toaster position="bottom"` · `duration=2000` · `completed` 콜백으로 `show=2` 진입.
- [x] (NFR) `Comment` 는 `React.memo` 로 export — 부모 리렌더 시 props 변화 없으면 재렌더 회피.
- [x] **(Must, §동작 7 / FR-01·FR-02·FR-03) 실패 갈래의 표면 동반** — 실패 갈래를 소스에서 **도출**해 읽기/쓰기를 대조한다 (`RULE-06 §열거 고정 금지` — 갈래 목록을 하드코딩하지 않는다).
  ```
  awk '
    /\[API (GET|POST)\] FAILED/ && !inb {
      inb=1; d=0; obs=0
      kind=$0; sub(/.*\[API /,"",kind); sub(/\].*/,"",kind); next
    }
    inb {
      if ($0 ~ /setToasterMessage\(|setIsShowToaster\(|role="alert"|aria-live/) obs=1
      n=gsub(/\{/,"{"); m=gsub(/\}/,"}"); d += n - m
      if (d < 0) { tot[kind]++; if (obs) ok[kind]++; inb=0 }
    }
    END {
      g=tot["GET"]+0; go=ok["GET"]+0; p=tot["POST"]+0; po=ok["POST"]+0
      printf "GET-failure-branches=%d observed=%d | POST-failure-branches=%d observed=%d\n", g, go, p, po
      if (g==0 || p==0) exit 2
      exit (go==g ? 0 : 1)
    }
  ' src/Comment/Comment.tsx
  ```
  → **rc=0** 이어야 한다. **실측 2026-08-28 (HEAD `dac5a60`): `GET-failure-branches=2 observed=2 | POST-failure-branches=2 observed=2` / rc=0 → 충족** (`TSK-20260827-11-a` / `4d3e0ea`). `badcfe2` 실측은 `observed=0` rc=1 이었다. **주석 통과 배제 확인** — 계수된 두 GET 갈래의 표면은 실행 라인이다: errorType 갈래 `Comment.tsx:145-147`, catch 갈래 `:155-157` 모두 `setToasterMessage(...)` · `setToasterType("error")` · `setIsShowToaster(1)` 실호출.
  - **공집합 비-초록** — 어느 한쪽 모집단이 0 이면 `exit 2` (무판정). 도출이 깨진 채 초록이 되는 경로를 막는다.
  - **판정 상태 4종 실측 (inspector, HEAD `badcfe2`, probe 사본)** — 특이도·민감도·부분충족·공집합을 각각 확인했다. 민감도 0 인 게이트가 정상 트리에서 dry-run 을 통과하는 사례(`RULE-06 §게이트 실효 검증`)를 배제한다.

    | probe | 출력 | rc |
    |---|---|---|
    | 무주입 (현 트리) | `GET…=2 observed=0 \| POST…=2 observed=2` | **1** (특이도) |
    | 두 갈래 모두 표면 setter 주입 | `GET…=2 observed=2 \| POST…=2 observed=2` | **0** (민감도) |
    | **errorType 갈래만** 주입 | `GET…=2 observed=1 \| POST…=2 observed=2` | **1** (FR-03 부분충족 거부) |
    | POST 갈래 없는 입력 | `GET…=1 observed=0 \| POST…=0 observed=0` | **2** (공집합 무판정) |

  - **대조군 동시 감시** — `POST-failure-branches` 를 같은 명령에서 출력하므로 쓰기 표면 회귀도 함께 잡힌다.
  - **단독 판정력 없음 (과신 금지)** — 소스 grep 이라 `RULE-06 §관측 표면` 이 경고하는 형태이며 주석 한 줄로 통과할 수 있다. **아래 항목과 동반해야만 의미를 갖는다.** 아래 항목이 요구하는 단언은 `npm test` 에서 실제로 실행된다.

- [x] **(Must, §동작 7 / FR-04 · Should FR-05) 테스트가 실패 표면을 단언한다** — GET 실패/성공 시나리오를 `api.mock.ts` **정의에서 도출**해 대조한다.
  ```
  bash -c '
  M=src/Comment/api.mock.ts; T=src/Comment/Comment.test.tsx
  export SURF="waitForToasterVisible\(|ByRole\((.)alert|getToasterElement\(|toHaveAttribute\((.)aria-live"
  export ABS="waitForToasterHidden\(|queryByRole\((.)alert(.)\)\)\.(toBeNull|not\.toBeInTheDocument)"
  derive() { awk -v want="$1" "
    /^export const [A-Za-z]+ = scenario\(/ { n=\$3; i=1; f=0; next }
    i && /http\.get\(/ { if (\$0 ~ /ERROR_500|HttpResponse\.error\(\)/) f=1 }
    i && /^\);/ { if (f==want) print n; i=0 }" "$M"; }
  seg() { NAMES="$1" VAR="$2" awk "
    BEGIN { split(ENVIRON[\"NAMES\"],a,\" \"); for(k in a) want[a[k]]=1; re=ENVIRON[ENVIRON[\"VAR\"]] }
    /useMockServer\(\(\) => mock\./ { c=\$0; sub(/.*mock\./,\"\",c); sub(/[^A-Za-z].*/,\"\",c) }
    (c in want) && \$0 ~ re { h++ }
    END { print h+0 }" "$T"; }
  FAIL=$(derive 1 | tr "\n" " "); OK=$(derive 0 | tr "\n" " ")
  nf=$(printf "%s" "$FAIL" | wc -w | tr -d " "); no=$(printf "%s" "$OK" | wc -w | tr -d " ")
  s=$(seg "$FAIL" SURF); b=$(seg "$OK" ABS)
  printf "get-failing-scenarios=%d surface-asserts=%d | get-ok-scenarios=%d absence-asserts=%d\n" "$nf" "$s" "$no" "$b"
  if [ "$nf" -eq 0 ] || [ "$no" -eq 0 ]; then exit 2; fi
  if [ "$s" -ge 1 ] && [ "$b" -ge 1 ]; then exit 0; fi
  exit 1'
  ```
  → **rc=0** 이어야 한다. **실측 2026-08-28 (HEAD `dac5a60`): `get-failing-scenarios=4 surface-asserts=4 | get-ok-scenarios=2 absence-asserts=1` / rc=0 → 충족.** `badcfe2` 실측은 `surface-asserts=0 absence-asserts=0` rc=1 이었다. **귀속 한계 미발현 확인** — surface-asserts 4 는 전부 GET 실패 시나리오 소속이다 (`Comment.test.tsx:119`·`:121` under `devServerFailed:106`, `:150`·`:152` under `devServerNetworkError:138`). `prodServerFailed`·`prodServerNetworkError` 세그먼트 기여 0 이므로 POST 단언 오계수는 발생하지 않았다. absence-asserts 1 은 `:626` under `devServerOk:613`.
  - **공집합 비-초록** — 실패 또는 성공 시나리오 모집단이 0 이면 `exit 2`. `get-failing-scenarios=4` 가 모집단 비공허임을 수치로 낸다.
  - **판정 상태 4종 실측 (inspector, HEAD `badcfe2`, probe 사본)**

    | probe | 출력 | rc |
    |---|---|---|
    | 무주입 (현 트리) | `failing=4 surface=0 \| ok=2 absence=0` | **1** (특이도) |
    | `devServerNetworkError` 에 `waitForToasterVisible` + `devServerOk` 에 `waitForToasterHidden` 주입 | `failing=4 surface=1 \| ok=2 absence=1` | **0** (민감도) |
    | 실패측만 주입 (FR-05 미이행) | `failing=4 surface=1 \| ok=2 absence=0` | **1** (부분충족 거부) |
    | mock 의 GET 실패를 전부 성공으로 치환 | `failing=0 surface=0 \| ok=6 absence=0` | **2** (공집합 무판정) |

  - **귀속 한계 (알려진 약점)** — 세그먼트 귀속이 `useMockServer` 라인 기준 단순 분할이라, GET 실패 세그먼트 안의 **POST** 실패 단언이 `surface-asserts` 로 오계수될 수 있다. 현 HEAD 에서는 `:206` 이 `findByText("The comment posted failed.")` 형태라 `SURF` 에 매칭되지 않아 `0` 이 정확하다. 이 약점은 위 항목(읽기 갈래 소스 대조)과 동반될 때 닫힌다 — **두 기준은 함께 판정한다.**

- [x] **(Should, §동작 7 / FR-06) 조회 실패 문구가 작성 실패 문구를 재사용하지 않는다**
  ```
  bash -c 'test $(grep -cE "The comment posted failed" src/Comment/Comment.tsx) -eq 2'
  ```
  → **rc=0**. **실측 2026-08-28 (HEAD `dac5a60`): 2 hit (`:90` · `:100`) / rc=0 → 충족.** `badcfe2` 에서도 rc=0 이었으나 동반 항목 미충족으로 마커를 보류했었다 — 세 항목이 함께 충족된 본 tick 에 플립한다.
  **추출 실효성** — 위 세 블록은 본 spec 파일에서 기계 추출해 실행했고 각각 607 / 1221 / 85 bytes 로 **비공집합**이었다 (`RULE-06 §추출 실패 검출` — 빈 문자열 추출 시 `bash -c ""` 가 `rc=0` 으로 오통과하는 경로 차단).
  회귀 방지용이다 — 조회 실패 처리를 추가하며 기존 POST 문구를 복사해 붙이면 3 이 되어 rc=1 이 된다.

## 게이트 실효 검증 이관 (RULE-07 §처리 · RULE-06 §게이트 실효 검증)

아래는 **'가정 주입 요구' 부류**라 §수용 기준 체크박스로 두지 않는다. 검출 방향을 **보존한 채** §동작 7 수리 task 의 `## 검증/DoD` 로 이관한다. developer 는 `RULE-04` notes 에 `injection: 4/4 detect` 를 박제한다. **이관처 task 발행 전까지 귀속처는 본 절의 명시적 지시다** (이관처 없는 강등 금지 — RULE-07).

- **(Dir-1) 민감도 / errorType 갈래** — `Comment.tsx` 의 `[API GET] FAILED` **errorType** 갈래에서 새 표면 발화만 제거 → 대상 테스트 `rc≠0` → 원복 → `rc=0`.
- **(Dir-2) 민감도 / catch 갈래** — **catch** 갈래에서만 제거 → `rc≠0` → 원복 → `rc=0`. §동작 7 이 두 갈래를 모두 요구하므로 방향이 2 개다. 한 갈래만 주입하면 다른 갈래의 누락이 통과한다.
- **(Dir-3) 특이도 / 무주입** — 주입 없이 실행 → `rc=0`. 이 방향이 없으면 "항상 실패하는 단언" 이 (Dir-1)(Dir-2) 를 통과한다.
- **(Dir-4) 빈 상태 구별** — GET 이 **성공하고 0건**을 반환하는 시나리오에서 실패 표면 부재를 확인 → 나타나면 `rc≠0`. **본 계약의 핵심 명제가 정확히 이 구별이므로 생략 불가** — 이 방향이 없으면 "상시 표시되는 오류 배너" 가 형식 통과한다.

## 참고

### 자격 심사 (RULE-07)

- **축** — §주제 우선순위 **1순위 (사용자 관측 가능 동작)**. 토큰·설정 정합 축이 아니다.
- **방어 대상 (silent regression)** — "조회 실패가 정상 종료로 흡수되어 빈 상태로 렌더되는" 회귀. 기존 자동 게이트가 검출하지 못하는 이유가 구조적이다: 실패 경로가 예외를 던지지 않고 정상 종료하므로(`catch` 흡수 후 `setIsLoading(false)` 진행) unhandled rejection·error boundary 어디에도 걸리지 않는다. GET 실패를 **실제로 실행하는** 테스트가 4 시나리오 있는데 렌더 결과 단언은 0 이다. `npm test` 704 tests / 74 files 전부 초록인 상태에서 본 위반이 살아 있었다 (등록 시점). 2026-08-28 `4d3e0ea` 로 해소 — `npx vitest run src/Comment` 3 files / 36 tests rc=0.
- **중복 게이트 아님** — 등록 시점에 **거짓**인 명제였다(`badcfe2` 실측 rc=1 × 2). "현재 이미 참" 부류가 아니었다. `TSK-20260827-11-a` (`4d3e0ea`) 착지로 현재는 참이 됐으나, 그 참을 지키는 채널은 본 계약이 요구한 테스트 단언(`surface-asserts=4` · `absence-asserts=1`)이며 `npm test` 에서 실행된다 — 계약이 만든 게이트이지 선행 게이트의 중복이 아니다.

### 중복 회피 근거

- green `foundation/auth-redirect-url-totality-and-observable-failure` — 같은 축의 **선례**이지 중복이 아니다. 그 spec 의 모집단은 `src/common/UserLogin.tsx` 한정이며 `src/Comment/**` 를 포함하지 않는다.
- `REQ-20260825-023` 의 *"위반 모집단이 `UserLogin` 1건"* 판정은 **쓰기 경로만 보고 내린 결론**이었다(근거 예시가 `src/File/FileItem.tsx:66-69` 업로드 경로). `Comment` 의 **읽기** 경로는 그 측정에 들어 있지 않았다. 본 흡수는 그 사각에서 확정된 위반 1건만 추가한다.
- blue `components/toaster.md` — Toaster 자체의 3-state 머신 계약이며 **어디서 써야 하는가**는 다루지 않는다.
- green `testing/post-await-guard-individual-observability` — unmount 후 **무발화**를 요구하므로 조건이 배타적이다.

### 미측정·비판정 항목 (RULE-07 §처리)

- **다른 제품 영역(`src/Image` · `src/Search` · `src/Log` · `src/File`)의 조회 실패 표면 유무는 측정하지 않았다.** 미측정 대상에 전칭 계약을 세우지 않는다 — §동작 7 의 모집단은 `src/Comment/Comment.tsx` 의 조회 갈래 **한정**이다. 별 followup 으로 측정 후 판단할 축이다.
- 실패 표면의 **노출 시간·재시도 UX 품질**은 측정 채널이 없어 판정 대상에서 제외한다. `reload` 상태가 이미 있으나 재시도 버튼 제공은 별 축이다.
- `reportError` 의 미래 배선(Sentry 등, REQ-20260418-005 §13) — 붙어도 **사용자 표면은 아니다**.
- **접근성 표기 baseline (NFR)** — HEAD `badcfe2` 에서 `src/**` 프로덕션 소스의 `role="alert"|aria-live` 는 **3 hit** (`src/Toaster/Toaster.tsx:79` · `src/common/ErrorFallback.tsx:35` · `src/common/UserLogin.tsx:73`; `*.test.*` · `src/test-utils/` 제외, 미제외 시 5 hit). 참고 수치이며 증감 자체는 판정 대상이 아니다 — §수용 기준이 판정하는 것은 발화 **동반 여부**다.
- `npm test` · `npm run lint` · `npm run typecheck` rc=0 유지는 **중복 게이트 부류**라 체크박스로 두지 않는다 (위반 시 husky·CI 가 즉시 실패).

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-04-20 | operator / — | 최초 등록 (as-is 서술 spec) | all |
| 2026-04-21 | inspector / REQ-20260422-045 | **REQ-045 FR-01 흡수** — blue `components/comment.md` → green carry-over 후 §동작 하위 §접근성 소절 신설 (2줄). `activateOnKey` / 패턴 B 식별자 + `components/common.md` §a11y 상호참조 박제. 기존 §공개 인터페이스·§동작·§회귀 중점·§의존성·§수용 기준 서술 수정 0 (NFR-02 준수). 선행 done: REQ-20260421-033 FR-07 "blue 승격 시 comment/log/common/image.md §접근성 상호참조" Should 항 — writer 매트릭스상 blue 직접 편집 불가로 영구 미충족 상태였던 것을 본 green 경유 경로로 해소. RULE-07 자기검증: 상호참조 문장 존재는 `grep -c` 로 반복 검증 가능한 시스템 관찰 불변식, 1회성 incident patch 아님. | §최종 업데이트, §관련 요구사항, §동작 (§접근성 신설), 본 이력 |
| 2026-08-27 | inspector / REQ-20260827-034 | **REQ-034 (RULE-07 축 1 — 사용자 관측 가능 동작) 흡수** — blue `components/comment.md` → green carry-over 후 §동작 7(조회 실패 표면, 빈 상태와의 구별) 신설 · §회귀 중점에 "기존 GET 실패 테스트가 위반에 의존한다" 박제 · §수용 기준 3항(도출형 명령 2 + 문구 재사용 방지 1) 추가 · §게이트 실효 검증 이관 4방향 신설 · §참고 신설. 3항 전부 HEAD `badcfe2` 에서 inspector 가 직접 재실행해 수치 박제(rc=1 / rc=1 / rc=0). §위치의 `.jsx`→`.tsx` 표기 정정(파일 실존 기준). 기존 §공개 인터페이스·§동작 1-6·§의존성·기존 수용 기준 8항 서술 수정 0. | §최종 업데이트, §관련 요구사항, §위치, §동작(7 신설), §회귀 중점, §수용 기준, §게이트 실효 검증 이관(신설), §참고(신설), 본 이력 |

- 2026-08-28 inspector Phase 1 (HEAD `dac5a60`): **수용 기준 3항 전수 플립 — [x]11/[ ]3 → [x]14/[ ]0.** `TSK-20260827-11-a` (`4d3e0ea`, `merge-base --is-ancestor` HEAD 확인) 이 `getComments` 실패 2 갈래에 Toaster 표면을 부착했다. 세 판정 블록을 본 파일에서 기계 추출(641 / 1261 / 87 bytes — 전부 비공집합)해 재실행: FR-01·02·03 `observed 0 → 2` rc=0 · FR-04·05 `surface 0 → 4, absence 0 → 1` rc=0 · FR-06 2 hit rc=0. 소스 grep 판정의 알려진 두 약점을 실측으로 배제했다 — (a) 주석 통과: 계수된 표면이 `Comment.tsx:145-147`·`:155-157` 실행 라인, (b) 세그먼트 오귀속: surface-asserts 4 전량이 GET 실패 시나리오 소속. 회귀 검증 `npx vitest run src/Comment` 3 files / 36 tests rc=0. §게이트 실효 검증 이관 절(Dir-1~Dir-4)은 유지 — 주입 4방향은 여전히 task DoD 귀속이며 이관처 없는 강등은 RULE-07 이 금지한다.
