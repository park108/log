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
