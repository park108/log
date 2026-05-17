// TSK-20260517-19 / REQ-20260517-082 — jsdom `window.location` read-only setter
// 우회 헬퍼 단일 출처. `setLocation` 으로 location 객체 주입, `restoreLocation`
// 으로 원본 복원, `mockUrlLocation` 으로 `URL` 기반 mock location 인스턴스
// (assign/replace/reload spy) 생성을 1 모듈에서 export.
//
// 본 모듈은 jsdom strict 환경 (`window.location` 이 `string & Location` 의
// read-only 속성으로 표면화) 에서 테스트가 location 주입을 수행할 때 발생하는
// 타입 노이즈 (`delete (window as unknown as { location?: Location }).location`)
// 를 단일 호출로 흡수한다. 호출부 (test 파일) 는 본 모듈만 import 한다.

import { vi } from 'vitest';

// jsdom `URL` 인스턴스를 location 호환 객체로 cast 할 때 사용하는 단일 타입.
// `assign`/`replace`/`reload` 는 jsdom `Location` 시그니처상 필수이지만 `URL`
// 에는 없으므로 옵셔널 으로 박제 (`mockUrlLocation` 이 vi.fn() 으로 채움).
export type MockableLocation = URL & {
	replace?: (url: string | URL) => void;
	assign?: (url: string | URL) => void;
	reload?: () => void;
};

/**
 * 현재 `window.location` 을 `loc` 으로 교체.
 *
 * jsdom strict 환경에서 `window.location` 은 read-only 이므로 `delete` 후
 * 재할당하는 우회 패턴이 필요하다. 본 헬퍼는 그 패턴을 1 호출로 흡수한다.
 */
export const setLocation = (loc: MockableLocation | Location): void => {
	delete (window as unknown as { location?: Location }).location;
	(window as unknown as { location: Location }).location = loc as unknown as Location;
};

/**
 * `setLocation` 이전에 저장해 둔 원본 `Location` 으로 복원.
 *
 * 일반적으로 테스트 시작 시 `const saved = window.location;` 으로 저장 후
 * `afterEach` 또는 `finally` 에서 `restoreLocation(saved)` 호출 패턴.
 */
export const restoreLocation = (loc: Location): void => {
	delete (window as unknown as { location?: Location }).location;
	(window as unknown as { location: Location }).location = loc;
};

/**
 * `href` 로 `URL` 인스턴스를 생성하고 `assign`/`replace`/`reload` 를
 * `vi.fn()` spy 로 채워 `setLocation` 에 그대로 주입 가능한 location 호환
 * 객체를 반환.
 *
 * 호출자가 `mock.replace`/`mock.assign`/`mock.reload` 호출 검증을 수행할 수
 * 있도록 반환 객체에 spy 가 박제된다.
 */
export const mockUrlLocation = (href: string): MockableLocation => {
	const u = new URL(href) as MockableLocation;
	u.replace = vi.fn();
	u.assign = vi.fn();
	u.reload = vi.fn();
	return u;
};
