# 요약 파생 계약

> **위치**: `src/Log/api.ts` `trimmedContents` · 소비처 `LogList`(목록) · `Search`(검색 미리보기) · `LogSingle`(meta description)
> **게이트**: `src/Log/summaryBoundary.test.ts` · `src/Log/api.test.ts` · `scripts/check-summary-drift.sh`
> **최종 업데이트**: 2026-09-01 (운영자 — 요약 계약 2건 통합)

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

## 의존성

- `sanitizeHtml.ts` `ALLOWED_TAGS` — (2) 의 도출 원천.
- `markdown-rendering` — 파서 산출이 이 함수의 입력이다. 그 계약이 바뀌면 (5) 가 발동한다.

## 수용 기준

- [x] 경계 게이트 통과: `bash -c 'npx vitest run src/Log/summaryBoundary.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 요약 스위트 통과: `bash -c 'npx vitest run src/Log/api.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] drift 채널 실재: `bash -c 'test -x scripts/check-summary-drift.sh'` → rc=0

## 참고

### 통합 이력 (2026-09-01)
`stored-summary-parser-drift-measurement` 와 `summary-block-boundary-tag-derivation` 을 합쳤다. 같은 함수의 두 축이라 문서를 나눌 이유가 없었다. 게이트는 삭제하지 않았다.

### 미측정·비판정 항목
- 이미 저장된 요약의 회복(재저장·서버 일괄 재계산)은 **저장소 밖**이다. 글을 한 번 수정하면 그 글은 낫는다.
- drift 채널은 수동 실행이며 CI 에 부착돼 있지 않다.
