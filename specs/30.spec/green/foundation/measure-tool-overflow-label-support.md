# 측정 도구의 넘침 라벨은 `overflow` 계산값이 뒷받침하는 것만 말한다

> **위치**: `scripts/measure-layout.mjs` — 넘침 판정 (`:112` `clipped`) · 수집 (`:121` `overflowX`) · 라벨 인쇄 (`:228` `← 잘림`) · 노드 스타일 출력 (`:229-233`). 발화 채널: **현재 부재** (`package.json` `check:*` 17건 중 0 · 테스트 0건).
> **관련 요구사항**: REQ-20260831-075 FR-01~FR-06 · NFR-01~NFR-04 (출처: 운영자 결함 신고 `20260831-0937-measure-tool-clipped-label-overstates.md`)
> **최종 업데이트**: 2026-08-31 (by inspector 254차 tick — 최초 박제, HEAD=`af42803`)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷이다.

## 역할

`scripts/measure-layout.mjs` 의 넘침 라벨은 **`overflow` 계산값이 뒷받침하는 결론만** 말한다. 내용이 상자보다 크다는 사실 하나로 *"잘림"* 을 단정하지 않는다 — `overflow-x: auto` 면 스크롤로 도달 가능하고 `visible` 이면 상자 밖에 그려진다. 그리고 가로·세로는 분리해 판정하며, 판정 근거값을 사람이 읽는 출력에 함께 싣는다.

**방어 대상 (`RULE-07 §주제 우선순위 2`)**: **측정 도구가 없는 결함을 단정해 파이프라인에 거짓 입력을 넣는 것.** 이 도구의 출력은 `RULE-05 §결함 신고` 가 연 운영자 입구의 **입력**이다. 도구가 정상 상태에 `잘림` 을 붙이면 파이프라인은 존재하지 않는 req 를 만든다. **실제로 그 직전까지 갔다** — 운영자가 이 라벨을 믿고 신고할 뻔했고 CSS 를 직접 열어보고 멈췄다. 도구 자신의 머리 주석이 선언한 목적(*"멀쩡한 것을 고치지 않은 것도 이 도구의 성과다"*)이 이 축에서 뒤집혀 있다.

이 결함이 침묵하는 이유는 **이 도구에 감시자가 하나도 없기 때문**이다 — 대상 테스트 0건, `check:*` 17건 중 0건. `src/__tests__/hover-popup-anchoring.test.tsx` 는 그 상태를 평서로 적어 두었다: *"측정(`scripts/measure-layout.mjs`)의 몫이고 CI 에 없다."*

**의도적으로 하지 않는 것**:

- **레이아웃(CSS) 변경.** `src/styles/typography.css:73` 의 `overflow-x: auto` 는 정상이며 본 계약은 그것을 바꾸지 않는다. 도구는 read-only 다 (FR-06 Won't).
- 다른 측정 축(`glyph` · `box` · `--overflow` 목록)의 의미 변경, 새 측정 기능(스크린샷 · 뷰포트 스윕).
- 도구가 쓰는 브라우저 자동화 계층의 교체.

## 공개 인터페이스

- `node scripts/measure-layout.mjs <파일경로|URL> [--width …] [--select "…"] [--overflow]` — **CLI 시그니처 무변경**. 계약면은 **stdout 텍스트**다.
- 노드 출력 줄에 판정 근거값이 추가된다 (`overflowX` · `overflowY`). 기존 줄의 형식은 바뀌지 않는다 (NFR-04).

## 동작

1. **(I1) 라벨은 `overflow` 계산값에 따라 갈린다** (FR-01): `hidden`·`clip` 이면 **내용 손실**(`잘림`), `auto`·`scroll` 이면 **도달 가능**(`스크롤`), `visible` 이면 **상자 밖 그려짐**(`넘침`). 관측이 뒷받침하지 않는 결론을 라벨이 단정하지 않는다.

   > 현행은 `el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1` 하나로 `clipped` 를 정하고 `:228` 이 그것을 `← 잘림` 으로 인쇄한다. **`overflow` 는 판정에 들어가지 않는다.** `:109-111` 의 주석은 원래 의도를 정확히 적고 있다 — *"**overflow hidden 인 라벨에서** 글자가 잘리는지는 이 둘을 비교해야 안다."* **구현이 자기 주석의 한정을 잃었다.**

2. **(I2) 가로와 세로는 분리 판정한다** (FR-02): 두 축을 한 플래그에 합치지 않는다. 현행 `||` 는 세로 넘침에도 라벨을 붙이는데 `:228` 이 인쇄하는 수치는 `scrollW`·`clientW` 뿐이라, **읽는 사람은 가로 수치만 보고 세로 원인의 라벨을 가로 잘림으로 읽는다.**

3. **(I3) 판정 근거값이 사람이 읽는 출력에 실린다** (FR-03): 라벨을 붙인 근거(`overflowX`·`overflowY`)가 노드 출력에 함께 인쇄된다. 읽는 사람이 판정을 **반증할 수 있어야** 한다.

   > **정정 — 값이 전부 손에 있는 것은 아니다.** req §배경 (3) 은 *"값은 이미 `:121` 에서 수집돼 있고 출력에서만 빠진다"* 고 적었다. **가로만 참이다**: `:121` 은 `overflowX` 만 담고 `overflowY` 는 파일 전체에서 **0 hit** 이다 (`overflowX` 3 hit — `:121` 노드 수집 · `:132` `--overflow` 경로 · `:239` 그 경로의 출력). 따라서 (I2) 의 세로 축은 **수집 추가가 선행**하며 수정 비용은 req 가 적은 *"판정식 한 줄 + 출력 한 조각"* 보다 한 조각 크다.

4. **(I4) 라벨 문자열은 판정 결과의 단일 출처에서 나온다** (FR-04): 판정과 표시가 갈라지면 `:112`(판정)와 `:228`(표시)가 다시 어긋난다. **지금의 결함이 정확히 그 형태다** — 판정은 두 축을 합쳤고 표시는 가로만 인쇄한다.

5. **(I5) 도구의 회귀를 재는 채널이 부착된다** (FR-05): `check:*` 또는 테스트. 채널 없이는 같은 표류가 재발해도 조용하다 — **현행이 그 상태이며 이 결함이 얼마나 오래 있었는지 아무도 모른다.**

6. **(I6) 도구는 측정 대상을 바꾸지 않는다** (NFR-04): 판정 대상이 아닌 출력(박스·글자·스타일 수치)은 변경 전후 동일하다.

## 회귀 중점

- **`overflow` 를 판정에 넣되 `visible` 을 `hidden` 과 같게 다루는 방향은 (I1) 을 반쪽만 고친다.** `visible` 은 내용이 **보인다** — 상자 밖으로 그려질 뿐이다. 세 갈래를 두 갈래로 접으면 `pre` 는 고쳐지고 `visible` 요소가 새로 오보된다.
- **세로를 판정에서 아예 빼는 방향은 (I2) 를 만족시키지 못한다.** 현행 `||` 가 세로를 **섞어** 넣은 것이 문제이지 세로를 재는 것이 문제가 아니다. 빼면 세로 잘림이 무측정이 된다.
- **`overflowY` 수집 없이 (I2) 를 선언하는 방향은 판정 불가다.** 현재 0 hit 이므로 수집이 선행한다.
- **라벨 문자열을 출력 지점에서 조립하는 방향은 (I4) 를 되돌린다.** 지금의 결함이 그 형태이고, 고친 뒤 같은 자리에 다시 조립하면 다음 축에서 같은 어긋남이 난다.
- **CSS 를 고쳐 라벨을 없애는 방향은 범위를 넘는다.** `typography.css:73` 은 정상이며 도구가 틀렸다.

## 의존성

- 내부: `scripts/measure-layout.mjs` (단일 대상) · `package.json` (`scripts.check:*` — 채널) · `src/styles/typography.css` (**읽기 대상**, 반례 CSS).
- 외부: 도구가 쓰는 헤드리스 브라우저 계층 (버전 정합은 `dependency-bump-gate` 영역).
- **역의존 (사용처) — 열거하지 않고 도출한다**: `bash -c 'grep -rn "measure-layout" package.json .husky/ .github/ src/ scripts/ 2>/dev/null | grep -v "^scripts/measure-layout.mjs:"'` → HEAD=`af42803` 실측 **1 hit** — `src/__tests__/hover-popup-anchoring.test.tsx` 의 **주석**이며 호출이 아니다. **제외 규칙**: 도구 자신의 파일(사용법 문자열 3곳)은 세지 않는다. **즉 자동 소비처는 0 이고 유일한 소비자는 사람이다** — 그것이 (I5) 채널 부재의 실물이며, 이 도구의 출력이 `RULE-05 §결함 신고` 입구로 흘러 들어간다.
- 직교: `foundation/spec-dependency-reverse-derivation` (같은 tick 신설 — 본 절의 도출 형태가 그 계약을 따른다).

## 테스트 현황

> 각 명령은 HEAD=`af42803` 에서 **파일에서 추출해** 실행했고 rc 를 박제한다 (손 전사 0 — `RULE-06 §추출 실패 검출`).

- [ ] (I1 라벨 분기) 넘침 라벨이 `overflow` 계산값에 따라 갈린다 — **노드 라벨 자리에 한정해 센다**: `bash -c 'f=scripts/measure-layout.mjs; test -f "$f" || exit 2; L=$(grep -vE "docScrollWidth" "$f" | grep -vE "^[[:space:]]*//"); s=$(printf "%s\n" "$L" | grep -c "스크롤"); c=$(printf "%s\n" "$L" | grep -c "잘림"); v=$(printf "%s\n" "$L" | grep -c "넘침"); echo "node-labels scroll=$s clip=$c overflow=$v"; test "$s" -ge 1 -a "$c" -ge 1 -a "$v" -ge 1'` → HEAD=`af42803` 실측 **rc=1**, 출력 `node-labels scroll=0 clip=1 overflow=1`.

  > **초안이 여기서 거짓 통과했다 (자체 검출).** 제외 규칙 없이 `grep -qF "스크롤"` 만 썼더니 **rc=0** 이었다 — `:220` 의 `'← 가로 스크롤 발생'` 에 걸린 것이고 그것은 **문서 전체의 가로 스크롤**을 알리는 다른 라벨이지 노드 넘침 라벨이 아니다. 게이트가 재던 것은 *"파일 어딘가에 이 글자가 있는가"* 였고 계약이 말하는 것은 *"노드 라벨이 세 갈래로 갈리는가"* 다. **`REQ-20260831-077` 이 세운 대리 표면의 실물이 이 문서 자신의 게이트에서 나왔다.** 제외 규칙(`docScrollWidth` 줄 · 주석 줄)을 넣어 정정했고, 그래도 이 항목은 **정적 근사**이며 판정은 아래 (접속) 이 진다.

- [ ] (I2 축 분리) 넘침 판정이 가로·세로를 한 플래그에 합치지 않는다: `bash -c 'f=scripts/measure-layout.mjs; test -f "$f" || exit 2; ! grep -qE "scrollWidth > el\.clientWidth \+ 1 \|\| el\.scrollHeight" "$f"'` → HEAD=`af42803` 실측 **rc=1** — `:112` 가 정확히 그 형태다. **부정 판정이라 `test -f` 선행 조건이 필수다** — 파일이 없으면 `! grep` 이 참이 되어 통과로 읽힌다.
- [ ] (I3 근거값 수집·출력) 두 축의 `overflow` 값이 수집되고 노드 출력에 인쇄된다: `bash -c 'f=scripts/measure-layout.mjs; test -f "$f" || exit 2; x=$(grep -c "overflowX" "$f"); y=$(grep -c "overflowY" "$f"); echo "overflowX=$x overflowY=$y"; test "$y" -ge 1 || exit 1; grep -qE "console\.log.*overflowX.*overflowY|console\.log.*overflowY" "$f"'` → HEAD=`af42803` 실측 **rc=1**, 출력 `overflowX=3 overflowY=0`. **`overflowY` 가 0 인 것이 req 정정의 실물이다** (§동작 (I3) 주).
- [ ] (I4 단일 출처) 라벨 문자열이 판정 결과에서 나온다: `bash -c 'f=scripts/measure-layout.mjs; test -f "$f" || exit 2; grep -qE "(overflowLabel|clipLabel|label\s*[:=])" "$f"'` → HEAD=`af42803` 실측 **rc=1** — 현재 라벨은 `:228` 의 삼항 연산자로 출력 지점에서 조립된다.
- [ ] (I5 채널 실재) 도구의 회귀를 재는 채널이 실재한다 — **주석 인용은 채널이 아니다**: `bash -c 'if grep -qE "\"check:measure-layout\"" package.json; then exit 0; fi; n=0; for t in $(grep -rl "measure-layout" src --include="*.test.ts" --include="*.test.tsx" --include="*.test.mjs" 2>/dev/null); do grep -n "measure-layout" "$t" | grep -vqE "^[0-9]+:[[:space:]]*(//|\\*)" && n=$((n+1)); done; echo "channel-tests=$n"; test "$n" -ge 1'` → HEAD=`af42803` 실측 **rc=1 (채널 부재)**, 출력 `channel-tests=0`. **`RULE-07 §promote 조건 4` 의 선행 조건이며 promote 차단이 아니라 채널 부착 task 발행이 선행한다** (§참고 §채널 부착 선행).

  > **초안이 여기서도 거짓 통과했다 (자체 검출).** 제외 규칙 없이 `grep -rl` 만 썼더니 **rc=0** 이었다 — `src/__tests__/hover-popup-anchoring.test.tsx:127` 이 걸렸고 그 줄은 *"측정(`scripts/measure-layout.mjs`)의 몫이고 CI 에 없다"* 는 **주석**이다. **채널이 없다고 적은 문장이 채널의 증거로 계수됐다.** 주석 줄 제외는 이 저장소가 이미 쓰는 규칙이다 (`sanitizeHtml` (I1) — *"인용은 정책 분기를 만들지 않는다"*).

- [ ] (I1·I2·I3 접속 — **동작 판정**) 반례 픽스처에서 라벨이 실제로 갈린다: `bash -c 'f=scripts/measure-layout.mjs; test -f "$f" || exit 2; d=$(mktemp -d); printf "%s" "<html><body><pre style=\"width:40px;overflow-x:auto;white-space:pre\">AAAAAAAAAAAAAAAAAAAA</pre><div id=h style=\"width:40px;overflow:hidden;white-space:nowrap\">BBBBBBBBBBBBBBBBBBBB</div></body></html>" > "$d/probe.html"; out=$(node "$f" "$d/probe.html" --select "pre,#h" 2>&1) || exit 2; echo "$out" | grep -A2 "pre" | grep -q "잘림" && exit 1; echo "$out" | grep -A2 "#h" | grep -q "잘림"'` → HEAD=`af42803` 실측 **rc=1** — `pre`(`overflow-x: auto`)에 `잘림` 이 붙는다. **이 항목이 이 계약의 판정 전부다** — 위 네 항목은 전부 소스 텍스트를 읽는 **정적 근사**이고, 라벨이 실제로 무엇을 인쇄하는지는 도구를 돌려야 안다 (`REQ-20260831-077` FR-04). **`|| exit 2` 로 닫는 이유**: 도구 실행 자체가 실패하면(브라우저 계층 부재 등) 그것은 위반이 아니라 무판정이다.
- [x] (I6 무변경 baseline — 정적) 도구가 **측정 대상**을 쓰지 않는다: `bash -c 'f=scripts/measure-layout.mjs; test -f "$f" || exit 2; n=$(grep -nE "writeFileSync\(|appendFileSync\(|rmSync\(" "$f" | grep -vc "profile"); echo "target-writes=$n"; test "$n" -eq 0'` → HEAD=`af42803` 실측 **rc=0**, 출력 `target-writes=0`. **정적 불변식이다** — 판정면이 쓰기 API 의 부재이므로 정적 명령이 정확한 측정면이며 실행 채널을 요구하지 않는다 (`REQ-20260831-077` FR-06 분류 근거 박제).

  > **초안이 여기서 거짓 실패했다 (자체 검출, 앞의 둘과 반대 방향).** 제외 없이 쓰니 **rc=1** 이었다 — `:213` `rmSync(profile, …)` 은 **헤드리스 브라우저의 임시 프로파일 정리**이지 측정 대상 쓰기가 아니다. 산문에는 그 제외를 적어 두고 명령에는 넣지 않았다. **라벨이 약속한 측정과 명령이 실제로 한 측정이 달랐다**는 점에서 `sanitizeHtml` drift D5 와 같은 부류이며, 여기서는 같은 tick 안에 재실행으로 잡혔다.

- [x] (반례 CSS 실재 baseline — 정적) 반례가 저장소에 실재한다: `bash -c 'grep -qE "^[[:space:]]*overflow-x:[[:space:]]*auto" src/styles/typography.css'` → HEAD=`af42803` 실측 **rc=0** (`typography.css:73`, `pre` 규칙 안). **정적 불변식이다.** **이 반례가 사라지면 (I1) 의 특이도 대조가 근거를 잃는다** — 그때는 대조를 다시 고르는 것이지 계약이 닫히는 것이 아니다.

## 수용 기준

- [ ] (Must, FR-01) 위 §테스트 현황 (I1 라벨 분기) 명령 → rc=0.
- [ ] (Must, FR-02) 위 §테스트 현황 (I2 축 분리) 명령 → rc=0.
- [ ] (Must, FR-03) 위 §테스트 현황 (I3 근거값 수집·출력) 명령 → rc=0 (`overflowY` ≥ 1).
- [ ] (Must, FR-01·FR-02 동작) 위 §테스트 현황 (I1·I2·I3 접속 — 동작 판정) 명령 → rc=0.
- [ ] (Should, FR-04) 위 §테스트 현황 (I4 단일 출처) 명령 → rc=0.
- [ ] (Should, FR-05 채널) 위 §테스트 현황 (I5 채널 실재) 명령 → rc=0.
- [x] (Must, NFR-04 read-only) 위 §테스트 현황 (I6 무변경 baseline — 정적) 명령 → rc=0. HEAD=`af42803` 실측 rc=0.
- [x] (Must, 범위 제한) CSS 변경 · 다른 측정 축의 의미 변경 · 새 측정 기능은 본 계약의 요구 대상이 아니다 — §역할 · §참고 §미측정.

## 스코프 규칙

- **expansion**: 불허 — 대상은 `scripts/measure-layout.mjs` 와 채널 실물(`package.json` script 항목 1 + 테스트 또는 `scripts/check-*.sh` 1) 이다. **`src/styles/**` 는 읽기 대상이며 고치면 안 된다** — 게이트를 초록으로 만드는 가장 싼 경로가 반례 CSS 를 없애는 것이고 그것은 정상 동작을 파괴한다.
- **grep-baseline** (HEAD=`af42803`, 저장소 루트 read-only 실측):
  - `grep -c "overflowX" scripts/measure-layout.mjs` → **3** (`:121` `--select` 노드 수집 · `:132` `--overflow` 경로 수집 · `:239` `--overflow` 경로 출력). `grep -c "overflowY" …` → **0**.
  - `grep -n "잘림" scripts/measure-layout.mjs` → **2** (`:109` 주석 · `:228` 라벨). `스크롤` 라벨 → **0**.
  - 판정식 `:112` — `const clipped = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;`. **`overflow` 미참조.**
  - 노드 스타일 출력 `:229-233` — `display` `position` `line-height` `fontSize` `fontWeight` `color` `backgroundColor` `border` `padding` **9종**이며 `overflowX` 는 **없다**. 같은 객체 안에 있는데 인쇄되지 않는다.
  - 채널: `grep -oE '"check:[a-z-]+"' package.json | wc -l` → **17**, 그중 이 도구를 재는 것 **0**. `measure-layout` 을 참조하는 테스트 파일 → **0**. 유일한 참조는 `src/__tests__/hover-popup-anchoring.test.tsx:127` 의 **주석**이다.
  - 반례 CSS: `src/styles/typography.css:73` `overflow-x: auto;` (`pre` 규칙, `:65-74`). 저장소에서 `overflow-x` 선언은 **이 1건뿐**이다.
  - 도구 규모 **272줄**. 판정·수집·표시가 각각 1곳이라 변경면이 좁다.
- **rationale**: 판정식 1줄 · 수집 1줄 · 출력 2줄이 전부 단일 지점이고 수치가 정수로 닫히므로 baseline 은 열거로 닫힌다. 반례 CSS 를 baseline 에 넣은 이유는 **그것을 지우는 것이 게이트를 초록으로 만드는 가장 싼 경로**이기 때문이다 — expansion 불허와 함께 그 경로를 막는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-31 | inspector 254차 tick (Phase 3, REQ-20260831-075 흡수) / pending @ HEAD=`af42803` | 최초 박제 — 넘침 라벨 6 축 (I1~I6). **req 의 수집 주장을 재실측해 정정했다**: *"값은 이미 손에 있고 출력에서만 빠진다"* 는 **가로만 참**이다 — `overflowY` 는 파일 전체 **0 hit** 이라 (I2) 의 세로 축은 수집 추가가 선행한다. 이 정정이 수정 비용을 한 조각 늘린다. **(접속) 을 동작 판정으로 세운 것이 이 흡수의 판단이다**: 나머지 다섯은 전부 소스 텍스트를 읽는 정적 근사이고, *"라벨이 무엇을 인쇄하는가"* 는 도구를 돌려야만 알 수 있다. 반례 픽스처(`overflow-x: auto` 인 `pre` + `overflow: hidden` 인 `div`)를 임시 디렉터리에 만들어 두 방향을 한 명령에서 잰다 — 한 방향만 재면 라벨을 통째로 없앤 구현이 통과한다. **정적 항목에는 정적임을 문면에 밝혔다** (`REQ-20260831-077` FR-06). **채널 0** 이라 `RULE-07 §promote 조건 4` 의 채널 부착이 선행 조건이다. **자기 게이트 결함 3건을 자체 검출·정정했다** — 초안 8 명령을 실행해 보니 셋이 잘못 답했다. **거짓 통과 2건**: (I1) 이 `:220` 의 *'← 가로 스크롤 발생'*(문서 전체 라벨, 노드 라벨이 아니다)에 걸려 rc=0 이었고, (I5 채널) 이 *"CI 에 없다"* 고 **적어 둔 주석**에 걸려 rc=0 이었다 — **채널이 없다는 문장이 채널의 증거로 계수됐다**. **거짓 실패 1건**: (I6) 이 `:213` `rmSync(profile, …)`(브라우저 임시 프로파일 정리)를 측정 대상 쓰기로 세어 rc=1 이었다 — 산문에는 제외를 적고 명령에는 넣지 않은, `sanitizeHtml` drift D5 와 같은 부류다. 셋 다 제외 규칙으로 정정했고 **셋 다 이 문서가 다루는 결함과 같은 형태**다 (라벨/게이트가 재는 표면이 계약이 말하는 표면과 다르다). **동작 판정으로 결함을 재현했다**: 반례 픽스처(`overflow-x:auto` 인 `pre` + `overflow:hidden` 인 `div`)를 도구에 물려 실행한 결과 **둘 다 `← 잘림`** 이었다 (`pre` scrollW=157 clientW=40 · `#h` scrollW=188 clientW=40). 신고 내용 전건 확인. baseline: `overflowX` 3 / `overflowY` 0 · 노드 라벨 `잘림` 1 / `스크롤` 0 / `넘침` 1 · 스타일 출력 9종에 overflow 없음 · 채널 0 · 반례 CSS 1. unchecked 6 · checked 2. | all |

## 참고

### 채널 부착 선행 (`RULE-07 §promote 조건 4`)

본 계약은 Must 측정 게이트를 선언하는데 발화 채널 실경로가 **0건**이다. `RULE-07` 은 채널 부재를 promote **차단**이 아니라 **"채널 부착 task 발행"을 선행 조건**으로 규정한다.

채널 형태는 두 갈래가 가능하고 본 계약은 지정하지 않는다 — (a) `package.json` `check:measure-layout` + `scripts/check-*.sh` (선례 16건), (b) 반례 픽스처를 도구에 물려 라벨을 단언하는 테스트. **(b) 가 (접속) 과 같은 것을 재므로 중복이 아니라 이관이다** — 그 경우 (접속) 명령은 채널을 호출하는 형태로 좁혀진다.

> **비용 주의**: 이 도구는 헤드리스 브라우저를 띄운다. CI 에 넣을 때 실행 시간과 브라우저 가용성이 판단 재료이며, 그것이 지금까지 채널이 없던 이유일 가능성이 있다 — 다만 **추정이고 측정된 바 없다** (§미측정).

### 미측정·비판정 항목 (`RULE-07 §수용 기준 문장 규약`)

- **도구 실행 시간**·**헤드리스 브라우저 CI 가용성**은 측정 채널이 없다. 채널 부착 task 가 실측할 몫이다.
- **`overflow: clip`** 은 `hidden` 과 같은 갈래로 두었으나 저장소에 사용례가 **0건**이라 반례 픽스처로 재지 않는다. 사용례가 생기면 그때 픽스처를 더한다.
- **`--overflow` 경로의 `overflowX` 출력**(`:239`)은 이미 근거값을 인쇄하고 있어 (I3) 의 대상이 아니다. **그 경로가 이미 옳다는 것이 `--select` 경로 결함의 대조**다 — 같은 파일 안에서 한쪽은 근거를 보이고 한쪽은 감춘다.
- **이 결함이 언제 들어왔는가**는 측정하지 않았다. 채널이 0이라 회귀 시점을 좁힐 자료가 없으며, 그 사실 자체가 (I5) 의 근거다.

### 주입 이관 (`RULE-06 §게이트 실효 검증` · §음성 대조 — 구현 task DoD 로)

'가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **검출 방향 4 · 음성 대조 배터리 4 원소이며 이관처 task 는 아직 발행되지 않았다** — 발행 전까지 이 절이 그 박제다.

**민감도 (주입 → `rc≠0`)**

- **Dir-1 (`hidden` 미검출)**: `overflow: hidden` 이고 내용이 넘치는 픽스처에서 `잘림` 라벨이 사라지게 만든다 (NFR-01). 라벨을 통째로 없애는 해법이 여기서 걸린다.
- **Dir-2 (`auto` 오보)**: `overflow-x: auto` 픽스처에 `잘림` 이 붙게 되돌린다 (NFR-02 — **현행 위반의 직접 반례**).
- **Dir-3 (축 혼입)**: 세로로만 넘치는 픽스처에 가로 라벨이 붙게 만든다 (NFR-03).
- **Dir-4 (근거값 은닉)**: `overflowX`·`overflowY` 를 노드 출력에서 뺀다 — FR-03 이 재는 방향이며 Dir-1~3 로는 검출되지 않는다 (라벨은 옳은데 반증 자료가 없다).

**특이도 — 정상 변형 배터리 (각각 `rc=0`, `RULE-06 §음성 대조` 2026-08-31 개정: 배터리는 게이트가 재는 대상의 **구조 클래스**를 덮는다. 범위 밖 축은 원소일 수는 있으나 배터리를 대신하지 않는다)**

| 원소 | 구조 클래스 | 변형 |
|---|---|---|
| **Ctrl-1** | `overflow` 값 공간의 나머지 | `visible`(기본값)이고 내용이 넘치는 픽스처 — `잘림` 이 아니라 `넘침` 이며, 세 갈래를 두 갈래로 접은 구현이 여기서 갈린다 |
| **Ctrl-2** | 넘치지 않는 정상 요소 | `overflow: hidden` 인데 내용이 상자에 들어가는 픽스처 — 라벨 없음. `hidden` 을 곧 `잘림` 으로 읽는 구현이 걸린다 |
| **Ctrl-3** | 판정 밖 출력면 | 박스·글자·스타일 수치 줄의 형식 (NFR-04). 라벨 축 변경이 이 줄들을 건드리면 안 된다 |
| **Ctrl-4** | 도구 내부의 등가 재작성 | 판정식을 헬퍼 함수로 추출하거나 라벨 문자열을 상수로 뽑는 정상 리팩터. **소스 텍스트를 고정 패턴으로 잠근 게이트는 여기서 붉는다** — (I1)(I2)(I4) 가 정적 근사인 이유이며 (접속) 이 동작으로 닫는 이유다 |

> **Ctrl-4 가 배터리의 핵심이다.** (I2) 는 `scrollWidth > el.clientWidth + 1 || el.scrollHeight` 라는 **현행 소스 문자열의 부재**를 잰다. 이 형태는 결함이 그 자리에 있는 동안만 옳고, 정상 리팩터가 같은 판정을 다른 표기로 쓰면 **위반이 없는데 통과**하거나 **정상인데 붉는다**. 그래서 정적 4항은 근사이고 판정은 (접속) 이 진다 — 이 구분을 문면에 적는 것이 `REQ-20260831-077` FR-06 이 요구한 바다.

### 관련

- **원 req**: `specs/60.done/2026/08/31/req/20260831-measure-tool-label-supported-by-measurement.md` (REQ-20260831-075). 출처: 운영자 결함 신고 `20260831-0937-measure-tool-clipped-label-overstates.md`.
- **반례 CSS**: `src/styles/typography.css:65-74` (`pre { … overflow-x: auto }`).
- **채널 부재 근거**: `src/__tests__/hover-popup-anchoring.test.tsx:127` — *"측정(`scripts/measure-layout.mjs`)의 몫이고 CI 에 없다."*
- **도구의 선언된 목적** (파일 머리 주석): *"멀쩡한 것을 고치지 않은 것도 이 도구의 성과다."* 본 계약은 그 선언을 이 축까지 넓힌다.
- **인접 축**: `foundation/spec-dependency-reverse-derivation` (같은 tick 신설) 과 `REQ-20260831-077` (효력면) — **셋 다 "표시된 값을 판단에 썼다" 는 같은 부류**이며 표면만 다르다 (spec 산문 · 게이트 도출 · 측정 도구 라벨).
