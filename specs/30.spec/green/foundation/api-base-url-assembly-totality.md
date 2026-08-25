# API base URL 도출은 총함수이며 미정의가 URL 로 직렬화되지 않는다

> **위치**: `src/{Log,Monitor,Image,Comment,Search,File}/api.{js,ts}` 의 base URL 도출부와 URL 문자열 조립부. 환경 키 선언은 `src/types/env.d.ts`, mode 술어는 `src/common/env.ts`.
> **관련 요구사항**: REQ-20260825-016 (api-base-url-assembly-totality)
> **최종 업데이트**: 2026-08-25 (by inspector — tick 222 최초 등록)

> 참조 코드는 **식별자 우선, 라인 번호 보조**. 라인 번호는 스냅샷 (`ff699f9`).

## 역할

각 도메인 api 모듈의 base URL 도출은 **총함수**다 — 모든 런타임 환경 상태에서 문자열을 반환하거나 **명시적으로 실패**한다. 정의되지 않은 값이 문자열 연결을 거쳐 URL 로 승격되는 경로가 없다.

`RULE-07 §주제 우선순위` 귀속은 **2순위 (토큰·설정 정합)** 이며 `§역할` 이 요구하는 대로 **방어 대상을 명시한다**: 이 계약이 막는 것은 미정의 base URL 이 `"undefined?limit=10"` 이라는 **상대 URL** 로 조립돼 자기 origin 에 요청이 나가고, SPA 폴백이 `index.html` 을 200 으로 돌려주면 뒤따르는 `res.json()` 이 파싱 오류로 깨지는 silent regression 이다. **요청 실패가 아니라 잘못된 성공이 된다.**

이 계약이 의도적으로 하지 않는 것:
- (i) `.env*` 파일의 값 선택·호스트명 정책 — `testing/network-egress-isolation` 이 이미 별 축으로 선언했다.
- (ii) 총성 확보 **수단**(기본값 / 예외 throw / 단일 도출 모듈 / 빌드타임 검증) — planner·developer 영역.
- (iii) `isDev()`/`isProd()` 자체의 의미 변경.
- (iv) 표기의 통일. 정합해야 할 것은 표기가 아니라 **총성(totality)** 이다.

## 공개 인터페이스

본 계약은 공개 인터페이스를 갖지 않는다 (모듈 내부 도출 계약). 관측 표면은 각 api 함수가 `fetch` 에 전달하는 **URL 문자열**이다.

## 동작

### (A-1) 도출의 총성

HEAD=`ff699f9` 실측 — glob 산출 **7 도출 지점** 중 **5 총함수 / 2 부분함수**:

| 모듈 | 선언 | 마지막 실행문 | 판정 |
|---|---|---|---|
| `src/Comment/api.ts:13` | `const getApiUrl = (): string => {` | `return BASE + "/test";` | **총함수** |
| `src/Search/api.ts:4` | `const getApiUrl = (): string => {` | `return BASE + "/test";` | **총함수** |
| `src/File/api.ts:4` | `const getApiUrl = (): string => {` | `return BASE + "/test";` | **총함수** |
| `src/Monitor/api.js:4` | `export const getAPI = () => {` | `return BASE + "/test";` | **총함수** |
| `src/Monitor/api.js:9` | `const getApiUrl = () => {` | `return getAPI();` | **총함수** (위임) |
| `src/Log/api.js:6` | `const getApiUrl = () => {` | `if (isDev()) return BASE + "/test";` | **부분함수** — else 절이 없어 함수 끝에서 떨어진다 |
| `src/Image/api.ts:4` | `const getApiUrl = (): string \| undefined => {` | `return undefined;` | **부분함수** — 명시적 미정의 |

같은 파생을 수행하는 지점들이 두 개의 서로 다른 계약을 가진다.

### (A-2) 미정의의 URL 승격 금지

base URL 이 확정되지 않은 상태에서 URL 문자열을 조립해 `fetch` 에 넘기는 경로가 없다. 미정의는 **조용한 상대 URL** 이 아니라 관측 가능한 실패가 된다.

```js
// src/Log/api.js:14
return await fetch(getApiUrl() + "?limit=" + limit + admin);
```

`getApiUrl()` 이 `undefined` 면 `undefined + "?limit=10"` → 문자열 `"undefined?limit=10"`. 동일 형태가 `src/Log/api.js:18, 22, 33, 55, 65` · `src/Monitor/api.js:14, 18, 22, 26` · `src/Image/api.ts:15` 에 반복된다.

**비용은 이미 실현됐다.** 전역 egress 차단 계측(TSK-20260825-14) 중 `src/App.test.jsx` 에서 **4건**이 미정의 origin 으로 조립돼 나갔다. Node 의 `fetch` 가 `Failed to parse URL` 로 즉시 거절하고 호출부가 rejection 을 삼켰기 때문에 **네트워크 로그에도 타임아웃에도 남지 않았고, 테스트는 초록이었다.** 부수 계측이 아니었으면 관측되지 않았을 결함이다.

### (A-3) 계약의 동형성

도출 지점의 계약이 모듈마다 갈리지 않는다. 구체적으로 **미정의 가능성을 반환 타입으로 선언하는 모듈이 0** 이다 — `(A-1)` 의 총성이 전수 성립하면 `string | undefined` 선언은 근거를 잃는다.

> `.js` 모듈(`Log`·`Monitor`)은 타입 주석을 가질 수 없으므로 "주석 문자열의 일치" 를 요구하지 않는다. 요구하는 것은 **총성**과 **미정의 선언 부재** 두 가지다.

### (A-4) 타입 계약의 소거 금지

도출 결과의 미정의 가능성을 타입 단언으로 지우는 지점이 `src/**` 에 없다.

```ts
// src/Image/api.ts:11
return await fetch(getApiUrl() as string);
```

`getApiUrl` 은 `string | undefined` 를 **정직하게 선언한 유일한 모듈**인데, 그 선언을 소비 지점에서 `as string` 으로 즉시 지운다. **위험을 타입으로 표현한 유일한 곳이 유일하게 캐스팅으로 그것을 버린다.**

이 캐스팅은 **기존 게이트를 정확히 비껴간다.** `scripts/check-vite-env-coherence.sh:37` 의 G1 패턴은 `import\.meta\.env\.VITE_[A-Z_]+[[:space:]]+as[[:space:]]+string` 이라 `import.meta.env.VITE_X as string` 만 잡는다. `getApiUrl() as string` 은 **함수 결과에 대한 캐스팅**이라 hit 하지 않는다 — **같은 병리의 한 칸 옆이 무방비다.**

### (A-5) 선언과 실재의 괴리

`src/types/env.d.ts:4` 는 `readonly VITE_LOG_API_BASE: string` 으로 선언하지만 **런타임 보장이 아니다**. 해당 키가 `.env*` 에 없으면 값은 `undefined` 이고 `BASE + "/prod"` 는 `"undefined/prod"` 가 된다 — 총성이 성립해도 이쪽으로 같은 결과에 도달한다. 타입 선언과 런타임 실재 사이에 검증 지점이 있어야 한다.

## 의존성

- 외부: Vite (`import.meta.env`), 런타임 `fetch`.
- 내부: `src/common/env.ts` (`isDev`/`isProd`), `src/types/env.d.ts`.
- 인접 계약: `foundation/vite-env-boundary-typing` — 본 계약의 (A-4) 가 그 §G1 캐스팅 금지 축의 **인접 사각**을 지목한다. `testing/network-egress-isolation` — (A-2) 의 유출 요청이 그 전역 차단에 걸리나, 그쪽은 "나가는가" 를, 본 계약은 "왜 그런 URL 이 조립되는가" 를 판정한다.

## 회귀 중점

- **(R-1) 열거 고정으로의 회귀.** 판정 대상을 6 모듈 리터럴로 박으면 7번째 도메인이 추가될 때 사각이 된다. 판정은 `src/**/api.{js,ts}` glob 산출로 한다 (`RULE-06 §열거 고정 금지`). HEAD 실측 도출 **7 지점** — 모듈 6개에 `Monitor` 의 위임 1개가 더해진 수다.
- **(R-2) 표기 통일로의 오회복.** `Image/api.ts` 의 `string | undefined` 선언을 `string` 으로 바꾸고 `return undefined` 를 남기면 (A-3) 은 초록이 되고 (A-1) 은 여전히 위반이다 — **정직한 선언만 사라지고 결함은 남는다.** 순서는 총성 확보가 먼저다.
- **(R-3) `as string` 확산.** (A-1) 을 닫지 않은 채 (A-4) 만 요구하면 캐스팅이 `!` 나 `?? ""` 로 이름을 바꿔 살아남는다. `?? ""` 는 특히 위험하다 — 빈 base 는 `"?limit=10"` 이 되어 **여전히 상대 URL** 이다.
- **(R-4) 게이트를 넓은 패턴으로 세우는 회귀.** `as string\)` 은 무관한 5건(`Toaster.tsx:61` · `FileItem.tsx:54,84,98` · `build-policy-and-vitest-config-coherence.test.ts:120`)을 함께 잡는다. 판정은 **도출부 한정 패턴**이어야 한다.
- **(R-5) 마지막 `return` 의 순진한 판정.** `\breturn\b[^\n]*\n\}` 형태는 조건부 tail return(`if (isDev()) return …`)을 무조건 반환으로 **오판**한다. 그 패턴으로는 `Log/api.js` 가 총함수로 통과한다.

## 발화 채널

**HEAD=`ff699f9` 에 이 축의 발화 채널이 없다.**

| 게이트 | HEAD=`ff699f9` 채널 | 상태 |
|---|---|---|
| A-1 / A-3 (총성·동형성) | 없음 (정적 판정은 §수용 기준) | **부착 필요** |
| A-2 (URL 승격 금지) | 없음 — `tsc --noEmit` 은 `.js` 2 모듈을 보지 않는다 (`tsconfig.json:12` `"checkJs": false`) | **부착 필요** |
| A-4 (캐스팅 소거 금지) | `scripts/check-vite-env-coherence.sh:37` G1 — **함수 결과 캐스팅은 미검출** | 부분 존재 (인접 사각) |
| A-5 (선언·실재 괴리) | 없음 — 기존 G2 는 키 **선언 존재**만 보고 값 실재는 보지 않는다 | **부착 필요** |

`RULE-07 §promote 조건 4` 에 따라 채널 부재는 promote 차단이 아니라 **채널 부착 task 발행을 선행 조건**으로 한다.

> **관측 표면 주의** (`RULE-06 §관측 표면`) — (A-2) 의 판정은 "조립 코드가 어떻게 생겼는가" 가 아니라 **`fetch` 에 실제로 전달된 URL 문자열**이다. rejection 을 호출부가 삼키므로 (실측 4회 발생하고도 초록) 신호는 조립 지점에서 발생하는 **판별 가능한 오류**여야 한다.

**게이트 실효 검증의 이관처 (RULE-07 §처리 · RULE-06 §게이트 실효 검증).** 아래는 **'가정 주입 요구' 부류**라 본 spec 의 체크박스가 아니며, 검출 방향을 보존한 채 **채널 부착 task 의 `## 검증/DoD`** 로 이관한다. `RULE-04` notes 에 `injection: 3/3 detect` 박제. **이관처 task 가 발행되기 전까지 귀속처는 이 절의 명시적 지시다** (이관처 없는 강등 금지).

- (Dir-1) 총함수를 부분함수로 되돌린다(마지막 `return` 을 조건부로 변경) → `rc≠0` 확인 → 원복 → `rc=0`.
- (Dir-2) `getApiUrl() as string` 형태의 캐스팅을 1건 주입 → `rc≠0` 확인 → 원복 → `rc=0`.
- (Dir-3) **총함수를 부분함수로 되돌리되 `?? ""` 로 감싼다** → `rc≠0`. (R-3) 의 직접 대응이며, 이 방향이 없으면 빈 base 로 상대 URL 이 되는 오회복이 (Dir-1)(Dir-2) 를 통과한다.

## 테스트 현황

- [ ] 도출 총성 전수 — HEAD **7 중 2 부분함수** (`Log/api.js` · `Image/api.ts`). (A-1) 의 부착 대상.
- [ ] 도출부 캐스팅 0 — HEAD **1 hit** (`Image/api.ts:11`). (A-4) 의 부착 대상.
- [ ] base 미확정 상태의 조립 픽스처 — HEAD 0건. (A-2) 의 부착 대상.
- [ ] `VITE_*_API_BASE` 런타임 실재 검증 — HEAD 0건. (A-5) 의 부착 대상.

## 수용 기준

> 전 항목 명령 1회로 rc 판정 가능 (RULE-07 §수용 기준 문장 규약). 측정 명령은 `src/**` · `scripts/**` · `package.json` 만 참조한다 (spec 자신의 green/blue 경로 미참조 — RULE-07 §promote 조건 2). **HEAD=`ff699f9` 기준 0/4** — 신규 등록이며 전 항목 미충족이 정상이다.

- [ ] (Must, A-1/A-3) 도출 총성 전수 — `src/**/api.{js,ts}` 의 base URL 도출 지점을 **glob 으로 산출**해, 각 본문의 **마지막 실행문이 무조건 `return`** 이고 그 `return` 이 미정의가 아니다. 판정:
  ```
  node -e 'const fs=require("fs"),p=require("path");let mods=[],bad=[];const walk=x=>fs.readdirSync(x,{withFileTypes:true}).forEach(e=>{const f=p.join(x,e.name);if(e.isDirectory())walk(f);else if(/\/api\.(js|ts)$/.test(f)&&!/\.mock\./.test(f)){const s=fs.readFileSync(f,"utf8");const re=/(?:export\s+)?const\s+(getApiUrl|getAPI)\s*=\s*\([^)]*\)\s*(?::[^=]*)?=>\s*\{/g;let m;while((m=re.exec(s))){let i=re.lastIndex,d=1;while(i<s.length&&d>0){const c=s[i];if(c==="{")d++;else if(c==="}")d--;i++}const body=s.slice(re.lastIndex,i-1);const st=body.split("\n").map(t=>t.trim()).filter(Boolean).filter(t=>!t.startsWith("//"));const last=st[st.length-1]||"";const total=/^return\b/.test(last)&&!/^return\s+undefined\s*;?$/.test(last);mods.push(f+":"+m[1]+(total?" TOTAL":" PARTIAL last="+JSON.stringify(last)));if(!total)bad.push(f+":"+m[1])}}});walk("src");if(mods.length===0){console.error("derive=0 vacuous");process.exit(2)}mods.forEach(x=>console.error(x));console.log("api-derivations="+mods.length+" partial="+bad.length);process.exit(bad.length===0?0:1)'
  ```
  → **rc=0**. **HEAD=`ff699f9` 실측 rc=1 / `api-derivations=7 partial=2` → 미충족.** **공허 통과 가드 내장** — 도출 결과가 0 이면 `exit 2` 다. ack 라인이 `api-derivations=7` 로 **비공허**임을 수치로 함께 낸다. 판정이 **마지막 실행문**을 보는 이유는 (R-5) 참조 — 순진한 tail-return 패턴은 `if (isDev()) return …` 을 총함수로 오판해 `Log/api.js` 를 통과시킨다. 주석 행은 판정에서 제외한다. 대조군 확인 — 같은 명령이 `Comment`·`Search`·`File`·`Monitor` 4 모듈 5 지점을 `TOTAL` 로 분류한다 (실측). 즉 이 판정은 총성을 **실제로 구별한다**.
- [ ] (Must, A-4) 도출부 캐스팅 0 — `bash -c 'test "$(grep -rnE "get(ApiUrl|API)\(\)[[:space:]]+as[[:space:]]+[A-Za-z]" src --include="*.ts" --include="*.tsx" | wc -l)" -eq 0'` → **rc=0**. **HEAD=`ff699f9` 실측 rc=1 / 1 hit (`src/Image/api.ts:11`) → 미충족.** 넓은 패턴 `as string\)` 을 쓰지 않는 이유는 (R-4) 참조 — 무관한 5건을 함께 잡는다. 반대로 기존 `check:vite-env` 의 G1 패턴은 `import.meta.env.VITE_*` 직접 캐스팅만 보므로 이 지점을 **한 칸 차이로 놓친다**. 캐스팅 대상 타입을 `string` 리터럴로 고정하지 않은 것은 `as unknown as string` 류 우회를 함께 덮기 위함이다.
- [ ] (Must, A-2) base 미확정 상태에서 `"undefined"` 를 포함한 URL 로 `fetch` 가 호출되지 않는다 — 그 상태를 구성한 픽스처가 테스트 파일로 실재하고 `npx vitest run <파일>` 이 rc=0 이다. **HEAD=`ff699f9` 실측 — 픽스처 0건 → 미충족.** 파일 경로는 채널 부착 task 가 확정하며 확정 시 이 항목에 박제한다. **판정을 `fetch` 인자로 하는 이유**: 조립 코드의 형태를 보는 정적 판정은 `?? ""` 우회를 통과시키고, rejection 관측은 호출부가 삼키므로 신호가 되지 못한다 (실측 4회 발생·초록).
- [ ] (Should, A-5) `VITE_*_API_BASE` 런타임 실재 검증 채널의 저장소 등재 — `bash -c 'grep -qE "VITE_[A-Z_]*API_BASE" scripts/*.sh'` → rc=0. **HEAD=`ff699f9` 실측 rc=1 → 미충족.** `src/types/env.d.ts` 의 `string` 선언은 **컴파일 시 주장**일 뿐이므로 그 파일의 grep 을 이 항목의 판정에 쓰지 않는다 — 선언과 실재의 괴리 그 자체가 이 항목의 대상이다. `RULE-07 §promote 조건 4` 의 실경로 요건이며, 채널 부재는 promote 차단이 아니라 채널 부착 task 발행의 선행 조건이다.

## 참고

- **REQ 원문**: `20.req/20260825-api-base-url-assembly-totality.md` (REQ-20260825-016, slug 식별).
- 소비한 followup: `20260825-1320-app-test-undefined-api-url` (실측 `undefined?limit=10` ×4).
- 관련 blue spec: `30.spec/blue/foundation/vite-env-boundary-typing.md`, `30.spec/blue/common/env.md`.
- 기존 게이트 원문: `scripts/check-vite-env-coherence.sh:37` (G1 패턴).

### 미측정·비판정 항목

- **(미측정 NFR) 프로덕션 빌드에서 `isProd()` 가 거짓이 되는 조건의 실재.** 현 빌드 설정에서 `import.meta.env.PROD` 는 참이므로 3번째 상태가 **prod 런타임에** 도달 가능한지는 미확인이다. 본 계약의 판정은 함수의 총성과 조립 경로의 정적 성질로 이뤄지며 이 도달성에 의존하지 않는다 — 방어 대상은 **mode 집합 확장(staging·preview 추가)** 과 **`VITE_*_API_BASE` 키 부재** 두 가지다.
- **(미측정 NFR) 상대 URL 요청이 실제 배포 origin 에서 SPA 폴백 200 을 받는지.** 배포 환경 관측 채널이 없다. 귀결의 방향(잘못된 성공)은 §역할에 평서문으로 박제했다.
- **(가정 주입 요구 — 이관) 게이트의 검출력.** (Dir-1)~(Dir-3) 으로 채널 부착 task DoD 에 이관했다 (§발화 채널). 이관처 task 가 발행되기 전까지 귀속처는 그 절의 명시적 지시다.
- **(별 축) `.env*` 의 호스트명 정책과 값 선택.** `testing/network-egress-isolation §역할 (iv)` 가 이미 선언했다.

## 변경 이력

| 일자 | TSK / 커밋 | 요약 | 영향 섹션 |
|------|-----------|------|----------|
| 2026-08-25 | REQ-20260825-016 (inspector tick 222) | 최초 등록. followup 1건을 흡수한 req 를 불변식으로 반영. **req 수용 기준 5항을 그대로 쓰지 않았다**: (a) 총성 판정이 `src/Log/api.js` **1 파일 하드코딩**이었다 — `RULE-06 §열거 고정 금지` 위반이자 req 자신의 §배경 표(6 모듈)와 스코프가 어긋난다. `src/**/api.{js,ts}` glob 산출 + 중괄호 균형으로 본문을 잘라 마지막 실행문을 보는 판정으로 교체해 실측 `api-derivations=7 partial=2` 를 얻었다 (모듈 6 + `Monitor` 위임 1). **공허 통과 가드**(도출 0 → `exit 2`)를 신규 부착했다. (b) req 의 `grep -nE "^\s*return undefined;" src/Image/api.ts` 는 **파일·표기 양쪽에 고정**이라 (a) 의 총성 판정에 흡수했다 — `return undefined` 를 지우고 `return void 0` 로 바꾸면 통과하는 자리였다. (c) FR-03 "반환 타입 선언이 전 모듈 동일" 은 `.js` 2 모듈이 주석을 가질 수 없어 **어느 시점에도 참이 될 수 없는 문장**이다 — "미정의를 반환 타입으로 선언한 모듈 0" 으로 환원해 (A-1) 에 합쳤다. (d) 캐스팅 패턴을 `getApiUrl\(\) as string` 에서 `get(ApiUrl|API)\(\)\s+as\s+[A-Za-z]` 로 넓혔다 — `getAPI()` 와 `as unknown as string` 우회를 덮되 (R-4) 의 무관 5건은 여전히 배제한다. **신규 추가 (req 에 없던 항목)**: (R-2) 정직한 선언만 지우는 오회복(순서가 뒤집히면 결함이 남고 경고만 사라진다), (R-3)/(Dir-3) `?? ""` 우회 — 빈 base 는 `"?limit=10"` 이 되어 **여전히 상대 URL** 이므로 `as string` 제거만으로는 닫히지 않는다, (R-5) 순진한 tail-return 패턴의 오판을 회귀 중점으로 승격. | all |
