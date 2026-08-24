# test 환경 `QueryClient` defaultOptions 단일 출처 정합 — `src/test-utils/queryWrapper.tsx` helper 경유 single-source axis × prod-test 옵션 토큰 분리 박제

> **위치**: `src/test-utils/queryWrapper.tsx` 의 `createQueryTestWrapper` (보조 라인: `:17`) + 측정 scope `src/**/*.test.{js,jsx,ts,tsx}`
> **관련 요구사항**: REQ-20260519-001
> **최종 업데이트**: 2026-08-24 (수동 — 운영자: 자동 게이트 도입 + 마커 회수 + green→blue promote)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 baseline HEAD `3649298` 스냅샷.

## 역할
test 환경 (`src/**/*.test.{js,jsx,ts,tsx}` 파일) 의 `@tanstack/react-query` `QueryClient` 인스턴스화는 **`src/test-utils/queryWrapper.tsx` 의 `createQueryTestWrapper` 단일 helper 경유** 라는 결과 효능을 박제하고, **prod 채널 옵션 토큰 (`staleTime: 60_000, retry: 1`) ↔ test 채널 옵션 토큰 (`retry: false, staleTime: 0, gcTime: 0` + `mutations: { retry: false }`) 의 분리 보존** 을 박제한다. 의도적으로 하지 않는 것 — (a) 옵션 토큰 값 자체의 정책 변경 (prod / test 양면 별 axis), (b) `QueryClientProvider` 마운트 위치, (c) per-test 인스턴스 갯수 정책 (1 vs N), (d) 메이저 bump 마이그레이션 task 발행.

## 공개 인터페이스
- 측정 scope: `src/**/*.test.{js,jsx,ts,tsx}` 파일 + `src/test-utils/queryWrapper.tsx` helper.
- 단일 출처 식별자: `createQueryTestWrapper` (export from `src/test-utils/queryWrapper.tsx`).
- 옵션 토큰 박제 위치: `src/test-utils/queryWrapper.tsx:17-22` (test 채널) + `src/App.jsx:20-24` (prod 채널).

## 동작
- (D-1) test 채널 `QueryClient` 인스턴스가 필요한 파일은 `createQueryTestWrapper` import + 호출로 인스턴스 획득. 직접 `new QueryClient(...)` 호출은 박제된 면제 목록의 파일을 제외하고 금지.
- (D-2) helper `src/test-utils/queryWrapper.tsx` 가 `new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 }, mutations: { retry: false } } })` 1+ 호출 박제. 옵션 토큰 변경은 본 1 지점 갱신으로 consumer 자동 추종.
- (D-3) prod 채널 (`src/App.jsx` root level 1 인스턴스) 의 옵션 토큰 (`staleTime: 60_000, retry: 1`) 은 test 채널 옵션 토큰과 분리. prod 옵션 토큰 grep 이 test 파일에서 매치 0 + test 옵션 토큰 grep 이 prod 진입점에서 매치 0.
- (D-4) 면제 박제 — 본 spec 본문 §스코프 규칙 영역에 helper 미경유 면제 파일 경로 + 면제 사유 명시. 면제 박제 미사용 시 측정 상한 = 0.
- (D-5) 시점 비의존 — react-query 메이저 bump (v5.99 → v6) · `gcTime` deprecation · `mutations` 시그니처 변경 · vitest 메이저 bump 어떤 이벤트 직후에도 동일 측정 결과 효능 유지 또는 본 spec 갱신.

## 스코프 규칙
- **expansion**: N/A (본 spec 자체는 grep 게이트를 발행하지 않음 — 측정 채널은 회수 task 가 위임받음. baseline 박제 한정).
- **grep-baseline** (HEAD `3649298`, 2026-05-19 실측):
  - `grep -rnE "new QueryClient\(" src --include="*.test.*"` → 4 hits in 4 files:
    - `src/Search/Search.test.tsx:30` (인라인 호출 — 모듈 최상위 `const queryClient`)
    - `src/Log/LogSingle.test.jsx:31` (`makeQueryClient` 인라인 함수)
    - `src/Log/LogItem.test.jsx:31` (`makeQueryClient` 인라인 함수)
    - `src/Log/Writer.test.jsx:22` (`makeQueryClient` 인라인 함수)
  - `grep -nE "new QueryClient\(" src/test-utils/queryWrapper.tsx` → 1 hit:
    - `src/test-utils/queryWrapper.tsx:17` (`const queryClient = new QueryClient({`)
  - `grep -rcE "createQueryTestWrapper\(" src --include="*.test.*" | grep -v ":0$"` → 6 files (총 호출 18 — req 본문 21+ 명목 대비 실측 18 가벼운 격차, ≥ 합산 정합):
    - `src/Search/hooks/useSearchList.test.ts:4`
    - `src/Log/hooks/useCreateLog.test.js:3`
    - `src/Log/hooks/useUpdateLog.test.js:3`
    - `src/Log/hooks/useLog.test.js:2`
    - `src/Log/hooks/useDeleteLog.test.js:3`
    - `src/Log/hooks/useLogList.test.js:3`
  - `grep -nE "staleTime: 60_000, retry: 1" src/App.jsx` → 1 hit:
    - `src/App.jsx:22` (prod 채널 토큰 1 인스턴스)
- **면제 박제 (현 baseline 시점 — 본 spec 진입 baseline)**: 4 violator 중 면제 박제 0. 측정 상한 = 0 (회수 task 완료 후 baseline).
- **rationale**: baseline 박제는 본 spec 진입 시 violator / consumer / helper / prod 토큰 4 표면 동시 박제로 후속 task 회수 시점의 ack 측정 기준선 고정. expansion N/A 인 이유는 본 spec 이 grep 게이트 자체를 발행하지 않고 결과 효능 양면 (helper 단일 출처 + prod-test 분리) 만 박제 — 게이트는 회수 task 가 §검증/DoD 에 박제.

## 의존성
- 내부: `src/test-utils/queryWrapper.tsx` (helper 단일 출처) + `src/App.jsx` (prod 채널 1 인스턴스) + `src/**/*.test.{js,jsx,ts,tsx}` (consumer + violator).
- 외부: `@tanstack/react-query` (v5.99.0 — `package.json:6`) + `vitest` (test runner) + `react` (`QueryClientProvider` HOC consumer).
- 역의존 (사용처): `30.spec/blue/components/app.md:45` (prod 채널 옵션 토큰 박제 — 본 spec 보완) + `30.spec/blue/components/app.md:93` (G5 자기 검증 `QueryClient` 기본값 면제 박제 — test 채널 면제 박제 0 영역 본 spec 보완) + `30.spec/green/testing/runtime-fetch-unmount-safety.md` (QueryClient consumer unmount 안전성 axis 직교) + 인접 single-source axis (REQ-20260518-029 `vitest-globals-tri-channel-coherence` + `30.spec/green/foundation/vitest-setupfiles-token-disk-coherence.md` — test 인프라 single-source 카테고리 직교 보완).

## 테스트 현황
- [x] 자동 게이트 (예: `scripts/check-queryclient-single-source.sh` 또는 fixture test) 도입 — 별 task 위임 (수단 중립, 회수 시점 박제). — **회수**: `src/__tests__/react-query-test-queryclient-single-source.test.ts` (7 `it`).
- [x] inspector audit 채널 / pre-push hook / CI step 선정 — 수단 위임. — **회수**: `npm test` (CI `Test` step) 발화.

## 수용 기준
- [x] (Must) **FR-01** — `src/**/*.test.{js,jsx,ts,tsx}` 파일 본문에서 `new QueryClient(` 호출 hit ≤ 박제된 면제 상한 (현 baseline 4 hit — 회수 후 0 hit 또는 면제 박제). 측정: `grep -rnE "new QueryClient\(" src --include="*.test.*" | wc -l` ≤ spec 박제 상한. **PASS — HEAD `9dde28d` 재실측 0 hit (baseline 4 → 0, 면제 박제 0 / 상한 0 정합).**
- [x] (Must) **FR-02** — `src/test-utils/queryWrapper.tsx` 가 test 채널 `QueryClient` defaultOptions 의 단일 출처. 측정: `grep -nE "new QueryClient\(" src/test-utils/queryWrapper.tsx` → 1+ hit + `grep -rnE "createQueryTestWrapper" src --include="*.test.*"` → 1+ hit. **PASS — HEAD `9dde28d` 재실측 helper 1 hit @`:17` + consumer 10 file (Search 1 + Search hooks 1 + Log 3 + Log hooks 5, baseline 6 → 10 진보).**
- [x] (Must) **FR-03** — prod 채널 옵션 토큰 (`staleTime: 60_000, retry: 1`) 이 test 채널 옵션 토큰과 분리. 측정: `grep -nE "staleTime: 60_000" src/App.jsx` → 1+ hit + `grep -rnE "staleTime: 60_000" src --include="*.test.*"` → 0 hit. **PASS — HEAD `9dde28d` 재실측 App.jsx 1 hit @`:22` + test 0 hit.**
- [x] (Must) **FR-04** — test 채널 옵션 토큰 (`retry: false`, `staleTime: 0`, `gcTime: 0`, `mutations: { retry: false }`) 이 prod 채널 옵션 토큰과 분리. 측정: `grep -rnE "retry: false|staleTime: 0|gcTime: 0" src/App.jsx` → 0 hit + `grep -nE "retry: false|staleTime: 0|gcTime: 0" src/test-utils/queryWrapper.tsx` → 3+ hit. **PASS — HEAD `9dde28d` 재실측 App.jsx 0 hit + helper 3 hit @`:19-20` (queries + mutations 분리 박제).**
- [x] (Must) **FR-05** — 현 baseline 위반 4 violator 박제 (회수는 task 영역). baseline: `src/Search/Search.test.tsx:30` + `src/Log/LogSingle.test.jsx:31` + `src/Log/Writer.test.jsx:22` + `src/Log/LogItem.test.jsx:31`. — **측정**: baseline 4 violator 는 `9dde28d` 에서 회수 완료. 현재 `new QueryClient(` 발화는 `src/test-utils/queryWrapper.tsx` 1곳뿐이며 테스트 파일 직접 생성 **0**.
- [x] (Should) **FR-06** — helper consumer baseline 박제 (6 파일 18 호출). 측정 PASS — baseline 실측 (HEAD `3649298`) 6 파일 hit (Search hooks 1 + Log hooks 5).
- [x] (Should) **FR-07** — 면제 박제 옵션 (별 axis 분리 시). 본 spec 진입 baseline 면제 박제 0 → FR-01 상한 = 0. — **측정**: 면제 목록 `EXEMPTIONS = []` → FR-01 상한 0.
- [x] (Must) **FR-09** — 스코프 경계 명시 — 본 효능은 `src/**/*.test.{js,jsx,ts,tsx}` + `src/test-utils/queryWrapper.tsx` 한정. `src/__tests__/*.ts` (도구 매트릭스 fixture) 직교. — **측정**: 게이트가 `src/__tests__/**` 를 scope 에서 제외하며 그 사실을 단언한다.

## 비기능 요구사항
- **NFR-01** 측정 결정론 — FR-01~FR-04 측정 grep 동일 HEAD 동일 hit count.
- **NFR-02** 게이트 메타성 — 단일 grep + 단일 보조 grep 의 hit count 비교로 검증 가능.
- **NFR-04** 우회 정책 회피 — `vi.mock('@tanstack/react-query', ...)` 우회로 형식 충족 시 NFR-04 위반.
- **NFR-05** 외부 비파괴 — prod 채널 옵션 토큰 / `QueryClientProvider` 마운트 / `react-query` 메이저 / `tsconfig.json` strict / 컴포넌트 props 시그니처 변경 0.
- **NFR-06** 시점 비의존 — react-query · vitest 메이저 bump · `gcTime` deprecation 직후 동일 효능 유지 또는 본 spec 갱신.
- **NFR-07** RULE-07 양성 기준 — 본 spec 은 평서문 시스템 효능 선언 + 반복 grep 검증 가능 + 시점 비의존 + incident patch 귀속 0.

## 변경 이력
| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-05-19 | (none) / 127차 inspector tick (HEAD baseline `3649298`) | 최초 등록 — REQ-20260519-001 흡수, test 환경 QueryClient single-source axis + prod-test 토큰 분리 박제, baseline 4 violator + 1 helper + 6 consumer + 1 prod 박제. FR-06 [x] (현 baseline PASS), 9 marker [ ] (회수/별 task 위임). NFR-03 + FR-08 [deferred] (수단 위임). | all |
| 2026-05-19 | TSK (react-query-test-queryclient-single-source-recovery) / `9dde28d` | 회수 hook-ack — 4 Must marker (FR-01~FR-04) [x] flip. HEAD `9dde28d` 재실측: `new QueryClient(` in tests = 0 hit (baseline 4 → 0), helper 1 hit + consumer 10 file (baseline 6 → 10), App prod token 1 hit + test 0 hit, App test token 0 hit + helper 3 hit. DoD (result.md): lint warning 0 + typecheck rc=0 + 전체 57 file 500 case PASS (coverage Statements 97.54% / Branches 94.07% / Functions 94.37% / Lines 98.31%) + build PASS (290ms) + 회귀 0. NFR-04 우회 `vi.mock('@tanstack/react-query')` 0 hit 정합. FR-05 (baseline violator 박제) 는 이력 marker 라 flip 무관 — `[ ]` 유지. FR-07~FR-10 + NFR-03 (자동 게이트 / 수단 위임 / 시점 비의존) 는 별 task 영역 — `[ ]` 유지. | 수용 기준, 헤더 일자 |
| 2026-08-24 | (수동 — 운영자) / 본 변경 | 마커 회수 + 자동 게이트 도입. FR-05 의 4 violator 는 `9dde28d` 에서 이미 회수됐고 baseline 만 stale 이었다. `src/__tests__/react-query-test-queryclient-single-source.test.ts` 신설 (7 `it`, 위반 주입 검출 확인). FR-05·FR-07·FR-08·FR-09 + 자동 게이트 2항목 flip, FR-10 §참고 강등. green→blue promote. | §테스트 현황 / §수용 기준 / §참고 |

## 참고

### deferred (blue 승격 시 강등)

> `[deferred]` 는 green 전용 상태다. blue 는 baseline 이므로 미결 태그를 갖지 않는다 (RULE-07 §promote).

- (Must) **FR-08** — 수단 라벨 금지 (RULE-07 정합) — 회수 수단에 "기본값" / "권장" / "우선" / "default" / "best practice" / "먼저" 라벨 부여 금지. 본 spec 본문 자기 검증: `awk '/^## 역할/,/^## 의존성/' specs/30.spec/blue/testing/react-query-test-queryclient-default-options-single-source-coherence.md | grep -cE "기본값|권장|우선|default|best practice|먼저"` → 0 hit. **[deferred: 자기 진단 자체는 `npm run check:spec-coherence` 같은 자동 게이트 부착 시 채널 박제 — 별 task 위임]**. — **측정**: 본 spec §역할~§의존성 수단 라벨 0 hit.
- **NFR-03** 회귀 fixture 도입 비용 — **[deferred: 신규 자동 게이트 (fixture test 또는 `scripts/check-*.sh`) 도입 + 수단 중립 — 별 task 위임]**.


### 미측정·비판정 항목 (RULE-07 §수용 기준 문장 규약)

- (Must) **FR-10** — 시점 비의존 — `@tanstack/react-query` 메이저 bump · `gcTime` deprecation · `mutations` 시그니처 변경 · vitest 메이저 bump 등 어떤 이벤트 직후에도 동일 측정 결과 효능 유지 또는 본 spec 갱신.

### 게이트 설계 메모

스캔형 게이트는 대상이 0건이어도 통과한다 (vacuous PASS). 경로 필터가 잘못되면 아무것도 검사하지 않으면서 초록이 된다 — 그래서 스캔 대상 테스트 파일 수가 20을 넘는지 함께 단언한다.

헬퍼 검사는 파일 존재가 아니라 **값**을 본다. `retry` 가 켜지면 목 실패가 재시도로 번지고, `staleTime`/`gcTime` 이 0 이 아니면 캐시가 테스트 사이에 남는다. 또 `new QueryClient` 가 팩토리 함수 안에 있는지도 확인한다 — 모듈 스코프의 단일 인스턴스는 파일 간 캐시를 공유한다.

위반 주입(테스트 파일에서 `new QueryClient({})`)으로 `1 failed / 6 passed` 검출 확인.
