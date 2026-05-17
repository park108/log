# Result: TSK-20260517-15 — `src/common/` typecheck island 자격 회복

## 요약
HEAD=`79d28cc` baseline 109 error / 10 file (5 카테고리: URL/Location mock 비호환, `delete` 비-optional, implicit any, possibly undefined, type cast) 회복. `src/common/` 영역 격리 `tsc --noEmit` → **0 hit** 수렴. NFR-04 baseline (우회 주석 0 hit) 유지. `src/Toaster/` 19 hit TS2769 잔존은 TSK-16 영역 — 본 task 미관여.

## 변경 파일
- `src/common/common.test.ts` (62 → 0): `stubMode` / spy 변수 / 헬퍼 (`setLocation`/`restoreLocation`/`mockUrlLocation`) 도입으로 URL→Location cast + delete 패턴 일관 흡수. cookie spy descriptor non-null assertion. `Array.filter`/`map` 콜백 인자 타입 명시.
- `src/common/common.ts` (11 → 0): `setMetaDescription` 을 `querySelector('meta[name="description"]')` 로 재설계 (비표준 named-item 접근 제거). `getCookie` 의 `matches[1]` undefined guard 추가. `getFormattedSize` 의 `scaled` 변수를 `number` 로 통일 (`Number(.toFixed())` 재변환).
- `src/common/ErrorBoundary.test.tsx` (9 → 0): `Bomb` props 타입 명시. spy 변수에 `MockInstance` 타입. `mock.calls[0]!` non-null assertion. `capturedReset` 옵셔널 + `!` 활성.
- `src/common/Navigation.test.tsx` (8 → 0): `stubMode` 타입. `link!`/`anchor!.parentNode as HTMLElement | null`/`li!.getAttribute` non-null narrow.
- `src/common/UserLogin.test.tsx` (6 → 0): `setEnv(dev, prod)` 타입. `originalLocation: Location`. `delete window.location` 대신 `(window as unknown as { location?: Location }).location` cast 패턴.
- `src/common/a11y.audit.test.ts` (6 → 0): `collectProductionJsx` / `findOpeningTagRange` / `toRepoRel` / `isExempt` 매개변수·반환 타입 명시. `Violation` 타입 alias. `lines[i] ?? ''` 등 noUncheckedIndexedAccess narrow.
- `src/common/UserLogin.tsx` (3 → 0): `handleLoginClick` 매개변수를 `{ preventDefault: () => void }` 구조적 부분 타입으로 축소 (`onClick`/`activateOnKey` 양쪽 호환). `getLogoutUrl()` / `getLoginUrl()` 결과 `string | undefined` narrow 후 `window.location.href` 할당.
- `src/common/markdownParser.ts` (2 → 0): `top()` 반환 `number` 명시 + non-null assertion (호출처 `depthStack.length > 0` 분기 박제).
- `src/common/useHoverPopup.ts` (1 → 0): `contentProps: ContentProps` 명시 (`role: 'tooltip'` literal 추론 보장).
- `src/common/ErrorBoundary.tsx` (1 → 0): 클래스 정적 `propTypes` 할당을 `(ErrorBoundary as unknown as { propTypes: object }).propTypes = ...` cast 로 흡수 (TypeScript 가 React.Component 정적 형상에 `propTypes` 키를 박제하지 않음).
- `src/common/useHoverPopup.test.tsx` (0 → 0, +1 → 0): `useHoverPopup.ts` 의 `ContentProps` 타입 명시로 인해 노출된 `probe.mock.calls[0]` undefined guard 추가 (`!` non-null).

회복 수단 분포 (spec §동작 5 박제 4 카테고리):
- 카테고리 (a) URL/Location mock: 헬퍼 3종 (`setLocation`/`restoreLocation`/`mockUrlLocation`) 단일 패턴으로 흡수.
- 카테고리 (b) `delete` operator: `(window as unknown as { location?: Location }).location` cast 일관 적용.
- 카테고리 (c) implicit any: 함수 매개변수 / 변수 / 반환 타입 명시.
- 카테고리 (d) possibly undefined: non-null assertion (`!`) + `?? ''` narrow 혼합.

## 커밋
`964f294` — `fix: src/common/ type-safe island DoD — error TS 0 hit 수렴`.

## 테스트 결과
- `npx tsc --noEmit 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → **0** (baseline 109 → 0, I2 marker flip).
- `npm test src/common -- --run` → **14 Test Files / 184 Tests PASS** (회귀 0).
- `npm run lint` → **0 error**.
- `npm run build` → **PASS** (`✓ built in 353ms`).

전체 `npx tsc --noEmit` exit=2 — Toaster 19 hit TS2769 잔존 (TSK-16 영역). 본 task 회복 후 common 분포 0 / 전체 분포는 TSK-16 동반 머지 시 exit=0 도래 (chain 진입 — I3 회수 대기).

## DoD 점검
- [x] (G2 유지) `find src/common \( -name "*.jsx" -o -name "*.js" \) ! -name "*.d.ts"` → **0 hit**.
- [x] (G4 회복) `npx tsc --noEmit 2>&1 | grep -E "^src/common/" | grep -cE "error TS"` → **0 hit** (109 → 0).
- [x] (G6 부분 회복) `npx tsc --noEmit 2>&1 | grep -oE "error TS[0-9]+" | sort | uniq -c` → common 0, 전체 잔존 = `19 error TS2769` (Toaster, TSK-16 회수 대기).
- [x] (G8 유지) `grep -rn "@ts-expect-error\|@ts-ignore" src/Toaster src/common` → **0 hit**.
- [x] `npm test src/common` → 14 file / 184 test PASS.
- [x] `npm run lint` → 0 error.
- [x] 수동 검증: PR diff 에 `@ts-expect-error` / `@ts-ignore` 0 추가 (NFR-04 자기 검증).

## 관찰 이슈 / 후속
- **URL/Location mock 헬퍼 모듈 횡단 패턴**: 본 task 도입한 `setLocation`/`restoreLocation`/`mockUrlLocation` 3 헬퍼는 `src/common/common.test.ts` 한정 박제. 동일 패턴이 `src/Log/**` · `src/Comment/**` 등 다른 영역 test 에 회귀할 가능성 — inspector 가 `spec common/env.md` 또는 신규 mock 패턴 spec 박제 후보로 검토 권고. → followups 스텁 생성.
- **`ErrorBoundary.propTypes` cast 흡수 정합**: React.Component 정적 형상에 PropTypes 키가 없어 cast 가 필요. 장기적으로는 PropTypes 의존 제거 (TypeScript 타입으로 대체) 가 정합 — REQ 후보. → followups 스텁 생성.
- **`useHoverPopup.test.tsx` 신규 노출 error**: `ContentProps` literal 좁힘 시 `probe.mock.calls[0]` 의 `noUncheckedIndexedAccess` 가 새로 노출됨 (`!` 로 흡수). 향후 strict 평가 시 `vitest` mock generic 추론 정밀화 spec 후보. → followups 스텁 생성.

## RULE-06 스코프 정합
- expansion: 불허 (`src/common/` 디렉터리 한정).
- 변경 파일 11개 모두 `src/common/` 내부 (`useHoverPopup.test.tsx` 포함 — baseline 0 → 0 유지 + 1 신규 노출 0 회복).
- `src/Toaster/` · `src/Log/` · `src/Monitor/` 등 scope 밖 무변경 확인.
