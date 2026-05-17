import { isDev, isProd, mode } from './env';

// Smoke: 헬퍼가 올바른 타입을 export 하고 vitest 환경의 MODE 를 노출하는지만 검증.
// 관련 요구사항: REQ-20260418-002 §10 수용 기준

describe('env helper', () => {

	it('isDev is a function returning boolean', () => {
		expect(typeof isDev).toBe('function');
		expect(typeof isDev()).toBe('boolean');
	});

	it('isProd is a function returning boolean', () => {
		expect(typeof isProd).toBe('function');
		expect(typeof isProd()).toBe('boolean');
	});

	it('mode is a function returning string', () => {
		expect(typeof mode).toBe('function');
		expect(typeof mode()).toBe('string');
	});

	it('vitest default mode is "test"', () => {
		// vite/vitest 기본 MODE (spec §5.3, §7). vite.config.js 에 mode override 없음.
		expect(mode()).toBe('test');
	});

	it('isProd is the negation of isDev (mutually exclusive)', () => {
		// Vite 규약: import.meta.env.DEV === !import.meta.env.PROD.
		// 정확한 상호 배타 관계만 단언 — vitest 의 DEV/PROD 구체 값은 vite 버전별 기본이 다를 수 있어
		// spec §13 의 "vite.config.js 가 mode override 시" 재검토 가정 범위 밖에서도 유지되는 불변식만 고정.
		expect(isProd()).toBe(!isDev());
	});

});
