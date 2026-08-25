# 테스트 더블은 대체 대상의 반환 형상을 보존한다

> **위치**: 횡단 테스트 런타임 계약. 대체 대상 선언은 `src/common/common.ts`, 더블 설치 지점은 `src/**/*.test.{js,jsx,ts,tsx}`.
> **관련 요구사항**: REQ-20260825-017 (test-double-return-shape-fidelity)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 222 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`ff699f9`).

## 역할

테스트 더블이 대체하는 함수의 **반환 형상**(동기 값 / `Promise`)은 대체 대상의 선언과 일치한다. 동기 술어를 `mockResolvedValue` 로 대체하는 것처럼 **프로덕션에서 성립 불가능한 형상**을 주입하지 않는다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며, `§역할` 이 요구하는 대로 **방어 대상을 명시한다**: 이 계약이 막는 것은 "테스트가 초록인데 제품의 비-admin 차단 경로가 한 번도 실행되지 않는" silent regression 이다. 그 상태는 기존 자동 게이트 어느 것도 검출하지 못한다 — `tsc --noEmit`·`eslint --max-warnings=0`·`npm test`·`check:*` 15종 전부 HEAD=`ff699f9` 에서 `rc=0` 이다.

**위반은 테스트를 붉게 만들지 않는다. 오히려 단언을 무력화해 초록을 만든다.** 그래서 테스트 자신이 이 축의 판정자가 될 수 없다.

이 계약이 의도적으로 하지 않는 것:
- (i) **프로덕션 코드의 변경.** 본 축에서 프로덕션은 옳다 (§동작 (T-0) 의 진단 정정).
- (ii) 단언 민감도 자체 — 별 축이다.
- (iii) 실제로 비동기인 대상(`copyToClipboard` 의 `Promise<boolean>` · api 모듈 함수)의 `mockResolvedValue` — 정합이므로 대상이 아니다.
- (iv) 강제 **수단**(타입 강화 / 정적 게이트 / 헬퍼 래퍼) — planner·developer 영역.
- (v) `.jsx` 테스트 파일을 타입 검사 대상으로 편입할지(`checkJs`) — 별 축이며 본 계약은 그 결정에 의존하지 않는다.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (테스트 런타임 정합 계약). 관측 표면은 (a) 더블이 설치된 테스트 파일의 라인, (b) 그 더블을 소비하는 프로덕션 분기의 실행 여부다.

## 동작

**(T-0) 대체 대상은 동기 함수다 — 원 followup 의 진단은 정정됐다.**

```ts
// src/common/common.ts:162
export function isLoggedIn(): boolean {
// src/common/common.ts:169
export function isAdmin(): boolean {
```

두 함수 모두 `boolean` 을 동기 반환하며 `Promise` 반환 경로가 없다. 원 followup 은 `[object Promise]` 관측을 근거로 `src/Comment/Comment.tsx:127` 의 `await` 누락을 원인으로 지목했으나, **관측은 정확하고 귀속이 틀렸다** (`RULE-05 §결함 신고 재정식화`). `await` 를 추가하면 `boolean` 을 `await` 하는 무의미한 코드가 되고 `getComments(timestamp: number, admin: boolean)` 계약은 그대로다. 고쳐야 할 것은 테스트 더블이다. **이 정정 없이 spec 이 섰으면 정상 코드를 훼손하는 task 가 발행됐다.**

**(T-1) 반환 형상 일치** — 테스트 더블의 반환 형상은 대체 대상 함수의 선언 반환 형상과 일치한다. 동기 술어(`(): boolean`)를 `mockResolvedValue` / `mockResolvedValueOnce` 로 대체하는 지점이 `src/**` 에 0건이다.

HEAD=`ff699f9` 실측 위반 **67 라인 / 8 파일**:

| 파일 | hits |
|---|---|
| `src/Log/Writer.test.jsx` | 20 |
| `src/Log/LogItem.test.jsx` | 14 |
| `src/Log/LogSingle.test.jsx` | 10 |
| `src/Log/Log.test.jsx` | 8 |
| `src/common/Navigation.test.tsx` | 6 |
| `src/App.test.jsx` | 4 |
| `src/common/UserLogin.test.tsx` | 4 |
| `src/Comment/Comment.test.tsx` | 1 |

대조군(준수 사례): `src/Comment/CommentItem.test.tsx:40` `vi.spyOn(common, 'isAdmin').mockReturnValue(false);` — **두 표기가 같은 트리에 공존하며 어느 쪽이 옳은지 강제하는 것이 없다.** 그것이 이 계약이 세워지는 이유다.

**(T-2) 귀결 α — 프로덕션이 낼 수 없는 요청이 실제로 나간다.**

```ts
// src/Comment/Comment.tsx:127
const res = await getComments(timestamp as number, isAdmin());
// src/Comment/api.ts:19
return await fetch(getApiUrl() + "?logTimestamp=" + timestamp + "&isAdmin=" + admin);
```

`admin: boolean` 자리에 `Promise` 가 들어가 문자열 연결에서 `[object Promise]` 로 직렬화된다. 실측 로그 — `GET …?logTimestamp=1656034616036&isAdmin=[object%20Promise]` 가 `request:unhandled` 로 이어진다. **프로덕션은 이 URL 을 만들 수 없다.** 즉 그 테스트가 재고 있는 것은 제품의 동작이 아니다.

**(T-3) 귀결 β — 음성 분기가 양성 분기를 실행한다. 이쪽이 더 무겁다.**

`Promise.resolve(false)` 는 객체이므로 **truthy** 다. 따라서 `mockResolvedValue(false)` 는 "false 를 반환한다" 가 아니라 **"항상 참으로 평가되는 값을 반환한다"** 이다.

- `src/common/Navigation.tsx:24` `if(isAdmin())` — `mockResolvedValue(false)` 로 "not admin" 을 선언한 케이스가 **admin 분기를 실행**한다. 그 테스트의 단언(`href === null || /^https?:\/\//.test(href)`)은 어느 분기가 실행됐는지에 무관하므로 초록이다.
- `src/Monitor/Monitor.jsx:46` `if(!isAdmin())` · `src/File/File.tsx:68` `if(!isAdmin())` — `!Promise` 는 항상 `false` 이므로 **비-admin 접근 차단 경로는 어떤 테스트에서도 실행된 적이 없다.**

**(T-4) 판정의 도출성** — 정합 판정의 대상 함수 목록은 **하드코딩이 아니라 선언으로부터 도출**된다 (`RULE-06 §열거 고정 금지`). `isAdmin`·`isLoggedIn` 2개만 박아 두면 세 번째 동기 술어가 사각으로 남는다.

**(T-5) 특이도** — 실제로 `Promise` 를 반환하는 대상의 정합한 `mockResolvedValue` 는 오탐되지 않는다. HEAD=`ff699f9` `mockResolvedValue` 총 **126 hit** 중 위반은 **67**, 나머지 **59** 는 정합이다 (예: `src/File/FileItem.test.tsx:74` `copyToClipboard` — `src/common/common.ts:413` `Promise<boolean>`).

## 의존성

- 외부: `vitest` (`vi.spyOn` · `mockResolvedValue` · `mockReturnValue`).
- 내부: `src/common/common.ts` 의 export 선언이 판정의 **단일 진리원**이다.
- 인접 계약: `testing/network-egress-isolation` — (T-2) 의 미핸들 요청은 그 계약의 전역 차단이 잡는 표면과 겹치나, 그쪽은 "요청이 나가는가" 를, 본 계약은 "왜 그런 요청이 조립되는가" 를 판정한다.

## 회귀 중점

- **(R-1) 열거 고정으로의 회귀.** 판정을 `isAdmin|isLoggedIn` 리터럴로 되돌리면 `common.ts` 에 추가되는 동기 술어가 그대로 사각이 된다. HEAD 실측 도출 결과는 **12개**이며 그중 2개만 현재 위반 대상이다 — 나머지 10개는 아직 위반이 없을 뿐 판정 범위 안에 있어야 한다.
- **(R-2) `mockReturnValue` 로의 일괄 치환이 만드는 오회복.** 67건을 기계적으로 바꾸면 (T-3) 이 처음으로 참인 음성 분기를 실행시키므로 **일부 테스트가 붉어지는 것이 정상**이다. 붉어진 단언을 완화해 초록으로 되돌리는 것은 회복이 아니다 — 그 분기가 처음 실행된 것이고, 실패는 제품이나 단언의 실제 상태를 알려준다.
- **(R-3) 프로덕션 `await` 추가로의 오회복.** (T-0) 이 배제한 방향이다. `Comment.tsx:127` 에 `await` 를 넣으면 `[object Promise]` 는 사라지지만 더블은 여전히 형상을 위반하고 (T-3) 의 truthy 문제는 그대로 남는다 — 증상만 지우고 원인을 보존하는 최단 경로다.
- **(R-4) 특이도 붕괴.** 패턴을 `\.mockResolvedValue` 로 넓히면 정합한 59건이 위반으로 계수된다. 판정은 반드시 **대체 대상의 선언 형상**과 짝지어야 한다.
- **(R-5) 채널을 테스트로 두는 회귀.** 위반은 테스트를 붉게 만들지 않으므로, 판정 채널을 "그 테스트가 통과하는가" 로 두면 검출력이 0 이다 (T-1 §역할).

## 발화 채널

**HEAD=`ff699f9` 에 이 축의 발화 채널이 없다.** `check:*` 15종 중 반환 형상 정합을 재는 것 0, `npm test` 수집 경로에 이 축의 단언 0.

| 게이트 | HEAD=`ff699f9` 채널 | 상태 |
|---|---|---|
| T-1 / T-4 (형상 일치·도출성) | 없음 (정적 판정은 §수용 기준) | **부착 필요** |
| T-3 (truthy 전제) | 없음 — 전제 자체는 §수용 기준에서 판정 가능 | 계약 서술 + 전제 박제 |
| T-5 (특이도) | 없음 | **부착 필요** |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다. **채널은 테스트 성공/실패와 독립이어야 한다** — `package.json` `scripts.check:*` 또는 `.husky/*` 가 적격이고, 위반 파일 자신의 통과 여부는 부적격이다 ((R-5)).

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** 아래는 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향을 보존한 채 **채널 부착 task 의 `## 검증/DoD`** 로 이관한다. `RULE-04` notes 에 `injection: 2/2 detect` 박제. **이관처 task 가 발행되기 전까지 귀속처는 이 절의 명시적 지시다** (이관처 없는 강등 금지).

- (Dir-1) 동기 술어에 `mockResolvedValue` 1건 주입 → `rc≠0` 확인 → 원복 → `rc=0`.
- (Dir-2) 실제 `Promise` 반환 대상(`copyToClipboard`)의 정합한 `mockResolvedValue` 가 **오탐되지 않음** 확인 → `rc=0` 유지. (T-5) 의 직접 대응이며, 이 방향이 없으면 `\.mockResolvedValue` 전면 금지 게이트가 (Dir-1) 만으로 통과한다.

## 테스트 현황

- [x] 대조군 정합 표기 실재 — `src/Comment/CommentItem.test.tsx:40` `mockReturnValue(false)`.
- [ ] 위반 0 — HEAD **67 라인 / 8 파일**. (T-1) 의 부착 대상.
- [ ] 선언 도출형 판정 채널 — HEAD 0건. (T-4) 의 부착 대상.
- [ ] 비-admin 차단 경로의 실제 실행 — `Monitor.jsx:46` · `File.tsx:68` 의 `!isAdmin()` 갈래는 (T-3) 때문에 어떤 테스트에서도 실행된 적이 없다. 더블 형상 교정 이후에야 관측 가능해진다.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` · `package.json` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`ff699f9` 기준 1/4** — 신규 등록이며 (T-3) 전제만 충족이다.

- [ ] (Must, T-1/T-4) 선언 도출형 위반 0 — 대상 목록을 `src/common/common.ts` 의 **동기 반환 export 선언에서 도출**해, 그 이름에 `mockResolvedValue` 를 설치하는 지점이 0 이다. 판정:
  ```
  node -e 'const fs=require("fs"),p=require("path");const d=fs.readFileSync("src/common/common.ts","utf8");const sync=[...d.matchAll(/export function ([A-Za-z0-9_]+)\s*\([^)]*\)\s*:\s*(?!Promise)([A-Za-z<>\[\]|{} ]+?)\s*\{/g)].map(m=>m[1]);if(sync.length===0){console.error("derive=0 vacuous");process.exit(2)}const Q=String.fromCharCode(39),D=String.fromCharCode(34);let n=0;const walk=x=>fs.readdirSync(x,{withFileTypes:true}).forEach(e=>{const f=p.join(x,e.name);if(e.isDirectory())walk(f);else if(/\.test\.[jt]sx?$/.test(f)){fs.readFileSync(f,"utf8").split("\n").forEach((l,i)=>sync.forEach(fn=>{if(l.includes("spyOn")&&l.includes("mockResolvedValue")&&(l.includes(Q+fn+Q)||l.includes(D+fn+D))){n++;console.error(f+":"+(i+1)+" "+fn)}}))}});walk("src");console.log("sync-predicates="+sync.length+" violations="+n);process.exit(n===0?0:1)'
  ```
  → **rc=0**. **HEAD=`ff699f9` 실측 rc=1 / `sync-predicates=12 violations=67` → 미충족.** **tick 222 는 이 명령을 문면 그대로 실행해 확인했다** — 초안은 `new RegExp('…\\s*\\)…')` 형태였는데 JS 문자열 리터럴이 `\s`·`\)` 의 백슬래시를 먹어 `Unmatched ')'` 로 죽었다 (rc=1 이 **위반 검출이 아니라 문법 오류**였다). 정규식 조립을 `includes` 3중 조건으로 교체했고, 따옴표는 `String.fromCharCode(39/34)` 로 만들어 셸 인용 계층과 충돌하지 않게 했다. **판정 명령은 박제 전에 실행해야 한다** — 실행하지 않으면 `rc≠0` 이라는 사실만으로 미충족처럼 보이고, 착지 후에도 영원히 `rc≠0` 인 게이트가 남는다. **공허 통과 가드 내장** — 도출 결과가 0 이면 `exit 2` 다. 도출이 무너지면 "위반 0" 은 무조건 참이 되고, 그 상태가 정상 트리에서 초록을 내며 정착한다. ack 라인이 `sync-predicates=12` 로 **비공허**임을 수치로 함께 낸다. **검출 경계 (과신 금지)**: 도출은 `export function` 선언 형태만 훑는다. `export const f = () => …` 형태의 동기 술어는 현 HEAD `common.ts` 에 없으나 (실측) 이 판정의 **선언된 경계 밖**이다 — 미검출일지언정 미기록이 아니다. 반대로 이 경계 덕에 `copyToClipboard` (`:413` `export const … async … Promise<boolean>`) 는 자연히 제외되어 (T-5) 특이도가 성립한다.
- [x] (Must, T-3 전제) `Promise.resolve(false)` 는 truthy 다 — `bash -c 'test "$(node -e "console.log(Boolean(Promise.resolve(false)))")" = "true"'` → **rc=0**. **HEAD=`ff699f9` 실측 `true` → 충족.** 자명해 보이지만 이 항목이 **귀결 β 전체의 전제**다 — 이것이 거짓이면 `mockResolvedValue(false)` 로 선언한 음성 케이스가 실제로 음성이고 (T-3) 의 근거가 사라진다. 전제와 귀결을 한 문서에서 함께 재판정할 수 있게 박제한다.
- [ ] (Must, T-1 회귀 부재) 교정이 기존 테스트를 깨지 않는다 — `bash -c 'npx vitest run src/common/Navigation.test.tsx src/Log/LogSingle.test.tsx >/dev/null 2>&1 || npx vitest run src/common/Navigation.test.tsx src/Log/LogSingle.test.jsx >/dev/null 2>&1'` → rc=0. **HEAD=`ff699f9` 실측 rc=0 이나 (T-1) 미충족 상태의 통과이므로 단독으로는 판정력이 없다** — 본 항목은 (T-1) 과 **함께** `[x]` 일 때만 의미를 갖는 **동반 조건**이다. 다만 (R-2) 대로 교정 직후 일부 단언이 붉어지는 것은 **정상**이며, 그 경우 회복 경로는 단언 완화가 아니라 처음 실행된 분기에 대한 판정이다.
- [ ] (Must, T-4 채널 등재) 판정 채널이 저장소에 등재되고 **테스트 성공/실패와 독립**으로 발화한다 — `bash -c 'node -e "const s=require(\"./package.json\").scripts;process.exit(Object.keys(s).some(k=>/^check:/.test(k)&&/(double|mock|return-shape|shape)/.test(k))?0:1)"'` → rc=0. **HEAD=`ff699f9` 실측 rc=1 → 미충족** (`check:*` 15종 중 0). **vitest 수집 경로를 이 항목의 대안으로 두지 않았다** — 위반은 테스트를 붉게 만들지 않으므로 테스트 채널은 이 축에서 검출력을 갖지 못한다 ((R-5)). `RULE-07 §promote 조건 4` 의 실경로 요건이며, 채널 부재는 promote 차단이 아니라 채널 부착 task 발행의 선행 조건이다.

## 참고

- **REQ 원문**: `20.req/20260825-test-double-return-shape-fidelity.md` (REQ-20260825-017, slug 식별).
- 소비한 followup: `20260825-1525-comment-api-isadmin-unawaited-promise` — **진단을 정정해 흡수했다** (§동작 (T-0)).
- 관련 blue spec: `30.spec/blue/common/test-idioms.md`, `30.spec/blue/common/test-helpers.md`, `30.spec/blue/testing/console-error-runtime-zero.md`.

### 미측정·비판정 항목

- **(미측정) 67 위반 중 교정 후 실제로 붉어지는 테스트의 수.** 교정 전에는 알 수 없다 — 음성 분기가 처음으로 실행되므로 단언이 그 분기를 견디는지는 미지다. 착지 시 관측 대상이지 판정 기준이 아니다.
- **(중복 게이트) `npm run typecheck` rc=0.** 현 HEAD 에서 이미 참이고 위반 시 기존 자동 게이트(`husky pre-push` · CI)가 즉시 실패하므로 본 문서의 체크박스로 두지 않는다 (`RULE-07 §반려 시그널` 3번째 항).
- **(가정 주입 요구 — 이관) 게이트의 검출력·특이도.** (Dir-1)(Dir-2) 로 채널 부착 task DoD 에 이관했다 (§발화 채널). 이관처 task 가 발행되기 전까지 귀속처는 그 절의 명시적 지시다.
- **(별 축) `.jsx` 테스트 파일의 `checkJs` 편입 여부.** 본 계약은 그 결정에 의존하지 않는다 — 판정이 타입 검사기가 아니라 선언 도출 + 정적 스캔이기 때문이다.
- **(별 축) `(T-2)` 미핸들 요청의 차단.** `testing/network-egress-isolation` 이 이미 규정한다. 본 계약은 그 요청이 **왜 조립되는가** 만 닫는다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-017 (inspector tick 222) | 최초 등록. followup 1건을 **진단 정정해** 흡수한 req 를 불변식으로 반영 (`RULE-05 §결함 신고 재정식화`) — 관측(`isAdmin=[object Promise]`)은 정확하고 귀속(프로덕션 `await` 누락)이 틀렸으며, 그 정정 없이 spec 이 섰으면 정상 코드를 훼손하는 task 가 발행됐다. **req 수용 기준 6항을 그대로 쓰지 않았다**: (a) `grep -rnE "\"(isAdmin\|isLoggedIn)\")\.mockResolvedValue…"` 는 **열거 고정**이라 `RULE-06` 위반이자 req 자신의 FR-04 와 모순이다 — `common.ts` 의 동기 export 선언에서 대상을 **도출**하는 판정으로 교체해 실측 `sync-predicates=12 violations=67` 을 얻었다 (열거판과 동일한 67 이면서 사각이 없다). **공허 통과 가드**(도출 0 → `exit 2`)를 신규 부착했다 — 도출이 무너지면 "위반 0" 이 무조건 참이 되는 자리다. (b) `npm run typecheck rc=0` 은 **중복 게이트 부류**라 §참고로 강등했다. (c) `npx vitest run … rc=0` 두 항은 (T-1) 미충족 상태에서도 통과하므로 **동반 조건**임을 명시해 한 항목으로 합쳤다. (d) 채널 등재 항목에서 **vitest 수집 경로를 대안에서 제외**했다 — 위반이 테스트를 붉게 만들지 않는다는 것이 이 축의 전제이므로 테스트 채널은 검출력 0 이다. **신규 추가 (req 에 없던 항목)**: (R-2) `mockReturnValue` 일괄 치환 후 붉어진 단언을 완화하는 오회복, (R-3) 프로덕션 `await` 추가로의 오회복((T-0) 이 배제한 방향의 재발), (R-5) 채널을 테스트로 두는 회귀, 그리고 §수용 기준 (T-1) 의 **검출 경계 명시** — 도출이 `export function` 형태만 훑는다는 사실을 미검출일지언정 **미기록이 아니게** 박제했다. | all |
