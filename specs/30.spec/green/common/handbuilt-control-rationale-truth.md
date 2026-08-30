# 손조립 조작부를 유지하는 근거는 현 HEAD 에서 참이다

> **위치**: `src/Log/LogItemInfo.tsx` (`link-copy-button` 근거 주석) · `src/Comment/CommentItem.tsx` (`reply-toggle-button` 근거 주석) · `src/Image/ImageItem.tsx` (`imageItem`) · `src/common/UserLogin.tsx` (`login-button`).
> **관련 요구사항**: REQ-20260830-047 FR-05 · REQ-20260831-049 FR-01~FR-07 (인용의 클래스 지목 + 게이트 fail-closed)
> **최종 업데이트**: 2026-08-31 (by inspector — Phase 1 drift reconcile, HEAD=`b1cbf5c`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`b1cbf5c`).

> **측정 기준**: 본 문서의 rc 는 전부 HEAD=`b1cbf5c` 에서 재실행한 결과다. 직전 박제(HEAD=`643be56`/`3398833`)와 갈리는 지점은 §변경 이력 마지막 행과 §주입 이관 에 사유를 적었다 — `130b81d`(지목 추가)·`b42d1f0`(폴백 제거)이 그 사이에 들어왔다.

## 역할

네이티브 요소로 전환하지 **않는다**는 판단을 코드에 박제한 근거 주석은, 그것이 인용하는 CSS·DOM 사실이 현 HEAD 와 일치할 때만 남는다. 전제가 거짓이 되면 주석은 정정되거나 (근거가 사라졌으므로) 함께 사라진다.

**방어 대상 (silent regression)**: 근거의 전제만 조용히 거짓이 되고 결론은 남는 상태. `7cd575a` 는 이 주석들의 목적을 "재론되지 않도록" 이라고 적었다 — 즉 이 문장들은 미래의 판단을 **선점**한다. 선점하는 문장이 거짓이면, 다음에 이 코드를 보는 사람은 **이미 사라진 위험**을 근거로 전환을 다시 포기한다. 이 축의 발화 채널은 `src/__tests__/handbuilt-rationale-premise-truth.test.ts` (`b34c391` 에서 vitest 수집 경로에 부착) 이며, 근거 주석이 인용한 `position:` 값을 그 파일이 렌더하는 클래스의 실제 CSS 선언과 대조한다. 그 전까지 이 축을 보는 게이트는 하나도 없었다: `src/common/a11y.audit.test.ts` 는 손조립이 패턴 B(`tabIndex` + `onKeyDown`)를 갖췄는지만 보고, `src/__tests__/hover-popup-anchoring.test.tsx` 는 CSS 계약의 형태와 DOM 조상 관계만 본다. 둘 다 주석이 무엇을 주장하는지 읽지 않으므로, 전제 소멸은 어떤 rc 도 바꾸지 않은 채 통과했다.

**방어 대상 2 (REQ-20260831-049 — 게이트 자신의 사각)**: 위 채널이 인용 대상을 좁히지 못해 **형제 클래스에 가려 회귀를 놓치는** 상태. 게이트는 주석이 클래스를 지목했을 때만 그 클래스와 대조하고, 지목이 없으면 그 파일이 렌더하는 클래스 **중 최소 1개**가 인용 값을 선언하는지로 폴백한다. `some` 은 OR 이므로 대상 집합이 넓어질수록 판정이 약해진다. 이 상태는 HEAD=`643be56` 에 실재했다 — `src/Image/ImageItem.tsx` 의 인용이 클래스를 지목하지 않았고, 그 파일이 렌더하는 `.img--image-selected` 와 `.div--image-backdrop` 이 둘 다 `position: fixed` 였다. 둘 중 하나만 회귀시키면 게이트는 rc=0 을 냈다 (REQ-049 §배경 MUT-A 실측). **HEAD=`b1cbf5c` 에서는 해소됐다**: `130b81d` 가 지목을 넣었고 `b42d1f0` 이 폴백 자체를 제거했다. 아래 서술은 이 불변식이 무엇을 막으려고 서 있는지의 근거이지 현 HEAD 의 진단이 아니다. 더 나쁜 갈래는 **지목이 깨졌을 때**다: 주석의 클래스명에 오타가 나면 지목이 조용히 빈 집합이 되어 같은 폴백으로 강등되고, 같은 CSS 회귀에 대해 지목이 살아 있는 파일만 붉어진다 (MUT-D/MUT-E 실측). 클래스 rename 이 실제로 일어나는 방식 — 주석은 두고 CSS 만 고치는 — 이 이 경로와 정확히 겹친다. 이 갈래도 `b42d1f0` 이 (I6) 두 번째 항으로 닫았다. 즉 이 축의 방어 대상은 "거짓이 된 전제" 가 아니라 **그 전제를 잡으라고 세운 게이트의 사각**이며, `RULE-06 §게이트 실효 검증` 이 말하는 "주입 왕복을 `N/N detect` 로 통과한 검출력 0 게이트" 의 실물이다 — `b34c391` 의 주입은 전원 이탈(MUT-B)형만 돌았다.

의도적으로 하지 않는 것: **전환 자체** (별 spec — `activatable-control-native-button.md`, §참고 §축 분리 근거), 주석의 문체·분량·언어, 근거 주석의 서식 표준화, 손조립이 아닌 지점의 주석 일반.

## 공개 인터페이스
- 없음 (소스 주석 ↔ CSS 정합 계약). 본 spec 은 측정 게이트 박제만.

## 동작

1. **(I1) 근거 동반**: `role="button"` 손조립을 유지하는 지점은 그 지점에 고유한 근거 주석을 갖는다. 근거 없는 손조립은 전환 대상이지 예외가 아니다.
2. **(I2) 인용 사실 일치**: 근거 주석이 인용하는 CSS 선언은 실제 CSS 파일의 선언과 일치한다. 현 HEAD 사실:
   - `.div--logitem-linkmessage` (`src/Log/Log.css`) — `position: absolute; top: 100%; left: 0; width: max-content`.
   - `.div--logitem-versionhistory` (`src/Log/Log.css`) — 동일 4속성.
   - `.span--logitem-toolbaricon` · `.div--logitem-toolbar` (`src/Log/Log.css`) — `position: relative`.
   - `.div--comment-replybutton` (`src/Comment/Comment.module.css`) — `position: relative; display: inline-block`.
   따라서 이 팝업들을 `position: fixed` 또는 **좌표 부재**로 서술하는 주석은 (I2) 위반이다.
   **(I2-a) 인용은 대상을 지목한다.** `position: <값>` 을 인용하는 근거 주석 블록은 그 인용이 가리키는 CSS 클래스를 같은 블록 안에서 지목한다 (판정 가능한 형태: 백틱으로 감싼 `.kebab-class` 또는 `styles.<ident>`). 지목 없는 인용은 어느 사실을 주장하는지 확정되지 않으므로 (I2) 의 대조 대상이 서지 않는다.
3. **(I3) 전제 소멸 시 결론 무효**: 전제가 거짓이 되면 그 전제에 매달린 결론 문장("따라서 전환하지 않는다")도 함께 정정된다. 전제만 지우고 결론을 남기는 것은 (I3) 위반이다 — 근거 없는 금지가 되어 선점 효과는 그대로 남는다.
4. **(I4) 해소 경로는 둘**: (a) 주석을 현 사실로 정정하거나, (b) 근거가 지키던 손조립 자체를 없애 주석이 소멸하거나. 어느 쪽이든 (I2) 는 충족된다. 본 spec 은 둘 중 하나를 강제하지 않는다.
5. **(I5) 범위 밖 지점의 근거는 별도 판정**: `src/Image/ImageItem.tsx` 의 근거(확대 시 `position: fixed` 배치 + grid 셀 `aspect-ratio` 가 래퍼로 이동)와 `src/common/UserLogin.tsx` 의 근거(운영자 지시)는 현재 참이며 본 spec 이 요구하는 정정 대상이 아니다. 다만 (I1)~(I3) 은 이 지점들에도 동일하게 적용된다.

6. **(I6) 게이트는 fail-closed 다**: 이 축의 게이트는 아래 둘을 **위반으로 판정**한다 — 통과나 무발화로 처리하지 않는다.
   - **지목 부재**: 인용이 클래스를 지목하지 않으면 위반이다. "렌더 클래스 중 최소 1개" 폴백을 쓰지 않는다.
   - **지목 미렌더**: 지목한 클래스가 그 파일의 렌더 집합에 없으면 위반이다. 조용히 폴백으로 강등하지 않는다 — 오타·rename 이 검출 소실로 이어지지 않는다.
7. **(I7) 도출은 유지하고 공집합은 무판정이다**: 게이트의 모집단·렌더 클래스·CSS 규칙은 계속 **도출**로 산출한다 (`RULE-06 §열거 고정 금지`). 도출 결과가 공집합이면 통과가 아니라 무판정(비영 rc)이다 — "위반 0" 이 공허하게 참이 되는 자리를 막는다. (I6) 의 fail-closed 전환이 이 공허 가드를 약화시키지 않는다.
8. **(I8) 게이트의 실패 메시지는 무엇과 대조했는지 말한다**: 어느 클래스와 대조해 어떤 값이 어긋났는지를 출력하고, (I6) 의 두 위반(지목 부재 · 지목 미렌더)은 값 불일치와 **구별해** 발화한다. 무엇을 재고 있었는지 보이지 않는 rc 는 증거가 아니다.
9. **(I9) 게이트 자신의 경계 주석에도 (I2)(I3) 이 적용된다**: 게이트 파일 상단의 §검출 경계 서술은 현 구현의 사실이어야 한다. 폴백 제거 후에도 폴백 존재를 전제한 경계 문장이 남으면 그것이 곧 (I2) 위반이다 — 다음에 이 게이트를 보는 사람이 이미 사라진 폴백을 근거로 판정 범위를 오인한다.

### 회귀 중점
- 팝업 CSS 를 다시 `position: fixed` 로 되돌리거나 좌표를 걷으면 (I2) 의 기준 사실이 바뀐다 — 주석이 아니라 CSS 가 움직인 경우다. 이때도 두 쪽이 어긋나면 위반이며, `hover-popup-anchoring` 게이트(`.tsx`)가 CSS 쪽을 먼저 잡는다.
- 새 손조립 지점을 추가하며 기존 근거 주석을 복사해 붙이면 (I1) 의 "그 지점에 고유한" 을 위반한다 — 복사된 전제는 새 지점에서 참인지 판정되지 않았다.
- **(I6) 을 되돌리는 방향은 두 갈래다** — 폴백 삼항을 되살리거나, 지목 클래스를 렌더 집합으로 거르며 빈 배열을 폴백 신호로 읽는 경로를 되살리거나. 둘 다 정상 트리에서는 rc=0 이라 dry-run 으로 보이지 않는다. 판정은 주입(§참고 §주입 이관 Dir-1~3)이 한다.
- **인용 값을 지우고 지목만 남기면** (I6) 은 조용히 통과한다 — 인용이 없으면 판정 대상 자체가 없기 때문이다. (I2) 는 인용의 **정확성**을 재지 인용의 **존재**를 강제하지 않는다. 근거를 지우는 해소는 (I4-b) 경로이며 그때는 손조립도 함께 사라져야 한다.

## 의존성
- 내부: `src/Log/LogItemInfo.tsx`, `src/Comment/CommentItem.tsx`, `src/Log/Log.css`, `src/Comment/Comment.module.css`, `src/Image/ImageItem.tsx`, `src/Image/ImageSelector.module.css`, `src/common/UserLogin.tsx`, `src/__tests__/handbuilt-rationale-premise-truth.test.ts` (본 축의 유일한 게이트 — (I6)~(I9) 의 대상).
- 외부: 없음.
- 역의존 (사용처): 없음 (주석은 소비자가 사람이다).
- 직교: `src/common/a11y.audit.test.ts` (패턴 B 충족 여부만), `src/__tests__/hover-popup-anchoring.test.tsx` (CSS 계약 형태 + 팝업의 DOM 조상 관계). 둘 다 주석의 주장은 읽지 않는다 — 그 사실이 §역할 의 방어 대상 근거이며, 본 축은 `src/__tests__/handbuilt-rationale-premise-truth.test.ts` 가 전담한다.

## 테스트 현황
- [x] (I2) 거짓 전제 소멸: `bash -c '! grep -nF "position: fixed" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx'` → HEAD=`b1cbf5c` 재실측 **rc=0** (0 hit). `8772f0d` (TSK-20260831-01-a) 가 두 주석의 거짓 전제 절반을 현 CSS 사실 인용으로 교체했다. 직전 측정(HEAD=`efe6268`)은 rc=1 · 2 hit (`LogItemInfo.tsx:75` · `CommentItem.tsx:85`) 이었다.
- [x] (I2) 기준 사실 실재: `bash -c 'grep -A4 -nE "^\.div--logitem-linkmessage" src/Log/Log.css | grep -qE "position:[[:space:]]*absolute"'` → HEAD=`b1cbf5c` 재실측 rc=0 (`Log.css:118`).
- [x] (I5) 범위 밖 2 지점 보존: `bash -c 'grep -qE "^[[:space:]]*role=\"button\"" src/Image/ImageItem.tsx && grep -qE "^[[:space:]]*role=\"button\"" src/common/UserLogin.tsx'` → HEAD=`b1cbf5c` 재실측 rc=0 (`ImageItem.tsx:75` · `UserLogin.tsx:68`).
- [x] (I2) 발화 채널 현행 PASS: `npx vitest run src/__tests__/handbuilt-rationale-premise-truth.test.ts` → HEAD=`b1cbf5c` 재실측 rc=0 (3 tests). `b34c391` (TSK-20260831-01-b) 부착 — RULE-07 §promote 조건 4 의 실경로다 (vitest 수집 경로 → `npm test` → pre-push · CI).
- [x] (I2-a) 지목 없는 인용 0 건 — HEAD=`b1cbf5c` 재실측 **rc=0**, 출력 `files=4 quotes=3 unscoped=0` (`UNSCOPED` 라인 0건). `130b81d` (TSK-20260831-02-a) 가 `src/Image/ImageItem.tsx:26-30` 근거 주석에 `` `.img--image-selected` `` / `` `styles.imgImageSelected` `` 지목을 넣었다. 직전 측정(HEAD=`643be56`)은 rc=1 · `unscoped=1` 이었다. 모집단 도출 + 공허 가드 내장 (`files=0` 또는 `quotes=0` 이면 `exit 2`):
  ```
  perl -MFile::Find -e 'my @f; find(sub { push @f, $File::Find::name if /\.tsx$/ && !/\.test\./ }, "src"); my ($tot,$q,$n)=(0,0,0); for my $p (sort @f) { open my $h, "<", $p or next; local $/; my $t = <$h>; next unless $t =~ m/role=\{?["\x27]button["\x27]\}?/; $n++; while ($t =~ m{((?:^[ \t]*//[^\n]*\n)+|/\*.*?\*/)}gms) { my $b=$1; next unless $b =~ m/position:\s*[A-Za-z]/; $q++; unless ($b =~ m/--[a-z0-9-]+|styles\.[A-Za-z]/) { $tot++; print "UNSCOPED $p\n"; } } } print "files=$n quotes=$q unscoped=$tot\n"; exit(2) if $n==0 || $q==0; exit($tot?1:0);'
  ```
- [x] (I6 투영) 폴백 삼항 부재: `bash -c '! grep -nE "q\.scoped : q\.rendered" src/__tests__/handbuilt-rationale-premise-truth.test.ts'` → HEAD=`b1cbf5c` 재실측 **rc=0** (0 hit). `b42d1f0` (TSK-20260831-02-b) 가 `:203` 폴백을 제거했다. **투영이지 불변식이 아니다** — 민감도의 실검증은 §참고 §주입 이관 Dir-2·Dir-3 이 했다.
- [x] (I6 투영) 지목 클래스의 조용한 탈락 경로 부재: `bash -c '! grep -nE "filter\(\(c\) => rendered\.includes\(c\)\)" src/__tests__/handbuilt-rationale-premise-truth.test.ts'` → HEAD=`b1cbf5c` 재실측 **rc=0** (0 hit). `b42d1f0` 이 `:152` 의 거르기를 없애고 지목을 전량 보존한 뒤 렌더 집합과의 차집합을 `Quote.unrendered` 로 들고 다니게 바꿨다. 투영 — 실검증은 Dir-3.
- [x] (I5, REQ-049 FR-04 보존) `ImageItem` 의 손조립은 정정 후에도 보존: `bash -c 'test "$(grep -cE "^[[:space:]]*role=\"button\"" src/Image/ImageItem.tsx)" = "1"'` → HEAD=`b1cbf5c` 재실측 rc=0 (`:75`). 이 지점의 근거는 **참이다** — 요구되는 것은 지목 추가지 근거·손조립의 제거가 아니다.
- (I8)(I9) 실패 메시지의 구별 발화 · 게이트 경계 주석의 사실성 — **체크박스 부적격** (의미 판정 + 고장 주입 요구). §참고 §미측정·비판정 항목 및 §주입 이관 으로 내린다.
- (I1)(I3) 근거 동반·결론 정합 — **체크박스 부적격** (의미 판정: 주석과 JSX 속성의 결합, 그리고 결론 문장의 정정 여부는 명령으로 rc 판정되지 않는다). §참고 §미측정·비판정 항목 으로 강등 (RULE-07 §수용 기준 문장 규약).

## 수용 기준
- [x] (Must, FR-05) 거짓 전제 소멸: `bash -c '! grep -nF "position: fixed" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx'` → rc=0. HEAD=`b1cbf5c` 재실측 rc=0.
- [x] (Must, 범위 제한) 범위 밖 2 지점(`ImageItem` · `UserLogin`)의 손조립과 근거는 보존: 위 (I5) 명령 rc=0.
- [x] (Must, 기준 사실) 정정의 기준이 되는 CSS 사실이 현 HEAD 에 실재: 위 (I2) 기준 사실 명령 rc=0.
- [x] (Must, 발화 채널) 본 spec 의 Must 측정 게이트가 실경로에서 발화: `npx vitest run src/__tests__/handbuilt-rationale-premise-truth.test.ts` → rc=0 (RULE-07 §promote 조건 4).
- [x] (Must, REQ-049 FR-01) 지목 없는 인용이 0 건: 위 §테스트 현황 (I2-a) 명령 → rc=0. HEAD=`b1cbf5c` 재실측 rc=0 (`files=4 quotes=3 unscoped=0`) — `130b81d`.
- [x] (Must, REQ-049 FR-02 투영) 폴백 삼항 부재: 위 (I6 투영) 첫 명령 → rc=0. HEAD=`b1cbf5c` 재실측 rc=0 — `b42d1f0`.
- [x] (Must, REQ-049 FR-03 투영) 지목 미렌더의 조용한 강등 경로 부재: 위 (I6 투영) 둘째 명령 → rc=0. HEAD=`b1cbf5c` 재실측 rc=0 — `b42d1f0`.
- [x] (Must, REQ-049 FR-04 보존) `ImageItem` 손조립 1 hit 유지: 위 (I5) 명령 rc=0.
- [x] (Must, REQ-049 NFR-01 비퇴행) 게이트가 계속 초록: `bash -c 'npx vitest run src/__tests__/handbuilt-rationale-premise-truth.test.ts >/dev/null 2>&1'` → HEAD=`b1cbf5c` 재실측 rc=0 (1 file / 3 tests). 정정(`130b81d`)·게이트 수정(`b42d1f0`) 후에도 rc=0.

## 스코프 규칙
- **expansion**: 불허 — 대상은 (a) 근거 주석 정정 축의 `src/Log/LogItemInfo.tsx` · `src/Comment/CommentItem.tsx` · `src/Image/ImageItem.tsx`, (b) 게이트 축의 `src/__tests__/handbuilt-rationale-premise-truth.test.ts` 뿐이다. 그 밖 파일의 주석은 본 spec 의 게이트 대상이 아니며, CSS 파일은 **읽기 대상**이지 정정 대상이 아니다 (CSS 가 움직인 경우는 §회귀 중점 참조).
- **grep-baseline** (HEAD=`b1cbf5c`, 2026-08-31 재실측):
  - `grep -nF "position: fixed" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx` → **0 hits** (충족 상태). 직전 baseline (HEAD=`efe6268`) 은 2 hits in 2 files 였다: `src/Log/LogItemInfo.tsx:75` · `src/Comment/CommentItem.tsx:85`.
  - `grep -rnE "^[[:space:]]*role=\"button\"" src --include="*.tsx" | grep -v "\.test\."` → 4 hits in 4 files:
    - `src/Comment/CommentItem.tsx:92`, `src/Image/ImageItem.tsx:75`, `src/common/UserLogin.tsx:68`, `src/Log/LogItemInfo.tsx:85`
  - **(REQ-049) 인용의 지목 현황** — 위 (I2-a) perl 도출을 그대로 실행한 결과 (HEAD=`b1cbf5c`): `files=4 quotes=3 unscoped=0`. 인용 3건이 전부 지목을 갖는다: `src/Log/LogItemInfo.tsx` · `src/Comment/CommentItem.tsx` 는 `` `.div--logitem-linkmessage` ``, `src/Image/ImageItem.tsx` 는 `` `.img--image-selected` `` / `` `styles.imgImageSelected` `` (`130b81d`). `src/common/UserLogin.tsx` 는 `position:` 인용이 없어 모집단 4 중 인용 3 이다. 직전 baseline (HEAD=`643be56`) 은 `unscoped=1` 이었다.
  - **(REQ-049) 게이트의 폴백 지점** — `grep -nE "q\.scoped : q\.rendered|filter\(\(c\) => rendered\.includes\(c\)\)" src/__tests__/handbuilt-rationale-premise-truth.test.ts` → **0 hits** (HEAD=`b1cbf5c`). 직전 baseline (HEAD=`643be56`) 은 2 hits (`:152` 지목의 조용한 탈락 · `:203` 렌더 집합 폴백) 이었고, `b42d1f0` 이 두 지점을 정정했다.
- **rationale**: `position: fixed` 문자열은 이 두 파일에서 오직 거짓이 된 전제 문장에만 나타났다 (직전 실측 2/2). 0 hit 은 (I2) 의 **투영**이지 불변식 자체가 아니다 (§참고) — 불변식 자체의 상시 판정은 `handbuilt-rationale-premise-truth.test.ts` 가 인용↔CSS 대조로 수행한다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector (Phase 3, REQ-20260830-047 흡수) / pending | 최초 박제 — 근거 주석 진실성 5 축 (I1~I5). REQ 의 FR-05 만 분리 흡수 (§참고 §축 분리 근거). baseline: 거짓 전제 2 hit 실측 (rc=1 FAIL) + 기준 CSS 사실 rc=0. | all |
| 2026-08-31 | inspector (Phase 3, REQ-20260831-049 흡수) / pending (HEAD=`643be56`) | 인용의 클래스 지목 + 게이트 fail-closed 축 흡수 — §역할 방어 대상 2, §동작 (I2-a)(I6)~(I9), §회귀 중점 3행, §테스트 현황 unchecked 3 + checked 1, §수용 기준 unchecked 3 + checked 2, §스코프 규칙 baseline 2, §참고 주입 이관 6방향 + (C-1) DoD 작성 조건. **본 tick 전반부에 4/4 `[x]` 로 promote 후보였던 상태가 이 흡수로 6/9 로 되돌아간다** — 부착된 게이트가 두 방향에서 검출력 0 임이 실측됐으므로, 그 상태로 blue 에 올리면 검출 0 채널을 계약으로 박제하게 된다. | 역할·동작·회귀 중점·의존성·테스트 현황·수용 기준·스코프 규칙·참고 |
| 2026-08-31 | inspector (Phase 1 reconcile) / `8772f0d`+`b34c391` @ HEAD=`643be56` | (I2)·(Must FR-05) 마커 플립 — 거짓 전제 0 hit rc=0 재실측 (TSK-20260831-01-a). 발화 채널 `handbuilt-rationale-premise-truth.test.ts` rc=0 확인 (TSK-20260831-01-b) → §역할 의 "게이트 없음" 서술 정정, §수용 기준에 채널 항목 추가. `hover-popup-anchoring.test.ts` → `.tsx` 경로 drift 반영. §수용 기준 4/4 `[x]` (같은 tick 후반 REQ-049 흡수로 6/9 로 이동 — 윗 행). | 역할·테스트 현황·수용 기준·스코프 규칙·참고 |
| 2026-08-31 | inspector (Phase 1 reconcile) / `130b81d`+`b42d1f0` @ HEAD=`b1cbf5c` | 마커 플립 3 — (I2-a) `unscoped=1`→`unscoped=0` rc=0, (I6 투영) 2건 `:152`·`:203` 0 hit rc=0. §수용 기준 6/9 → **9/9 `[x]`** (promote 후보). 동기화: §역할 방어 대상 2 의 "현 HEAD 에 실재한다" 를 해소 사실로 정정, §주입 이관 을 이관처 완료 결과표로 교체하고 **Dir-1 의 `rc=0 (놓침)` 이 `130b81d` 이후 재현되지 않는 사실 박제** (TSK-02-b result 관찰 반영), baseline 2건 갱신, 근거 주석 라인 drift 4건. | 역할·테스트 현황·수용 기준·스코프 규칙·참고 |

## 참고

### 축 분리 근거

원 req (REQ-20260830-047) 는 두 축을 함께 담았다: (A) 거짓이 된 근거 주석의 정정, (B) `link-copy-button` · `reply-toggle-button` 의 네이티브 `<button>` 전환. 본 spec 은 (A) 만 담고 (B) 는 `specs/30.spec/green/common/activatable-control-native-button.md` 로 갈랐다. 근거:

1. **독립 충족 가능**. (A) 는 (B) 없이 해소된다 — 주석을 현 사실로 고쳐 쓰면 된다 (I4-a). 역으로 (B) 를 하면 주석이 소멸해 (A) 도 함께 해소된다 (I4-b). 한쪽이 다른 쪽의 전제가 아니다.
2. **논쟁 표면이 다르다**. (A) 는 "코드에 적힌 사실이 사실과 다르다" 로, 판정에 재량이 없다. (B) 는 마크업 구조 변경이며 운영자가 과거에 button 전환 1건을 되돌린 이력이 있다 (`src/common/UserLogin.tsx` 의 `login-button` — 그 지점 주석에 박제). 성격이 다른 두 판단을 한 spec 에 묶으면 promote 조건(§수용 기준 전수 `[x]`)이 둘을 AND 로 묶어, 재량 없는 정정이 재량 있는 전환의 결론을 기다리게 된다.
3. **선점 효과의 제거가 (B) 의 전제 조건**. (B) 를 논의하려면 먼저 (A) 가 참이어야 한다 — 거짓 근거가 남아 있는 한 (B) 의 재검토는 그 거짓 위에서 이뤄진다. 따라서 (A) 는 (B) 의 채택 여부와 **무관하게** 가치가 있다. (B) 를 하지 않기로 최종 결정하더라도 근거는 참인 근거여야 한다.

### 주입 이관 (RULE-06 §게이트 실효 검증 — 게이트 수정 task DoD 로)

`RULE-07 §수용 기준 문장 규약` 의 '가정 주입 요구' 부류라 체크박스로 두지 않고 이관했다. 검출 방향 4 · 음성 대조 2. **이관처는 `TSK-20260831-02-b` 이며 수행이 끝났다** (`b42d1f0` — `injection: 4/4 detect` · `control: 2/2 pass`). 아래는 그 왕복의 결과 박제다.

| 방향 | 요지 | 수정 전 (`f5ad082`) | 수정 후 (`b42d1f0`) |
|---|---|---|---|
| **Dir-1** (I6 지목 부재의 실물) | `.img--image-selected` 만 `fixed`→`absolute`, 형제 `.div--image-backdrop` 은 `fixed` 유지 | **rc=1 (검출)** — 아래 주 참조 | rc=1 |
| **Dir-2** (I2-a) | 주석에서 클래스 지목만 삭제, 인용 값 유지 | **rc=0 (놓침)** | rc=1 |
| **Dir-3** (I6 지목 미렌더) | 지목 클래스명을 렌더되지 않는 이름으로 (오타·rename 모사) | **rc=0 (놓침)** | rc=1 |
| **Dir-4** (기존 축 보존) | 지목 클래스의 `position` 값을 실제로 회귀 | rc=1 | rc=1 (대조 클래스명 출력 — I8) |
| **Ctrl-1** (특이도) | 지목·인용 값 유지한 채 주석 문구만 재서술 | — | **rc=0** |
| **Ctrl-2** (특이도) | 지목 클래스의 `position` **이외** 속성 변경 (`z-index`) | — | **rc=0** |

> **Dir-1 의 종전 박제 `rc=0 (놓침)` 은 현 트리에서 재현되지 않는다.** 그 수치는 HEAD=`643be56`, 즉 `130b81d` **이전** — `ImageItem.tsx` 의 인용에 지목이 없어 폴백 OR 로 판정되던 상태 — 의 것이다. `130b81d` 가 지목을 넣은 뒤로는 폴백 코드가 아직 남아 있던 시점(`f5ad082`)에도 이 인용이 폴백 경로를 타지 않아 Dir-1 이 이미 rc=1 이었다 (`TSK-20260831-02-b` 실측). 따라서 `b42d1f0` 이 실제로 닫은 사각은 **Dir-2 · Dir-3** 이고, Dir-1 은 그 사각의 **동기**였지 잔존 증상이 아니다. 지어낸 재현을 박제하지 않기 위해 이 갈림을 그대로 적는다 — 이 문단 자체가 (I2)(I9) 가 요구하는 "인용은 현 HEAD 에서 참이어야 한다" 를 본 spec 에 적용한 결과다.

세 부류의 실패 문구는 서로 구별된다 (I8): 지목 부재는 `**지목하지 않았다**`, 지목 미렌더는 `**렌더하지 않는다**`, 값 불일치는 `**지목한 클래스의** 실제 CSS 는 [...] 다`. Dir-1 과 Dir-4 는 같은 값 불일치 부류이며 출력하는 클래스명으로 갈린다.

### (C-1) 게이트 수정 task 의 DoD 작성 조건 — 열거 고정 금지는 주석을 판정 대상에서 제외한다

본 spec 으로 발행될 게이트 수정 task 는 `RULE-06 §열거 고정 금지` 를 재는 DoD 를 다시 달게 된다. **직전 발행분에서 그 DoD 가 같은 task 의 구현 지시와 서로를 배제했다** — `TSK-20260831-01-b` 는 검출 경계 주석에 `ImageItem.tsx` 의 형제 클래스 사실을 적으라고 지시하면서, 같은 문서에서 `grep -nE "LogItemInfo|CommentItem|ImageItem|UserLogin" <신규 테스트>` → 0 lines 를 요구했다. 지시가 요구한 문자열이 게이트가 금지한 문자열이었고, developer 는 DoD 를 택해 경계 문구에서 파일명을 뺐다 (현 게이트 상단 §검출 경계 1 이 그 결과다). 그 판단은 규약이 아니라 재량으로 이뤄졌다.

열거 고정 금지가 재려는 것은 **도출 로직의 하드코딩**이지 주석의 예시 언급이 아니다. 따라서 그 부류의 DoD 는 판정 전에 주석을 걷어내거나(`sed "s://.*::"` — 선례: `specs/30.spec/blue/testing/network-egress-isolation.md`) 문자열 리터럴로 한정한다. 이는 spec 의 불변식이 아니라 **발행될 task 의 DoD 작성 조건**이며 귀속처는 planner·inspector 다. `RULE-06` 문면 개정은 운영자 소관이라 본 spec 은 개정을 요구하지 않는다.

### 미측정·비판정 항목

- **(I1) "손조립 지점은 고유한 근거 주석을 갖는다" 의 전수 판정 채널이 없다.** 주석과 JSX 속성의 결합은 위치 근접성으로만 표현돼 있어 grep 으로 "이 `role="button"` 에 딸린 주석" 을 지목할 수 없다. 현 4 지점은 육안 확인으로 전부 근거를 갖는다 (HEAD=`b1cbf5c` 재확인): `LogItemInfo.tsx:73-82` · `CommentItem.tsx:83-88` · `ImageItem.tsx:26-30` · `UserLogin.tsx:59-66`.
- **(I3) "전제가 거짓이 되면 결론도 정정된다" 는 의미 판정이라 명령으로 잴 수 없다.** 게이트(`grep -F "position: fixed"` 0 hit)는 **전제 문자열의 소멸**만 본다. 전제만 지우고 "전환하지 않는다" 만 남기면 게이트는 rc=0 을 내지만 (I3) 위반이다. 이 방향은 본 spec 의 정정 task 리뷰에서 사람이 판정한다. 부착된 `handbuilt-rationale-premise-truth.test.ts` 도 자기 헤더 §검출 경계 2 에서 (I1)(I3) 을 명시적으로 범위 밖에 둔다 — 그 파일이 재는 것은 `position` 값의 인용 정합 하나다. `8772f0d` 는 결론 문장을 남은 참인 근거(콘텐츠 모델) 위에서 다시 써 이 방향을 사람 리뷰로 충족했다.
- **(I8) 실패 메시지의 구별 발화와 (I9) 경계 주석의 사실성은 고장을 내야 판정된다.** (I8) 은 위반을 주입해야 메시지가 보이고, (I9) 는 폴백 제거 이후에야 현 경계 문장의 참·거짓이 갈린다. **둘 다 `TSK-20260831-02-b` (`b42d1f0`) 에서 판정됐다** — (I8) 은 Dir-1~4 의 출력 4종이 서로 구별됨으로, (I9) 는 게이트 상단 §검출 경계 1 의 재서술 + `! grep -nF "최소 1개" <게이트>` rc=0 으로. 상시 판정 채널은 여전히 없으므로 체크박스로 올리지 않는다 — 다음 게이트 수정 때 같은 왕복을 다시 요구한다.
- **(I6) 의 두 수용 기준은 게이트 소스 문자열에 대한 투영이다.** `q.scoped : q.rendered` · `filter((c) => rendered.includes(c))` 0 hit 은 현 구현의 폴백 지점이 사라졌음을 재지, 새 구현이 fail-closed 임을 재지 않는다. 리팩터로 같은 폴백이 다른 표기로 되살아나면 두 명령은 통과한다. **민감도의 판정은 §주입 이관 Dir-1~4 가 전담했고** (`b42d1f0` — 4/4 detect), 두 투영은 이제 그 결과의 회귀 감시용이다. 두 투영이 rc=0 이 된 지금이 정확히 이 한계가 드러나는 지점이다: 0 hit 은 폴백이 **그 표기로** 없다는 뜻일 뿐이다.
- **잔존하는 참인 근거**: 두 주석의 첫 절반 — "트리거가 팝업 `div` 를 품는데 `button` 의 콘텐츠 모델은 phrasing content 라 어긋난다" — 은 현 HEAD 에서 **여전히 참이다**. 거짓이 된 것은 두 번째 절반(형제로 빼면 밀린다)뿐이다. 정정은 참인 절반을 지우는 것이 아니라, 그 절반이 더 이상 **전환 불가**를 함의하지 않게 된 사실을 반영하는 것이다.

- **원 req**: `specs/60.done/2026/08/31/req/20260830-activatable-control-native-button-and-rationale-truth.md` (FR-05) · `specs/60.done/2026/08/31/req/20260831-rationale-quote-class-scoping-and-fail-closed-gate.md` (REQ-20260831-049 — 인용 지목 + fail-closed 축).
- **관련 커밋**: `7cd575a` (3곳 손조립 유지 근거 박제 — "재론되지 않도록"), `520f906` (팝업 명시 좌표 + 기준점 + 게이트 — 전제를 거짓으로 만든 커밋), `8772f0d` (거짓 전제 정정 — TSK-20260831-01-a), `b34c391` (발화 채널 부착 — TSK-20260831-01-b · 폴백 도입 지점이기도 하다: `:152` `:203`), `130b81d` (`ImageItem` 인용에 지목 추가 — TSK-20260831-02-a), `b42d1f0` (게이트 fail-closed 전환, 폴백 2 지점 제거 — TSK-20260831-02-b).
- **관련 spec**: `specs/30.spec/blue/common/accessibility.md` (§동작 (I6) 이 native interactive element 의 focus 표시를 범위 밖으로 두므로 직교).
