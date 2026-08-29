// api-base-url-assembly-totality.test.ts
// Spec: foundation/api-base-url-assembly-totality §동작 (A-2) · §발화 채널 (관측 표면 주의)
// Task: TSK-20260825-26
//
// (A-2) base URL 이 확정되지 않은 상태에서 URL 문자열을 조립해 `fetch` 에 넘기는
//       경로가 없다. 미정의는 **조용한 상대 URL** 이 아니라 관측 가능한 실패가 된다.
//
// **판정을 `fetch` 인자로 하는 이유** (RULE-06 §관측 표면):
//   - 조립 코드의 형태를 보는 정적 판정은 `?? ""` 우회를 통과시킨다. 빈 base 는
//     `"?limit=10"` 을 만들어 증상 문자열(`"undefined"`)만 사라지고 여전히 상대 URL 이다.
//   - rejection 관측은 신호가 되지 못한다 — 호출부가 삼킨다. TSK-20260825-14 계측 중
//     4건이 미정의 origin 으로 조립돼 나갔고 **테스트는 초록이었다.**
//   따라서 관측 표면은 `fetch` 에 **실제로 전달된 URL 문자열** 이다.
//
// **판정을 "URL 에 undefined 가 없다" 로만 두지 않는다** (spec (R-3)):
//   양성 대조의 축은 `new URL(arg)` 파싱 성공이다 — 상대 URL 은 base 인자 없이
//   파싱되지 않으므로 `?? ""` 우회가 여기서 붉어진다.
//
// 모듈 목록은 **glob 산출**이다 (RULE-06 §열거 고정 금지, spec (R-1)). 6개를 import 로
// 나열하면 7번째 도메인이 그대로 사각이 된다. 대표 export·환경 키 map 은 하드코딩이
// 불가피하므로 **목록 완전성 보조 단언**을 함께 박제한다 (RULE-06 명시 예외 경로) —
// glob 산출과 map 키 집합이 어긋나면 조용히 스킵되지 않고 붉어진다.
//
// **"모든 export 를 일괄 호출" 로 만들지 않는다 — 실측 반증.** `File/api.ts:putFile`
// 은 호출자가 URL 을 넘기는 export 라 도출 산물을 소비하지 않는다. 인자 없이
// 일괄 호출하면 `fetch(undefined)` 가 되어 양성 대조가 거짓 실패한다.
//
// **모듈 캐시 격리 순서** — `stubEnv` → `resetModules` → 동적 import. `BASE` 는 모듈
// 최상위 `const` 라 import 시점에 고정된다. 이 순서를 어기면 이 픽스처는
// **아무것도 재지 않으면서 초록**이 된다.

const apiModules = import.meta.glob('../**/api.{js,ts}') as Record<
	string,
	() => Promise<Record<string, unknown>>
>;

const ENV_KEY: Record<string, string> = {
	'../Comment/api.ts': 'VITE_COMMENT_API_BASE',
	'../File/api.ts': 'VITE_FILE_API_BASE',
	'../Image/api.ts': 'VITE_IMAGE_API_BASE',
	'../Log/api.ts': 'VITE_LOG_API_BASE',
	'../Monitor/api.js': 'VITE_MONITOR_API_BASE',
	'../Search/api.ts': 'VITE_SEARCH_API_BASE',
};

// 모듈별 대표 export 1개 — 도출 산물을 실제로 소비하는 것으로 고른다.
const REPRESENTATIVE: Record<string, [string, unknown[]]> = {
	'../Comment/api.ts': ['getComments', [1, false]],
	'../File/api.ts': ['getFiles', []],
	'../Image/api.ts': ['getImages', []],
	'../Log/api.ts': ['getLogs', []],
	'../Monitor/api.js': ['getWebVitals', ['LCP']],
	'../Search/api.ts': ['getSearchList', ['q']],
};

// `tsconfig.json:10` 의 `noUncheckedIndexedAccess: true` 로 인덱스 접근은
// `T | undefined` 다. 이 헬퍼는 타입 우회가 아니라 **완전성 단언을 런타임에서 한 번
// 더 잡는 장치**다 — `!` 나 `as` 로 지우지 않는다.
const pick = <T,>(map: Record<string, T>, key: string): T => {
	const v = map[key];
	if (v === undefined) throw new Error(`대표 항목 미등록: ${key}`);
	return v;
};

const loadAndCall = async (key: string): Promise<void> => {
	const mod = await pick(apiModules, key)();
	const [name, args] = pick(REPRESENTATIVE, key);
	const fn = mod[name];
	if (typeof fn !== 'function') throw new Error(`대표 export 미실재: ${key}#${name}`);
	await (fn as (...a: unknown[]) => Promise<Response>)(...args);
};

const spyFetch = () =>
	vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

describe('api base URL assembly totality', () => {

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	// 도출 비공허 + 목록 완전성. 이 단언이 없으면 glob 이 0개를 내도 "위반 0" 이
	// 참이 되어 전 케이스가 조용히 사라진 채 초록이 된다.
	it('derives every api module from glob and covers each one', () => {
		const keys = Object.keys(apiModules).sort();
		expect(keys.length).toBeGreaterThanOrEqual(6);
		expect(Object.keys(REPRESENTATIVE).sort()).toEqual(Object.keys(apiModules).sort());
		expect(Object.keys(ENV_KEY).sort()).toEqual(Object.keys(apiModules).sort());
	});

	describe.each(Object.keys(apiModules).sort())('%s', (key) => {

		// (양성 대조) base 정상 — 조립 결과가 **절대 URL** 이다.
		it('assembles an absolute URL when the base is defined', async () => {
			vi.resetModules();
			const fetchSpy = spyFetch();

			await loadAndCall(key);

			expect(fetchSpy).toHaveBeenCalled();
			const arg = String(fetchSpy.mock.calls[0]?.[0]);
			expect(arg).not.toContain('undefined');
			// 상대 URL 은 base 인자 없이 파싱되지 않는다 — `?? ""` 우회가 여기서 붉어진다.
			expect(() => new URL(arg)).not.toThrow();
		});

		// (음성 1) base 미정의 — 거절되고 fetch 는 한 번도 호출되지 않는다.
		it('rejects without calling fetch when the base is undefined', async () => {
			const envKey = pick(ENV_KEY, key);
			vi.stubEnv(envKey, undefined as unknown as string);
			vi.resetModules();
			const fetchSpy = spyFetch();

			await expect(loadAndCall(key)).rejects.toThrow(envKey);
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		// (음성 2) base 빈 문자열 — `?? ""` 우회와 `.env` 값 공란이 만드는 상태가
		// 정확히 이것이다. `undefined` 만 보는 픽스처는 여기서 초록이 된다.
		it('rejects without calling fetch when the base is an empty string', async () => {
			const envKey = pick(ENV_KEY, key);
			vi.stubEnv(envKey, '');
			vi.resetModules();
			const fetchSpy = spyFetch();

			await expect(loadAndCall(key)).rejects.toThrow(envKey);
			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});
});
