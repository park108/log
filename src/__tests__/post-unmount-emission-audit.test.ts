// TSK-20260824-07-d / REQ-20260824-002 — post-unmount 외부 발화 audit 판정 채널.
//
// spec slug: testing/runtime-fetch-unmount-safety §공개 인터페이스 (M-A)(M-C)
//            + §동작 (I3)(I4)(I6) + §회귀 중점 R-1 · R-3.
//            (spec 경로 literal 미박제 — 아래 "spec 경로" 절 참조.)
//
// 선행 3 회복 task (07-a / 07-b / 07-c) 가 미가드 표면을 0 으로 만든 뒤, 그 0 을
// **고정(pinning)** 하는 채널이다. 회복 자체는 본 채널의 일이 아니다. 가드가
// 사라지거나 신규 컴포넌트가 가드 없이 들어와도 tsc / eslint / vite build 는
// 전부 통과한다 — 그 침묵을 깨는 것이 본 채널의 유일한 목적이다.
//
//   G-A 대상 집합 술어 산출 : 디렉터리 재귀 열거 + 술어. 파일명 하드코딩 0.
//   G-B 가드 보유          : 대상 전수에 unmount 가드 식별자 존재.
//   G-C race fixture 존재   : 대상마다 형제 테스트 + unmount() 왕복 존재.
//   G-D 관측 표면 정합      : fixture 가 **그 대상이 실제로 내는 발화 종류**를 관측한다.
//   G-E 두 술어 정합        : 확장 ⊇ 선행 + 차집합도 집행 대상 + 열거 버그 검출.
//   G-F 무필터 단정         : 발화 기록을 필터로 좁힌 뒤 0 을 세는 fixture 0건.
//
// ── 집행 대상 = 확장 술어 (TSK-20260825-05 / REQ-20260825-002) ───────────────
// G-B / G-C / G-D 의 대상은 `widenedSurface()` — "훅을 쓰고 post-await 발화가 있는
// 파일" 전수다. `useEffect` 등록 여부를 묻지 않으므로 **이벤트 핸들러의 async
// continuation** 도 집행 대상에 든다. 선행 술어 `specScopedTargets()` 는 삭제하지
// 않고 G-E 의 비교항으로 남는다 — 두 술어의 정합이 깨지는 것 자체가 신호다.
//
// 최초 판본의 대상 한정(`useEffect` 등록 파일)은 **계약의 경계가 아니라 최초 측정
// 수단의 경계**였다. 출처 spec 이 선언을 async continuation 일반으로 넓히면서
// "선언 범위 = 술어 대상" 이 불변식으로 승격됐고, 본 채널의 집행 대상이 그것을 따라
// 이동했다. 사각이 닫힌 경위는 아래 "측정하지 않는 것" 절에 그대로 남겼다.
//
// ── G-D 를 둔 이유 (관측 표면 비대칭) ────────────────────────────────────────
// React 18 의 `dispatchSetState` 는 unmount 된 fiber 에서 조용히 bail out 한다 —
// 경고도 콘솔 출력도 없다. 따라서 post-await 발화가 **state setter 뿐인** 표면에서는
// 콘솔 spy 단정이 항상 0 hit 이고, 가드를 제거해도 fixture 가 통과한다 (민감도 0).
// "unmount() 문자열이 있는 테스트가 존재하는가" 만 세면 그 공허한 fixture 를 실효
// 있는 것으로 오판한다. G-D 는 대상의 post-await 발화 종류를 정적으로 분류해
// **setter 전용 표면에는 setter 계수 관측기**를 요구한다.
//
// ── 본 채널이 측정하지 **않는** 것 (측정된 잔여 false-negative) ──────────────
// 최초 판본(TSK-20260824-07-d)이 자백한 두 부류의 현황이다. 항목을 지우지 않고
// 상태를 갱신한다 — 사각이 있었다는 사실과 닫힌 경위가 함께 남아야 다음 사람이
// 같은 한정을 "원래 그런 것" 으로 다시 믿지 않는다.
//   (1) effect 미등록 async 핸들러 — 클릭·submit 핸들러의 `await` 이후 발화.
//       **[닫힘 — TSK-20260825-05]** 집행 대상을 `widenedSurface()` 로 옮겨 이 부류가
//       G-B / G-C / G-D 의 정식 대상이 됐다. G-E 는 더 이상 "차집합 = 면제 목록" 을
//       고정하지 않고, 차집합도 같은 요구를 통과함을 단언한다(E-3).
//       실코드 쪽 회복은 TSK-20260825-04 (`src/File/FileItem.tsx`) 가 선행 착지했다.
//   (2) fixture 관측 강도 — G-D 는 "발화 종류에 맞는 관측기 존재" 까지만 본다.
//       **[닫힘 — TSK-20260825-06]** 콘솔 spy 의 호출 기록을 **필터로 좁힌 뒤 0 을
//       세는** 형태는 이제 G-F 가 잡는다. 그 형태는 코드 상태와 무관하게 항상 0 을
//       내므로(React 18.2 는 unmounted fiber 의 setState 에 경고를 내지 않는다)
//       민감도 0 이었고, 정상 트리에서 초록이라 어떤 재실행으로도 신고되지 않았다.
//       선행 시대 fixture 4 파일 10 블록의 필터는 같은 task 가 제거했다.
//       판정은 **문구 열거가 아니라 구조**다 — 리터럴 문구 grep 은 `.includes()`
//       변형(`src/Search/Search.test.tsx`)을 구조적으로 놓쳤다. G-D 의
//       `fixtureObservations` 는 손대지 않는다: "관측기가 있는가"(G-D)와
//       "관측이 필터로 공허해졌는가"(G-F)는 분업이다.
//   (3) 갈래(함수) 단위 분류 — **[열림]** `requiredSurfaces` 는 **파일 단위** 분류다.
//       한 파일에 콘솔류 갈래와 setter-only 갈래가 공존하면 후자의 관측 요구가
//       파일 단위 분류에 흡수된다. 갈래 단위 세분화는 별 축이다.
//
// ── 파일 목록을 상수로 두지 않는 이유 (RULE-06 §열거 고정 금지) ─────────────
// 선행 baseline 은 wrapper 3 파일을 열거해 측정했고, 실제 fetch 는 `lazy()` 로
// 분리된 구현 파일에 있었다. 열거는 어떤 코드 상태에서도 0 hit 을 냈다 — 민감도 0.
// 본 채널의 대상 집합은 전부 디렉터리 재귀 열거 + 술어 산출이며, G-A 가 "lazy 로
// 분리된 구현 파일이 대상에 들어 있고 wrapper 는 들어 있지 않다" 를 함께 고정한다.
//
// ── 자기 무효화 / 경로 제외 부재 ─────────────────────────────────────────────
// 프로덕션 스캔의 제외 규칙은 **spec 술어가 선언한 것뿐**이다 (`.test.` 파일 제외 —
// spec (M-A) 명령의 `grep -v "\.test\."` 동치, `.d.ts` 는 실행 코드 없음). 본 파일
// 경로를 겨냥한 예외는 두지 않으며, G-A 보조 단언이 raw 열거에 본 파일이 포함됨을
// 고정해 "제외 과잉" 이 없음을 보인다.
//
// ── spec 경로 literal 을 적지 않는 이유 ──────────────────────────────────────
// scripts/check-spec-coherence.sh G2 는 src/** 에서 추출한 spec 경로의 디스크 실재를
// 강제한다. 출처 spec 은 green 큐에 있고 승격되면 경로가 바뀐다 — 어느 쪽 경로를
// 적어도 시한폭탄이라 REQ id + slug 로만 식별한다.
//
// ── 발화 채널 (spec (M-C)) ───────────────────────────────────────────────────
// 본 파일은 `src/__tests__/**` 산하이므로 `npm test` 수집 경로에 자동 등재된다 —
// CI (.github/workflows/ci.yml `- name: Test`) 와 .husky/pre-push 두 지점에서
// 발화한다. package.json / ci.yml 무변경.
//
// 멱등성: read-only — readFileSync / readdirSync / statSync 만 사용한다.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative, dirname, basename } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC_DIR = join(REPO_ROOT, "src");
const REL_SELF = join("src", "__tests__", "post-unmount-emission-audit.test.ts");

// 스캔 확장자 — spec (M-A) 명령의 `--include` 는 jsx/tsx 지만, 프로덕션 컴포넌트가
// .js/.ts 로 작성되는 것을 막는 규칙은 없다. 넓게 잡고 완전성은 보조 단언이 본다.
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;
const RE_SCRIPT_LIKE_EXT = /\.[cm]?[jt]sx?$/;
const TEST_EXTENSIONS = [".test.tsx", ".test.jsx", ".test.ts", ".test.js"] as const;

// ── 술어 토큰 ────────────────────────────────────────────────────────────────
// spec (M-A) 의 `grep -q "await \|\.then("` 동치.
const RE_ASYNC_TOKEN = /await\s|\.then\s*\(/;
const RE_EFFECT_REGISTRATION = /useEffect\s*\(/;
// 컴포넌트성 판정 — 훅 호출이 있으면 마운트/언마운트 생명주기를 갖는다.
// **표기 변형 주의**: TS 는 `useState<boolean>(false)` 처럼 타입 인자를 끼워 넣는다.
// `use[A-Z]\w*\s*\(` 로 좁히면 그 표기의 파일이 통째로 확장 표면에서 빠지고,
// 차집합이 공허해져 G-E 가 "경계 없음" 을 보고한다 (실측된 false-negative).
const RE_HOOK_CALL = /\buse[A-Z]\w*\s*(?:<[^()]*>)?\s*\(/;
// spec (M-A) 가드 식별자 집합. 수단은 지정하지 않는다 (flag ref / AbortController / …).
const RE_GUARD_IDENTIFIER = /cancelled|AbortController|isMounted|signal/;

// 발화 분류 — 컴포넌트 경계를 넘는 호출.
const RE_CONSOLE_EMIT = /\blog\s*\(|\breportError\s*\(|\bconsole\.(?:log|error|warn|info)\s*\(/g;
const RE_SETTER_EMIT = /\bset[A-Z]\w*\s*\(/g;

// ── 테스트 측 관측 표면 토큰 ─────────────────────────────────────────────────
const RE_UNMOUNT_CALL = /\bunmount\s*\(\s*\)/;
// `const logSpy = vi.spyOn(console, 'log')` / `const s = vi.spyOn(errorReporter, 'reportError')`
const RE_SPY_BINDING = /(?:const|let)\s+(\w+)\s*=\s*vi\.spyOn\(\s*([\w.]+)\s*,\s*['"](\w+)['"]/g;
// ── (축 5) 발화 관측기 판정 토큰 — deny-by-default 전환 (TSK-20260827-10-b) ─
// 종전 판본은 발화 spy 를 **메서드 이름 다섯 개의 리터럴 집합**으로 정했다
// (콘솔 4종 + 리포터 1종). 그래서 목록 밖 이름의
// 관측기(`vi.spyOn(customLogger,'emit')`)를 쓰는 파일은 spy 로 인식되지 않아 축 1~4
// 판정에서 **통째로 빠졌고**, 그 상태가 "위반 없음" 과 관측적으로 동일했다. 이름을
// 하나 더 얹는 것은 같은 사각을 `telemetry.capture` 로 즉시 재생산한다.
//
// 그래서 이 축도 기본값을 뒤집는다 — **`vi.spyOn` 이 만든 spy 는 기본적으로 발화
// 관측기이고**, 아래 두 **구조적 비-발화 형태**만 예외로 빠진다. 예외는 애플리케이션
// 메서드 어휘가 아니라 (N1) mock 의 종류 · (N2) 호스트 환경 객체 경유 여부 라는
// **구조**로 정의되므로, 새 발화 설비가 도입돼도 목록 갱신 없이 잡힌다.
//
//   (N1) **값 공급 스텁** — `mockReturnValue`/`mockResolvedValue`/`mockRejectedValue`
//        계열이 붙은 spy 는 프로덕션이 **반환값을 소비**하는 입력 의존성이다
//        (`api.getLogs` · `globalThis.fetch` · `common.isAdmin`). 발화는
//        fire-and-forget 이라 값을 공급할 이유가 없다. **묵음** 스텁
//        (`mockImplementation(() => {})`)은 값을 공급하지 않으므로 제외되지 않는다 —
//        콘솔 관측기의 표준 형태가 그것이다.
//   (N2) **플랫폼 배선 표면** — 호스트 환경 객체를 **경유해** 접근하는 멤버
//        (`window.addEventListener` · `globalThis.fetch` · `global.clearTimeout`).
//        런타임 배선을 관측하는 spy 이지 애플리케이션 발화의 싱크가 아니다.
//        `console.error` · `errorReporter.reportError` 는 이 경유가 없다.
const RE_VALUE_SUPPLYING_MOCK = /mockReturnValue|mockResolvedValue|mockRejectedValue/;
const HOST_ENVIRONMENT_ROOTS = new Set([
	"window",
	"globalThis",
	"global",
	"self",
	"top",
	"parent",
	"document",
	"navigator",
	"location",
	"history",
	"screen",
	"process",
]);
// setter 계수 관측기 — ESM namespace 는 non-configurable 이라 `vi.spyOn(React,'useState')`
// 가 불가하다. 모듈 mock 으로 useState 를 감싸는 형태만이 setter 호출을 셀 수 있다.
const RE_REACT_MODULE_MOCK = /vi\.mock\(\s*['"]react['"]/;
const RE_USE_STATE_WRAP = /useState/;
const RE_ZERO_COUNT_ASSERT = /expect\(\s*[\w.]+\s*\)\.toBe\(\s*0\s*\)|toHaveBeenCalledTimes\(\s*0\s*\)|not\.toHaveBeenCalled/;
// lazy 분리 구현 — `lazy(() => import('./X'))`
const RE_LAZY_IMPORT = /lazy\(\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g;

// ── G-F 토큰 (무필터 단정) ───────────────────────────────────────────────────
// 테스트 파일 열거 — 목록 하드코딩 0. 확장자 드리프트(.cts/.mts)까지 덮는다.
const RE_TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
// ── (축 3) 기록 도달 경로 — deny-by-default 전환 (TSK-20260825-13) ─────────
// 종전에는 기록 표현식을 **2형태로 열거**했다: 직결 `spy.mock.calls` 와
// `const errorCalls = consoleErrorSpy.mock.calls` 별칭 (`RE_MOCK_CALLS_ALIAS`).
// 그래서 구조분해 `const { calls } = spy.mock` 도, `const m = spy.mock` 후
// `m.calls` 접근도 기록으로 인식되지 않았다 (inspector tick 221 실측 — 둘 다
// 미검출). 형태를 2개 더 얹는 것은 같은 사각을 `const { mock } = spy` 로 즉시
// 재생산한다.
//
// 그래서 이 축도 기본값을 뒤집는다 — **발화 spy 를 뿌리로 갖는 임의의 바인딩
// 연쇄를 따라 `mock.calls` 에 도달하면 그것이 기록이다.** 판정은 바인딩 *형태*를
// 열거하지 않고 (a) 단순 바인딩 (b) 구조분해 두 **문법 범주**의 경로를 고정점까지
// 전개해 정규 경로를 만든 뒤, 정규 경로가 `<spy>.mock.calls` 의 접두이면 남은
// 꼬리를 이어 붙여 기록 표현식을 만든다. 중간 단계 수·깊이에 무관하다.
const RE_MEMBER_PATH = String.raw`[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*`;
// (a) 단순 바인딩 — `const calls = s.mock.calls;` / `const m = s.mock;` / `const x = m;`
// 초기화식이 **멤버 경로로 끝나야** 한다. `const w = s.mock.calls.filter(…)` 처럼
// 호출로 끝나는 바인딩은 기록이 아니라 좁힘 **결과**이므로 걸리지 않는다.
const RE_PATH_BINDING = new RegExp(
	String.raw`(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(${RE_MEMBER_PATH})\s*(?=[;,)\r\n]|$)`,
	"g",
);
// (b) 구조분해 바인딩 — `const { calls } = s.mock;` / `const { calls: w } = s.mock;`
const RE_DESTRUCTURED_BINDING = new RegExp(
	String.raw`(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*(${RE_MEMBER_PATH})\s*(?=[;,)\r\n]|$)`,
	"g",
);
const RE_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
// 도달 경로 허용 목록 — **비어 있다**. 축 1·2 와 같은 근거다: 기록에 도달하는
// 별칭 이름의 집합은 유한하지 않고, 여기에 이름을 넣는 순간 그 이름을 쓴 재도입이
// 통째로 통과한다. 비어 있어야 (E4) probe 가 "열거 확장이 아니라 전환" 을 증명한다.
const RECORD_REACH_ALLOWLIST: ReadonlySet<string> = new Set<string>([]);
// ── deny-by-default 전환 (TSK-20260825-09) ─────────────────────────────────
// 종전에는 **위반 형태를 열거**했다: 선택자는 `.filter(` 하나, 영단정 어휘는
// `toBe(0)|toHaveLength(0)|not.toHaveBeenCalled|length === 0|toBeFalsy(` 다섯.
// 두 열거 모두 목록 밖 형태를 통과시켰고, 실측상 `.find(…) + toBeUndefined()` ·
// `.some(…) + toBe(false)` · `.filter(…) + toBeUndefined()` 셋이 새어 나갔다
// (`src/Search/Search.test.tsx:218` 이 첫 형태의 실물이었다). 열거에 형태를
// **추가**하면 같은 사각이 `.flatMap(…) + toStrictEqual([])` 로 즉시 재생산된다.
//
// 그래서 두 축 모두 기본값을 뒤집는다 — 목록에 없는 신규 형태는 통과가 아니라
// **위반**이다. 정상 용례의 집합은 유한하고 저장소에서 실측 가능하지만, 위반
// 형태의 집합은 무한하기 때문이다.
//
// (축 1) 선택자 — 발화 기록에 대한 **모든 메서드 호출**을 좁힘으로 간주한다.
// 아래 허용 목록에 있는 이름만 예외다.
//
// 목록은 **비어 있다**. 근거: 발화 기록 전체를 보존하는 접근은 메서드 호출이
// 아니라 속성 접근·인덱싱(`.length` · `[0]`)으로 쓰이며 그 둘은 이 패턴에
// 걸리지 않는다 (`Comment.test.tsx:386` · `common.test.ts:94` ·
// `Toaster.test.tsx:157` 가 그 형태다). `.map(` 류를 넣고 싶어지면 멈춰라 —
// `record.map(…).filter(…)` 의 `.filter` 는 기록이 아니라 map 결과에 붙으므로
// 허용하는 순간 체인 한 칸으로 축 1 이 통째로 우회된다. 목록 확장은 그 우회가
// 불가능함을 보인 뒤에만 한다.
const RECORD_ACCESS_ALLOWLIST: ReadonlySet<string> = new Set<string>([]);
//
// (축 2) 영단정 어휘 — 좁힘 결과에 대한 창 내 `expect(` 는 **기본이 위반**이고,
// 비어있지 않음/양수를 단정하는 형태만 허용한다. `toBeGreaterThanOrEqual(0)` 은
// 어떤 배열에도 참이므로 허용에서 뺀다 (공허 단정). 원시 비교식(`length > 0` ·
// `length === 1`)도 허용하지 않는다 — `expect(w.length > 0).toBe(false)` 처럼
// **비교식을 단정 안으로 옮긴 영단정**이 허용 어휘를 달고 통과해버린다.
const RE_NONEMPTY_ASSERT_NEAR =
	/toBeGreaterThan\s*\(|toBeGreaterThanOrEqual\s*\(\s*[1-9]|toBe\s*\(\s*[1-9]|toHaveLength\s*\(\s*[1-9]|toBeDefined\s*\(|toBeTruthy\s*\(|toContain\s*\(/;
// `toHaveBeenCalled*` 는 `not.` 이 붙지 않은 경우만 비어있지 않음 단정이다.
const RE_NEGATED_CALLED = /not\s*\.\s*toHaveBeenCalled\w*/g;
const RE_POSITIVE_CALLED = /toHaveBeenCalled\s*\(|toHaveBeenCalledWith\s*\(|toHaveBeenCalledTimes\s*\(\s*[1-9]/;
const RE_EXPECT_CALL = /expect\s*\(/;
// 좁힘~단정 창 400자 — 실측 위반 블록의 좁힘~단정 거리 최대 ~200자.
const FILTER_ZERO_WINDOW = 400;

/**
 * 창에서 좁힘 결과를 소비하는 **가장 가까운 단정문 1건**을 잘라낸다.
 *
 * 창 전체를 허용 판정에 쓰면 400자 뒤의 **무관한** 비어있지 않음 단정이 위반을
 * 취소한다 (실측 — 본 파일의 fixture 는 바로 다음 줄에 fixture 를 검사하는 바깥
 * 단정 `.toContain("calls")` 를 두고 있어, 창 전체 판정에서는 양성 fixture 가
 * 전부 통과로 뒤집혔다). 좁힘을 소비하는 단정은 **가장 가까운 것**이므로 그
 * 하나만 본다. 이 축소는 deny 방향이다 — 무관한 선행 단정이 끼면 통과가 아니라
 * 위반으로 계수된다.
 */
export function nearestAssertion(window: string): string | null {
	const at = window.search(RE_EXPECT_CALL);
	if (at < 0) return null;
	let depth = 0;
	for (let i = at; i < window.length; i += 1) {
		const ch = window[i];
		if (ch === "(") depth += 1;
		else if (ch === ")") depth -= 1;
		else if (ch === ";" && depth <= 0) return window.slice(at, i + 1);
	}
	return window.slice(at);
}

/**
 * (축 4) 좁힘 지점을 **감싸는** `expect(...)` 문을 찾는다 — 창의 반대 방향.
 *
 * 종전 판정은 좁힘 토큰에서 **뒤로만** 창을 열었다. 그래서 좁힘이 `expect(` 인자
 * **안쪽**에 있는 인라인 형태(`expect(spy.mock.calls.filter(…)).toHaveLength(0)`)는
 * 창에 `expect(` 가 없어 "단정 없는 좁힘" 음성 분기로 떨어져 통과했다 (inspector
 * tick 221 실측). 위상이 단방향인 한, 좁힘 선택자와 영단정 어휘를 아무리 deny 로
 * 뒤집어도 **한 줄로 접기만 하면** 재도입이 통과한다.
 *
 * **뒤쪽 창은 좁힘을 감싸는 `expect` 에만 쓴다.** 앞쪽의 아무 `expect(` 나 집어오면
 * 직전 줄의 무관한 단정(허용 어휘를 단)이 좁힘을 취소해 **deny 가 allow 로 뒤집힌다**.
 * 괄호 균형이 좁힘 지점을 **포함**하는지가 그 오답을 막는 유일한 조건이므로, 후보
 * `expect(` 마다 여는 괄호의 짝을 실제로 세어 포함 여부를 판정한다. 포함 후보가
 * 여럿이면 (중첩 `expect`) **가장 가까운 것**을 쓴다 — 앞쪽 창에서 "가장 가까운
 * 단정" 을 쓰는 것과 같은 이유다.
 */
export function enclosingAssertion(source: string, at: number): string | null {
	const from = Math.max(0, at - FILTER_ZERO_WINDOW);
	const back = source.slice(from, at);
	const finder = new RegExp(RE_EXPECT_CALL.source, "g");
	let nearest: number | null = null;
	let e: RegExpExecArray | null;
	while ((e = finder.exec(back)) !== null) {
		const start = from + e.index;
		if (enclosesIndex(source, start, at)) nearest = start;
	}
	if (nearest === null) return null;
	return nearestAssertion(source.slice(nearest, nearest + FILTER_ZERO_WINDOW * 2));
}

/** `expect(` 의 여는 괄호 짝이 `at` 을 넘겨 닫히는가 (= 좁힘을 인자로 감싸는가). */
function enclosesIndex(source: string, expectStart: number, at: number): boolean {
	const open = source.indexOf("(", expectStart);
	if (open < 0 || open > at) return false;
	const limit = Math.min(source.length, at + FILTER_ZERO_WINDOW * 2);
	let depth = 0;
	for (let i = open; i < limit; i += 1) {
		const ch = source[i];
		if (ch === "(") depth += 1;
		else if (ch === ")") {
			depth -= 1;
			if (depth === 0) return i > at;
		}
	}
	// 한도 안에서 닫히지 않았다 — 좁힘 지점을 지나쳤으므로 감싼 것으로 본다 (deny 방향).
	return true;
}

/** 단정문이 "비어있지 않음/양수" 를 단정하는가 (축 2 허용 판정). */
export function assertsNonEmptyNear(assertion: string): boolean {
	if (RE_NONEMPTY_ASSERT_NEAR.test(assertion)) return true;
	return RE_POSITIVE_CALLED.test(assertion.replace(RE_NEGATED_CALLED, ""));
}

type ScanEntry = { abs: string; rel: string };

/** `grep -r` 동치 재귀 열거. 어떤 경로도 제외하지 않는다. */
function collectFiles(root: string): ScanEntry[] {
	const out: ScanEntry[] = [];
	const stack: string[] = [root];
	while (stack.length > 0) {
		const current = stack.pop();
		if (current === undefined) continue;
		for (const entry of readdirSync(current)) {
			const full = join(current, entry);
			const st = statSync(full);
			if (st.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (!st.isFile()) continue;
			out.push({ abs: full, rel: relative(REPO_ROOT, full) });
		}
	}
	return out;
}

function isProductionFile(rel: string): boolean {
	if (rel.includes(".test.")) return false; // spec (M-A) 의 `grep -v "\.test\."`
	if (rel.endsWith(".d.ts")) return false; // 타입 선언 — 실행 코드 0
	return SCAN_EXTENSIONS.some((ext) => rel.endsWith(ext));
}

export function productionFiles(): ScanEntry[] {
	return collectFiles(SRC_DIR).filter((f) => isProductionFile(f.rel));
}

/**
 * `await` / `.then(` 각 지점부터 **그 지점을 감싼 블록의 끝까지** 를 잘라낸다.
 * 중괄호 깊이 0 에서 만나는 첫 `}` 가 경계다 — 인접 블록으로 새지 않는다
 * (RULE-06 §블록 경계 false-positive). 문자열 literal 안의 중괄호는 구분하지
 * 않는 근사이며, 그 한계는 아래 analyzer 자가 검증이 고정한다.
 */
export function postAsyncRegions(source: string): string[] {
	const regions: string[] = [];
	const finder = new RegExp(RE_ASYNC_TOKEN.source, "g");
	let m: RegExpExecArray | null;
	while ((m = finder.exec(source)) !== null) {
		const start = m.index;
		let depth = 0;
		let end = source.length;
		for (let i = start; i < source.length; i++) {
			const c = source[i];
			if (c === "{") depth += 1;
			else if (c === "}") {
				if (depth === 0) {
					end = i;
					break;
				}
				depth -= 1;
			}
		}
		regions.push(source.slice(start, end));
	}
	return regions;
}

export type EmissionKinds = { consoleLike: number; setterLike: number };

/** post-await 구간에서 컴포넌트 밖으로 나가는 호출을 종류별로 계수한다. */
export function postAsyncEmissions(source: string): EmissionKinds {
	const joined = postAsyncRegions(source).join("\n");
	return {
		consoleLike: (joined.match(RE_CONSOLE_EMIT) ?? []).length,
		setterLike: (joined.match(RE_SETTER_EMIT) ?? []).length,
	};
}

export type Target = {
	rel: string;
	source: string;
	emissions: EmissionKinds;
};

/** spec (M-A) 술어 — `useEffect` 등록 + 본문 `await` / `.then(`. */
export function specScopedTargets(files: ScanEntry[]): Target[] {
	const targets: Target[] = [];
	for (const f of files) {
		const source = readFileSync(f.abs, "utf8");
		if (!RE_EFFECT_REGISTRATION.test(source)) continue;
		if (!RE_ASYNC_TOKEN.test(source)) continue;
		targets.push({ rel: f.rel, source, emissions: postAsyncEmissions(source) });
	}
	return targets;
}

/**
 * 확장 표면 — effect 등록 여부를 묻지 않고 "훅을 쓰는 파일 중 post-await 발화가
 * 있는 것" 전수. 핸들러 경로(effect 미등록)까지 포함한다.
 *
 * **G-B / G-C / G-D 의 집행 대상** (TSK-20260825-05). 이전 판본은 이 함수를 G-E 의
 * 비교항으로만 썼고 집행은 `specScopedTargets` 이 했다 — 그래서 이벤트 핸들러의
 * async continuation 이 측정 밖에 있었다.
 */
export function widenedSurface(files: ScanEntry[]): Target[] {
	const out: Target[] = [];
	for (const f of files) {
		const source = readFileSync(f.abs, "utf8");
		if (!RE_HOOK_CALL.test(source)) continue;
		if (!RE_ASYNC_TOKEN.test(source)) continue;
		const emissions = postAsyncEmissions(source);
		if (emissions.consoleLike + emissions.setterLike === 0) continue;
		out.push({ rel: f.rel, source, emissions });
	}
	return out;
}

export function siblingTestPath(rel: string): string | null {
	const dir = dirname(rel);
	const base = basename(rel).replace(/\.[^.]+$/, "");
	for (const ext of TEST_EXTENSIONS) {
		const candidate = join(dir, base + ext);
		if (existsSync(join(REPO_ROOT, candidate))) return candidate;
	}
	return null;
}

export type SpyBinding = { name: string; target: string; method: string };

/** 테스트 소스의 `const x = vi.spyOn(target, 'method')` 바인딩 전수. */
export function spyBindings(testSource: string): SpyBinding[] {
	const finder = new RegExp(RE_SPY_BINDING.source, "g");
	const out: SpyBinding[] = [];
	let m: RegExpExecArray | null;
	while ((m = finder.exec(testSource)) !== null) {
		const [, name, target, method] = m;
		if (name === undefined || target === undefined || method === undefined) continue;
		out.push({ name, target, method });
	}
	return out;
}

/** (N1) — 그 spy 가 프로덕션이 소비할 **값을 공급**하는가 (입력 의존성 스텁). */
function suppliesValueToProduction(binding: SpyBinding, testSource: string): boolean {
	const mock = `\\s*\\.\\s*(?:${RE_VALUE_SUPPLYING_MOCK.source})`;
	if (new RegExp(`\\b${escapeForRegExp(binding.name)}${mock}`).test(testSource)) return true;
	const site =
		`vi\\.spyOn\\(\\s*${escapeForRegExp(binding.target)}\\s*,` +
		`\\s*['"]${escapeForRegExp(binding.method)}['"]\\s*\\)`;
	return new RegExp(`${site}${mock}`).test(testSource);
}

/** (N2) — 호스트 환경 객체를 **경유한** 접근인가 (플랫폼 배선 표면). */
function isPlatformWiringSurface(binding: SpyBinding): boolean {
	const root = binding.target.split(".")[0];
	return root !== undefined && HOST_ENVIRONMENT_ROOTS.has(root);
}

/**
 * (Q-A) 발화 관측기 판정 — **deny-by-default** (spec FR-01).
 *
 * 기본값은 "관측기다". (N1)(N2) 두 구조적 비-발화 형태에만 예외를 준다. 목록에 없는
 * 새 발화 설비(`vi.spyOn(telemetry, 'capture')`)는 예외에 걸리지 않으므로 **자동으로
 * 판정 대상**이 된다 — 종전 이름 열거에서는 통째로 판정 밖이었다.
 */
export function isEmissionObserver(binding: SpyBinding, testSource: string): boolean {
	if (isPlatformWiringSurface(binding)) return false;
	if (suppliesValueToProduction(binding, testSource)) return false;
	return true;
}

export type Observations = { consoleSurface: boolean; setterSurface: boolean };

/** 테스트 소스가 어떤 발화 표면을 실제로 관측하는지 판정한다. */
export function fixtureObservations(testSource: string): Observations {
	let consoleSurface = false;
	for (const binding of spyBindings(testSource)) {
		if (!isEmissionObserver(binding, testSource)) continue;
		// spy 를 바인딩만 하고 쓰지 않으면 관측이 아니다 — 단정 또는 호출 기록 소비를 요구한다.
		const n = escapeForRegExp(binding.name);
		const used = new RegExp(`expect\\(\\s*${n}\\b|\\b${n}\\.mock\\.calls`).test(testSource);
		if (used) consoleSurface = true;
	}
	const setterSurface =
		RE_REACT_MODULE_MOCK.test(testSource) &&
		RE_USE_STATE_WRAP.test(testSource) &&
		RE_ZERO_COUNT_ASSERT.test(testSource);
	return { consoleSurface, setterSurface };
}

/** 대상의 발화 종류가 요구하는 관측 표면. */
export function requiredSurfaces(emissions: EmissionKinds): Array<"console" | "setter"> {
	// 콘솔류 발화가 있으면 콘솔 spy 가 비공허하다 (호출이 실제로 spy 에 도달한다).
	if (emissions.consoleLike > 0) return ["console"];
	// setter 뿐이면 콘솔에 흔적이 남지 않는다 — setter 계수 관측기를 요구한다.
	if (emissions.setterLike > 0) return ["setter"];
	return [];
}

/** G-B 동치 — 가드 식별자를 갖지 않는 대상. */
export function guardViolations(targets: Target[]): string[] {
	return targets.filter((t) => !RE_GUARD_IDENTIFIER.test(t.source)).map((t) => t.rel);
}

/** G-C 동치 — 형제 테스트가 없거나 그 안에 `unmount()` 왕복이 없는 대상. */
export function fixtureViolations(targets: Target[]): string[] {
	const missing: string[] = [];
	for (const t of targets) {
		const testRel = siblingTestPath(t.rel);
		if (testRel === null) {
			missing.push(`${t.rel} — 형제 테스트 파일 부재`);
			continue;
		}
		const testSource = readFileSync(join(REPO_ROOT, testRel), "utf8");
		if (!RE_UNMOUNT_CALL.test(testSource)) missing.push(`${t.rel} — ${testRel} 에 unmount() 왕복 부재`);
	}
	return missing;
}

/** G-D 동치 — 대상의 발화 종류가 요구하는 관측기를 형제 fixture 가 갖는가. */
export function surfaceViolations(targets: Target[]): { violations: string[]; setterOnlyChecked: number } {
	const violations: string[] = [];
	let setterOnlyChecked = 0;

	for (const t of targets) {
		const need = requiredSurfaces(t.emissions);
		if (need.length === 0) continue;
		const testRel = siblingTestPath(t.rel);
		if (testRel === null) {
			violations.push(`${t.rel} — 형제 테스트 부재 (G-C 참조)`);
			continue;
		}
		const obs = fixtureObservations(readFileSync(join(REPO_ROOT, testRel), "utf8"));
		if (need.includes("setter")) {
			setterOnlyChecked += 1;
			if (!obs.setterSurface) {
				violations.push(
					`${t.rel} — post-await 발화가 setter 전용(console ${t.emissions.consoleLike} / setter ${t.emissions.setterLike})인데 ` +
						`${testRel} 에 setter 계수 관측기가 없다. 콘솔 spy 단정은 이 표면에서 공허하다.`,
				);
			}
		}
		if (need.includes("console") && !obs.consoleSurface) {
			violations.push(
				`${t.rel} — post-await 콘솔류 발화 ${t.emissions.consoleLike}건인데 ${testRel} 에 소비되는 발화 spy 가 없다.`,
			);
		}
	}

	return { violations, setterOnlyChecked };
}

/** 정규식 리터럴 이스케이프 — 별칭·spy 이름을 패턴에 끼워 넣기 위한 것. */
function escapeForRegExp(literal: string): string {
	return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 발화 spy 바인딩 이름 — `isEmissionObserver` 가 관측기로 판정한 바인딩 전수.
 *
 * 판정은 이름 열거가 아니라 **deny-by-default** 다 (축 5). 그래서 목록에 없던
 * `vi.spyOn(customLogger, 'emit')` 도 관측기로 잡히고, `vi.spyOn(window,
 * 'addEventListener')` 같은 플랫폼 배선은 (N2) 로 여전히 제외된다 — 이 구분이 없으면
 * 정상 테스트를 위반으로 잡는다 (`src/App.test.jsx` 가 실물 대조군이다).
 */
export function emissionSpyNames(testSource: string): string[] {
	return spyBindings(testSource)
		.filter((binding) => isEmissionObserver(binding, testSource))
		.map((binding) => binding.name);
}

/**
 * (축 3) 발화 기록(`<spy>.mock.calls`)에 **도달하는 모든 표현식**을 산출한다.
 *
 * deny-by-default 다 — 알려진 2형태를 열거하는 대신, 파일의 바인딩을 두 **문법
 * 범주**(단순 경로 바인딩 · 구조분해)로 수집해 정규 경로를 고정점까지 전개한다.
 * 정규 경로가 `<spy>.mock.calls` 와 같으면 그 별칭 자체가 기록이고, 접두이면
 * 남은 꼬리를 이어 붙인 표현식이 기록이다 (`const m = s.mock` → `m.calls`,
 * `const { mock } = s` → `mock.calls`). 그래서 새로운 우회 표기는 목록에 추가되지
 * 않아도 잡힌다 — 잡히지 않으려면 spy 뿌리를 끊어야 하고, 끊으면 기록이 아니다.
 *
 * 호출로 끝나는 바인딩(`const w = s.mock.calls.filter(…)`)은 기록이 아니라 좁힘
 * **결과**이므로 경로 패턴에 걸리지 않는다 — 걸리면 좁힘 결과를 다시 좁혔는지로
 * 판정이 번져 정상 용례를 오탐한다.
 */
export function recordExpressions(testSource: string, spies: ReadonlySet<string>): string[] {
	const bindings: Array<[string, string]> = [];

	const pathFinder = new RegExp(RE_PATH_BINDING.source, "g");
	let b: RegExpExecArray | null;
	while ((b = pathFinder.exec(testSource)) !== null) {
		const [, alias, path] = b;
		if (alias === undefined || path === undefined) continue;
		bindings.push([alias, path.replace(/\s+/g, "")]);
	}

	const destructureFinder = new RegExp(RE_DESTRUCTURED_BINDING.source, "g");
	let d: RegExpExecArray | null;
	while ((d = destructureFinder.exec(testSource)) !== null) {
		const [, props, base] = d;
		if (props === undefined || base === undefined) continue;
		for (const entry of props.split(",")) {
			const parts = entry.split(":").map((piece) => piece.trim());
			const key = parts[0];
			const renamed = parts.length > 1 ? parts[1] : undefined;
			const alias = renamed !== undefined && renamed !== "" ? renamed : key;
			if (key === undefined || alias === undefined) continue;
			if (!RE_IDENTIFIER.test(key) || !RE_IDENTIFIER.test(alias)) continue;
			bindings.push([alias, `${base.replace(/\s+/g, "")}.${key}`]);
		}
	}

	// 고정점 전개 — 선언 순서·중간 단계 수에 무관하게 뿌리(spy)까지 접는다.
	const canonical = new Map<string, string>();
	for (let pass = 0; pass <= bindings.length; pass += 1) {
		let changed = false;
		for (const [alias, path] of bindings) {
			if (RECORD_REACH_ALLOWLIST.has(alias)) continue;
			const segments = path.split(".");
			const head = segments[0];
			if (head === undefined) continue;
			const root = spies.has(head) ? head : canonical.get(head);
			if (root === undefined) continue;
			const resolved = [root, ...segments.slice(1)].join(".");
			if (resolved === alias || canonical.get(alias) === resolved) continue;
			canonical.set(alias, resolved);
			changed = true;
		}
		if (!changed) break;
	}

	const records = new Set<string>();
	for (const spy of spies) records.add(`${spy}.mock.calls`);
	for (const [alias, path] of canonical) {
		for (const spy of spies) {
			const target = `${spy}.mock.calls`;
			if (path === target) records.add(alias);
			else if (target.startsWith(`${path}.`)) records.add(`${alias}${target.slice(path.length)}`);
		}
	}
	return [...records];
}

/**
 * G-F 판정 — **발화 기록을 좁힌 뒤 비어있음을 단정하는** 형태를 찾는다.
 *
 * 문구 열거가 아니라 구조로 본다. 리터럴 문구 grep(`update.*was not wrapped` 등)은
 * `.includes('unmounted')` 변형을 놓쳤다 (실측 — `src/Search/Search.test.tsx`).
 * 좁힘이 씌워진 영단정은 좁힘이 어떤 문구를 쓰든 "코드가 그 문구를 내지 않으면 항상
 * 통과" 라는 같은 결함을 갖는다.
 *
 * **판정은 deny-by-default 다** (두 축 모두). 좁힘 선택자는 허용 목록
 * (`RECORD_ACCESS_ALLOWLIST`) 밖의 **모든** 메서드 호출이고, 영단정 어휘는
 * `assertsNonEmptyNear` 가 허용하지 **않는** 모든 단정이다. 신규 형태의 기본값이
 * 통과가 아니라 위반이므로, 목록에 없는 조합(`.flatMap` + `toStrictEqual([])`)도
 * 그 조합을 게이트가 알지 못한 채 잡힌다 (자가 검증의 비열거성 probe 가 증명한다).
 *
 * 창은 **양방향**이다 (TSK-20260825-13). 좁힘을 인자로 감싸는 `expect(` 가 앞쪽에
 * 있으면 그것이, 없으면 뒤쪽 창의 가장 가까운 `expect(` 가 판정 대상이다. 양쪽 어디에도
 * `expect(` 가 없으면 위반이 아니다 — 좁히기만 하고 단정하지 않는 코드는 본 계약의
 * 대상이 아니다.
 *
 * ── 다섯 축의 현 상태 (RULE-06 §열거 고정 금지) ────────────────────────────
 *   (축 1) 좁힘 선택자   deny  — `RECORD_ACCESS_ALLOWLIST` 공집합 (TSK-…-09)
 *   (축 2) 영단정 어휘   deny  — `assertsNonEmptyNear` 허용만 통과 (TSK-…-09)
 *   (축 3) 기록 식별     deny  — `recordExpressions` 도달 경로 전개 (TSK-…-13)
 *   (축 4) 좁힘~단정 위상 양방향 — `enclosingAssertion` (TSK-…-13)
 *   (축 5) 관측기 식별   deny  — `isEmissionObserver` (N1)(N2) 예외 (TSK-…-10-b)
 * **이름 열거 잔존 0건.** 축 5 는 메서드 이름 열거였고, 목록 밖 이름의 관측기
 * (`vi.spyOn(customLogger, 'emit')`)를 쓰는 파일은 좁힘이 통째로 판정 밖으로 빠졌다.
 * 이제 기본값이 "관측기" 이고 예외는 구조((N1) 값 공급 스텁 · (N2) 플랫폼 배선)로만
 * 주어진다. 다섯 축을 뒤집는 동안 **남은 축이 매번 다음 사각이었다** 는 것이 이 게이트의
 * 4회 반복된 실측이므로(문구 열거 → 선택자 열거 → 위상 단방향 → 기록 열거 → 관측기
 * 열거), 여섯 번째 사각의 부재는 여기서 단정하지 않는다.
 *
 * 반환값은 위반 지점의 **기록 표현식·별칭 이름** 목록이다 (사람이 찾아갈 수 있게).
 *
 * ── (Q-B) 단락 신호 (TSK-20260827-10-a / FR-02) ────────────────────────────
 * 관측기가 0 으로 도출되면 축 1~4 판정은 **한 건도 수행되지 않는다**. 종전 판본은
 * 그 사실을 빈 배열로 반환해 "판정했고 위반이 없었다" 와 관측적으로 동일하게 만들었다
 * (관측기 0 분기가 빈 배열을 즉시 돌려줬다). 이제 `shortCircuited` 로 두 상태를 구별해
 * 돌려주고, `filteredEmissionZeroAssertions` 는 기존 호출 지점의 `string[]` 계약을
 * 유지하는 얇은 어댑터로 남는다.
 */
export type EmissionAudit = {
	/** 관측기 0 도출로 축 1~4 판정이 **수행되지 않았다** — "위반 0" 과 구별된다. */
	shortCircuited: boolean;
	violations: string[];
};

export function auditEmissionZeroAssertions(testSource: string): EmissionAudit {
	const spies = new Set(emissionSpyNames(testSource));
	if (spies.size === 0) return { shortCircuited: true, violations: [] };

	// 축 3 — 형태 열거가 아니라 **도달 경로**로 기록을 식별한다.
	const records = new Set(recordExpressions(testSource, spies));

	const violations: string[] = [];
	for (const record of records) {
		// 축 1 — `.filter(` 고정이 아니라 **임의의 메서드 호출**을 잡는다.
		// `.length`(속성) · `[0]`(인덱싱)은 메서드 호출이 아니므로 걸리지 않는다.
		const finder = new RegExp(`\\b${escapeForRegExp(record)}\\s*\\.(\\w+)\\s*\\(`, "g");
		let m: RegExpExecArray | null;
		while ((m = finder.exec(testSource)) !== null) {
			const method = m[1];
			if (method !== undefined && RECORD_ACCESS_ALLOWLIST.has(method)) continue;
			// 축 4 — 창을 **양방향**으로 연다. 좁힘을 인자로 감싸는 `expect(` 가
			// 있으면 그것이 좁힘을 소비하는 단정이고(인라인 형태), 없으면 종전대로
			// 앞쪽 창의 가장 가까운 단정을 본다.
			// 축 2 — 창에 단정이 없으면 대상 밖, 있으면 **비어있지 않음 단정만** 통과.
			const assertion =
				enclosingAssertion(testSource, m.index) ??
				nearestAssertion(testSource.slice(m.index, m.index + FILTER_ZERO_WINDOW));
			if (assertion === null) continue;
			if (!assertsNonEmptyNear(assertion)) violations.push(record);
		}
	}
	return { shortCircuited: false, violations: [...new Set(violations)] };
}

/**
 * 축 1~4 위반 목록만 필요한 호출자용 어댑터. 단락과 "위반 0" 이 여기서 합쳐지므로,
 * 두 상태를 구별해야 하는 호출자는 `auditEmissionZeroAssertions` 를 직접 쓴다.
 */
export function filteredEmissionZeroAssertions(testSource: string): string[] {
	return auditEmissionZeroAssertions(testSource).violations;
}

/**
 * 관측 요구 집합 — **발화 호출(`log(` · `reportError(` · `console.*(`)을 가진
 * 프로덕션 파일의 형제 테스트** 전수. 프로덕션 열거에서 매 실행 산출한다.
 *
 * (Q-C) 하한을 상수로 박는 대신(구 판본의 리터럴 하한 10 — 착수 실측 18 대비
 * 슬랙 8) 이 집합을 대조항으로 쓴다. 관측기 인식이 무너져 대상이 1 건 줄면 그 파일이
 * 이 집합 안에서 **단락** 쪽으로 넘어가므로, 합이 보존되는 분할 완전성으로는 보이지
 * 않는 축소가 이름으로 지목된다.
 */
export function emissionObservationRequired(): string[] {
	const required = new Set<string>();
	for (const f of productionFiles()) {
		const source = readFileSync(f.abs, "utf8");
		if ((source.match(RE_CONSOLE_EMIT) ?? []).length === 0) continue;
		const testRel = siblingTestPath(f.rel);
		if (testRel === null) continue;
		required.add(testRel);
	}
	return [...required].sort();
}

/**
 * 관측 부채 — 위 요구를 아직 만족하지 못하는 형제 테스트 (착수 시점 3 건).
 *
 * 기본 방향은 deny 이고 목록은 **예외에만** 쓰인다 (모집단은 디렉터리 열거로 산출한다
 * — RULE-06 §열거 고정 금지). 죽은 항목은 G-F 가 매 실행 차단하고, 부채가 갚아져도
 * (관측기가 붙어도) 실패하지 않는다 — 상한이지 고정점이 아니다.
 */
const EMISSION_OBSERVATION_DEBT = new Set([
	join("src", "Log", "LogItem.test.jsx"),
	join("src", "Log", "LogItemInfo.test.jsx"),
	join("src", "Monitor", "Monitor.test.jsx"),
]);

// ── G-G 토큰 (다중 post-await 가드 분해능 — TSK-20260828-01 / REQ-20260825-013) ─
// 출처 spec: testing/post-await-guard-individual-observability §동작 1~6.
//
// G-A~G-F 는 "가드가 있는가 / 관측기가 있는가 / 관측이 필터로 공허해졌는가" 까지만
// 본다. 가드가 **여러 개** 걸린 continuation 에서 중간 가드 1개가 사라지면 뒤 경계의
// 가드가 대신 막아 주므로 "최종 발화 0" 단정은 그대로 초록이다 (TSK-20260825-04 의
// injection Dir-B1 1차 시도가 `FileItem` 첫 경계 가드를 제거하고도 rc=0 을 낸 실측).
// G-G 는 그 사각에 **분해능** 축을 세운다 — 대상별로 `요구 N / 보유 M` 을 내고
// `요구 > 보유` 를 집행한다.
//
//   (P-A) 대상 모집단   post-await 가드 경계가 2개 이상인 프로덕션 파일 (디렉터리 열거).
//   (P-B) 요구 분해능   그 파일의 post-await 가드 경계 수 (try 본문 + catch 진입).
//   (P-C) 보유 관측     형제 fixture 의 **양성** 호출 단정 수 (중간 관측).

/**
 * 주석 절단 — `//` 행 주석과 `/* *\/` 블록 주석을 제거한다.
 *
 * (P-B)(P-C) 는 **실행 라인만** 계수해야 한다. 주석에 적힌 가드 토큰
 * (`// if(cancelled.current) return;`) 이나 단정 토큰이 판정을 충족시키면 게이트는
 * 코드가 아니라 서술을 세게 된다 — 그것이 이 부류에서 반복 관측된 false-negative 다.
 *
 * 문자열 리터럴은 상태로 추적하므로 `"https://x"` 의 `//` 는 잘리지 않는다. 정규식
 * 리터럴은 별도 상태로 추적하지 않는 **근사**이며, 이스케이프(`\/`) 다음 문자는
 * 건너뛰므로 `/\/\//` 같은 표기는 보존된다. 남는 한계는 자가 검증이 고정한다.
 */
export function stripComments(source: string): string {
	let out = "";
	let i = 0;
	const n = source.length;
	while (i < n) {
		const c = source[i];
		if (c === '"' || c === "'" || c === "`") {
			out += c;
			i += 1;
			while (i < n) {
				const d = source[i];
				if (d === "\\") {
					out += source.slice(i, i + 2);
					i += 2;
					continue;
				}
				out += d;
				i += 1;
				if (d === c) break;
			}
			continue;
		}
		if (c === "\\") {
			out += source.slice(i, i + 2);
			i += 2;
			continue;
		}
		if (c === "/" && source[i + 1] === "/") {
			while (i < n && source[i] !== "\n") i += 1;
			continue;
		}
		if (c === "/" && source[i + 1] === "*") {
			i += 2;
			while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
				if (source[i] === "\n") out += "\n";
				i += 1;
			}
			i += 2;
			continue;
		}
		out += c;
		i += 1;
	}
	return out;
}

/** 가드 검사 지점 — `if (…cancelled|isMounted|signal|aborted…)` 형태의 조건. */
const RE_GUARD_CHECK = /\bif\s*\(\s*[^()]*(?:cancelled|isMounted|signal|aborted)[^()]*\)/g;
/** 예외 처리기 머리 — try 본문 종료 직후의 `catch (…) {` · `finally {`. */
const RE_HANDLER_HEAD = /^\s*(?:catch\s*(?:\([^)]*\))?|finally)\s*\{/;
/** (P-A) 모집단 편입 하한 — "가드가 여러 개" 가 본 계약의 전제다. */
const MULTI_GUARD_MIN = 2;

/**
 * `await` / `.then(` 각 지점부터 **그 continuation 이 끝나는 곳까지** 의 인덱스 구간.
 *
 * `postAsyncRegions` (G-D 계열) 와의 차이는 하나다 — 깊이 0 의 `}` 를 만났을 때
 * 뒤에 `catch` · `finally` 가 붙어 있으면 **끊지 않고 계속한다**. try 본문에서
 * 시작한 continuation 은 catch 진입 경계와 그 뒤 코드까지 이어지기 때문이다
 * (spec §동작 2 — "try 본문 경계와 catch 진입 경계를 모두 계수한다").
 *
 * 그래서 `try { await f(); if(cancelled) return; } catch { if(cancelled) return; }
 * if(cancelled) return;` 은 경계 3 으로 산출된다. G-D 의 근사(첫 `}` 에서 절단)로는
 * 뒤 두 경계가 통째로 보이지 않는다.
 *
 * **근사 한계**: 중괄호 계수는 문자열·정규식 리터럴 안의 중괄호를 구분하지 않는다
 * (주석은 호출 전에 절단된다). 계수 대상이 `if (…) `조건 뿐이라 리터럴 중괄호가
 * 경계 수를 바꾸는 실측 사례는 없으며, 이 한계는 자가 검증 fixture 가 고정한다.
 */
export function postAwaitContinuations(source: string): Array<[number, number]> {
	const spans: Array<[number, number]> = [];
	const finder = new RegExp(RE_ASYNC_TOKEN.source, "g");
	let m: RegExpExecArray | null;
	while ((m = finder.exec(source)) !== null) {
		const start = m.index;
		let depth = 0;
		let end = source.length;
		for (let i = start; i < source.length; i += 1) {
			const c = source[i];
			if (c === "{") depth += 1;
			else if (c === "}") {
				if (depth === 0) {
					// 뒤에 예외 처리기가 붙으면 continuation 은 끝나지 않았다.
					if (RE_HANDLER_HEAD.test(source.slice(i + 1, i + 200))) continue;
					end = i;
					break;
				}
				depth -= 1;
			}
		}
		spans.push([start, end]);
	}
	return spans;
}

/**
 * (P-B) — post-await continuation 안에 있는 **가드 검사 지점 수**.
 *
 * 지점은 인덱스로 식별하므로 같은 지점이 여러 `await` 의 구간에 겹쳐 들어가도 1 로
 * 센다. `await` **앞** 의 가드(진입 가드)는 post-await 경계가 아니므로 제외된다.
 */
export function guardBoundaries(source: string): number {
	const src = stripComments(source);
	const spans = postAwaitContinuations(src);
	const finder = new RegExp(RE_GUARD_CHECK.source, "g");
	const sites = new Set<number>();
	let m: RegExpExecArray | null;
	while ((m = finder.exec(src)) !== null) {
		const at = m.index;
		if (spans.some(([s, e]) => at > s && at <= e)) sites.add(at);
	}
	return sites.size;
}

/** 부정 호출 단정 — (P-C) 에서 제외한다 (spec §역할 (ii): "발화 0 자체" 는 범위 밖). */
const RE_NEGATED_CALL_ASSERT = /\bnot\s*\.\s*toHaveBeenCalled\w*/g;
/**
 * (P-C) 중간 관측 — 그 경계 **이후로 진행했는지**를 드러내는 **양성** 호출 단정.
 * `not.toHaveBeenCalled` 계열은 최종 발화 무발화이므로 계수 전에 지운다.
 */
const RE_INTERMEDIATE_OBSERVATION =
	/toHaveBeenCalledWith\s*\(|toHaveBeenCalledTimes\s*\(\s*[1-9]|toHaveBeenCalled\s*\(\s*\)/g;

export function intermediateObservations(testSource: string): number {
	const src = stripComments(testSource).replace(RE_NEGATED_CALL_ASSERT, " ");
	return (src.match(RE_INTERMEDIATE_OBSERVATION) ?? []).length;
}

export type ResolutionTarget = { rel: string; testRel: string | null; required: number; have: number };

/**
 * (P-A)(P-B)(P-C) 동시 산출. 스캔 루트는 인자로 받는다 — 루트가 없거나 그 아래에
 * 프로덕션 파일이 없으면 **빈 배열**을 돌려주고, 호출자가 그것을 무판정 실패로 처리한다
 * (spec §동작 1 — 도출 붕괴 은폐 방지).
 */
export function resolutionTargets(root: string = SRC_DIR): ResolutionTarget[] {
	if (!existsSync(root)) return [];
	const out: ResolutionTarget[] = [];
	for (const f of collectFiles(root).filter((x) => isProductionFile(x.rel))) {
		const required = guardBoundaries(readFileSync(f.abs, "utf8"));
		if (required < MULTI_GUARD_MIN) continue;
		const testRel = siblingTestPath(f.rel);
		const have = testRel === null ? 0 : intermediateObservations(readFileSync(join(REPO_ROOT, testRel), "utf8"));
		out.push({ rel: f.rel, testRel, required, have });
	}
	return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function fmt(list: string[]): string {
	return list.map((l) => `  ${l}`).join("\n");
}

describe("post-unmount-emission-audit (TSK-20260824-07-d / REQ-20260824-002)", () => {
	it("G-A: 대상 집합이 디렉터리 열거 + 술어로 산출된다 (파일명 하드코딩 0)", () => {
		const files = productionFiles();
		const targets = widenedSurface(files);
		const specScoped = specScopedTargets(files);

		expect(files.length, "프로덕션 열거가 비었다 — 게이트 공허 통과 위험").toBeGreaterThan(0);

		// 공허 통과 가드 — 세 수치를 전부 단언한다. 하나라도 조용히 0 으로 무너지면
		// 나머지 게이트(G-B/G-C/G-D)는 빈 집합을 검사하고 통과한다.
		//
		// 확장 술어 대상 하한 12 (TSK-20260825-05 착수 시점 실측). 이 수치는
		// `RE_HOOK_CALL` 의 `(?:<[^()]*>)?` 절이 지워지는 회귀도 함께 잡는다 —
		// 그 절이 빠지면 `useState<boolean>(false)` 표기 파일이 통째로 빠져
		// 대상이 11 로 붕괴한다 (실측된 false-negative. analyzer 자가 검증의
		// 표기 변형 단언과 이중으로 고정한다).
		expect(
			targets.length,
			`확장 술어 대상이 12 미만이다 — 열거 또는 술어가 축소됐다:\n${fmt(targets.map((t) => t.rel))}`,
		).toBeGreaterThanOrEqual(12);

		// 선행 술어(effect 등록 한정) 대상 하한 11. 집행에는 쓰이지 않지만 G-E 의
		// 비교항이므로 이쪽이 무너지면 두 술어 정합 판정이 공허해진다.
		expect(
			specScoped.length,
			`선행 술어 대상이 11 미만이다 — 열거가 축소됐다:\n${fmt(specScoped.map((t) => t.rel))}`,
		).toBeGreaterThanOrEqual(11);

		// (I4) wrapper 함정 고정 — fetch 를 하지 않는 wrapper 만 겨냥한 패턴은 어떤
		// 코드 상태에서도 0 을 낸다. 대상 집합은 `lazy()` 로 분리된 **구현 파일**을
		// 포함해야 하고, wrapper 자신은 (async 토큰이 없으므로) 대상이 아니어야 한다.
		const lazyImplRels = new Set<string>();
		const wrapperRels: string[] = [];
		for (const f of files) {
			const source = readFileSync(f.abs, "utf8");
			const finder = new RegExp(RE_LAZY_IMPORT.source, "g");
			let m: RegExpExecArray | null;
			let lazyCount = 0;
			while ((m = finder.exec(source)) !== null) {
				const spec = m[1];
				if (spec === undefined || !spec.startsWith(".")) continue;
				lazyCount += 1;
				const baseAbs = resolve(dirname(f.abs), spec);
				for (const ext of SCAN_EXTENSIONS) {
					const candidate = baseAbs + ext;
					if (existsSync(candidate)) {
						lazyImplRels.add(relative(REPO_ROOT, candidate));
						break;
					}
				}
			}
			if (lazyCount > 0 && !RE_ASYNC_TOKEN.test(source)) wrapperRels.push(f.rel);
		}

		const targetRels = new Set(targets.map((t) => t.rel));
		const lazyTargets = [...lazyImplRels].filter((r) => targetRels.has(r)).sort();
		expect(
			lazyTargets.length,
			"lazy 로 분리된 구현 파일이 대상 집합에 3건 미만이다 — 술어가 wrapper 만 보고 있을 수 있다",
		).toBeGreaterThanOrEqual(3);

		const wrappersInTargets = wrapperRels.filter((r) => targetRels.has(r));
		expect(
			wrappersInTargets,
			`async 토큰이 없는 wrapper 가 대상으로 계수됐다:\n${fmt(wrappersInTargets)}`,
		).toHaveLength(0);
		expect(
			wrapperRels.length,
			"lazy wrapper 가 1건도 없다 — wrapper/구현 분리 구조가 사라졌다면 본 단언의 전제를 재검토해야 한다",
		).toBeGreaterThanOrEqual(1);
	});

	it("G-A 보조: raw 열거에 본 채널 자신이 포함된다 + 스캔 확장자 완전성", () => {
		const raw = collectFiles(SRC_DIR).map((f) => f.rel);
		expect(raw, "raw 열거에서 본 파일이 빠졌다 — 경로 제외가 있다").toContain(REL_SELF);

		const uncovered = collectFiles(SRC_DIR)
			.filter((f) => RE_SCRIPT_LIKE_EXT.test(f.rel))
			.filter((f) => !SCAN_EXTENSIONS.some((ext) => f.rel.endsWith(ext)))
			.map((f) => f.rel);
		expect(
			uncovered,
			`스캔 확장자 집합 밖의 스크립트 파일이 있다 — 그 파일의 위반은 사각지대에 숨는다:\n${fmt(uncovered)}`,
		).toHaveLength(0);
	});

	it("G-B / R-1: 확장 술어 대상 전수에 unmount 가드 식별자가 있다", () => {
		const targets = widenedSurface(productionFiles());
		const unguarded = guardViolations(targets);
		expect(
			unguarded,
			`가드 없는 async continuation 표면:\n${fmt(unguarded)}\n` +
				"await 이후 코드가 unmount 후에도 실행돼 setter · log · reportError 를 발화한다. " +
				"effect 등록 여부는 묻지 않는다 — 이벤트 핸들러의 continuation 도 같은 계약을 진다.",
		).toHaveLength(0);
	});

	it("G-C: 확장 술어 대상마다 unmount 왕복 fixture 가 존재한다", () => {
		const missing = fixtureViolations(widenedSurface(productionFiles()));
		expect(missing, `race fixture 부재:\n${fmt(missing)}`).toHaveLength(0);
	});

	it("G-D / R-2: fixture 가 그 대상이 실제로 내는 발화 종류를 관측한다 (표면 비대칭 차단)", () => {
		const { violations, setterOnlyChecked } = surfaceViolations(widenedSurface(productionFiles()));

		expect(violations, `관측 표면 불일치:\n${fmt(violations)}`).toHaveLength(0);

		// 규칙이 살아 있는지 — setter 전용 표면이 0 이면 본 게이트는 그 축에서 공허하다.
		// 0 이 되는 것 자체는 위반이 아니므로 실패시키지 않고 분류만 고정한다.
		expect(setterOnlyChecked, "setter 전용 분류가 음수일 수 없다").toBeGreaterThanOrEqual(0);
	});

	it("G-E: 두 술어의 정합 — 확장 ⊇ 선행 · 차집합도 집행 대상 (면제 아님)", () => {
		const files = productionFiles();
		const specScoped = specScopedTargets(files);
		const widened = widenedSurface(files);
		const specScopedRels = new Set(specScoped.map((t) => t.rel));

		// (E-1) 발화가 있는 선행 술어 대상은 확장 표면에도 반드시 든다 — 두 술어 중
		//       하나가 고장나면 여기서 잡힌다.
		const widenedRels = new Set(widened.map((t) => t.rel));
		const escaped = specScoped
			.filter((t) => t.emissions.consoleLike + t.emissions.setterLike > 0)
			.filter((t) => !widenedRels.has(t.rel))
			.map((t) => t.rel);
		expect(
			escaped,
			`선행 술어 대상이 확장 표면 열거에서 샜다 — 두 술어 중 하나가 고장났다:\n${fmt(escaped)}`,
		).toHaveLength(0);

		// (E-2) 확장이 축소로 뒤집히지 않는다. 술어 편집으로 확장 표면이 선행보다
		//       좁아지면 집행 대상이 조용히 줄어든다.
		expect(
			widened.length,
			`확장 술어 대상(${widened.length})이 선행 술어 대상(${specScoped.length})보다 적다 — 확장이 축소로 뒤집혔다.`,
		).toBeGreaterThanOrEqual(specScoped.length);

		// (E-3) 차집합(확장 ∖ 선행)은 **면제 목록이 아니라 집행 대상의 일부**다.
		//       이전 판본의 G-E 는 "차집합 = effect 미등록 부류" 를 고정해 사각을
		//       유지했다. 이제는 같은 차집합에 가드 · fixture · 관측 요구를 그대로
		//       적용하고, 그 통과를 여기서 한 번 더 못박는다 (G-B/G-C/G-D 가 이미
		//       전수를 보지만, 차집합이 비게 되는 회귀와 구별하기 위해 분리 단언한다).
		const diff = widened.filter((t) => !specScopedRels.has(t.rel));
		const diffViolations = [
			...guardViolations(diff),
			...fixtureViolations(diff),
			...surfaceViolations(diff).violations,
		];
		expect(
			diffViolations,
			`effect 미등록 async continuation 이 가드·fixture·관측 요구를 통과하지 못했다:\n${fmt(diffViolations)}`,
		).toHaveLength(0);

		// (E-4) 차집합의 모든 파일이 effect 미등록이어야 한다. 하나라도 effect 를
		//       등록하고 있다면 그것은 술어 경계가 아니라 **선행 술어 열거 버그**다.
		const enumerationBugs = diff.filter((t) => RE_EFFECT_REGISTRATION.test(t.source)).map((t) => t.rel);
		expect(
			enumerationBugs,
			`effect 를 등록하는데도 선행 술어 대상에서 빠진 파일 — 열거 버그다:\n${fmt(enumerationBugs)}`,
		).toHaveLength(0);
	});

	it("G-F: 발화 기록을 좁힌 뒤 비어있음을 단정하는 fixture 가 없다 (열거 아닌 deny-by-default 구조 판정)", () => {
		const enumerated = collectFiles(SRC_DIR).filter((f) => RE_TEST_FILE.test(f.rel));

		// 공허 통과 가드 (1) — 0 hit 게이트는 대상이 비면 자동 통과한다.
		// 착수 시점 실측 69.
		expect(
			enumerated.length,
			"테스트 파일 열거가 40 미만이다 — 열거가 축소돼 게이트가 공허해졌다",
		).toBeGreaterThanOrEqual(40);

		// ── 자기 제외 1건과 그 대가 ────────────────────────────────────────────
		// 본 파일은 G-F 판정 함수의 **양성 fixture** 를 합성 문자열로 들고 있다
		// (analyzer 자가 검증). 그 문자열은 판정상 진짜 위반과 구별되지 않는다.
		// 문자열을 쪼개 패턴을 피하는 것은 자기 게이트를 우회하는 형태라 택하지
		// 않고, **자기 자신 1건만** 제외한다. 제외의 대가는 아래 두 단언으로 갚는다:
		//   (i) 제외 대상이 열거에 실재하고 정확히 1건일 것 (제외 과잉 차단)
		//   (ii) 그 파일이 판정 함수에 **양성으로** 걸릴 것 — 즉 판정이 살아 있음을
		//        합성 문자열이 아니라 **실파일 텍스트**로 확인한다 (민감도 상시 증명).
		expect(
			enumerated.map((f) => f.rel),
			"자기 제외 대상이 열거에 없다 — 제외 규칙이 죽은 경로를 가리킨다",
		).toContain(REL_SELF);
		const testFiles = enumerated.filter((f) => f.rel !== REL_SELF);
		expect(enumerated.length - testFiles.length, "자기 제외가 1건이 아니다 — 제외 과잉").toBe(1);
		expect(
			filteredEmissionZeroAssertions(readFileSync(join(REPO_ROOT, REL_SELF), "utf8")).length,
			"본 파일의 양성 fixture 가 판정에 걸리지 않는다 — G-F 판정이 죽었다",
		).toBeGreaterThan(0);

		// 판정 대상 전수를 **보유 / 단락** 두 부류로 분류한다. 단락은 축 1~4 를 한 건도
		// 수행하지 않은 파일이며, 위반 0 으로 통과한 파일과 같은 칸에 들어가지 않는다.
		const spyBearing: string[] = [];
		const shortCircuited: string[] = [];
		const violations: string[] = [];
		for (const f of testFiles) {
			const source = readFileSync(f.abs, "utf8");
			const audit = auditEmissionZeroAssertions(source);
			(audit.shortCircuited ? shortCircuited : spyBearing).push(f.rel);
			for (const record of audit.violations) {
				violations.push(`${f.rel} — \`${record}\` 를 메서드 호출로 좁힌 뒤 비어있음을 단정한다`);
			}
		}

		// (FR-03-a) 대상 수를 **실행 출력**으로 낸다. 주석은 판정에 계수되지 않는다 —
		// 게이트가 몇 개의 파일을 실제로 판정했는지는 실행하는 사람이 볼 수 있어야 한다.
		// `console.log` 는 기본 reporter 가 삼킨다 (vitest 4 실측 — `--reporter=verbose`
		// 에서만 노출). 대상 수는 **어떤 reporter 로 실행해도** 보여야 하므로 stdout 에
		// 직접 쓴다.
		process.stdout.write(
			`[G-F] spy-bearing: ${spyBearing.length} / short-circuit: ${shortCircuited.length} / ` +
				`judged: ${testFiles.length} / enumerated: ${enumerated.length} (self 제외 1)\n`,
		);

		// 공허 통과 가드 (2) — 파일은 세지만 spy 인식이 무너지면 위반이 구조적으로
		// 보이지 않는다. **상수 없는 분할 완전성** 으로 고정한다: 판정 대상은 보유·단락
		// 어느 쪽으로도 새지 않고, 보유가 0 이면 게이트는 아무것도 판정하지 않은 것이다
		// (모집단이 디렉터리 열거이므로 "빈 디렉터리 = 정상" 부류가 없다).
		expect(
			spyBearing.length + shortCircuited.length,
			"보유 + 단락이 판정 대상 수와 다르다 — 분류가 새고 있다",
		).toBe(testFiles.length);
		expect(
			testFiles.length,
			"판정 대상이 0 이다 — 열거가 무너졌다",
		).toBeGreaterThan(0);
		expect(
			spyBearing.length,
			`관측기 보유 파일이 0 이다 — 게이트가 축 1~4 를 한 건도 판정하지 않았다 (단락 ${shortCircuited.length})`,
		).toBeGreaterThanOrEqual(1);

		// (FR-03-b) 축소 대조 — 분할 완전성만으로는 축소가 붉어지지 않는다. 보유 1 건이
		// 단락으로 넘어가도 **합은 보존**되기 때문이다. 그래서 단락 집합을 deny 방향으로
		// 감사한다: 발화 호출을 가진 프로덕션 파일의 형제 테스트는 관측기를 보유해야 하고,
		// 예외는 부채 목록에 이름으로만 존재한다. 대조항은 상수가 아니라 프로덕션 열거에서
		// 매 실행 산출된다.
		const required = emissionObservationRequired();
		expect(
			required.length,
			"관측 요구 모집단이 비었다 — 대조가 공허해졌다 (프로덕션 열거 또는 형제 해석이 무너졌다)",
		).toBeGreaterThan(0);
		const enumeratedRels = new Set(enumerated.map((f) => f.rel));
		const requiredOutside = required.filter((r) => !enumeratedRels.has(r));
		expect(
			requiredOutside,
			`관측 요구 대상이 테스트 파일 열거 밖이다 — 두 열거가 어긋났다:\n${fmt(requiredOutside)}`,
		).toHaveLength(0);

		// 부채 목록 죽은 항목 차단 (RULE-06 §열거 고정 금지 — 하드코딩엔 완전성 보조 단언).
		const deadDebt = [...EMISSION_OBSERVATION_DEBT].filter((r) => !required.includes(r));
		expect(
			deadDebt,
			`관측 부채 목록이 요구 집합에 없는 경로를 가리킨다 — 예외가 죽은 경로다:\n${fmt(deadDebt)}`,
		).toHaveLength(0);

		const shortCircuitedRels = new Set(shortCircuited);
		const unobserved = required.filter(
			(r) => shortCircuitedRels.has(r) && !EMISSION_OBSERVATION_DEBT.has(r),
		);
		expect(
			unobserved,
			`발화하는 프로덕션 파일의 형제 테스트가 관측기 0 으로 **단락**됐다:\n${fmt(unobserved)}\n` +
				`판정 대상 집합이 조용히 줄었다 (spy-bearing ${spyBearing.length} / short-circuit ${shortCircuited.length}). ` +
				"관측기를 되살리거나, 그 파일이 관측 대상이 아님을 부채 목록에 근거와 함께 등재하라.",
		).toHaveLength(0);

		expect(
			violations,
			`좁힌 뒤의 영단정 (민감도 0 fixture):\n${fmt(violations)}\n` +
				"React 18.2 는 unmounted fiber 의 setState 에 경고를 내지 않는다 — 문구로 거른 뒤 세는 " +
				"단정은 가드를 전부 제거해도 통과한다. 무필터 0 단정으로 바꿔라.",
		).toHaveLength(0);
	});

	it("G-G: 다중 post-await 가드 표면의 분해능 — 대상별 `요구 N / 보유 M` 집행", () => {
		// 등급 분리 — 모집단은 **디렉터리 열거**다. `src/` 루트가 없으면 측정 자체가
		// 불가능하므로 무판정 실패이고, 루트는 있으나 (P-A) 가 공집합인 것도 무판정
		// 실패다 (spec §동작 1). 빈 **하위** 디렉터리가 존재하는 것 자체는 위반이
		// 아니다 — 열거가 그 디렉터리를 그냥 지나칠 뿐이다. package.json 키 열거
		// 모집단의 "빈 목록 = 정상" 규칙을 여기에 복사하지 않는다.
		expect(existsSync(SRC_DIR), "스캔 루트(src/)가 없다 — 무판정 (측정 불가)").toBe(true);

		const targets = resolutionTargets();

		expect(
			targets.length,
			"(P-A) 도출이 공집합이다 — 무판정. 다중 post-await 가드 표면이 실제로 사라진 것이 아니라면 " +
				"가드 검사 패턴 또는 continuation 구간 산출이 무너진 것이다 (도출 붕괴 은폐 방지).",
		).toBeGreaterThan(0);

		const totalRequired = targets.reduce((n, t) => n + t.required, 0);
		const totalHave = targets.reduce((n, t) => n + t.have, 0);

		// (§동작 5) 통과 시에도 대상별 수치를 낸다. `console.log` 는 vitest 4 기본
		// reporter 가 삼키므로 stdout 에 직접 쓴다 (G-F 의 spy-bearing 행과 같은 채널).
		const summary = `[G-G] 대상 수: ${targets.length} / 요구 합: ${totalRequired} / 보유 합: ${totalHave}\n`;
		process.stdout.write(summary);
		const perTarget = targets.map((t) => `[G-G] ${t.rel}: 요구 ${t.required} / 보유 ${t.have}\n`);
		for (const line of perTarget) process.stdout.write(line);

		// 회피 경로 차단 (1) — 출력한 `대상 수` 가 (P-A) 도출 수와 같은가. 총계만
		// 줄여 찍고 전건 열거는 그대로 두는 경로를 막는다. 파싱은 출력 문자열 자체에서
		// 한다 — 변수를 다시 읽으면 "출력이 맞는가" 가 아니라 "변수가 자기 자신인가" 다.
		const printed = /대상 수: (\d+) \/ 요구 합: (\d+) \/ 보유 합: (\d+)/.exec(summary);
		expect(printed, `총계 1행의 형식이 깨졌다: ${summary}`).not.toBeNull();
		expect(Number(printed?.[1]), "출력한 대상 수가 (P-A) 도출 수와 다르다").toBe(targets.length);
		expect(perTarget.length, "대상 전건 출력 행 수가 도출 수와 다르다").toBe(targets.length);
		expect(Number(printed?.[2]), "출력한 요구 합이 대상별 요구의 합과 다르다").toBe(totalRequired);
		expect(Number(printed?.[3]), "출력한 보유 합이 대상별 보유의 합과 다르다").toBe(totalHave);

		// 회피 경로 차단 (2) — 모집단 수 하한. 분할 완전성·형식 정합만으로는 대상이
		// 조용히 줄어드는 것이 붉어지지 않는다 (줄어든 채로도 전부 정합하기 때문이다).
		// 착수 시점 실측 11 (TSK-20260828-01). 슬랙 2 — 컴포넌트 통폐합 여지.
		expect(
			targets.length,
			`(P-A) 대상이 9 미만이다 — 열거 또는 가드 경계 산출이 축소됐다:\n${fmt(
				targets.map((t) => `${t.rel} (요구 ${t.required})`),
			)}`,
		).toBeGreaterThanOrEqual(9);

		// 공허 방지 — 요구 합이 대상 수 × 2 미만이면 (P-A) 술어(경계 2 이상)와 (P-B)
		// 산출이 어긋난 것이다. 둘은 같은 함수에서 나오므로 어긋나면 버그다.
		expect(
			totalRequired,
			"요구 합이 대상 수 × 2 미만이다 — 모집단 술어와 경계 산출이 어긋났다",
		).toBeGreaterThanOrEqual(targets.length * 2);

		// 회피 경로 차단 (3) — **요구 합 하한**. 본 계약이 이름으로 지목한 방어 대상은
		// "다중 가드 표면에서 마지막 가드를 제외한 **중간 가드가 제거·누락되는 사건**"
		// 이다 (spec §역할). 그 사건은 `요구` 를 **줄인다** — 그래서 `요구 ≤ 보유` 대조
		// 하나만으로는 붉어지지 않는다 (요구가 줄면 대조는 오히려 여유로워진다).
		// 가드 1개 소실이 합에서 1 만큼 빠지는 것을 여기서 잡는다.
		//
		// 착수 실측 39 (TSK-20260828-01 / 대상 11건). G-A 의 대상 수 하한과 같은 이디엄이며
		// 같은 대가를 진다 — 가드를 **정상적으로** 줄이는 리팩터는 이 수치를 함께 내려야
		// 한다. 그 편집이 명시적이어야 한다는 것이 본 단언의 목적이다.
		expect(
			totalRequired,
			`post-await 가드 경계 합이 39 미만이다 — 가드가 사라졌거나 (P-B) 산출이 축소됐다:\n${fmt(
				targets.map((t) => `${t.rel}: 요구 ${t.required} / 보유 ${t.have}`),
			)}`,
		).toBeGreaterThanOrEqual(39);

		// (§동작 4) 집행 — `요구 > 보유` 인 원소를 대상별 형태로 열거하고 실패시킨다.
		const under = targets
			.filter((t) => t.required > t.have)
			.map(
				(t) =>
					`${t.rel}: 요구 ${t.required} / 보유 ${t.have}` +
					(t.testRel === null ? " (형제 fixture 부재 — G-C 참조)" : ` (${t.testRel})`),
			);
		expect(
			under,
			`post-await 가드 경계 수보다 형제 fixture 의 중간 관측이 적다:\n${fmt(under)}\n` +
				"중간 가드 1개가 사라져도 뒤 경계의 가드가 대신 막아 '최종 발화 0' 단정은 통과한다. " +
				"경계 이후 진행을 드러내는 **양성** 관측(다음 단계 호출을 spy 로 관측)을 보강하라. " +
				"숫자를 맞추기 위한 무의미 단정은 금지다 — 그 경우 (P-B) 산정의 과대 계수를 좁혀라.",
		).toHaveLength(0);
	});

	it("G-G 자가 검증: 주석 절단 · catch 경계 계수 · 부정 단정 제외", () => {
		// ── 주석 절단 — 판정은 **실행 라인**만 본다 ──────────────────────────
		expect(stripComments("const a = 1; // if(cancelled.current) return;\n")).not.toContain("cancelled");
		expect(stripComments("/* if(isMounted.current) return; */\nconst a = 1;")).not.toContain("isMounted");
		// 문자열 안의 `//` 는 주석이 아니다 (URL 오절단 방지).
		expect(stripComments('const u = "https://x/y"; // c'), "문자열 안의 // 를 주석으로 잘랐다").toContain(
			"https://x/y",
		);
		// 주석에만 있는 가드는 경계로 계수되지 않는다.
		const commentedGuard = ["const f = async () => {", "\tawait g();", "\t// if(cancelled.current) return;", "\tlog('x');", "};"].join("\n");
		expect(guardBoundaries(commentedGuard), "주석 안의 가드를 경계로 셌다").toBe(0);
		// 같은 라인을 실행 구간으로 되돌리면 1 이 된다 — 절단이 계수보다 앞이라는 증거.
		const liveGuard = commentedGuard.replace("// if(", "if(");
		expect(guardBoundaries(liveGuard), "실행 구간의 가드를 놓쳤다").toBe(1);
		// 부정 단정의 주석 절단도 같은 방향으로 움직인다.
		expect(intermediateObservations("// expect(s).toHaveBeenCalledWith(1);\n")).toBe(0);
		expect(intermediateObservations("expect(s).toHaveBeenCalledWith(1);\n")).toBe(1);

		// ── catch 진입 경계 (spec §동작 2) ───────────────────────────────────
		// try 본문 경계 · catch 진입 경계 · try/catch 이후 경계 셋을 모두 센다.
		const threeBoundaries = [
			"const f = async () => {",
			"\ttry {",
			"\t\tconst res = await g();",
			"\t\tif(cancelled.current) return;",
			"\t\tlog('ok');",
			"\t}",
			"\tcatch(err) {",
			"\t\tif(cancelled.current) return;",
			"\t\tlog('fail');",
			"\t}",
			"\tif(cancelled.current) return;",
			"\tsetIsLoading(false);",
			"};",
		].join("\n");
		expect(guardBoundaries(threeBoundaries), "catch 진입 경계 또는 try 이후 경계를 놓쳤다").toBe(3);

		// 진입 가드(`await` 앞)는 post-await 경계가 아니다.
		const preGuard = ["const f = async () => {", "\tif(cancelled.current) return;", "\tawait g();", "};"].join("\n");
		expect(guardBoundaries(preGuard), "await 앞의 진입 가드를 post-await 경계로 셌다").toBe(0);

		// 인접 블록으로 새지 않는다 — 다른 함수의 가드까지 삼키면 요구가 부풀어 오른다.
		const adjacent = [
			"const f = async () => {",
			"\tawait g();",
			"\tlog('inside');",
			"};",
			"const h = () => {",
			"\tif(cancelled.current) return;",
			"};",
		].join("\n");
		expect(guardBoundaries(adjacent), "인접 블록의 가드까지 계수했다").toBe(0);

		// 수단 중립 (spec §역할 (i)) — ref 플래그 · isMounted · AbortSignal 셋 다 경계다.
		for (const cond of ["cancelled.current", "!isMounted.current", "controller.signal.aborted"]) {
			const src = ["const f = async () => {", "\tawait g();", `\tif(${cond}) return;`, "};"].join("\n");
			expect(guardBoundaries(src), `가드 수단을 놓쳤다: ${cond}`).toBe(1);
		}
		// 동등 표현 치환에도 경계 수는 불변이다 (정상 리팩터를 위반으로 잡지 않는다).
		const equivalent = ["const f = async () => {", "\tawait g();", "\tif (cancelled.current === true) return;", "};"].join("\n");
		expect(guardBoundaries(equivalent), "동등 표현 가드를 놓쳤다 — 게이트가 과잉 특정이다").toBe(1);

		// ── (P-C) 양성 단정만 센다 ───────────────────────────────────────────
		expect(intermediateObservations("expect(s).not.toHaveBeenCalled();"), "부정 단정을 중간 관측으로 셌다").toBe(0);
		expect(intermediateObservations("expect(s).not.toHaveBeenCalledWith(1);"), "부정 With 단정을 셌다").toBe(0);
		expect(intermediateObservations("expect(s).toHaveBeenCalledTimes(0);"), "0회 단정을 셌다").toBe(0);
		expect(intermediateObservations("expect(s).toHaveBeenCalledTimes(1);")).toBe(1);
		expect(intermediateObservations("expect(s).toHaveBeenCalled();")).toBe(1);
		expect(intermediateObservations("await waitFor(() => expect(s).toHaveBeenCalledWith('a', 'b'));")).toBe(1);

		// ── 스캔 루트 부재 · 공집합은 무판정으로 빠진다 (등급 분리) ──────────
		expect(resolutionTargets(join(REPO_ROOT, "no-such-root-for-gg")), "없는 루트에서 대상이 나왔다").toHaveLength(0);
	});

	it("analyzer 자가 검증: 표기 변형 · 블록 경계 · 발화 분류 (RULE-06 §fixture 대표성)", () => {
		// 블록 경계 — post-await 구간이 인접 블록으로 새지 않는다.
		const twoBlocks = [
			"const a = () => {",
			"\tconst r = await f();",
			"\tlog('inside');",
			"};",
			"const b = () => {",
			"\tlog('adjacent');",
			"};",
		].join("\n");
		const regions = postAsyncRegions(twoBlocks);
		expect(regions).toHaveLength(1);
		expect(regions[0]).toContain("inside");
		expect(regions[0], "인접 블록의 발화까지 삼켰다").not.toContain("adjacent");

		// 중첩 블록은 삼키지 않고 통과한다.
		const nested = "async () => {\n\tawait f();\n\tif (ok) {\n\t\tsetValue(1);\n\t}\n\tlog('after');\n}";
		const nestedEmissions = postAsyncEmissions(nested);
		expect(nestedEmissions.setterLike).toBe(1);
		expect(nestedEmissions.consoleLike).toBe(1);

		// 표기 변형 — 탭 들여쓰기 / 컬럼 위치 / then 체인 / 개행 배치.
		const variants = [
			"\t\t\tconst r = await f();\n\t\t\treportError(r);",
			"f().then((r) => {\n  setDone(true);\n})",
			"const r =\n\tawait f();\nconsole.error(r);",
		];
		for (const v of variants) {
			const e = postAsyncEmissions(v);
			expect(e.consoleLike + e.setterLike, `표기 변형에서 발화를 놓쳤다:\n${v}`).toBeGreaterThan(0);
		}

		// 훅 호출 표기 변형 — TS 타입 인자가 끼면 좁은 패턴이 통째로 놓친다.
		expect(RE_HOOK_CALL.test("const [v, setV] = useState<boolean>(false);"), "TS 타입 인자 표기의 훅 호출을 놓쳤다").toBe(true);
		expect(RE_HOOK_CALL.test("const [v, setV] = useState(false);")).toBe(true);
		expect(RE_HOOK_CALL.test("\tuseEffect(() => {}, []);")).toBe(true);
		expect(RE_HOOK_CALL.test("const useThing = 1;"), "훅 호출이 아닌 식별자를 훅으로 계수했다").toBe(false);

		// async 토큰이 없으면 구간도 발화도 0 (wrapper 부류).
		expect(postAsyncRegions("const W = lazy(() => import('./X'));\nexport default W;")).toHaveLength(0);

		// 발화 종류별 요구 표면.
		expect(requiredSurfaces({ consoleLike: 0, setterLike: 3 })).toEqual(["setter"]);
		expect(requiredSurfaces({ consoleLike: 2, setterLike: 3 })).toEqual(["console"]);
		expect(requiredSurfaces({ consoleLike: 0, setterLike: 0 })).toEqual([]);

		// 관측 표면 판정 — 바인딩만 하고 쓰지 않는 spy 는 관측이 아니다.
		const boundUnused = "const s = vi.spyOn(console, 'log');\nunmount();";
		expect(fixtureObservations(boundUnused).consoleSurface).toBe(false);
		const boundUsed = "const s = vi.spyOn(console, 'log');\nexpect(s).not.toHaveBeenCalled();";
		expect(fixtureObservations(boundUsed).consoleSurface).toBe(true);
		const filteredUse = "const s = vi.spyOn(console, 'error');\nconst c = s.mock.calls;\nexpect(c.length).toBe(0);";
		expect(fixtureObservations(filteredUse).consoleSurface).toBe(true);

		// setter 계수 관측기 — 모듈 mock 없이 콘솔 spy 만 있으면 setter 표면은 미관측.
		expect(fixtureObservations(boundUsed).setterSurface).toBe(false);
		const recorder = [
			"vi.mock('react', async (importOriginal) => {",
			"\tconst actual = await importOriginal();",
			"\tconst useState = (i) => actual.useState(i);",
			"\treturn { ...actual, useState };",
			"});",
			"expect(rec.calls).toBe(0);",
		].join("\n");
		expect(fixtureObservations(recorder).setterSurface).toBe(true);

		// ── G-F 판정 자가 검증 (RULE-06 §fixture 대표성) ──────────────────────
		// 양성 1 — 별칭 경유. 착수 시점 위반 4 파일 중 3 파일이 이 형태였다.
		const aliasFiltered = [
			"const s = vi.spyOn(console, 'error');",
			"const calls = s.mock.calls;",
			"const f = calls.filter(c => /x/.test(c[0]));",
			"expect(f.length).toBe(0);",
		].join("\n");
		expect(filteredEmissionZeroAssertions(aliasFiltered), "별칭 경유 필터를 놓쳤다").toContain("calls");

		// 양성 2 — 직결. 리터럴 문구 grep 이 놓친 `.includes()` 변형이 이 형태다.
		const directFiltered = [
			"const s = vi.spyOn(console, 'error');",
			"const w = s.mock.calls.filter(c => String(c[0]).includes('unmounted'));",
			"expect(w.length).toBe(0);",
		].join("\n");
		expect(filteredEmissionZeroAssertions(directFiltered), "직결 필터를 놓쳤다").toContain("s.mock.calls");

		// 음성 1 — 발화 spy 가 아니다 (`src/App.test.jsx` 의 실제 형태).
		const nonEmissionSpy = [
			"const a = vi.spyOn(window, 'addEventListener');",
			"const r = a.mock.calls.filter(([e]) => e === 'resize');",
			"expect(r.length).toBe(2);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(nonEmissionSpy),
			"발화가 아닌 spy 의 필터를 위반으로 잡았다 — 정상 테스트 오탐",
		).toHaveLength(0);

		// 음성 2 — 0 단정이 아니다.
		const nonZeroAssert = [
			"const s = vi.spyOn(console, 'error');",
			"const w = s.mock.calls.filter(c => /x/.test(c[0]));",
			"expect(w.length).toBeGreaterThanOrEqual(1);",
		].join("\n");
		expect(filteredEmissionZeroAssertions(nonZeroAssert), "0 단정이 아닌 필터를 잡았다").toHaveLength(0);

		// 음성 3 — 무필터 0 단정 (본 task 가 정착시킨 형태).
		const unfiltered = [
			"const s = vi.spyOn(console, 'error');",
			"s.mockClear();",
			"unmount();",
			"expect(s).not.toHaveBeenCalled();",
		].join("\n");
		expect(filteredEmissionZeroAssertions(unfiltered), "무필터 0 단정을 위반으로 잡았다").toHaveLength(0);

		// 양성 3 — `.find(…)` + `toBeUndefined()`. `src/Search/Search.test.tsx:218` 의
		// 실물 형태다. 선택자·어휘 **두 축 모두** 종전 열거 밖이라 미검출이었다.
		const findUndefined = [
			"const s = vi.spyOn(console, 'error');",
			"const w = s.mock.calls.find(c => String(c[0]).includes('unmounted'));",
			"expect(w).toBeUndefined();",
		].join("\n");
		expect(filteredEmissionZeroAssertions(findUndefined), "`.find` + `toBeUndefined` 를 놓쳤다").toContain("s.mock.calls");

		// 양성 4 — `.some(…)` + `toBe(false)`. 어휘가 `toBe(0)` 이 아니라 `toBe(false)` 다.
		const someFalse = [
			"const s = vi.spyOn(console, 'error');",
			"const seen = s.mock.calls.some(c => /x/.test(c[0]));",
			"expect(seen).toBe(false);",
		].join("\n");
		expect(filteredEmissionZeroAssertions(someFalse), "`.some` + `toBe(false)` 를 놓쳤다").toContain("s.mock.calls");

		// 양성 5 — `.filter(…)` + `toBeUndefined()`. 선택자는 종전 열거 **안**, 어휘만
		// 밖인 조합. 두 축이 독립임을 고정한다 (한 축만 넓히면 이 형태로 샌다).
		const filterUndefined = [
			"const s = vi.spyOn(console, 'error');",
			"const w = s.mock.calls.filter(c => /x/.test(c[0]))[0];",
			"expect(w).toBeUndefined();",
		].join("\n");
		expect(filteredEmissionZeroAssertions(filterUndefined), "`.filter` + `toBeUndefined` 를 놓쳤다").toContain("s.mock.calls");

		// ── TSK-20260825-13 (Dir-E) 4방향 — 위상 양방향화 + 기록 식별 deny 전환 ──
		// 아래 넷은 착수 시점 HEAD 의 판정이 **전부 미검출**한 형태다 (inspector tick 221
		// 실측). 대조군(양성 2)만 검출됐다는 사실이 축 3·4 가 남은 사각임을 고정한다.

		// (E1) 양성 — 인라인 좁힘 + `toHaveLength(0)`. 좁힘이 `expect(` **안쪽**이라
		// 뒤쪽 창에는 `expect(` 가 없다. 양성 2 를 **한 줄로 접기만 한** 형태이며,
		// `src/Search/Search.test.tsx:218` 을 이렇게 접으면 종전 판정은 통과했다.
		const inlineHaveLength = [
			"const s = vi.spyOn(console, 'error');",
			"expect(s.mock.calls.filter(c => String(c[0]).includes('unmounted'))).toHaveLength(0);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(inlineHaveLength),
			"(E1) 인라인 좁힘 + toHaveLength(0) 을 놓쳤다 — 위상이 여전히 단방향이다",
		).toContain("s.mock.calls");

		// (E2) 양성 — 인라인 좁힘 + `toBeUndefined()`. 선택자·어휘·위상 세 축이 동시에
		// 종전 열거 밖인 조합.
		const inlineUndefined = [
			"const s = vi.spyOn(console, 'error');",
			"expect(s.mock.calls.find(c => String(c[0]).includes('unmounted'))).toBeUndefined();",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(inlineUndefined),
			"(E2) 인라인 좁힘 + toBeUndefined 를 놓쳤다",
		).toContain("s.mock.calls");

		// (E3) 양성 — 구조분해 별칭 `const { calls } = s.mock`. 기록 식별이 열거이던
		// 동안 이 형태는 기록으로 인식조차 되지 않아 좁힘이 통째로 판정 밖이었다.
		const destructuredAlias = [
			"const s = vi.spyOn(console, 'error');",
			"const { calls } = s.mock;",
			"const w = calls.filter(c => /x/.test(c[0]));",
			"expect(w.length).toBe(0);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(destructuredAlias),
			"(E3) 구조분해 별칭을 기록으로 인식하지 못했다",
		).toContain("calls");

		// (E3b) 양성 — `const m = s.mock` 경유 2단 도달. 도달 경로 전개가 중간 단계
		// 수에 무관함을 고정한다 (열거였다면 이 형태도 별도 항목이 필요했다).
		const mockObjectAlias = [
			"const s = vi.spyOn(console, 'error');",
			"const m = s.mock;",
			"const w = m.calls.filter(c => /x/.test(c[0]));",
			"expect(w.length).toBe(0);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(mockObjectAlias),
			"(E3b) `spy.mock` 별칭 경유 도달을 놓쳤다",
		).toContain("m.calls");

		// (E3c) 양성 — `const { mock } = s` 구조분해 후 `mock.calls`. 게이트가 형태를
		// 열거했다면 (E3)·(E3b) 를 넣어도 이 형태는 다시 샜을 것이다.
		const destructuredMock = [
			"const s = vi.spyOn(console, 'error');",
			"const { mock } = s;",
			"const w = mock.calls.some(c => /x/.test(c[0]));",
			"expect(w).toBe(false);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(destructuredMock),
			"(E3c) `const { mock } = spy` 경유 도달을 놓쳤다",
		).toContain("mock.calls");

		// 양성 7 — **뒤쪽 창이 앞쪽 단정을 오채택하지 않음**. 좁힘 직전 줄에 무관한
		// 허용 어휘 단정(`toBeTruthy`)이 있어도 그것은 좁힘을 감싸지 않으므로 위반이
		// 취소되면 안 된다. 이 단언이 없으면 양방향화가 **deny 를 allow 로 뒤집는**
		// 형태로 들어와도 나머지 fixture 가 전부 통과한다 (TSK-20260825-13 §구현 지시 1).
		const precedingUnrelatedAssert = [
			"const s = vi.spyOn(console, 'error');",
			"expect(document.body).toBeTruthy();",
			"const w = s.mock.calls.filter(c => /x/.test(c[0]));",
			"expect(w.length).toBe(0);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(precedingUnrelatedAssert),
			"선행 무관 단정이 위반을 취소했다 — 뒤쪽 창이 감싸지 않는 expect 를 집었다",
		).toContain("s.mock.calls");

		// 음성 6 — 인라인 좁힘이지만 **비어있지 않음** 단정이다. 양방향화가 위상만
		// 뒤집고 어휘 판정을 건너뛰면 이 정상 용례가 오탐된다.
		const inlineNonEmpty = [
			"const s = vi.spyOn(console, 'error');",
			"expect(s.mock.calls.map(c => String(c[0]))).toContain('boom');",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(inlineNonEmpty),
			"인라인 좁힘 + 비어있지 않음 단정을 위반으로 잡았다 — 정상 테스트 오탐",
		).toHaveLength(0);

		// 양성 6 (**비열거성 probe**) — 게이트 판정 소스 어디에도 등장하지 않는
		// 메서드·매처 조합. 아래 두 단언이 **함께** 통과해야 deny-by-default 다:
		//   (i) 이 조합이 위반으로 잡힌다.
		//   (ii) 게이트 판정 소스에 그 어휘가 없다 — 즉 목록에 추가돼서 잡힌 게 아니다.
		// (ii) 가 깨지면 이뤄진 것은 전환이 아니라 열거 확장이다.
		const unknownCombination = [
			"const s = vi.spyOn(console, 'error');",
			"const w = s.mock.calls.flatMap(c => c);",
			"expect(w).toStrictEqual([]);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(unknownCombination),
			"게이트가 모르는 조합을 통과시켰다 — 기본값이 여전히 '통과' 다",
		).toContain("s.mock.calls");

		// (E4) 양성 — **인라인 × 비열거성**. 위 양성 6 의 조합을 한 줄로 접은 형태로,
		// 축 3·4 전환 이후에도 "게이트가 모르는 조합" 이 기본 위반임을 고정한다.
		const inlineUnknownCombination = [
			"const s = vi.spyOn(console, 'error');",
			"expect(s.mock.calls.flatMap(c => c)).toStrictEqual([]);",
		].join("\n");
		expect(
			filteredEmissionZeroAssertions(inlineUnknownCombination),
			"(E4) 인라인 × 게이트가 모르는 조합을 통과시켰다 — 기본값이 여전히 '통과' 다",
		).toContain("s.mock.calls");

		// 판정 소스 = 판정 함수 본문 + 토큰 상수. fixture 문자열(위 조합이 들어 있다)은
		// 판정 로직이 아니므로 제외한다.
		const gateSource = [
			filteredEmissionZeroAssertions.toString(),
			auditEmissionZeroAssertions.toString(),
			assertsNonEmptyNear.toString(),
			nearestAssertion.toString(),
			enclosingAssertion.toString(),
			recordExpressions.toString(),
			emissionSpyNames.toString(),
			isEmissionObserver.toString(),
			RE_NONEMPTY_ASSERT_NEAR.source,
			RE_POSITIVE_CALLED.source,
			RE_NEGATED_CALLED.source,
			RE_PATH_BINDING.source,
			RE_DESTRUCTURED_BINDING.source,
			RE_EXPECT_CALL.source,
			[...RECORD_ACCESS_ALLOWLIST].join(","),
			[...RECORD_REACH_ALLOWLIST].join(","),
			RE_VALUE_SUPPLYING_MOCK.source,
			[...HOST_ENVIRONMENT_ROOTS].join(","),
		].join("\n");
		// 공허 방지 — gateSource 가 비면 not.toMatch 는 무조건 통과한다.
		expect(gateSource.length, "판정 소스 수집이 비었다 — 비열거성 단언이 공허해진다").toBeGreaterThan(200);
		expect(gateSource, "판정 소스에 허용 목록 상수가 없다 — 수집 대상이 어긋났다").toContain("RECORD_ACCESS_ALLOWLIST");
		expect(gateSource, "판정 소스에 도달 경로 허용 목록이 없다 — 축 3 수집 대상이 어긋났다").toContain(
			"RECORD_REACH_ALLOWLIST",
		);
		// 축 1·3 의 허용 목록은 **둘 다 공집합이어야** deny-by-default 다. 이름이 하나라도
		// 들어오면 그 이름을 쓴 재도입이 통째로 통과한다 (TSK-20260825-13 §구현 지시 3).
		expect(RECORD_ACCESS_ALLOWLIST.size, "축 1 허용 목록이 비어있지 않다 — deny 전환이 되돌아갔다").toBe(0);
		expect(RECORD_REACH_ALLOWLIST.size, "축 3 허용 목록이 비어있지 않다 — deny 전환이 되돌아갔다").toBe(0);
		expect(
			gateSource,
			"판정 소스가 probe 어휘를 열거하고 있다 — deny-by-default 전환이 아니라 열거 확장이다",
		).not.toMatch(/flatMap|toStrictEqual/);

		// 음성 4 — 발화 기록의 `.slice(…)` + `toHaveLength(2)`. 선택자 축에는 걸리지만
		// 양수 단정이므로 허용된다 (`src/App.test.jsx:206` 이 실물 형태다).
		const slicePositive = [
			"const s = vi.spyOn(console, 'error');",
			"const first = s.mock.calls.slice(0, 2);",
			"expect(first).toHaveLength(2);",
		].join("\n");
		expect(filteredEmissionZeroAssertions(slicePositive), "양수 단정을 위반으로 잡았다 — 정상 테스트 오탐").toHaveLength(0);

		// 음성 5 — 좁히기만 하고 단정하지 않는다. 본 계약의 대상이 아니다.
		const narrowWithoutAssert = [
			"const s = vi.spyOn(console, 'error');",
			"const w = s.mock.calls.filter(c => /x/.test(c[0]));",
			"console.log(w.length);",
		].join("\n");
		expect(filteredEmissionZeroAssertions(narrowWithoutAssert), "단정 없는 좁힘을 위반으로 잡았다").toHaveLength(0);

		// ── (Q-A) 관측기 판정 자가 검증 — deny-by-default (TSK-20260827-10-b / FR-01) ──
		// 양성 (보존) — 콘솔·리포터 관측기.
		expect(emissionSpyNames("const s = vi.spyOn(console, 'error');")).toEqual(["s"]);
		expect(emissionSpyNames("const s = vi.spyOn(errorReporter, 'reportError');")).toEqual(["s"]);
		// 양성 (신규) — **목록 밖 이름**의 발화 설비. 종전 이름 열거에서는 spy 로 인식되지
		// 않아 이 소스를 가진 파일의 축 1~4 판정이 통째로 단락됐다.
		expect(
			emissionSpyNames("const emit = vi.spyOn(customLogger, 'emit');"),
			"목록 밖 이름의 발화 관측기를 인식하지 못했다 — 축 5 가 여전히 이름 열거다",
		).toEqual(["emit"]);
		expect(
			emissionSpyNames("const t = vi.spyOn(telemetry, 'capture');"),
			"두 번째 목록 밖 설비도 인식하지 못했다 — 목록을 한 칸 늘렸을 뿐이다",
		).toEqual(["t"]);
		// 음성 (N2) — 플랫폼 배선. 호스트 환경 객체를 **경유한** 접근은 발화 싱크가 아니다.
		expect(
			emissionSpyNames("const a = vi.spyOn(window, 'addEventListener');"),
			"플랫폼 배선 spy 를 관측기로 잡았다 — 술어 과잉 확장 (정상 테스트 오탐)",
		).toEqual([]);
		expect(
			emissionSpyNames("const f = vi.spyOn(globalThis, 'fetch');"),
			"호스트 전역 경유 spy 를 관측기로 잡았다 — 술어 과잉 확장",
		).toEqual([]);
		// 음성 (N1) — 값 공급 스텁. 반환값이 프로덕션에 소비되는 입력 의존성이다.
		expect(
			emissionSpyNames(
				["const g = vi.spyOn(api, 'getLogs');", "g.mockResolvedValue({ items: [] });"].join("\n"),
			),
			"값 공급 스텁을 관측기로 잡았다 — 술어 과잉 확장",
		).toEqual([]);
		// (N1) 은 **묵음** 스텁을 제외하지 않는다 — 콘솔 관측기의 표준 형태가 그것이다.
		expect(
			emissionSpyNames(
				["const s = vi.spyOn(console, 'error');", "s.mockImplementation(() => {});"].join("\n"),
			),
			"묵음 스텁이 붙은 콘솔 관측기를 제외했다 — (N1) 이 과잉이라 관측기가 조용히 줄어든다",
		).toEqual(["s"]);
		// 이름 열거 부재 — 판정 소스가 발화 메서드 어휘를 들고 있으면 전환이 아니라 열거 확장이다.
		expect(
			[isEmissionObserver.toString(), emissionSpyNames.toString()].join("\n"),
			"관측기 판정이 여전히 발화 메서드 이름을 열거한다 — deny 전환이 아니다",
		).not.toMatch(/reportError|['"]warn['"]|['"]info['"]/);

		// ── (Q-B) 단락 신호 자가 검증 (TSK-20260827-10-a / FR-02) ────────────
		// 관측기 0 인 소스는 "위반 0" 이 아니라 **단락** 으로 분류된다. 아래 소스는 축 1
		// 위반 형태를 그대로 갖고 있으면서 spy 가 전부 (N2) 플랫폼 배선이라 관측기가 0 이다.
		// (축 5 전환 전에는 `customLogger.emit` 이 이 자리에 있었다 — 이제 그것은 관측기로
		// 인식되므로 단락 fixture 로 쓸 수 없다. 아래 축 5 회귀 고정이 그 소스를 이어받는다.)
		const noObserver = [
			"const a = vi.spyOn(window, 'addEventListener');",
			"const w = a.mock.calls.filter(c => /x/.test(c[0]));",
			"expect(w.length).toBe(0);",
		].join("\n");
		const shortCircuitAudit = auditEmissionZeroAssertions(noObserver);
		expect(shortCircuitAudit.shortCircuited, "관측기 0 도출이 단락으로 분류되지 않았다").toBe(true);
		expect(shortCircuitAudit.violations, "단락은 위반을 낼 수 없다 — 판정을 수행하지 않았기 때문이다").toHaveLength(0);

		// 대조 — 같은 좁힘·같은 어휘인데 관측기가 인식되는 소스는 **판정된다**.
		const judgedAudit = auditEmissionZeroAssertions(aliasFiltered);
		expect(judgedAudit.shortCircuited, "관측기 보유 소스를 단락으로 분류했다").toBe(false);
		expect(judgedAudit.violations.length, "판정된 소스의 위반이 사라졌다").toBeGreaterThan(0);

		// ── (Q-A) 축 5 전환의 회귀 고정 (TSK-20260827-10-b / FR-01) ──────────
		// **종전 판본의 단락 사례**가 이제는 판정된다. 같은 소스가 전환 전에는
		// `shortCircuited: true` (축 1~4 판정 0 건) 였고 — 그 상태는 "위반 없음" 과
		// 관측적으로 동일했다 — 전환 후에는 축 1 위반으로 잡힌다. 이 두 단언이 축 5
		// false-negative 의 재도입을 고정한다: 판정을 이름 열거로 되돌리면 둘 다 붉어진다.
		const outOfListObserver = [
			"const emit = vi.spyOn(customLogger, 'emit');",
			"const w = emit.mock.calls.filter(c => /x/.test(c[0]));",
			"expect(w.length).toBe(0);",
		].join("\n");
		const outOfListAudit = auditEmissionZeroAssertions(outOfListObserver);
		expect(
			outOfListAudit.shortCircuited,
			"목록 밖 이름의 관측기를 쓴 소스가 여전히 단락된다 — 축 5 전환이 되돌아갔다",
		).toBe(false);
		expect(
			outOfListAudit.violations,
			"목록 밖 관측기의 축 1 위반을 잡지 못했다 — 판정 대상 집합이 조용히 줄어 있다",
		).toContain("emit.mock.calls");
	});
});
