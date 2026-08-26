# global-state-restoration 주입 픽스처

`scripts/check-global-state-restoration.sh` (spec: `testing/test-global-state-restoration-order-independence`
§동작 (FR-04)(NFR-02)) 의 민감도·특이도 검증용 격리 픽스처. 주입 왕복이 `src/**` 나 실
게이트 스크립트를 건드리지 않고 여기서 완결되도록 둔다 (`RULE-02 §교차 작업 파괴`).

## 파일명 규약 — `*.testcase.js` (`*.test.js` 금지)

`vite.config.js` 의 `test` 블록에 `include` override 가 없어 vitest **기본 include**
(`**/*.{test,spec}.?(c|m)[jt]s?(x)`) 가 적용된다. 즉 `scripts/fixtures/**/*.test.js` 는 실제
테스트로 수집돼 `npm test` 안에서 실행되고, 위반을 담은 픽스처가 스위트를 붉게 만든다.
`.testcase.` 는 `.test.` 세그먼트를 만들지 않으므로 수집 모집단 밖이다.

실측: `find src -name '*.test.*'` = 73 이나 vitest 집계는 74 files — 기본 include 가 `src`
밖 1건(루트 `vite.config.test.js`)까지 수집한다는 직접 증거다.

## 겨누는 법

```bash
GLOBAL_RESTORE_SCAN_ROOT=scripts/fixtures/global-state-restoration/<case> \
GLOBAL_RESTORE_FILE_GLOB='*.testcase.*' \
bash scripts/check-global-state-restoration.sh
```

| 케이스 | 성질 | 기대 rc |
|---|---|---|
| `clean/` | 프로퍼티 2개 전부 훅 등록 복원 | 0 (음성 대조) |
| `missing-prop/` | 2개 중 1개만 복원 — 부분 퇴행 | 1 (§동작 4 방향) |
| `body-call-only/` | 복원 호출이 `it` 본문에만 존재 | 1 (§동작 5 / NFR-02 방향) |
| `no-target/` | `Object.defineProperty` 없음 | 2 (무판정) |

## 표기 대표성 (`RULE-06 §fixture 대표성`)

실코드(`src/**`)는 **탭** 들여쓰기를 쓰고 옵션 객체를 같은 줄과 다음 줄 양쪽에 둔다.
픽스처는 **스페이스 2칸** 들여쓰기로 두고, 파일마다 인자 컬럼 위치를 실코드와 달리 섞는다.
들여쓰기 변형만 있는 픽스처는 컬럼 위치에 민감한 정규식 결함을 보지 못한다.
