---
source_task: TSK-20260517-15
category: test-pattern
severity: low
observed_at: 2026-05-17T05:48Z
---

# URL/Location mock 헬퍼 모듈 횡단 일관성

## 관찰
TSK-20260517-15 회복 시 `src/common/common.test.ts` 에 `setLocation` / `restoreLocation` / `mockUrlLocation` 3 헬퍼 도입. `window.location` 의 read-only setter (jsdom + `string & Location` 타입 회귀) 를 흡수하는 통일 패턴.

## 관심사
- 동일 패턴이 `src/Log/**` · `src/Comment/**` · `src/Search/**` 등 다른 영역 test 에 산재할 가능성. 각 파일이 ad-hoc `delete window.location` + cast 를 반복하면 typecheck 회복 task 들이 같은 헬퍼를 재발명.
- 본 헬퍼들은 현재 `common.test.ts` 내부 모듈 한정. 공통 export 위치(예: `src/test-utils/`) 또는 spec 박제 가능.

## 후보 액션
- inspector: `30.spec/green/common/env.md` 또는 신규 mock 패턴 spec 후보 박제 검토.
- discovery: REQ 후보 — "모듈 횡단 location mock 헬퍼 단일 출처 박제".

## 박제 위치 후보
- `src/test-utils/location-mock.ts` (재사용 헬퍼).
- spec `30.spec/green/common/test-fixtures.md` 신규.
