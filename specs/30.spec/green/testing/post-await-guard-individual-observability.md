# 다중 post-await 가드는 개별적으로 관측된다

> **위치**: 횡단 계약. 판정 표면은 `src/__tests__/post-unmount-emission-audit.test.ts` 이며, 대상 표면은 post-await 가드가 2개 이상인 `src/**` 컴포넌트다.
> **관련 요구사항**: REQ-20260825-013 (post-await-guard-individual-observability)
> **최종 업데이트**: 2026-08-26 (by inspector — 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`93f320d`).

## 역할

언마운트 후 발화를 막는 가드가 하나의 async continuation 에 **여러 개** 걸린 표면에서, fixture 는 **가드 개수만큼의 분해능**을 갖는다. 즉 임의의 가드 1개가 사라지면 반드시 어떤 단정 하나가 red 가 된다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**:

> **다중 가드 표면에서 마지막 가드를 제외한 중간 가드가 제거·누락되는 사건.**

이 사건은 현행 채널 어디에서도 붉어지지 않는다 — (a) "최종 발화 무발화" 단정은 뒤 경계의 가드가 대신 막아주므로 앞 경계 가드가 사라져도 초록이고, (b) `post-unmount-emission-audit.test.ts` 의 G-D 는 "**발화 종류에 맞는 관측기 존재**"(`:15`, `:376`, `:591`) 까지만 판정하며 관측기의 **강도**는 계수하지 않고, (c) `RULE-06 §게이트 실효 검증` 의 위반 1건 주입은 이 부류에서 **통과해버린다** — `TSK-20260825-04` 의 injection Dir-B1 1차 시도가 `FileItem.deleteFileItem` 첫 await 경계 가드를 제거하고도 `rc=0` 을 낸 실측이 있다. 민감도를 검증하는 유일한 절차가 이 부류에서 무력화되는 자리다.

이 계약이 의도적으로 하지 않는 것:

- (i) **가드 구현 방식의 통일을 요구하지 않는다.** `isMounted` ref · `AbortController` · cancelled 플래그 중 어느 것이든 무방하며, 판정은 구현 형태가 아니라 **경계별 관측 지점의 존재**만 본다.
- (ii) **가드가 없는 표면에 신규 가드를 도입하지 않는다.** 발화 0 자체는 상위 계약 `post-unmount-async-effect-emission-zero` 소관이며, 본 계약은 그 계약의 **관측 강도**만 다룬다 — 판정 대상이 다르다.
- (iii) **발화 종류 분류(G-D) 자체를 바꾸지 않는다.** 본 계약은 G-D 위에 층으로 서며 그 분류 결과를 입력으로 쓴다.
- (iv) **대상 파일 목록을 지정하지 않는다.** 목록은 (P-A) 의 동적 도출로만 성립한다 — `RULE-06 §열거 고정 금지`.
- (v) **가드 개수의 산정 알고리즘을 특정 정규식으로 못박지 않는다.** `await` 문자열 계수는 근사치이며 (P-B) 는 그보다 정확한 경계 도출을 허용한다. 계약이 고정하는 것은 **도출된 요구 분해능과 보유 관측 지점의 대조가 rc 에 반영된다**는 점이다.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (fixture 분해능 계약). 관측 표면은 셋이다.

- **(P-A) 대상 모집단** — `src/**` 아래 컴포넌트 파일 중 async continuation 상의 post-await 가드가 **2개 이상**인 것. 디렉터리 열거로 도출하며 파일 경로 하드코딩을 포함하지 않는다.
- **(P-B) 요구 분해능** — (P-A) 각 원소가 갖는 post-await 가드 경계 수. 정상 경로 경계와 **catch 경계**를 함께 계수한다.
- **(P-C) 보유 관측 지점** — 그 파일의 형제 fixture 가 갖는 **중간 관측** 단정 수. 중간 관측이란 "최종 발화 무발화" 가 아니라 **그 경계 이후로 진행했는지를 드러내는 관측**이다 (예: 다음 단계 호출을 spy 로 관측).

세 수치는 **대상별로 동시에** 발화된다 — 총계만 내면 어느 파일이 부족한지 갈리지 않는다.

## 동작

1. `src/**` 를 디렉터리 열거로 순회해 (P-A) 를 도출한다. 도출 결과가 0 이면 **무판정**으로 간주하고 `rc≠0` 을 낸다 (도출 붕괴 은폐 방지).
2. (P-A) 각 원소에 대해 (P-B) 를 산출한다. `try` 본문의 await 경계와 `catch` 진입 경계를 **모두** 계수한다.
3. 같은 원소의 형제 fixture 에서 (P-C) 를 산출한다.
4. `(P-B) > (P-C)` 인 원소가 1건이라도 있으면 그 원소를 **`파일: 요구 N / 보유 M`** 형태로 stderr 에 열거하고 `rc≠0` 을 낸다.
5. 판정 출력은 통과 시에도 **대상별 수치**를 낸다 — 대상 수 · 요구 분해능 합 · 보유 관측 지점 합.
6. 가드를 손대지 않은 정상 트리에서 본 판정은 `rc=0` 이며 기존 테스트 파일 전수 통과를 깨지 않는다.

## 의존성

- 내부: `src/__tests__/post-unmount-emission-audit.test.ts` (판정 표면) · `src/File/FileItem.tsx` (선례 처리 — F1b·F1c) · `src/File/File.tsx` · `src/File/FileUpload.tsx` · `src/Image/ImageSelector.tsx` · `src/Comment/Comment.tsx` (관측 위치 예시이며 판정 대상 목록이 아니다 — 목록은 (P-A) 도출로만 성립한다).
- 외부: `vitest` · `@testing-library/react`.
- 역의존 (사용처): 상위 계약 `post-unmount-async-effect-emission-zero` 가 선언하는 "발화 0" 의 관측 강도를 본 계약이 받친다.

## 테스트 현황

- [x] 발화 종류에 맞는 관측기의 **존재** 판정 (G-D — `post-unmount-emission-audit.test.ts:15`, `:376`, `:591`).
- [x] `FileItem` 단일 파일의 경계별 단독 고정 (F1b·F1c — `res.json()` spy 관측).
- [ ] (P-A) 동적 도출.
- [ ] (P-B) 대비 (P-C) 대조의 rc 반영.
- [ ] catch 경계의 분해능 계수.

## 수용 기준

- [x] (Must) `npx vitest run src/__tests__/post-unmount-emission-audit.test.ts` → rc=0. (분해능 판정의 **실재 여부**는 아래 (Should) 출력 판정 항목이 계수한다 — 한 체크박스 = 한 명령 rc 규약상 연언을 분리한다.)
- [x] (Must) 대상 목록 상수에 파일 경로 하드코딩 0건 — `bash -c "grep -rnE \"src/(File|Image|Comment|Log|Search|Monitor)/[A-Za-z]+\\.tsx\" src/__tests__/post-unmount-emission-audit.test.ts | grep -vE \"^[^:]+:[0-9]+:[[:space:]]*(//|\\*)\""` → 0 lines.
- [x] (Must) `npx vitest run src/File src/Image src/Comment` → rc=0.
- [ ] (Should) 판정 출력에 대상별 수치가 나타난다 — `bash -c "npx vitest run src/__tests__/post-unmount-emission-audit.test.ts 2>&1 | grep -cE '요구[[:space:]]*[0-9]+[[:space:]]*/[[:space:]]*보유[[:space:]]*[0-9]+|required[[:space:]]*[0-9]+[[:space:]]*/[[:space:]]*have[[:space:]]*[0-9]+'" → 1 이상.

## 참고

- 소비한 followup: `20260825-0840-fileitem-unmount-guard-observations.md` (TSK-20260825-04, test-observability/medium).
- 채널 주석의 잔여 false-negative 기록(`post-unmount-emission-audit.test.ts:47-55`) 은 "문구 필터" 부류만 담고 있어 본 축이 기록되어 있지 않다. 분해능 축의 등재가 필요하다.
- 상위 계약: `post-unmount-async-effect-emission-zero` — 발화 0 자체.

### 게이트 실효 검증 이관 (RULE-07 §수용 기준 문장 규약 · RULE-06 §게이트 실효 검증)

가드별 제거 왕복은 **가정 주입 요구** 부류이므로 spec 체크박스가 아니라 구현 task 의 DoD 로 이관한다. 이관처 task 는 다음을 명기한다.

> (P-A) 도출 결과 중 최소 1건에 대해 **가드 수만큼의 방향**을 주입한다 — 각 가드를 하나씩 제거 → 매회 `rc≠0` 확인 → 원복 → `rc=0` 확인. 방향 수는 그 파일의 post-await 가드 수 (P-B) 와 같다 (`RULE-06`: "방향 수는 spec 의 검출 선언에서 계수한다").

`RULE-04` notes 에 `injection: N/N detect` 박제. **이관처 task 가 발행되지 않은 상태에서 본 절을 삭제하지 않는다** — 이관처 없는 강등은 RULE-07 이 금지한다.

### 미측정·비판정 항목

- **NFR-01 (검출력 비율 100%)** — "임의 가드 1개 제거에 대해 형제 fixture 가 rc≠0 을 내는 비율이 가드 수 대비 100%" 는 가정 주입을 요구하므로 체크박스가 아니다. 검출 방향은 위 §게이트 실효 검증 이관 절에 보존된다.
- **NFR-02 (오탐 0)** — 정상 트리 전수 통과는 `npm test` 전수 실행에 귀속되며, 본 spec 은 그 수치(70 파일 / 654 테스트)를 시점 의존 스냅샷으로 보아 체크박스로 두지 않는다. 회귀 여부는 기존 CI 채널이 판정한다.
- **기존 `check:*` 전수 rc=0** — 본 계약이 신설·수정하는 표면이 아니며 기존 게이트 채널의 소관이다.
- req 의 await 계수표(`ImageSelector` 5 · `Comment` 5 · `File` 4 · `FileItem` 4 · `FileUpload` 3, HEAD `4014c66`) 는 `grep -cE "await "` 기반 **근사치**이며 실제 가드 경계 수와 일치하지 않을 수 있다. 정확한 경계 수는 (P-B) 산출이 대신하며, 이 표는 판정 대상 목록이 아니다.
- `src/Log` · `src/Search` · `src/Monitor` 에 같은 부류가 있는지는 미측정이다 — (P-A) 의 동적 도출이 성립하면 자동으로 포함된다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-26 | REQ-20260825-013 / (본 커밋) | 최초 등록 — 다중 post-await 가드 분해능 계약 | all |
| 2026-08-26 | inspector / (본 커밋) | 수용기준 1차 판정 — audit test rc=0 실측 확인 후 `[x]`; 연언(분해능 판정 포함)은 (Should) 출력 항목으로 분리 | 수용 기준 |
| 2026-08-26 | inspector / (본 커밋) | 수용기준 2차 판정 — 하드코딩 grep 게이트 실측 0 lines (raw 1 hit = 주석, 필터 후 0) → `[x]`; 미종료 code span 종료 | 수용 기준 |
| 2026-08-26 | inspector / (본 커밋) | 수용기준 3차 판정 — `npx vitest run src/File src/Image src/Comment` 실측 rc=0 (10 files / 115 tests) → `[x]` | 수용 기준 |
