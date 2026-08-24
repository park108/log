# coverage-attribution 픽스처

`scripts/check-coverage-attribution-monotonicity.sh` 의 **(M2) 대조 모드** 회귀 기준.
`coverage-final.json` 의 표기 변형을 담은 고정 입력이며, vitest 를 구동하지 않고
판정 코어만 왕복시킬 수 있다.

## 파일

| 파일 | 역할 |
|------|------|
| `full.json` | 현 HEAD(istanbul) 체제의 건강한 전수 산출물 표본 |
| `subset.json` | `full.json` 에 포함되는 정상 부분집합 (covered 슬롯 7개) |
| `full-v8-regression.json` | 구 v8 체제의 전수 산출물 — `Toaster.tsx` `0.1 / 2.1 / 3.1 / 4.0` 이 0 으로 소실된 실제 결함 형태 |
| `subset-empty.json` | 전 슬롯 `count: 0` 인 공허 산출물 |

## 기대 rc

```
# 정상 — rc=0
bash scripts/check-coverage-attribution-monotonicity.sh \
  --full scripts/fixtures/coverage-attribution/full.json \
  --subset scripts/fixtures/coverage-attribution/subset.json

# 단조성 위반 (구 v8 4 슬롯 소실 재현) — rc=1 + 위반 파일 경로 stdout
bash scripts/check-coverage-attribution-monotonicity.sh \
  --full scripts/fixtures/coverage-attribution/full-v8-regression.json \
  --subset scripts/fixtures/coverage-attribution/subset.json

# 공허 산출물 — rc=3 (부분집합 covered 0 은 포함 관계를 자동 만족하므로 별도 차단)
bash scripts/check-coverage-attribution-monotonicity.sh \
  --full scripts/fixtures/coverage-attribution/full.json \
  --subset scripts/fixtures/coverage-attribution/subset-empty.json
```

## 담고 있는 표기 변형

- **(a) 절대 경로 키** — 전 파일 키가 절대 경로다. 접두사는 머신 비의존 합성값(`/repo/`)이며
  `full`/`subset` 양쪽이 동일하므로 정규화 없이도 정합한다.
- **(b) 슬롯 3개 이상인 branchId** — `markdownParser.ts` `b["0"]` 은 슬롯 4개 (`switch`).
- **(c) 0 슬롯과 양수 슬롯 혼재** — `Toaster.tsx` `b["4"] = [6, 0]`, `markdownParser.ts` `b["0"] = [12, 0, 5, 9]`.
- **(d) 전 슬롯 0 인 공허 파일** — `useSearchList.ts` 는 `full`/`subset` 양쪽에서 전 슬롯 0 이다.
  파일 단위 공허가 전체 판정을 공허로 만들지 않음을 보인다 (`subset.json` 총 covered 7 > 0).
