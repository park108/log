# spec §의존성 의 역의존은 도출된다 — 명령은 검증되고 산문은 검증되지 않는다

> **위치**: `specs/30.spec/{blue,green}/**` 의 `## 의존성` 절, `역의존` 항. 발화 채널: `package.json scripts.check:*` (**현재 부재 — §참고 §채널 부착 선행**). 선례 채널: `scripts/check-blue-judgement-evaluable.sh` (`check:blue-judgement`) 가 같은 모집단을 이미 읽는다.
> **관련 요구사항**: REQ-20260831-074 FR-01~FR-06 · NFR-01~NFR-04 (출처: 운영자 결함 신고 `20260831-1011-tilde-spec-dependency-list-wrong.md`)
> **최종 업데이트**: 2026-08-31 (by inspector 254차 tick — 최초 박제, HEAD=`86ede5c`)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷이다.

## 역할

spec 의 `## 의존성` §역의존(사용처) 목록은 **도출 명령과 함께** 박제된다. 도출 결과와 문면이 어긋나면 발화하고, 문면이 지목한 경로가 실재하지 않으면 발화한다.

**방어 대상 (`RULE-07 §주제 우선순위 2`)**: **승격 조건이 검사하지 않는 사실 주장의 표류.** `RULE-07 §promote 조건` 은 (1) 체크박스 전수 `[x]`, (2) 명령 재실행 rc=0, (3)(4) 채널 실존을 본다 — **§역할 · §의존성 · §스코프 규칙 의 산문은 어느 조건에도 걸리지 않는다.** 그래서 판정 명령 10건이 전부 rc=0 인 문서가 존재하지 않는 사용처를 올린 채 승격됐다.

이 표류가 침묵하는 이유는 개별 문서의 부주의가 아니라 **같은 문장이 복사되며 번지기 때문**이다. 현 HEAD 실측: `Comment 본문` 을 사용처로 올린 문서 **8건** (blue 6 + green 2) — 그러나 `src/Comment/` 에는 `markdownToHtml` 참조가 **0 hit** 이고 댓글 본문은 평문 렌더다 (`CommentItem.tsx` 가 `message.split("\n")` 을 `<p>` 로 그린다). 반대 방향도 실측된다: 실제 사용처인 작성 미리보기 `src/Log/Writer.tsx`(작성자가 저장 전 결과를 확인하는 유일한 화면)를 §역의존 에 올린 파서 축 문서는 **0건**이다.

**의도적으로 하지 않는 것**:

- **§의존성 밖 산문**(§역할 · §배경 · §회귀 중점 의 서술)은 대상이 아니다. 넓히면 자연어 전체를 게이트 대상으로 삼게 된다 (REQ-074 FR-07 Won't).
- **판정 명령 축**은 `spec-judgement-command-evaluability` 소관이다. 그 축은 이미 `check:blue-judgement` 로 닫혔고, 본 계약은 **명령이 아닌 목록**을 대상으로 한다.
- **개별 문서의 정정 자체**를 계약으로 세우지 않는다. `30.spec/blue/**` 는 어떤 에이전트의 편집 영역도 아니다 (`RULE-01`). 본 계약이 정하는 것은 **판정과 도입 경로**이고, blue 정정은 재개봉 판단이다.
- **라인 번호의 정확성**은 판정 대상이 아니다 (§동작 (I4)).

## 공개 인터페이스

- 신규 스크립트 1건 (`scripts/check-spec-dependency-derivation.sh` 류) + `package.json` `scripts.check:*` 항목 1건. 기존 `check:*` ↔ `scripts/check-*.sh` 규약을 따르며 새 규약을 만들지 않는다.
- 게이트는 **read-only** 다 — spec 문서를 고쳐 쓰지 않는다 (REQ-074 FR-06).

## 동작

1. **(I1) 역의존은 도출 명령과 함께 박제된다**: §의존성 의 역의존 항은 사용처를 산출하는 명령(`bash -c 'grep -rn "<식별자>(" src …'` 류)을 본문에 싣는다. `RULE-06 §열거 고정 금지` 를 판정 명령에서 **의존성 목록으로 확장**한 것이다 (FR-01).

2. **(I2) 도출과 문면의 어긋남은 양방향으로 발화한다** (FR-02): 문면에 있는데 도출에 없는 것(**거짓 사용처** — 현행 `Comment 본문` 8건)과 도출에 있는데 문면에 없는 것(**누락** — 현행 `src/Log/Writer.tsx`)이 **둘 다** `rc≠0` 이다. 한 방향만 재면 목록을 통째로 비우는 것이 통과한다.

3. **(I3) 지목한 경로가 실재하지 않으면 발화한다** (FR-03): §역의존 이 파일 경로를 인용하면 그 경로는 현 HEAD 에 실재해야 한다. 현행 위반 실측 **6건 / 4 문서** — `src/App.jsx` · `src/App.test.jsx` · `src/Log/LogSingle.jsx` · `src/index.jsx` · `src/setupTests.js` · `Log/Writer.jsx`. 전부 `b793703`(2026-08-29 src 전면 TS 전환) 의 잔해이며, **같은 사건이 판정 명령 54건을 무효화했을 때는 감시자가 붙었고 산문 축에는 붙지 않았다.**

4. **(I4) 라인 번호는 판정 대상이 아니다** (FR-05 판정): 도출 비교와 경로 실재 판정은 **파일 경로 단위**로 하고 `:NN` 접미는 **잘라서** 비교한다. 근거는 실측이다 — 같은 호출(`src/Log/api.ts` 의 `markdownToHtml(contents)`)을 가리키는 인용이 문서마다 `:77`·`:78`·`:79` 로 갈려 있고 그중 `:78` 은 어느 쪽도 아니다. **라인은 파일이 한 줄만 자라도 낡으므로 그것까지 잡으면 특이도를 잃는다** — 오늘 하루에 파서 12+커밋이 그 파일들의 좌표를 전건 밀었다.

5. **(I5) 도출 항이 없으면 위반이 아니라 무판정이다** (FR-06·NFR-04): 대상 문서에 `## 의존성` 이 없거나 역의존 항이 없으면 `exit 2` 로 가른다. "위반 0" 과 "측정 0" 이 구별되지 않으면 절 이름이 바뀌는 것만으로 게이트가 조용해진다 — `REQ-20260826-028` 이 세운 관행과 같다.

6. **(I6) 도입은 단계적이며 그 단계가 계약의 일부다** (FR-04): 현 HEAD 에서 전면 적용하면 최소 **9건**(거짓 사용처 8 + 부재 경로 문서 4 중 중복 제외)이 즉시 붉어 게이트가 fail-closed 로 서고 파이프라인이 막힌다. 따라서 **차단 모집단은 `30.spec/green/**` 한정**이고 `30.spec/blue/**` 는 **등급 보고(비차단)** 로 낸다.

   > **왜 green 한정인가.** green 은 inspector 의 편집 영역이라 게이트가 붉으면 **같은 tick 안에 정상화할 writer 가 있다.** blue 는 어떤 에이전트도 못 고치므로 차단 모집단에 넣으면 그 즉시 운영자 개입 없이는 풀리지 않는다. 등급으로 내면 재개봉 판단의 입력이 되고, 재개봉되어 green 으로 들어오는 순간 자동으로 차단 모집단이 된다 — **경계가 writer 권한과 일치한다.** 선례는 `check:blue-judgement` 의 등급 분리이며 새 규약이 아니다.

## 회귀 중점

- **한 방향만 재는 게이트는 목록을 비우는 해법을 통과시킨다.** 거짓 사용처만 잡으면 §역의존 을 지워 버리는 것이 가장 싼 통과 경로가 된다. (I5) 의 무판정 구분이 그 경로도 함께 막는다.
- **라인 번호까지 재는 게이트는 정상 커밋마다 붉는다.** 오늘 하루 파서 12+커밋이 전부 그 방향으로 특이도를 깨뜨렸을 것이다.
- **blue 를 차단 모집단에 넣는 방향은 파이프라인을 세운다.** 고칠 writer 가 없는 문서를 차단 조건으로 삼는 것이 fail-closed 의 정의다.
- **문자열 일치로 도출-문면을 비교하는 방향은 어순·수식어 변경에서 붉는다** (NFR-02). 비교 단위는 **경로 집합**이지 문장이 아니다.
- **`__fixtures__` hit 을 호출로 세는 방향은 거짓 사용처를 새로 만든다.** 실측: `markdownToHtml(` 도출 4 hit 중 `src/Log/__fixtures__/logs.ts` 1건은 fixture 본문 안의 **글자열**이며 호출이 아니다. 도출 명령은 제외 규칙을 함께 실어야 하고, 그 제외 규칙 자체가 문면에 보여야 한다.

## 의존성

- 내부: `specs/30.spec/{blue,green}/**` (판정 대상 — read-only) · `package.json` (`scripts.check:*`) · `scripts/` (게이트 실물).
- 외부: 없음 (`grep`·`perl` 등 저장소가 이미 쓰는 도구만).
- **역의존 (사용처) — 열거하지 않고 도출한다** (본 계약을 자기 자신에게 적용한다): `bash -c 'grep -rln "check:blue-judgement\|check-blue-judgement" package.json scripts/ .husky/ .github/ 2>/dev/null'` → HEAD=`86ede5c` 실측 **2 hit** (`package.json` · `scripts/check-blue-judgement-evaluable.sh`) — 선례 채널의 부착 형태이며 본 계약의 채널도 같은 두 자리를 갖는다. 본 계약 자신의 채널은 **아직 0 hit** 이다 (§참고 §채널 부착 선행).
- 직교: `foundation/spec-judgement-command-evaluability` — **판정 명령**의 평가 가능성 축. 본 계약은 **명령이 아닌 목록**이 대상이며 두 축의 모집단은 같고 판정면은 겹치지 않는다.

## 테스트 현황

> 각 명령은 HEAD=`86ede5c` 에서 **파일에서 추출해** 실행했고 rc 를 박제한다 (손 전사 0 — `RULE-06 §추출 실패 검출`). 판정 대상이 `specs/**` 문서라 `src` 트리와 무관하므로 저장소 루트에서 read-only 로 실행한다.
>
> **모집단 도출 규칙 (전 항목 공통)**: 대상 줄은 `## 의존성` **구획 안**의 `- 역의존` / `- **역의존` 으로 시작하는 줄이다. 구획 밖의 `역의존` 언급은 세지 않는다 — **본 문서 자신이 그 함정을 밟았다**: 초안 게이트가 `grep -rn "역의존"` 으로 모집단을 잡아 이 spec 의 산문까지 세었고 green 모집단이 8줄이 아니라 **28줄**로 부풀었다 (`markdown-setext-heading-underline` 이 253차에 자기 본문을 계수한 것과 같은 부류이며, 구획 한정이 그 부류의 유일한 해법이다).

- [ ] (I1·I2 채널 실재) 도출 판정 채널이 실재하고 초록이다: `bash -c 'f=$(ls scripts/check-spec-dependency*.sh 2>/dev/null | head -1); test -n "$f" || exit 1; test -x "$f" && grep -qE "\"check:spec-dependency" package.json && "$f" >/dev/null 2>&1'` → HEAD=`86ede5c` 실측 **rc=1 (채널 미부착)**. **`RULE-07 §promote 조건 4` 의 선행 조건이며 promote 차단이 아니라 채널 부착 task 발행이 선행한다** (§참고 §채널 부착 선행).
- [x] (I1 도출 명령 실재) green 의 §역의존 이 전건 도출 명령을 싣는다 — **하한은 모집단에 걸고 등식으로 닫는다**: `bash -c 'set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; L=$(perl -ne '"'"'if(/^## 의존성\s*$/){$k=1;next} if(/^## /){$k=0;next} if($k && /^- \s*(\*\*)?역의존/){print} if(eof){$k=0}'"'"' "$@"); tot=$(printf "%s\n" "$L" | grep -c "역의존"); test "$tot" -ge 1 || exit 2; drv=$(printf "%s\n" "$L" | grep -c "grep -"); echo "green-revdep-lines=$tot derived=$drv"; test "$drv" -eq "$tot"'` → HEAD=`86ede5c` 실측 **rc=0**, 출력 `green-revdep-lines=8 derived=8`. **본 tick 에 3건을 정상화한 결과다** (`markdown-pipe-table` · `markdown-blank-line-predicate` · `spec-judgement-command-evaluability` — 앞의 둘은 `Comment 본문` 열거였고 셋째는 사람이 읽는 산문이었다). **산출(위반 수)에 하한을 걸지 않은 이유**: 파이프라인이 정상 작동해 위반이 줄면 그 하한이 붉어진다 (`spec-judgement-command-evaluability` (I10) 초안이 20분 만에 그렇게 붉었다). → 258차 재실측 rc=0 (`green-revdep-lines=6 derived=6` — green 6 문서 전건 도출형 유지).
- [x] (I1 도출 실행 가능성) green 의 §역의존 도출 명령이 **실제로 실행되고 rc=0 을 낸다** — 문자열 실재가 아니라 실행이 판정면이다: `bash -c 'set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; L=$(perl -ne '"'"'if(/^## 의존성\s*$/){$k=1;next} if(/^## /){$k=0;next} if($k && /^- \s*(\*\*)?역의존/){print} if(eof){$k=0}'"'"' "$@"); tot=$(printf "%s\n" "$L" | grep -c "역의존"); test "$tot" -ge 1 || exit 2; n=0; bad=0; while IFS= read -r c; do [ ${#c} -ge 20 ] || { bad=$((bad+1)); continue; }; n=$((n+1)); eval "$c" >/dev/null 2>&1 || bad=$((bad+1)); done < <(printf "%s\n" "$L" | perl -ne '"'"'my $b=chr(96); while(/$b(bash -c [^$b]+)$b/g){ print "$1\n" }'"'"'); echo "revdep-lines=$tot derivations-run=$n failed=$bad"; test "$n" -ge "$tot" -a "$bad" -eq 0'` → HEAD=`86ede5c` 실측 **rc=0**, 출력 `revdep-lines=8 derivations-run=13 failed=0`. **`[ ${#c} -ge 20 ]` 가 빈 추출을 위반으로 센다** — 인라인 span 이 닫는 backtick 없이 끝나면 추출이 빈 문자열이고 `bash -c ""` 는 rc=0 이라 **미실행이 통과로 읽힌다** (`RULE-06 §추출 실패 검출`). 명령 추출에 backtick 리터럴 대신 `chr(96)` 을 쓴 이유는 **이 명령 자신이 인라인 span 안에 있기 때문**이다 — backtick 을 쓰면 자기 span 이 그 자리에서 닫힌다. 8줄에 13 명령인 것은 여러 줄이 주 도출과 **부정 확인**(`! grep -rq … src/Comment`)을 함께 싣기 때문이며, `n >= tot` 는 모든 줄이 최소 1건을 갖는다는 뜻이다. → 258차 재실측 rc=0 (`revdep-lines=6 derivations-run=7 failed=0`).
- [ ] (I2 도출-문면 대조 — **채널 의존**) 도출 산출 집합과 문면 열거가 양방향으로 일치한다: `bash -c 'f=$(ls scripts/check-spec-dependency*.sh 2>/dev/null | head -1); test -n "$f" || exit 1; test -x "$f" && "$f" --compare >/dev/null 2>&1'` → HEAD=`86ede5c` 실측 **rc=1 (채널 미부착)**. **이 축은 정적 명령으로 닫히지 않는다** — §참고 §정적 대리 표면을 시도하고 버린 기록 에 실측이 있다.
- [x] (I3 정적 zero-point — 부재 경로) green 의 §역의존 이 지목한 파일 경로가 전건 실재한다: `bash -c 'set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; L=$(perl -ne '"'"'if(/^## 의존성\s*$/){$k=1;next} if(/^## /){$k=0;next} if($k && /^- \s*(\*\*)?역의존/){print} if(eof){$k=0}'"'"' "$@"); miss=0; tot=0; for pth in $(printf "%s\n" "$L" | grep -oE "src/[A-Za-z0-9_./-]+\.(ts|tsx|js|jsx|css|mjs)" | sort -u); do tot=$((tot+1)); [ -e "$pth" ] || { echo "MISSING $pth"; miss=$((miss+1)); }; done; echo "green-revdep-paths=$tot missing=$miss"; test "$miss" -eq 0'` → HEAD=`86ede5c` 실측 **rc=0**, 출력 `green-revdep-paths=5 missing=0`. **정적 불변식이다** — 판정면이 파일 실재이므로 정적 명령이 **정확한** 측정면이며 실행 채널을 요구하지 않는다 (`REQ-20260831-077` FR-06 이 요구한 분류 근거 박제). → 258차 재실측 rc=0 (`green-revdep-paths=5 missing=0`).
- [ ] (I1·I2·I3 접속) 세 축이 **동시에** 성립하고 채널이 붙어 있다: `bash -c 'f=$(ls scripts/check-spec-dependency*.sh 2>/dev/null | head -1); set -- $(find specs/30.spec/green -name "*.md"); test "$#" -ge 1 || exit 2; L=$(perl -ne '"'"'if(/^## 의존성\s*$/){$k=1;next} if(/^## /){$k=0;next} if($k && /^- \s*(\*\*)?역의존/){print} if(eof){$k=0}'"'"' "$@"); tot=$(printf "%s\n" "$L" | grep -c "역의존"); test "$tot" -ge 1 || exit 2; test "$(printf "%s\n" "$L" | grep -c "grep -")" -eq "$tot" || exit 1; n=0; bad=0; while IFS= read -r c; do [ ${#c} -ge 20 ] || { bad=$((bad+1)); continue; }; n=$((n+1)); eval "$c" >/dev/null 2>&1 || bad=$((bad+1)); done < <(printf "%s\n" "$L" | perl -ne '"'"'my $b=chr(96); while(/$b(bash -c [^$b]+)$b/g){ print "$1\n" }'"'"'); test "$n" -ge "$tot" -a "$bad" -eq 0 || exit 1; for pth in $(printf "%s\n" "$L" | grep -oE "src/[A-Za-z0-9_./-]+\.(ts|tsx|js|jsx|css|mjs)" | sort -u); do [ -e "$pth" ] || exit 1; done; test -n "$f" || exit 1; test -x "$f" && grep -qE '"'"'"check:spec-dependency'"'"' package.json && "$f" >/dev/null 2>&1'` → HEAD=`86ede5c` 실측 **rc=1** — 앞 세 축(도출 실재 8/8 · 도출 실행 13건 rc=0 · 경로 실재 5/5)은 통과하고 **채널 부재에서 탈락**한다. **접속으로 닫는 이유**: 세 축은 서로를 대체하지 않는다 — 도출 명령이 실려 있어도 그 결과와 문면이 어긋날 수 있고, 문면이 맞아도 경로가 사라질 수 있으며, 경로가 실재해도 열거일 수 있다. 그리고 **문서 상태가 세 축을 만족해도 채널이 없으면 다음 표류가 조용하다** — 본 tick 의 정상화가 정확히 그 상태다. 채널을 접속에 넣지 않으면 이 문서는 100% 초록인 채로 아무것도 지키지 않는다.
- [x] (I6 blue 등급 모집단 비공허 · 두 모집단 분리) 등급 보고 모집단이 공집합이 아니고 차단 모집단과 갈려 있다: `bash -c 'gb=$(find specs/30.spec/green -name "*.md"); bb=$(find specs/30.spec/blue -name "*.md"); P='"'"'if(/^## 의존성\s*$/){$k=1;next} if(/^## /){$k=0;next} if($k && /^- \s*(\*\*)?역의존/){print} if(eof){$k=0}'"'"'; g=$(perl -ne "$P" $gb | grep -c "역의존"); b=$(perl -ne "$P" $bb | grep -c "역의존"); bd=$(perl -ne "$P" $bb | grep -c "grep -"); echo "green-revdep=$g blue-revdep=$b blue-derived=$bd"; test "$g" -ge 1 -a "$b" -ge 1'` → HEAD=`86ede5c` 실측 **rc=0**, 출력 `green-revdep=8 blue-revdep=66 blue-derived=0`. **`blue-derived=0` 이 (I6) 의 존재 이유다** — blue 66줄 중 도출 명령을 실은 것이 하나도 없고 고칠 writer 도 없다. 차단 모집단에 넣으면 그 즉시 fail-closed 다. → 258차 재실측 rc=0 (`green-revdep=6 blue-revdep=73 blue-derived=8`).
- [x] (채널 규약 실재 baseline) 저장소에 `check:*` ↔ `scripts/check-*.sh` 규약이 이미 있다: `bash -c 'test "$(ls scripts/check-*.sh | wc -l | tr -d " ")" -ge 10 && grep -qE "\"check:blue-judgement\"" package.json'` → HEAD=`86ede5c` 실측 **rc=0** (`scripts/check-*.sh` **16건** · `check:*` **17건**). 본 계약은 새 규약을 만들지 않는다. **정적 불변식이다.**

## 수용 기준

- [x] (Must, FR-01) 위 §테스트 현황 (I1 도출 명령 실재) 명령 → rc=0. HEAD=`86ede5c` 실측 rc=0 (`green-revdep-lines=8 derived=8`).
- [x] (Must, FR-01 실행) 위 §테스트 현황 (I1 도출 실행 가능성) 명령 → rc=0. HEAD=`86ede5c` 실측 rc=0 (`revdep-lines=8 derivations-run=13 failed=0`).
- [ ] (Must, FR-02 양방향 대조) 위 §테스트 현황 (I2 도출-문면 대조 — 채널 의존) 명령 → rc=0. **채널 부착이 선행 조건이다.**
- [x] (Must, FR-03) 위 §테스트 현황 (I3 정적 zero-point — 부재 경로) 명령 → rc=0. HEAD=`86ede5c` 실측 rc=0 (`green-revdep-paths=5 missing=0`).
- [ ] (Must, FR-01~FR-03 접속 + NFR-03 채널) 위 §테스트 현황 (I1·I2·I3 접속) 명령 → rc=0. **현재 채널 부재로 rc=1** — 채널 부착 task 가 선행 조건이다.
- [ ] (Must, NFR-03 채널) 위 §테스트 현황 (I1·I2 채널 실재) 명령 → rc=0.
- [x] (Must, FR-04 도입 경로 — 모집단 분리) 위 §테스트 현황 (I6 blue 등급 모집단 비공허 · 두 모집단 분리) 명령 → rc=0. HEAD=`86ede5c` 실측 rc=0 (`green-revdep=8 blue-revdep=66 blue-derived=0`).
- [x] (Must, 범위 제한) §의존성 밖 산문 · 판정 명령 축 · 라인 번호 정확성 · blue 개별 문서 정정은 본 계약의 요구 대상이 아니다 — §역할 · §동작 (I4) · §참고 §미측정.

## 스코프 규칙

- **expansion**: 허용 — 대상은 `scripts/check-spec-dependency*.sh`(신설) · `package.json`(script 항목 1) · `specs/30.spec/green/**`(정상화)이다. **green 정상화는 inspector 편집 영역이므로 developer task 의 변경 범위에 들어가지 않는다** — 게이트를 붉히는 green 문서가 있으면 그것은 위반 보고이지 developer 가 고칠 대상이 아니다.
- **grep-baseline** (HEAD=`86ede5c`, `git archive` 격리 사본 + 저장소 루트 read-only 실측):
  - §의존성 구획 한정 역의존 줄 → blue **66** · green **8**. 그중 도출 명령(`grep -`)을 실은 줄 → blue **0** · green **8** (본 tick 정상화 전 green 5). **구획 한정 없이 `grep -rn "역의존"` 으로 세면 green 이 28줄로 부푼다** — 이 문서 자신의 산문이 섞이기 때문이며 그 함정은 §참고 에 박제했다. 흡수 시점 REQ-074 실측(도출 0)은 253차 이전 상태이고 253~254차 신규 green 이 형태를 세웠다.
  - `grep -rn "Comment 본문" specs/30.spec/` → **8 문서** — blue **6** (`markdown-blank-line-predicate.md:55` · `markdown-star-emphasis-space-flanking.md:57` · `markdown-blank-line-list-continuity.md:55` · `markdown-atx-heading-closing-sequence.md:40` · `markdown-tilde-strikethrough-space-flanking.md:53` · `markdown-list-item-continuation.md:66`) + green **2** (`markdown-pipe-table.md:62` · `markdown-blank-line-predicate.md:63` — **후자는 254차 재개봉으로 blue 에서 상속된 것이며 같은 tick 에 정정한다**).
  - **부재 경로 6건 / 4 문서**: `blue/common/env.md:34` (`src/App.jsx` · `src/App.test.jsx` · `src/Log/LogSingle.jsx` · `src/index.jsx` · `src/setupTests.js`) · `blue/components/image.md:36` (`Log/Writer.jsx`). 제외 규칙: `src/` 접두 없는 인용(`Log/Writer.jsx`)도 세며, 확장자 없는 디렉터리 인용은 세지 않는다.
  - **실제 호출부 도출** (`markdownToHtml` 축): `bash -c 'grep -rn "markdownToHtml(" src --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "common/markdownParser\.ts"'` → **4 hit**. 실제 호출 3건 = `src/Log/Writer.tsx`(작성 미리보기) · `src/Log/LogItem.tsx`(본문 렌더) · `src/Log/api.ts`(요약). 나머지 1건 `src/Log/__fixtures__/logs.ts` 는 **fixture 본문 안의 글자열이지 호출이 아니다**.
  - `bash -c '! grep -rq "markdownToHtml\|markdownParser\|dangerouslySetInnerHTML" src/Comment'` → **rc=0** (0 hit). 댓글 본문은 평문 렌더다.
  - `grep -oE '"check:[a-z-]+"' package.json | wc -l` → **17** · `ls scripts/check-*.sh | wc -l` → **16**. 본 계약의 채널은 그중 **0건**이다.
- **rationale**: 위반 수(8 · 6)와 모집단(75 줄 / 73 문서)이 전부 정수로 닫히고 도출 명령의 실물이 이미 트리 안에 4건 있으므로 baseline 은 열거로 닫힌다. 결함 열과 정상 열을 같은 자리에 둔 이유는, 이 축의 실패가 "목록이 틀렸다" 가 아니라 **"틀린 목록이 rc=0 인 문서에 실려 승격된다"** 쪽이기 때문이다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-09-01 | inspector 258차 tick (Phase 1 reconcile) / — @ HEAD=`eb62529` | 플립 0. 8 판정 명령 재실행 — `[x]` 4 전건 rc=0, `[ ]` 4 전건 rc=1 (채널 `scripts/check-spec-dependency*.sh` 부재 — `RULE-07 §promote 조건 4` 채널 부착 task 가 선행 조건). 재실측: `green-revdep-lines=6 derived=6` (green 6 문서 전건 도출형 유지 — 승격으로 모집단이 8 → 6 으로 줄었으나 **도출형 비율 100% 는 불변**) · `revdep-lines=6 derivations-run=7 failed=0` · `green-revdep-paths=5 missing=0` · `green-revdep=6 blue-revdep=73 blue-derived=8`. | §테스트 현황 (I1 × 2)(I3)(I6) · 본 이력 |
| 2026-08-31 | inspector 254차 tick (Phase 3, REQ-20260831-074 흡수) / pending @ HEAD=`86ede5c` | 최초 박제 — 역의존 도출 6 축 (I1~I6). **도입 경로를 writer 권한 경계와 일치시킨 것이 이 흡수의 판단이다** (FR-04): 차단 모집단 green 한정 · blue 등급 보고. 문서 수가 아니라 **고칠 writer 가 있는가**로 가른다 — blue 를 넣으면 그 즉시 운영자 개입 없이 풀리지 않는 fail-closed 다. **라인 번호를 판정 대상에서 뺀 것이 두 번째 판단이다** (FR-05, req 가 판정을 요구한 항목): 같은 호출을 가리키는 인용이 `:77`·`:78`·`:79` 로 갈려 있고 `:78` 은 어느 쪽도 아니다. 라인까지 잡으면 오늘 파서 12+커밋이 전부 게이트를 붉혔을 것이다. **req 의 위반 수치를 재실측해 정정했다**: 부재 경로는 req 가 든 1건(`image.md:36`)이 아니라 **6건 / 4 문서**이며 5건이 `blue/common/env.md:34` 한 줄에 몰려 있다. 도출 명령 실은 역의존은 req 실측 **0** → 현 **4** (253~254차 신규 green 이 형태를 세웠다 — req §배경 (8) 이 예측한 대로 형태는 실행 가능하나 규약 없이는 다음 문서가 산문으로 돌아간다는 것도 같은 실측이 보였다: 같은 시간대 green 2건이 여전히 `Comment 본문` 을 달고 있었다). baseline: 역의존 75줄 / 73 문서 · 거짓 사용처 8 문서 · 부재 경로 6 · 채널 0. **자기 검증에서 정적 대리 표면을 두 번 버렸다** — §참고 §정적 대리 표면을 시도하고 버린 기록. 대신 (I1) 을 **도출 명령 실행 판정**으로 세웠다 (추출 → 빈 추출 단언 → 실행 → rc=0). **본 tick 에 green 3건을 정상화했다**: `markdown-pipe-table` · `markdown-blank-line-predicate`(254차 재개봉으로 blue 에서 상속) 의 `Comment 본문` 열거와 `spec-judgement-command-evaluability` 의 산문 역의존 → 전건 도출 형태. green 역의존 **8줄 전건 도출 · 도출 실행 13건 rc=0 · 부재 경로 0**. baseline: 역의존 green 8 / blue 66 · **blue 도출 0** · 부재 경로 6(전건 blue) · 채널 0. unchecked 3 · checked 5. | all |

## 참고

### 정적 대리 표면을 시도하고 버린 기록 (본 흡수의 자기 검증)

FR-02 의 양방향 대조를 **채널 없이** 정적으로 근사해 보려고 초안이 `Comment 본문` 토큰 계수를 (I2) 판정 명령으로 세웠다. **두 번 붉었고 두 번 다 정상 문서였다.**

| 시도 | 결과 | 무엇을 셌나 |
|---|---|---|
| `grep -rn "역의존" specs/30.spec/green` 모집단 | green 8줄이 **28줄**로 부풀었다 | 이 spec 자신의 산문. 구획 한정으로 정정 |
| 구획 한정 + `grep -c "Comment 본문"` | `false-consumer-lines=1` | `markdown-mixed-type-nested-list.md:46` — **거짓 사용처를 적은 것이 아니라 그 실수를 인용해 경고하는 정상 문서** |
| 위 + 인라인 코드 span 제거 | `false-consumer-lines=5` | 정상화된 도출 5건의 *"Comment 는 이 파서를 쓰지 않는다"* — **부정 서술** |

세 번째가 결정적이다. **고정 토큰은 "사용처로 열거함" 과 "사용처가 아니라고 밝힘" 을 구별하지 못한다.** 둘 다 같은 글자를 쓰고 뜻이 반대다. 좁힐수록 다른 정상 문서가 걸렸으므로 `RULE-06 §음성 대조` 의 판정대로 **게이트를 버렸다** — 정상 변형 쪽을 바꿔 맞추지 않았다.

버린 자리를 무측정으로 두지 않기 위해 (I1) 을 **실행 판정**으로 세웠다: 문면의 도출 명령을 추출해 **실제로 돌리고** rc=0 과 빈 추출 부재를 단언한다. 이것은 텍스트가 아니라 동작을 재므로 위 세 함정 전부에 면역이다. **다만 (I1) 은 FR-02 를 대신하지 않는다** — 도출이 살아 있어도 그 산출과 문면 열거가 어긋날 수 있고, 그 대조는 두 집합을 계산해 비교해야 하므로 채널이 필요하다. 그래서 (I2) 를 채널 의존 항목으로 남기고 접속에 채널을 넣었다.

> 이 절 자체가 `REQ-20260831-077` 이 세운 축의 실물 기록이다 — **대리 표면은 상관이 유지되는 동안만 옳고, 이 축에서는 상관이 첫 시도에서 끊겼다.**

### 채널 부착 선행 (`RULE-07 §promote 조건 4`)

본 계약은 Must 측정 게이트를 선언하는데 발화 채널 실경로가 **0건**이다 (`package.json` `check:*` 17건 중 이 축을 재는 것 0 · `scripts/check-*.sh` 16건 중 0). `RULE-07` 은 채널 부재를 promote **차단**이 아니라 **"채널 부착 task 발행"을 선행 조건**으로 규정하므로, 승격 전에 채널 부착 task 가 발행돼야 한다.

선례가 정확히 같은 모집단을 읽는다 — `scripts/check-blue-judgement-evaluable.sh` 는 `specs/30.spec/**` 의 마크다운을 스캔해 등급을 낸다. 본 채널은 그 스캐너의 **구획만 다른** 형제이며(판정 명령 구획 ↔ §의존성 구획) 새 규약을 요구하지 않는다.

### 미측정·비판정 항목 (`RULE-07 §수용 기준 문장 규약`)

- **`Comment` 토큰 계수는 zero-point 이지 계약이 아니다.** (I2) 의 판정 명령이 `Comment` 라는 고정 문자열을 세는 것은 **현행 위반의 상계**를 재기 위한 것이고, 계약면은 (I1) 의 도출-문면 대조다. 도출 대조가 채널로 서면 이 고정 토큰 항목은 §참고 로 내린다 — 남겨 두면 다음 표류가 다른 이름으로 들어올 때 조용하다 (`markdown-blank-line-predicate` (I5) 가 정확히 그 형태였다).
- **blue 6 문서의 정정 시점**은 본 계약이 정하지 않는다. 재개봉은 planner·inspector 판단이며, 재개봉되어 green 으로 들어오는 순간 차단 모집단이 되므로 그 tick 에 정상화된다.
- **`30.spec` 밖 문서**(`rules/` · `.claude/agents/`)의 경로 인용은 대상이 아니다. 운영자 편집 영역이다.
- **도출 명령의 실행 시간**은 측정 채널이 없다. 선례 채널이 `elapsed=658s` 를 낸 전례가 있으므로 모집단이 blue 전수로 넓어지면 비용 측정이 필요하지만, 본 계약의 차단 모집단은 green 7 문서다.

### 주입 이관 (`RULE-06 §게이트 실효 검증` · §음성 대조 — 구현 task DoD 로)

'가정 주입 요구' 부류라 체크박스로 두지 않고 이관한다. **검출 방향 4 · 음성 대조 배터리 4 원소이며 이관처 task 는 아직 발행되지 않았다** — 발행 전까지 이 절이 그 박제다.

**민감도 (주입 → `rc≠0`)**

- **Dir-1 (거짓 사용처)**: 정상화된 green 문서의 §역의존 에 `Comment 본문` 을 되돌려 넣는다 (NFR-01 방향 1).
- **Dir-2 (누락)**: §역의존 에 등재된 실사용처 1건(`src/Log/Writer.tsx`)을 지운다 (NFR-01 방향 2). **한 방향만 주입하면 목록을 통째로 비우는 해법이 통과한다.**
- **Dir-3 (부재 경로)**: §역의존 의 경로 인용 1건을 실재하지 않는 파일(`src/Log/Writer.jsx`)로 바꾼다.
- **Dir-4 (도출 명령 제거)**: §역의존 에서 도출 명령만 걷어내고 산문 열거를 남긴다 — FR-01 이 재는 방향이며 Dir-1·2 로는 검출되지 않는다 (열거가 우연히 맞을 수 있다).

**특이도 — 정상 변형 배터리 (각각 `rc=0`, `RULE-06 §음성 대조` 2026-08-31 개정: 배터리는 게이트가 재는 대상의 **구조 클래스**를 덮는다)**

| 원소 | 구조 클래스 | 변형 |
|---|---|---|
| **Ctrl-1** | 사용처 집합의 정당한 확장 | 새 화면이 실제로 `markdownToHtml` 을 호출하고 문서가 그것을 등재 (NFR-02) |
| **Ctrl-2** | 산문 표현 | §역의존 문장의 어순·수식어만 바꾼다 — 비교 단위가 **경로 집합**이지 문장이 아님을 잰다 |
| **Ctrl-3** | 좌표 이동 | 인용된 파일이 자라서 `:NN` 이 밀린다 — (I4) 가 라인을 판정에서 뺀 이유이며 오늘 하루 12+커밋이 이 클래스였다 |
| **Ctrl-4** | 도출 명령의 등가 재작성 | 같은 사용처 집합을 내는 다른 도출 명령(`grep -rn` → `grep -rl` + 제외 규칙 변경)으로 바꾼다. **명령 문자열을 고정값으로 잠근 게이트는 여기서 붉는다** — `REQ-20260831-077` 의 효력면 축이 이 계약에 적용되는 자리다 |

> **Ctrl-4 가 배터리의 핵심이다.** Ctrl-1~3 만 두면 "도출 명령이 이 문자열과 같은가" 를 재는 구현이 통과하는데, 그 구현은 도출 **결과**를 한 번도 실행하지 않는다. 그 형태는 오늘 이 저장소에서 세 번 관측된 대리 표면 결함과 같은 부류다.

### 관련

- **원 req**: `specs/60.done/2026/08/31/req/20260831-spec-dependency-consumer-list-derivation.md` (REQ-20260831-074). 출처: 운영자 결함 신고 `20260831-1011-tilde-spec-dependency-list-wrong.md`.
- **자매 사건**: `markdown-emphasis-delimiter-parity` (I6) 이 `~~` 착지로 거짓이 됐는데 아무 채널도 붉지 않아 `32cbcd1` 로 사후 격리됐다. 산문 축 표류가 승격을 통과한 두 번째 사례다.
- **선례 채널**: `scripts/check-blue-judgement-evaluable.sh` (`TSK-20260831-12`). 그 스크립트 머리말이 기원을 적고 있다 — *"`b793703` 하나가 판정 명령 54건을 한꺼번에 무효화했고 그 뒤 190 커밋과 7 promote 가 감지 없이 지나갔다."* **같은 사건이 산문 축에도 같은 일을 했고**(부재 경로 6건이 그 잔해다) 차이는 감시자의 유무뿐이다.
- **인접 (겹치지 않음)**: `REQ-20260825-021` · `REQ-20260826-027` · `REQ-20260826-028` — 전부 판정 **명령** 축.
