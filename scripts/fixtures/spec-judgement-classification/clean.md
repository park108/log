# Fixture: 판정 항목 분류 채널 — 정상 상태

> 이 문서는 `scripts/check-spec-judgement-classification.sh` 의 주입·대조 대상이다.
> 실 spec 이 아니며 `specs/**` 아래 있지 않다. seam
> `SPEC_CLASSIFICATION_SCAN_ROOT` 가 이 디렉터리를 가리킬 때만 모집단에 든다.

## 역할

세 산출(`정적 미선언` · `이름-실행 불일치` · `창 미확인`)이 전부 0 인 상태를 고정한다.
아래 §참고 의 산문은 판정 구획 밖이므로 계수되지 않아야 한다.

## 테스트 현황

- [x] (F1 정적 선언) 선언 토큰을 단 정적 판정 항이다 — **정적 불변식**: `bash -c 'test -f package.json'` → rc=0.
- [x] (F2 실행 채널) 실행으로 분류돼야 하는 항이다: `bash -c 'npx vitest run src/common/markdownParser.test.ts --coverage.enabled=false >/dev/null 2>&1'` → rc=0.
- [x] (F3 도출형 이름-실행) 실행 인자를 도출해 넘긴다 (구조적 정합 — 계수 면제, 모집단 잔존): `bash -c 'set -- $(grep -rl "빈 줄 술어는 파서 안에 하나뿐이다" src); npx vitest run "$@" --coverage.enabled=false >/dev/null 2>&1'` → rc=0.
- [x] (F4 실행 창) 창을 좁혔고 **실행 창 확인** 선언을 단다: `bash -c 'npx vitest run src/common/markdownParser.test.ts -t "빈 줄 술어는 파서 안에 하나뿐이다" --coverage.enabled=false >/dev/null 2>&1'` → rc=0.

## 수용 기준

- [x] (F5 정적 선언) 두 번째 정적 항 — **정적 불변식**: `grep -qE "\"name\"" package.json` → rc=0.

## 참고

판정 구획 밖 산문이다. 아래 표기는 명령처럼 생겼으나 `## 역할` · `## 참고` 는
판정 구획이 아니므로 세 수치 어디에도 들어가지 않아야 한다:
`bash -c 'npx vitest run src/common/markdownParser.test.ts -t "아무 이름"'`.
