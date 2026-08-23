import { getSearchList } from './api';
import { firstCall } from '../test-utils/mockCalls';

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode: string): void => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

describe('Search api endpoint selection', () => {

	it('targets the prod endpoint on a production build', async () => {
		stubMode('production');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

		await getSearchList('hello world');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(firstCall(fetchSpy)[0])).toContain('/prod?q=');
	});

	it('targets the test endpoint on every non-production build', async () => {
		stubMode('test');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

		await getSearchList('hello world');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(firstCall(fetchSpy)[0])).toContain('/test?q=');
	});

	it('forwards the AbortSignal to fetch', async () => {
		stubMode('test');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
		const controller = new AbortController();

		await getSearchList('q', { signal: controller.signal });

		expect(firstCall(fetchSpy)[1]).toEqual({ signal: controller.signal });
	});
});
