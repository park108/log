import { getImages, getNextImages } from './api';
import { firstCall } from '../test-utils/mockCalls';

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode: string): void => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

describe('Image api endpoint selection', () => {

	it('targets the prod endpoint on a production build', async () => {
		stubMode('production');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

		await getImages();

		expect(String(firstCall(fetchSpy)[0])).toContain('/prod');
	});

	it('targets the test endpoint on a development build', async () => {
		stubMode('development');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

		await getImages();

		expect(String(firstCall(fetchSpy)[0])).toContain('/test');
	});

	it('resolves to no endpoint when the build is neither production nor development', async () => {
		stubMode('test');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

		await getImages();

		// getApiUrl() 이 undefined 로 귀결하는 경계 — 엔드포인트 문자열이 만들어지지 않는다.
		const url = String(firstCall(fetchSpy)[0]);
		expect(url).not.toContain('/prod');
		expect(url).not.toContain('/test');
	});

	it('appends lastTimestamp on the paged endpoint', async () => {
		stubMode('development');
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

		await getNextImages(1655737033793);

		expect(String(firstCall(fetchSpy)[0])).toContain('?lastTimestamp=1655737033793');
	});
});
