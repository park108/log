# 활성되는 조작부는 네이티브 `<button>` 이다

> **위치**: `src/Log/LogItemInfo.tsx` (`link-copy-button`) · `src/Comment/CommentItem.tsx` (`reply-toggle-button`). 게이트: `src/common/a11y.audit.test.ts` · `src/common/a11y.audit.exemptions.ts` · `src/__tests__/hover-popup-anchoring.test.tsx`.
> **관련 요구사항**: REQ-20260830-047 FR-01·FR-02·FR-03·FR-04·FR-06·FR-07
> **최종 업데이트**: 2026-08-31 (by inspector — Phase 1 drift reconcile, HEAD=`643be56`)

> 참조 코드는 **식별자 우선**. 라인 번호는 스냅샷 (HEAD=`643be56`).

## 역할

포인터와 키보드로 **활성되는** 조작부 — `onClick` 을 보유해 누르면 무언가 일어나는 요소 — 는 네이티브 `<button>` 이다. `role="button"` + `tabIndex={0}` + `onKeyDown` 손조립은 그 지점에 고유하고 **현 HEAD 에서 참인** 근거가 박제된 경우에만 예외로 허용된다.

사용자 관측 표면이 근거다. 손조립은 `src/common/a11y.audit.test.ts` 의 패턴 B 를 충족해도 네이티브 `<button>` 이 기본 제공하는 것을 재현하지 못한다 — UA 기본 focus 표시, Space 활성의 keyup 타이밍과 스크롤 억제, `disabled` 의미론, 보조기술의 button role 신뢰도. 또한 손조립은 5개 속성(`role`·`tabIndex`·`onClick`·`onKeyDown`·접근 가능한 이름)을 지점마다 손으로 다시 맞춰야 하므로 지점이 늘 때 하나를 빠뜨릴 수 있다.

의도적으로 하지 않는 것: 근거 주석의 진실성 (별 spec — `handbuilt-control-rationale-truth.md`, §참고 §축 분리 근거), 팝업의 열림/닫힘 타이밍·Escape·`aria-describedby` 계약 (`src/common/useHoverPopup.ts` — 불변), 팝업의 시각적 위치를 **바꾸는** 변경, `onClick` 이 없는 hover/focus 트리거 (`versions-button` — 활성 조작부가 아니다), 스크린리더 실사용 측정 (채널 부재 — §참고).

## 공개 인터페이스
- 변경 없음. 두 조작부의 `data-testid` (`link-copy-button` · `reply-toggle-button`) 와 `aria-label` (`Copy the log link` · `Reply this message`) 는 전환 전후 동일하다 — 이것이 사용처(테스트·보조기술)를 향한 계약면이다.

## 동작

1. **(I1) 활성 조작부의 요소 선택**: `onClick` 을 보유한 조작부는 네이티브 `<button>` 으로 표현한다. `role="button"` 손조립은 (I2) 의 예외 조건을 만족할 때만 허용된다.
2. **(I2) 예외의 조건**: 예외는 그 지점에 고유한 근거 주석을 요구하며, 그 근거는 현 HEAD 에서 참이어야 한다. 현 예외 2건:
   - `src/Image/ImageItem.tsx` (`imageItem`) — 조작부가 `<img>` 자신이고, `button` 으로 감싸면 확대 상태의 `position: fixed` 배치와 썸네일 grid 셀의 `aspect-ratio` 가 래퍼로 옮겨간다 (`ImageItem.tsx:26-29`).
   - `src/common/UserLogin.tsx` (`login-button`) — 운영자 지시. 푸터의 이름처럼 보여야 하는 진입점이라 UA 기본 테두리·배경이 의도를 깬다 (`UserLogin.tsx:59-66`).
3. **(I3) 팝업 포함은 더 이상 예외 근거가 아니다**: `button` 의 콘텐츠 모델(phrasing content)이 팝업 `div` 를 품지 못하는 것은 사실이나, 팝업을 트리거의 **형제**로 두면 해소된다. 팝업은 `position: absolute` + 명시 좌표(`top: 100%; left: 0`) + `width: max-content` 를 가지므로 정적 위치에 의존하지 않는다 (`520f906`). 형제 이동 후 기준점은 팝업을 감싸는 위치 지정 조상이 **명시적으로** 갖는다.
4. **(I4) 기준점 목록의 동반 갱신**: 전환으로 팝업의 기준점이 바뀌면 `src/__tests__/hover-popup-anchoring.test.tsx` 의 `HOSTS` 도 함께 바뀐다. 게이트를 느슨하게 만들어 통과시키지 않는다 — 이 게이트의 요지는 "팝업을 얹으면 기준점을 함께 선언하라" 이다.
5. **(I5) 계약면 보존**: 전환 후에도 두 조작부는 Enter 와 Space 로 활성되고, 접근 가능한 이름(`aria-label`)과 `data-testid` 를 유지한다.
6. **(I6) 배치 동일성**: 전환 후 세 팝업(link · version · reply)의 화면상 위치는 전환 전과 같다. 배치가 바뀌면 그것은 충족이 아니라 회귀다. 측정 채널은 §참고 참조.
7. **(I7) 면제는 늘지 않는다**: `PATTERN_B_EXEMPTIONS` (`src/common/a11y.audit.exemptions.ts`) 는 비어 있다. 전환은 면제 추가가 아니라 위반 소멸로 달성한다.

### 회귀 중점
- 전환하면서 팝업을 `button` 안에 그대로 두면 (I3) 위반 — 콘텐츠 모델이 어긋나 브라우저가 DOM 을 재구성할 수 있다.
- 팝업을 형제로 옮기고 새 래퍼에 `position: relative` 를 주지 않으면 `top: 100%` 가 뷰포트 높이를 잡아 팝업이 화면 밖으로 간다 (실측 y=1298 — `hover-popup-anchoring.test.tsx` 주석).
- `HOSTS` 를 손대지 않고 팝업 사용처만 바꾸면 3번째 `it` (팝업 사용처가 목록과 일치한다) 이 잡는다.
- 손조립을 `PATTERN_B_EXEMPTIONS` 에 등재해 감사를 통과시키면 (I7) 위반.

## 의존성
- 내부: `src/Log/LogItemInfo.tsx`, `src/Comment/CommentItem.tsx`, `src/Log/Log.css`, `src/Comment/Comment.module.css`, `src/common/a11y.ts` (`activateOnKey`), `src/common/useHoverPopup.ts`.
- 외부: 없음.
- 역의존 (사용처): `src/Log/LogItem.test.tsx`, `src/Log/LogItemInfo.test.tsx`, `src/Comment/CommentItem.test.tsx`, `src/Comment/Comment.test.tsx` 가 두 조작부를 `data-testid` 로 잡는다 — (I5) 의 보존 대상.
- 직교: `specs/30.spec/blue/common/accessibility.md` (§동작 (I6) 이 native interactive element 의 focus 표시를 명시적으로 범위 밖에 둔다).

## 테스트 현황
- [ ] (I1) 두 지점의 손조립 소멸: `bash -c '! grep -rnE "^[[:space:]]*role=\"button\"" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx'` → HEAD=`643be56` 재실측 **rc=1 (FAIL)** — 2 hit (`LogItemInfo.tsx:85` · `CommentItem.tsx:92`). 전환 미착수 (`8772f0d` 는 주석만 고쳤다 — 별 축).
- [ ] (I1) `link-copy-button` 이 `<button>`: `bash -c 'perl -0777 -ne '\''exit(1) unless /<button[^>]*data-testid="link-copy-button"/'\'' src/Log/LogItemInfo.tsx'` → HEAD=`643be56` 재실측 **rc=1 (FAIL)**.
- [ ] (I1) `reply-toggle-button` 이 `<button>`: `bash -c 'perl -0777 -ne '\''exit(1) unless /<button[^>]*data-testid="reply-toggle-button"/'\'' src/Comment/CommentItem.tsx'` → HEAD=`643be56` 재실측 **rc=1 (FAIL)**.
- [x] (I2) 예외 2 지점 보존: `bash -c 'grep -qE "^[[:space:]]*role=\"button\"" src/Image/ImageItem.tsx && grep -qE "^[[:space:]]*role=\"button\"" src/common/UserLogin.tsx'` → HEAD=`643be56` 재실측 rc=0.
- [x] (I4) 기준점 게이트 현행 PASS: `npx vitest run src/__tests__/hover-popup-anchoring.test.tsx` → HEAD=`643be56` 재실측 rc=0 (**6 it** — `68775f7` 이 런타임 DOM 조상 축 3 it 을 더하며 파일을 `.ts` → `.tsx` 로 옮겼다).
- [x] (I5) 계약면 현행 PASS: `npx vitest run src/Log/LogItemInfo.test.tsx src/Log/LogItem.test.tsx src/Comment/CommentItem.test.tsx src/Comment/Comment.test.tsx` → HEAD=`643be56` 재실측 rc=0 (72 tests). 이 72개가 전환의 회귀 그물이다.
- [x] (I1 보조) 감사 게이트 현행 PASS: `npx vitest run src/common/a11y.audit.test.ts src/common/a11y.focus-visible.test.ts` → HEAD=`643be56` 재실측 rc=0 (8 tests). **이 rc=0 이 손조립 2건을 허용하고 있다는 점이 본 spec 의 계기다** — 패턴 B 충족은 네이티브 button 을 대신하지 못한다.
- [x] (I7) 면제 공집합: `bash -c 'perl -0777 -ne '\''exit(1) unless /PATTERN_B_EXEMPTIONS[^=]*=\s*\[\s*(?:\/\/[^\n]*\n\s*)*\]/'\'' src/common/a11y.audit.exemptions.ts'` → HEAD=`643be56` 재실측 rc=0.
- (I6) 배치 동일성 — **체크박스 부적격** (미측정 NFR: 헤드리스 브라우저가 의존성에 없어 현 HEAD 에서 명령 1회로 rc 판정 불가). §참고 §미측정·비판정 항목 으로 강등하고 구현 task DoD 로 이관한다 (RULE-07 §수용 기준 문장 규약).

## 수용 기준
- [ ] (Must, FR-01) `bash -c '! grep -rnE "^[[:space:]]*role=\"button\"" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx'` → rc=0.
- [ ] (Must, FR-01) `bash -c 'perl -0777 -ne '\''exit(1) unless /<button[^>]*data-testid="link-copy-button"/'\'' src/Log/LogItemInfo.tsx'` → rc=0.
- [ ] (Must, FR-01) `bash -c 'perl -0777 -ne '\''exit(1) unless /<button[^>]*data-testid="reply-toggle-button"/'\'' src/Comment/CommentItem.tsx'` → rc=0.
- [x] (Must, FR-02·FR-06) `npx vitest run src/__tests__/hover-popup-anchoring.test.tsx` → rc=0. HEAD=`643be56` 재실측 rc=0 (6 it). 현행 PASS 이며 전환이 이를 깨지 않는 것이 요구다 — promote 시 재실행 대상 (RULE-07 §promote 조건 2).
- [x] (Must, FR-04·NFR-03) `npx vitest run src/Log/LogItemInfo.test.tsx src/Log/LogItem.test.tsx src/Comment/CommentItem.test.tsx src/Comment/Comment.test.tsx` → rc=0. HEAD=`643be56` 재실측 rc=0 (4 files / 72 tests). 동일 — 전환 후 재실행이 (I5) 계약면 보존의 판정이다.
- [x] (Must, NFR-01) `npx vitest run src/common/a11y.audit.test.ts src/common/a11y.focus-visible.test.ts` → rc=0. HEAD=`643be56` 재실측 rc=0 (2 files / 8 tests). 동일 — 손조립이 패턴 B 로 통과하던 상태를 전환이 유지하는지를 따진다.
- [x] (Should, FR-07) `PATTERN_B_EXEMPTIONS` 공집합: 위 (I7) 명령 rc=0.
- [x] (Must, 범위 제한) 예외 2 지점 보존: 위 (I2) 명령 rc=0.

## 스코프 규칙
- **expansion**: 불허 — 전환 대상은 `src/Log/LogItemInfo.tsx` · `src/Comment/CommentItem.tsx` 2 파일과 그 팝업 기준점 CSS(`src/Log/Log.css` · `src/Comment/Comment.module.css`), 그리고 `HOSTS` 목록(`src/__tests__/hover-popup-anchoring.test.tsx`) 뿐이다. 게이트 위반이 이 밖에서 나오면 격리 대상이다.
- **grep-baseline** (HEAD=`643be56`, 2026-08-31 재실측):
  - `grep -rnE "^[[:space:]]*role=\"button\"" src --include="*.tsx" | grep -v "\.test\."` → 4 hits in 4 files:
    - `src/Comment/CommentItem.tsx:92` (전환 대상), `src/Log/LogItemInfo.tsx:85` (전환 대상)
    - `src/Image/ImageItem.tsx:74` (예외 — 보존), `src/common/UserLogin.tsx:68` (예외 — 보존)
    - 제외 규칙: JSX 속성 라인 한정(`^[[:space:]]*role=`)이라 주석 본문의 `role="button"` 언급 3건은 계수하지 않는다. `.test.` 파일 제외.
  - `grep -cE "<button" src/Log/LogItemInfo.tsx src/Comment/CommentItem.tsx` → `LogItemInfo.tsx:1` · `CommentItem.tsx:0` (HEAD=`643be56` 재실측 동일). **LogItemInfo 의 1 hit 은 `link-copy-button` 이 아닌 별개 button 이다** — 그래서 §수용 기준은 `<button` 존재 여부가 아니라 `data-testid` 결합을 `perl -0777` 로 잰다.
- **rationale**: 두 전환 대상은 팝업을 품는 유일한 손조립이고, 그 팝업 3종의 기준점은 `HOSTS` 3행과 1:1 대응한다. 따라서 baseline 은 4 hit 열거로 닫힌다.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector (Phase 3, REQ-20260830-047 흡수) / pending | 최초 박제 — 활성 조작부 요소 선택 7 축 (I1~I7). REQ 의 FR-01·02·03·04·06·07 흡수, FR-05 는 별 spec 으로 분리 (§참고 §축 분리 근거). baseline: 손조립 4 hit 실측(2 전환 대상 + 2 예외), 게이트 3종 현행 rc=0. | all |
| 2026-08-31 | inspector (Phase 1 reconcile) / `68775f7` @ HEAD=`643be56` | 마커 플립 0 — (I1) 3 게이트 재실행 **rc=1 유지** (전환 미착수). 동기화만: `hover-popup-anchoring.test.ts` → `.tsx` 경로 drift 8곳, 3 it → 6 it, baseline 라인 번호 갱신, §참고 의 "팝업의 DOM 부모를 검사하지 않는다" 공백이 `68775f7` 로 닫힌 사실 반영. | 위치·동작·테스트 현황·수용 기준·스코프 규칙·참고 |

## 참고

### 축 분리 근거

원 req (REQ-20260830-047) 는 (A) 거짓이 된 근거 주석의 정정(FR-05) 과 (B) 네이티브 `<button>` 전환을 함께 담았다. 본 spec 은 (B) 만 담는다. (A) 는 `specs/30.spec/green/common/handbuilt-control-rationale-truth.md` 에 있고, 분리 근거 3항은 그 spec §참고 에 박제했다. 요지: 두 축은 서로의 전제가 아니며(각각 독립으로 충족된다), 판정의 성격이 다르다 — (A) 는 재량이 없고 (B) 는 마크업 구조 판단이라 운영자 재량이 실재한다 (`login-button` 이 그 재량으로 되돌려진 지점이며 그 이력이 `UserLogin.tsx:59-66` 에 박제돼 있다). 한 spec 에 묶으면 promote 조건이 둘을 AND 로 묶어 (A) 가 (B) 를 기다리게 된다.

**(B) 를 채택하지 않기로 결정하더라도 (A) 는 유효하다.** 그 경우 (A) 의 해소 경로는 "주석을 현 사실로 정정" 이 되고, 정정된 주석은 (B) 를 하지 않는 **참인** 근거를 새로 적어야 한다 — 팝업 배치 취약성은 더 이상 그 근거가 아니기 때문이다.

### 미측정·비판정 항목

- **(I6) 배치 동일성은 CI 로 잴 수 없다.** 헤드리스 브라우저가 의존성에 없다 (`package.json`). 원 req NFR-02 는 이를 "수행 시점 1회 실측" 으로 두고 8개 폭(280·320·375·414·768·900·1200·1440px)의 좌표 표를 `result.md` 에 박제하도록 요구했다. 이는 현 HEAD 에서 명령 1회로 판정되지 않으므로 체크박스로 두지 않는다. **구현 task 의 DoD 로 이관한다** — 선행 followup(`20260829-2320-hover-popup-fixed-position-detaches.md`)이 쓴 것과 같은 하네스(시스템 Chrome + CDP, 의존성 추가 없음)를 쓴다.
- **`HOSTS` 의 DOM 조상 축은 닫혔다 (`68775f7`).** 종전 3 it 은 (a) 팝업 규칙의 좌표·폭, (b) `anchor` 클래스 규칙이 위치 지정돼 있음, (c) 팝업 클래스를 쓰는 **파일 목록**이 `HOSTS` 와 일치함만 재어, 팝업을 기준점 밖 형제로 옮겨도 전부 통과했다 (해당 커밋이 주입으로 확인). 이제 3 it 이 더해져 세 팝업(link · version · reply)을 실제로 렌더한 뒤 **팝업이 선언된 `anchor` 의 자손인지**를 판정한다 (CSS 모듈 클래스는 DOM 에서 해시되므로 조상 판정은 부분 일치). 남은 공백은 **좌표 동일성** 하나다 — jsdom 은 레이아웃을 계산하지 않으므로 (I6) 은 여전히 브라우저 측정(`scripts/measure-layout.mjs`) 소관이고 CI 에 없다. 따라서 (I4) 의 실질은 이제 런타임 축이 지키고, (I6) 만 구현 task DoD 로 남는다.
- **네이티브 `<button>` 이 실제 보조기술에서 손조립과 다르게 읽히는지**는 스크린리더 실사용 측정이 필요하며 이 저장소에 채널이 없다. (I1) 은 그 측정이 아니라 **요소 선택의 기본값**을 불변식으로 둔다.
- **reply 팝업의 5px 오프셋**: `520f906` 이후 reply 팝업은 이전 대비 5px 왼쪽·5px 아래에 있다. 트리거의 `padding: 12px 0px 5px 5px` 에 대해 `left: 0` 이 padding box 기준이기 때문이며, 선행 followup 이 매직넘버 결합을 피하려 의식적으로 수용했다. 본 spec 은 이 값의 복원을 요구하지 않는다 — (I6) 실측은 이 오프셋이 **더 벌어지는지**만 관측한다.

- **원 req**: `specs/60.done/2026/08/31/req/20260830-activatable-control-native-button-and-rationale-truth.md`.
- **관련 커밋**: `7cd575a` (22곳 중 19곳 전환 + 3곳 근거 박제), `520f906` (팝업 명시 좌표 + 기준점 + 게이트), `68775f7` (기준점 게이트에 런타임 DOM 조상 축 추가 — 본 spec §참고 가 지적한 공백).
- **선행 게이트**: `src/__tests__/hover-popup-anchoring.test.tsx` (6 it — CSS 3 + DOM 조상 3), `src/common/a11y.audit.test.ts`, `src/common/a11y.audit.exemptions.ts`.
