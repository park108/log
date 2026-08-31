# 인증 진입점 계약

> **위치**: `src/common/UserLogin.tsx` · `src/common/common.ts`(`getUrl` · `auth`)
> **게이트**: `src/common/UserLogin.test.tsx` · `src/common/auth-url-cleanup.test.ts` · `src/__tests__/ambient-auth-render-determinism.test.ts`
> **최종 업데이트**: 2026-09-01 (운영자 — 인증 계약 2건 통합)

## 역할

사용자가 직접 밟는 **인증 진입점(로그인·로그아웃)의 리디렉트 URL 도출은 총함수**이며, 도출이 실패하면 그 실패가 **최종 사용자에게 관측된다.**

**방어 대상**: 버튼이 눌렸는데 아무 일도 일어나지 않는 상태가 정상 동작으로 취급되는 것. 이 실패는 로그에만 남고 화면에는 남지 않으므로 **아무도 신고하지 않는다** — 사용자는 자기가 잘못 눌렀다고 생각한다.

## 동작

1. **도출은 총함수다.** 모든 런타임 환경 상태에서 문자열을 반환하거나 **명시적으로 실패**한다. 정의되지 않은 값이 문자열 연결을 거쳐 URL 로 승격되는 경로가 없다.

2. **판정 대상은 도출한다.** 선언 키를 열거하지 않고 실제 참조에서 산출한다 — 열거는 나중에 추가된 키를 스캔 밖에 숨긴다.

3. **실패는 렌더 결과에서 성공 갈래와 구별된다.** 그 구별이 **접근성 트리에 도달**한다 — 색 변화 같은 시각 전용 신호는 충족이 아니다.

4. **실패 상태에서 진입점이 활성으로 남지 않는다.** 누를 수 있는 버튼이 아무 일도 하지 않으면 사용자는 자기 조작을 의심한다 (오귀인).

5. **부재 단언과 존재 단언은 같은 문자열을 담는다.** 따라서 정적 grep 만으로는 표면 유무가 구별되지 않는다 — 이 축의 판정은 **렌더 결과**로 한다.

6. **인증 토큰은 주소창에 남지 않는다.** 리디렉트로 돌아온 뒤 URL 의 토큰 파라미터가 제거되고 다른 값은 보존된다.

## 의존성

- `common.getUrl()` — 오리진 도출. `document-head` 계약의 사이트맵 오리진과 같은 출처다.
- **관리자 여부가 URL 파라미터로 주장되는 축은 본 계약 밖이다** — 서버 쪽 결정이며 저장소 안에서 닫히지 않는다.

## 수용 기준

- [x] 로그인 진입점 스위트: `bash -c 'npx vitest run src/common/UserLogin.test.tsx --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 토큰 정리: `bash -c 'npx vitest run src/common/auth-url-cleanup.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 렌더 결정성: `bash -c 'npx vitest run src/__tests__/ambient-auth-render-determinism.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0
- [x] 실패 표면 실재: `bash -c 'grep -qE "aria-disabled=|role=\"alert\"|<Toaster" src/common/UserLogin.tsx'` → rc=0

## 참고

### 통합 이력 (2026-09-01)
`auth-redirect-url-totality-and-observable-failure`(212줄) 와 `auth-entry-failure-user-observable-surface`(129줄) 를 합쳤다. 도출의 총함수성과 실패의 관측 가능성은 한 명제의 두 면이라 나눌 이유가 없었다. 게이트는 삭제하지 않았다.
