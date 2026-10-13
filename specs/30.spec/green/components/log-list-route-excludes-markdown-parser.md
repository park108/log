# 글 목록 경로는 마크다운 파서를 정적으로 받지 않는다

> **위치**: `src/Log/LogList.tsx` (목록 화면 — `getLogs`·`getNextLogs` 만 쓴다) · `src/Log/api.ts` (`trimmedContents` · `postLog` · `putLog`) · `src/common/markdownParser.ts` (`markdownToHtml` · `NAMED_ENTITY_TABLE`) · 렌더 경로 `src/Log/LogItem.tsx` · `src/Log/Writer.tsx` · `src/Log/LogSingle.tsx` (meta description)
> **관련 요구사항**: REQ-20261013-108 FR-01~FR-04 · NFR-01 · NFR-02 (출처: developer followup `20261013-1136-entity-table-bundle-size`, source_task TSK-20261013-05)
> **게이트**: 신설 예정(§수용 기준 `[ ]`): `scripts/check-log-list-excludes-parser.sh` (production build 산출물) · `src/__tests__/save-path-parser-load-failure.test.ts` (저장 경로 로드 실패)
> **최종 업데이트**: 2026-10-13 (inspector — 최초 등록)

> 참조 코드는 식별자 우선. 줄 번호는 HEAD=`cb354da` 스냅샷이다.

## 역할

첫 화면(`/` → `/log` → `LogList`)은 자기가 쓰지 않는 마크다운 파서와 이름 엔티티 표를 내려받지 않는다. 목록은 서버가 준 저장 요약을 그리므로 파서가 필요 없다.

**방어 대상** (`RULE-07 §주제 우선순위 2` — 기존 게이트로 검출되지 않는 silent regression): 목록 화면이 쓰지 않는 모듈이 그 화면의 정적 import 폐포로 조용히 들어오는 회귀. 화면은 그대로 뜨고 저장소에 크기 게이트가 없어 아무도 알아채지 못한다. HEAD=`cb354da` 가 그 상태다 — `api.ts` 첫 줄의 파서 import 하나로 2125 항목 표가 목록 폐포에 든다.

하지 않는 것: 엔티티 표의 내용·범위 (`markdown-rendering` 23) · 진입 청크(`index-*.js`) 구성 · 크기 수치 예산 · 표 인코딩 압축.

## 공개 인터페이스

- 없음 (산출물 계약). 판정면은 `vite build` 가 만든 청크와 그 안의 정적 import 다.

## 동작

1. **글 목록 경로의 정적 import 폐포에는 `markdownToHtml` 을 정의한 모듈이 없다** — 엔티티 표도 따라서 없다. 판정면은 production build 산출물이다: `LogList` 청크에서 청크 안 정적 import(`import … from "./x.js"` · `import "./x.js"`)를 따라간 청크 집합. 소스 import 문의 텍스트가 아니다 (`RULE-06 §게이트를 쓸 때 겪은 것` — production 이 소비하는 표면). vite 의 `__vite__mapDeps` (동적 import 선적재 목록)는 정적 폐포가 아니다.
    - 표지 문자열은 파서 소스에서 추출한다 (예: `NAMED_ENTITY_TABLE` 첫 항목 — HEAD 실측 `AElig:c6`). 추출이 비거나 경로 청크가 정확히 하나가 아니면 무판정(`exit 2`)이다.
    - 판정 입력은 **그 실행이 현 트리에서 만든 산출물**이다. 남아 있는 `build/` 를 읽으면 낡은 산출물을 판정한다.
2. **렌더 경로는 동기로 남는다.** `LogItem` (본문) · `Writer` (편집 미리보기) · `LogSingle` (meta description 의 `trimmedContents`) 청크의 정적 폐포에는 표지가 있다. 첫 렌더에서 본문이 비었다가 차는 깜빡임이 생기지 않는다. 파서를 동적 import 로 미루는 것은 이미 비동기인 저장 경로(`postLog` · `putLog`)에만 허용된다.
3. **저장 요약은 바뀌지 않는다.** `postLog`·`putLog` 가 보내는 `summary` 는 같은 입력에서 지금과 같은 문자열이다 (`summary-derivation` (4)). 요약 drift 채널(`scripts/check-summary-drift.sh`)은 `trimmedContents` 가 옮겨 가도 판정을 계속 낸다 — 그 스크립트가 각 리비전 트리에서 `trimmedContents` 를 부르는 경로(HEAD 는 `./src/Log/api.ts`)와 트리 충실성 확인 목록이 따라간다. 옮기기 전 리비전과 뒤 리비전을 한 쌍으로 재도 판정이 나와야 한다.
4. **저장 경로의 파서 로드 실패는 저장 실패다** (Should). 청크 404·오프라인으로 파서를 받지 못하면 `postLog`·`putLog` 는 실패로 호출처에 전달되고 저장 요청은 나가지 않는다. 빈 요약으로 조용히 저장되지 않는다 — `putLog` 가 `logs` 빈 배열에서 던지는 것과 같은 원칙이다.

## 의존성

- 내부: `src/Log/api.ts` · `src/common/markdownParser.ts` · `src/Log/LogItem.tsx` · `src/Log/Writer.tsx` · `src/Log/LogSingle.tsx` · `vite.config.js` (`build.outDir`) · `scripts/check-summary-drift.sh` (`:68` 충실성 목록 · `:184` import 경로).
- 계약: `summary-derivation` (4)(5)(6) — 요약 산출과 drift 채널. 그 채널의 산출 코드 동일 판정(REQ-20261013-109)은 `trimmedContents` 가 정적으로 닿는 모듈을 도출하므로 함수가 옮겨 가도 견뎌야 한다. `markdown-rendering` 23 (표의 범위). `components/log` (하위 라우트 lazy 경계).
- 발화 채널 등록: `package.json` `check:log-list-excludes-parser` 는 operator 쓰기 영역이다 (`RULE-01 §쓰기 권한`). 스크립트 착지 뒤 등록이 있어야 §수용 기준 (채널) 이 판정된다 — `b018cd7` 이 같은 순서를 밟았다.
- 역의존: 없음 (신설).

## 수용 기준

- [ ] (Must, 동작 1·2) 목록 폐포 표지 0 · 렌더 폐포 표지 있음: `bash -c 'f=scripts/check-log-list-excludes-parser.sh; test -f "$f" || exit 1; out=$(bash "$f" 2>&1); rc=$?; echo "$out" | grep -qE "^LogList .*marker=0" || exit 1; for c in LogItem Writer LogSingle; do echo "$out" | grep -qE "^$c .*marker=[1-9]" || exit 1; done; exit $rc'` → rc=0. HEAD=`cb354da` rc=1 (스크립트 부재). 스크립트는 경로 청크마다 `<청크> closure=<n> marker=<k>` 한 줄을 낸다. HEAD 실측 — §참고 표.
- [ ] (Must, RULE-07 §promote 조건 4) 발화 채널 실재: `bash -c 'test -f scripts/check-log-list-excludes-parser.sh && grep -qE "\"check:log-list-excludes-parser\"" package.json'` → rc=0. HEAD=`cb354da` rc=1.
- [x] (Must, 동작 3 — 요약 산출) 기존 요약 스위트: `bash -c 'npx vitest run src/Log/api.test.ts src/Log/summaryBoundary.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`cb354da` rc=0.
- [x] (Must, 동작 3 — drift 채널 판정) 옮기기 전 리비전과 HEAD 의 쌍이 판정된다: `bash -c 'git cat-file -e bea3a3b^{commit} || exit 2; out=$(SUMMARY_DRIFT_BASE=bea3a3b SUMMARY_DRIFT_HEAD=HEAD bash scripts/check-summary-drift.sh 2>&1); rc=$?; echo "$out" | grep -qE "diverged=[0-9]+" || exit 1; exit $rc'` → rc=0. **저장소 루트(또는 `git clone --local` 사본)가 판정 환경이다** — `git archive` 사본에는 `.git` 이 없다. HEAD=`7b66885` (src = `cb354da`) clone 사본 실측 rc=0 · `diverged=1` (엔티티 행). 지금 참인 것은 함수가 아직 옮겨 가지 않았기 때문이다 — drift 채널은 CI 에 없으므로 이 항목이 옮긴 뒤의 깨짐을 잡는 유일한 판정이다.
- [ ] (Should, 동작 4) 저장 경로 로드 실패: `bash -c 'npx vitest run src/__tests__/save-path-parser-load-failure.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0. HEAD=`cb354da` rc=1 (파일 부재). 파서 모듈 로드를 거부시키면 `postLog`·`putLog` 가 reject 하고 `fetch` 호출이 0 임을 잰다.

## 변경 이력

| 일자 | req / 커밋 | 요약 | 영향 |
|------|-----------|------|------|
| 2026-10-13 | REQ-20261013-108 / — | 최초 등록. req 가 신고의 세 후보(표 압축·표 동적 import·부분 집합) 대신 세운 축 — 표를 쓰지 않는 화면이 표를 받는 것 — 을 계약으로 옮겼다. FR-05 (표 인코딩 압축, Could) 비채택 · FR-06 (부분 집합, Won't) 은 `markdown-rendering` 23 계약 변경이라 범위 밖. HEAD=`cb354da` `git archive` 사본에서 `vite build` 후 폐포를 재현했다 (§참고) | all |

## 참고

### 실측 (HEAD=`cb354da`, `git archive` 격리 사본, `npx vite build`, gzip = Node `zlib` level 9)

| 경로 청크 | 정적 폐포 청크 수 | gzip 합 | 표지 `AElig:c6` 를 담은 청크 |
|---|---|---|---|
| `LogList` | 6 | 105,537 B | `api-*.js` |
| `LogSingle` | 7 | 107,946 B | `api-*.js` |
| `LogItem` | 8 | 117,621 B | `api-*.js` |
| `Writer` | 8 | 120,734 B | `api-*.js` |

- `api-*.js` 는 vite 보고 44.91 kB / gzip 18.18 kB 다. REQ-108 의 `e39b546` 실측(42.92 kB · `LogList` 합 104,741 B)보다 크다 — 그 사이 TSK-07·08·10 이 파서를 키웠다.
- 폐포는 청크 텍스트에서 `import\s*(?:[^"'()]*?from\s*)?["']\./([^"']+\.js)["']` 를 따라갔다. REQ-108 의 시제품(저장 경로만 `await import()`)은 `LogList` 합을 88,359 B 로 줄였고 `LogSingle` 은 +325 B 였다 — 수치는 판정 기준이 아니라 동기다.

### 계약을 뒤집는 지점 후보 (`RULE-06 §계약을 뒤집는 task` — planner 가 발행 시점에 확정)

- `trimmedContents` 를 다른 모듈로 옮기면 그것을 `./api` (또는 `../Log/api`) 에서 받는 테스트 셋의 import 경로가 바뀐다 — `src/Log/api.test.ts:12` · `src/Log/summaryBoundary.test.ts:6` · `src/__tests__/markdown-entity-reference.test.ts:4`. 동작 단언은 바뀌지 않는다. `api.ts` 가 그 이름을 다시 내보내면 경로도 바뀌지 않는다 — 단 그러면 `api.ts` 가 파서를 정적으로 다시 잡지 않는지 동작 1 이 잰다.

### 주입 이관 (`RULE-06 §게이트 실효 검증` — 동작 1 게이트를 세우는 task 의 DoD)

`RULE-07 §수용 기준 문장` 의 '가정 주입 요구' 부류라 체크박스로 두지 않는다. 이관처 task 는 미발행이다.

- **주입 (목록)**: `LogList.tsx` 에 `import { markdownToHtml } from '../common/markdownParser'` 와 그 사용 한 곳을 넣은 트리 → rc≠0 (`LogList … marker≥1`). 원복 → rc=0.
- **주입 (렌더 동기)**: `LogItem.tsx` 의 파서 import 를 동적 import 로 바꾼 트리 → rc≠0 (`LogItem … marker=0`).
- **주입 (무판정)**: 표지 추출 대상을 비운다 (존재하지 않는 경로) → rc=2.
- **대조**: 주석 안에만 그 import 문을 적은 `LogList.tsx` → rc=0. 산출물을 재므로 그래야 한다. 붉으면 게이트가 소스 텍스트를 재고 있다.

### 미측정·비판정 항목

- 목록 화면 정적 폐포의 gzip 합이 얼마나 줄어야 하는지는 계약하지 않는다 (NFR-01 — 동기이지 판정 기준이 아니다).
- 표 인코딩 압축(REQ-108 FR-05, 단건·작성기 경로 −1.5 kB gzip)은 채택하지 않았다. 목록 화면에는 어느 쪽이든 0 이고, 이득이 분리의 1/10 이다.
- 운영 환경의 실제 전송량·캐시 적중은 저장소 안에서 잴 수 없다.
