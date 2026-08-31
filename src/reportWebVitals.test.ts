import reportWebVitals from './reportWebVitals';

const onCLS = vi.fn();
const onINP = vi.fn();
const onFCP = vi.fn();
const onLCP = vi.fn();
const onTTFB = vi.fn();

vi.mock('web-vitals', () => ({
	onCLS: (cb: unknown) => onCLS(cb),
	onINP: (cb: unknown) => onINP(cb),
	onFCP: (cb: unknown) => onFCP(cb),
	onLCP: (cb: unknown) => onLCP(cb),
	onTTFB: (cb: unknown) => onTTFB(cb),
}));

beforeEach(() => {
	onCLS.mockClear();
	onINP.mockClear();
	onFCP.mockClear();
	onLCP.mockClear();
	onTTFB.mockClear();
});

it('registers all 5 v5 web-vitals callbacks when a function is provided', async () => {

	const cb = vi.fn();

	await reportWebVitals(cb);

	// wait for dynamic import microtask to resolve
	await new Promise<Response>((resolve) => setTimeout(resolve, 0));

	expect(onCLS).toHaveBeenCalledTimes(1);
	expect(onINP).toHaveBeenCalledTimes(1);
	expect(onFCP).toHaveBeenCalledTimes(1);
	expect(onLCP).toHaveBeenCalledTimes(1);
	expect(onTTFB).toHaveBeenCalledTimes(1);

	expect(onCLS).toHaveBeenCalledWith(cb);
	expect(onINP).toHaveBeenCalledWith(cb);
	expect(onFCP).toHaveBeenCalledWith(cb);
	expect(onLCP).toHaveBeenCalledWith(cb);
	expect(onTTFB).toHaveBeenCalledWith(cb);
});

it('does nothing when argument is not a function', async () => {

	// 의도적 오타입 주입 — 프로덕션 가드(`onPerfEntry instanceof Function`)가
	// 함수가 아닌 입력을 삼키는지 본다. 타입 시스템으로는 표현할 수 없는 축이라
	// 호출부에서 캐스트한다. 캐스트를 지우면 이 회귀 방향이 사라진다.
	await reportWebVitals(undefined);
	await reportWebVitals(null as never);
	await reportWebVitals('not a function' as never);
	await reportWebVitals({} as never);

	await new Promise<Response>((resolve) => setTimeout(resolve, 0));

	expect(onCLS).not.toHaveBeenCalled();
	expect(onINP).not.toHaveBeenCalled();
	expect(onFCP).not.toHaveBeenCalled();
	expect(onLCP).not.toHaveBeenCalled();
	expect(onTTFB).not.toHaveBeenCalled();
});

it('invokes the performance callback when a web-vital handler fires', async () => {

	const cb = vi.fn();
	const sampleMetric = { name: 'INP', value: 123, rating: 'good', id: 'v5-inp-1' };

	onINP.mockImplementation((fn) => fn(sampleMetric));

	await reportWebVitals(cb);
	await new Promise<Response>((resolve) => setTimeout(resolve, 0));

	expect(cb).toHaveBeenCalledWith(sampleMetric);
});

it('source code contains no deprecated v3 get*/onFID references', async () => {

	const fs = await import('node:fs/promises');
	const path = await import('node:path');
	const source = await fs.readFile(
		path.resolve(__dirname, 'reportWebVitals.ts'),
		'utf8',
	);

	expect(source).not.toMatch(/getCLS|getFID|getFCP|getLCP|getTTFB|onFID/);
	expect(source).toMatch(/onCLS/);
	expect(source).toMatch(/onINP/);
	expect(source).toMatch(/onFCP/);
	expect(source).toMatch(/onLCP/);
	expect(source).toMatch(/onTTFB/);
});

// `import('web-vitals')` 는 별도 청크다. 배포 직후 CDN 이 옛 `index.html` 을 주는
// 동안 그 주소가 이미 사라져 있을 수 있고, 오프라인이면 아예 오지 않는다. `.catch`
// 가 없으면 그 실패가 **처리되지 않은 거부**가 된다 — 성능 수치를 못 재는 것과
// 앱이 오류를 뿜는 것은 비교할 일이 아니다.
describe('청크가 오지 않아도 던지지 않는다', () => {

	it('동적 import 실패를 삼킨다', async () => {

		vi.resetModules();
		vi.doMock('web-vitals', () => {
			throw new Error('Failed to fetch dynamically imported module: /assets/web-vitals.js');
		});

		// **`window` 의 `unhandledrejection` 로는 못 잡는다.** jsdom 은 Node 의 프라미스
		// 거부를 그 이벤트로 다시 쏘지 않는다 — 실측: `.catch` 를 지워도 이 리스너에
		// 아무것도 들어오지 않았고, 그때 붉힌 것은 vitest 의 전역 처리였다.
		// 판정을 남의 전역 동작에 기대지 않도록 프로세스 수준에서 직접 받는다.
		const rejections: unknown[] = [];
		const onRejection = (reason: unknown): void => { rejections.push(reason); };
		process.on('unhandledRejection', onRejection);

		const mod = await import('./reportWebVitals');

		expect(() => mod.default(vi.fn())).not.toThrow();

		// 마이크로태스크가 다 돌고 **거부가 처리되지 않았다고 판정될 때까지** 기다린다.
		// Node 는 그 판정을 다음 틱으로 미룬다 — 즉시 재면 아직 조용하다.
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(rejections).toEqual([]);

		process.off('unhandledRejection', onRejection);
		vi.doUnmock('web-vitals');
		vi.resetModules();
	});
});
