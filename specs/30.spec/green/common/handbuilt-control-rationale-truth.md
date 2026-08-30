# 손조립 조작부를 유지하는 근거는 현 HEAD 에서 참이다

> **위치**: `src/Log/LogItemInfo.tsx` (`link-copy-button` 근거 주석) · `src/Comment/CommentItem.tsx` (`reply-toggle-button` 근거 주석) · `src/Image/ImageItem.tsx` (`imageItem`) · `src/common/UserLogin.tsx` (`login-button`).
> **관련 요구사항**: REQ-20260830-047 FR-05
> **최종 업데이트**: 2026-08-31 (by inspector — Phase 1 drift reconcile, HEAD=`643be56`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`643be56`).

## 역할

네이티브 요소로 전환하지 **않는다**는 판단을 코드에 박제한 근거 주석은, 그것이 인용하는 CSS·DOM 사실이 현 HEAD 와 일치할 때만 남는다. 전제가 거짓이 되면 주석은 정정되거나 (근거가 사라졌으므로) 함께 사라진다.

**방어 대상 (silent regression)**: 근거의 전제만 조용히 거짓이 되고 결론은 남는 상태. `7cd575a` 는 이 주석들의 목적을 "재론되지 않도록" 이라고 적었다 — 즉 이 문장들은 미래의 판단을 **선점**한다. 선점하는 문장이 거짓이면, 다음에 이 코드를 보는 사람은 **이미 사라진 위험**을 근거로 전환을 다시 포기한다. 이 축의 발화 채널은 `src/__tests__/handbuilt-rationale-premise-truth.test.ts` (`b34c391` 에서 vitest 수집 경로에 부착) 이며, 근거 주석이 인용한 `position:` 값을 그 파일이 렌더하는 클래스의 실제 CSS 선언과 대조한다. 그 전까지 이 축을 보는 게이트는 하나도 없었다: `src/common/a11y.audit.test.ts` 는 손조립이 패턴 B(`tabIndex` + `onKeyDown`)를 갖췄는지만 보고, `src/__tests__/hover-popup-anchoring.test.tsx` 는 CSS 계약의 형태와 DOM 조상 관계만 본다. 둘 다 주석이 무엇을 주장하는지 읽지 않으므로, 전제 소멸은 어떤 rc 도 바꾸지 않은 채 통과했다.

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
3. **(I3) 전제 소멸 시 결론 무효**: 전제가 거짓이 되면 그 전제에 매달린 결론 문장("따라서 전환하지 않는다")도 함께 정정된다. 전제만 지우고 결론을 남기는 것은 (I3) 위반이다 — 근거 없는 금지가 되어 선점 효과는 그대로 남는다.
4. **(I4) 해소 경로는 둘**: (a) 주석을 현 사실로 정정하거나, (b) 근거가 지키던 손조립 자체를 없애 주석이 소멸하거나. 어느 쪽이든 (I2) 는 충족된다. 본 spec 은 둘 중 하나를 강제하지 않는다.
5. **(I5) 범위 밖 지점의 근거는 별도 판정**: `src/Image/ImageItem.tsx` 의 근거(확대 시 `position: fixed` 배치 + grid 셀 `aspect-ratio` 가 래퍼로 이동)와 `src/common/UserLogin.tsx` 의 근거(운영자 지시)는 현재 참이며 본 spec 이 요구하는 정정 대상이 아니다. 다만 (I1)~(I3) 은 이 지점들에도 동일하게 적용된다.

### 회귀 중점
- 팝업 CSS 를 다시 `position: fixed` 로 되돌리거나 좌표를 걷으면 (I2) 의 기준 사실이 바뀐다 — 주석이 아니라 CSS 가 움직인 경우다. 이때도 두 쪽이 어긋나면 위반이며, `hover-popup-anchoring` 게이트(`.tsx`)가 CSS 쪽을 먼저 잡는다.
- 새 손조립 지점을 추가하며 기존 근거 주석을 복사해 붙이면 (I1) 의 "그 지점에 고유한" 을 위반한다 — 복사된 전제는 새 지점에서 참인지 판정되지 않았다.

## 의존성
- 내부: `src/Log/LogItemInfo.tsx`, `src/Comment/CommentItem.tsx`, `src/Log/Log.css`, `src/Comment/Comment.module.css`, `src/Image/ImageItem.tsx`, `src/common/UserLogin.tsx`.
- 외부: 없음.
- 역의존 (사용처): 없음 (주석은 소비자가 사람이다).
- 직교: `src/common/a11y.audit.test.ts` (패턴 B 충족 여부만), `src/__tests__/hover-popup-anchoring.test.tsx` (CSS 계약 형태 + 팝업의 DOM 조상 관계). 둘 다 주석의 주장은 읽지 않는다 — 그 사실이 §역할 의 방어 대상 근거이며, 본 축은 `src/__tests__/handbuilt-rationale-premise-truth.test.ts` 가 전담한다.

## 테스트 현황
- [x] (I2) 거짓 전제 소멸: `bash -c '! grep -nF "position: fixed" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx'` → HEAD=`643be56` 실측 **rc=0** (0 hit). `8772f0d` (TSK-20260831-01-a) 가 두 주석의 거짓 전제 절반을 현 CSS 사실 인용으로 교체했다. 직전 측정(HEAD=`efe6268`)은 rc=1 · 2 hit (`LogItemInfo.tsx:75` · `CommentItem.tsx:85`) 이었다.
- [x] (I2) 기준 사실 실재: `bash -c 'grep -A4 -nE "^\.div--logitem-linkmessage" src/Log/Log.css | grep -qE "position:[[:space:]]*absolute"'` → HEAD=`643be56` 실측 rc=0 (재실행).
- [x] (I5) 범위 밖 2 지점 보존: `bash -c 'grep -qE "^[[:space:]]*role=\"button\"" src/Image/ImageItem.tsx && grep -qE "^[[:space:]]*role=\"button\"" src/common/UserLogin.tsx'` → HEAD=`643be56` 실측 rc=0 (재실행).
- [x] (I2) 발화 채널 현행 PASS: `npx vitest run src/__tests__/handbuilt-rationale-premise-truth.test.ts` → HEAD=`643be56` 실측 rc=0 (3 tests). `b34c391` (TSK-20260831-01-b) 부착 — RULE-07 §promote 조건 4 의 실경로다 (vitest 수집 경로 → `npm test` → pre-push · CI).
- (I1)(I3) 근거 동반·결론 정합 — **체크박스 부적격** (의미 판정: 주석과 JSX 속성의 결합, 그리고 결론 문장의 정정 여부는 명령으로 rc 판정되지 않는다). §참고 §미측정·비판정 항목 으로 강등 (RULE-07 §수용 기준 문장 규약).

## 수용 기준
- [x] (Must, FR-05) 거짓 전제 소멸: `bash -c '! grep -nF "position: fixed" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx'` → rc=0. HEAD=`643be56` 실측 rc=0.
- [x] (Must, 범위 제한) 범위 밖 2 지점(`ImageItem` · `UserLogin`)의 손조립과 근거는 보존: 위 (I5) 명령 rc=0.
- [x] (Must, 기준 사실) 정정의 기준이 되는 CSS 사실이 현 HEAD 에 실재: 위 (I2) 기준 사실 명령 rc=0.
- [x] (Must, 발화 채널) 본 spec 의 Must 측정 게이트가 실경로에서 발화: `npx vitest run src/__tests__/handbuilt-rationale-premise-truth.test.ts` → rc=0 (RULE-07 §promote 조건 4).

## 스코프 규칙
- **expansion**: 불허 — 정정 대상은 아래 baseline 2 라인이 있는 2 파일뿐이다. 그 밖 파일의 주석은 본 spec 의 게이트 대상이 아니다.
- **grep-baseline** (HEAD=`643be56`, 2026-08-31 재실측):
  - `grep -nF "position: fixed" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx` → **0 hits** (충족 상태). 직전 baseline (HEAD=`efe6268`) 은 2 hits in 2 files 였다: `src/Log/LogItemInfo.tsx:75` · `src/Comment/CommentItem.tsx:85`.
  - `grep -rnE "^[[:space:]]*role=\"button\"" src --include="*.tsx" | grep -v "\.test\."` → 4 hits in 4 files:
    - `src/Comment/CommentItem.tsx:92`, `src/Image/ImageItem.tsx:74`, `src/common/UserLogin.tsx:68`, `src/Log/LogItemInfo.tsx:85`
- **rationale**: `position: fixed` 문자열은 이 두 파일에서 오직 거짓이 된 전제 문장에만 나타났다 (직전 실측 2/2). 0 hit 은 (I2) 의 **투영**이지 불변식 자체가 아니다 (§참고) — 불변식 자체의 상시 판정은 `handbuilt-rationale-premise-truth.test.ts` 가 인용↔CSS 대조로 수행한다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector (Phase 3, REQ-20260830-047 흡수) / pending | 최초 박제 — 근거 주석 진실성 5 축 (I1~I5). REQ 의 FR-05 만 분리 흡수 (§참고 §축 분리 근거). baseline: 거짓 전제 2 hit 실측 (rc=1 FAIL) + 기준 CSS 사실 rc=0. | all |
| 2026-08-31 | inspector (Phase 1 reconcile) / `8772f0d`+`b34c391` @ HEAD=`643be56` | (I2)·(Must FR-05) 마커 플립 — 거짓 전제 0 hit rc=0 재실측 (TSK-20260831-01-a). 발화 채널 `handbuilt-rationale-premise-truth.test.ts` rc=0 확인 (TSK-20260831-01-b) → §역할 의 "게이트 없음" 서술 정정, §수용 기준에 채널 항목 추가. `hover-popup-anchoring.test.ts` → `.tsx` 경로 drift 반영. §수용 기준 4/4 `[x]`. | 역할·테스트 현황·수용 기준·스코프 규칙·참고 |

## 참고

### 축 분리 근거

원 req (REQ-20260830-047) 는 두 축을 함께 담았다: (A) 거짓이 된 근거 주석의 정정, (B) `link-copy-button` · `reply-toggle-button` 의 네이티브 `<button>` 전환. 본 spec 은 (A) 만 담고 (B) 는 `specs/30.spec/green/common/activatable-control-native-button.md` 로 갈랐다. 근거:

1. **독립 충족 가능**. (A) 는 (B) 없이 해소된다 — 주석을 현 사실로 고쳐 쓰면 된다 (I4-a). 역으로 (B) 를 하면 주석이 소멸해 (A) 도 함께 해소된다 (I4-b). 한쪽이 다른 쪽의 전제가 아니다.
2. **논쟁 표면이 다르다**. (A) 는 "코드에 적힌 사실이 사실과 다르다" 로, 판정에 재량이 없다. (B) 는 마크업 구조 변경이며 운영자가 과거에 button 전환 1건을 되돌린 이력이 있다 (`src/common/UserLogin.tsx` 의 `login-button` — 그 지점 주석에 박제). 성격이 다른 두 판단을 한 spec 에 묶으면 promote 조건(§수용 기준 전수 `[x]`)이 둘을 AND 로 묶어, 재량 없는 정정이 재량 있는 전환의 결론을 기다리게 된다.
3. **선점 효과의 제거가 (B) 의 전제 조건**. (B) 를 논의하려면 먼저 (A) 가 참이어야 한다 — 거짓 근거가 남아 있는 한 (B) 의 재검토는 그 거짓 위에서 이뤄진다. 따라서 (A) 는 (B) 의 채택 여부와 **무관하게** 가치가 있다. (B) 를 하지 않기로 최종 결정하더라도 근거는 참인 근거여야 한다.

### 미측정·비판정 항목

- **(I1) "손조립 지점은 고유한 근거 주석을 갖는다" 의 전수 판정 채널이 없다.** 주석과 JSX 속성의 결합은 위치 근접성으로만 표현돼 있어 grep 으로 "이 `role="button"` 에 딸린 주석" 을 지목할 수 없다. 현 4 지점은 육안 확인으로 전부 근거를 갖는다 (HEAD=`643be56`): `LogItemInfo.tsx:73-84` · `CommentItem.tsx:83-89` · `ImageItem.tsx:26-29` · `UserLogin.tsx:59-66`.
- **(I3) "전제가 거짓이 되면 결론도 정정된다" 는 의미 판정이라 명령으로 잴 수 없다.** 게이트(`grep -F "position: fixed"` 0 hit)는 **전제 문자열의 소멸**만 본다. 전제만 지우고 "전환하지 않는다" 만 남기면 게이트는 rc=0 을 내지만 (I3) 위반이다. 이 방향은 본 spec 의 정정 task 리뷰에서 사람이 판정한다. 부착된 `handbuilt-rationale-premise-truth.test.ts` 도 자기 헤더 §검출 경계 2 에서 (I1)(I3) 을 명시적으로 범위 밖에 둔다 — 그 파일이 재는 것은 `position` 값의 인용 정합 하나다. `8772f0d` 는 결론 문장을 남은 참인 근거(콘텐츠 모델) 위에서 다시 써 이 방향을 사람 리뷰로 충족했다.
- **잔존하는 참인 근거**: 두 주석의 첫 절반 — "트리거가 팝업 `div` 를 품는데 `button` 의 콘텐츠 모델은 phrasing content 라 어긋난다" — 은 현 HEAD 에서 **여전히 참이다**. 거짓이 된 것은 두 번째 절반(형제로 빼면 밀린다)뿐이다. 정정은 참인 절반을 지우는 것이 아니라, 그 절반이 더 이상 **전환 불가**를 함의하지 않게 된 사실을 반영하는 것이다.

- **원 req**: `specs/60.done/2026/08/31/req/20260830-activatable-control-native-button-and-rationale-truth.md` (FR-05).
- **관련 커밋**: `7cd575a` (3곳 손조립 유지 근거 박제 — "재론되지 않도록"), `520f906` (팝업 명시 좌표 + 기준점 + 게이트 — 전제를 거짓으로 만든 커밋), `8772f0d` (거짓 전제 정정 — TSK-20260831-01-a), `b34c391` (발화 채널 부착 — TSK-20260831-01-b).
- **관련 spec**: `specs/30.spec/blue/common/accessibility.md` (§동작 (I6) 이 native interactive element 의 focus 표시를 범위 밖으로 두므로 직교).
