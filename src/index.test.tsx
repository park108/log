// TSK-20260517-28 / REQ-20260517-094 — 루트 엔트리 부트 비콘 4 불변식 fixture.
// spec: specs/30.spec/blue/components/app.md §동작 8 (B1~B4) + §수용 기준 (FR-01~FR-04).
//
// 본 fixture 는 `src/index.jsx` 부트 시점 2종 비콘 (sendToAnalytics reportWebVitals 콜백,
// sendCounter 모듈 즉시 호출) 의 4 불변식을 단일 fixture 로 박제한다:
//   B1/FR-01: sendToAnalytics URL/body 계약 (`getAPI()` URL + JSON.stringify(metric))
//   B2/FR-02: sendCounter URL/body 계약 (`getAPI()` + "/useragent" URL + JSON.stringify(userAgentParser()))
//   B3/FR-03: `navigator.sendBeacon` falsy 가드 — undefined 시 silent no-op (throw 없음)
//   B4/FR-04: 모듈 로드 1회 발화 카운트 (sendCounter 1회 + reportWebVitals 콜백 등록 1회)
//
// 격리 전략 (NFR-01/02/03):
//   • `vi.mock` 으로 `./Monitor/api` / `./common/common` / `./reportWebVitals` /
//     `react-dom/client` / `./App` 차단 → 실 모듈 부수효과 0.
//   • 각 케이스 도입부 `vi.resetModules()` → `await import('./index.jsx')` 로 모듈
//     캐시 격리 (케이스 간 1회 발화 카운트 누수 0).
//   • beforeAll 에서 `navigator.sendBeacon` 원본 descriptor 캡쳐 → afterAll 에서
//     `Object.defineProperty` 로 원복 (다른 test 누수 0).
//   • 전역 setupTests.js afterEach 가 `vi.restoreAllMocks` / `vi.unstubAllEnvs` /
//     `vi.useRealTimers` 를 담당 — 본 fixture afterEach 는 `vi.unstubAllGlobals` +
//     `vi.resetModules` + sendBeacon stub 해제만 수행.
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

const MOCK_API_URL = 'https://analytics.example/api';
const MOCK_UA_PAYLOAD = { ua: 'test-agent' };

const reportWebVitalsMock = vi.fn();
const getAPIMock = vi.fn(() => MOCK_API_URL);
const userAgentParserMock = vi.fn(() => MOCK_UA_PAYLOAD);
const createRootMock = vi.fn(() => ({ render: vi.fn(), unmount: vi.fn() }));

vi.mock('./Monitor/api', () => ({
	getAPI: getAPIMock,
}));

vi.mock('./common/common', () => ({
	userAgentParser: userAgentParserMock,
}));

vi.mock('./reportWebVitals', () => ({
	default: reportWebVitalsMock,
}));

vi.mock('react-dom/client', () => ({
	default: { createRoot: createRootMock },
	createRoot: createRootMock,
}));

// `./App` 자체는 mock 격리 — index.jsx 가 import 만 하므로 어떤 컴포넌트든 가능.
vi.mock('./App', () => ({
	default: function MockApp() {
		return null;
	},
}));

let originalSendBeaconDescriptor: PropertyDescriptor | undefined;

beforeAll(() => {
	originalSendBeaconDescriptor = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(navigator),
		'sendBeacon',
	) ?? Object.getOwnPropertyDescriptor(navigator, 'sendBeacon');
});

afterAll(() => {
	// 원래 descriptor 복원 — undefined 였으면 own property 제거.
	if (originalSendBeaconDescriptor) {
		Object.defineProperty(navigator, 'sendBeacon', originalSendBeaconDescriptor);
	} else if (Object.prototype.hasOwnProperty.call(navigator, 'sendBeacon')) {
		delete (navigator as { sendBeacon?: unknown }).sendBeacon;
	}
});

beforeEach(() => {
	// `document.getElementById("root")` stub — 실제 DOM 노드 반환.
	const rootEl = document.createElement('div');
	rootEl.id = 'root';
	vi.spyOn(document, 'getElementById').mockReturnValue(rootEl);

	// 케이스 간 모듈 캐시 격리 — 각 it 첫 줄에서도 명시적으로 reset.
	vi.resetModules();

	// 호출 카운트 격리 — 각 케이스 진입 시점 0.
	reportWebVitalsMock.mockClear();
	getAPIMock.mockClear();
	userAgentParserMock.mockClear();
	createRootMock.mockClear();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
	// sendBeacon 정리 — 케이스에서 set 했더라도 다음 케이스 시작 전 원복.
	if (originalSendBeaconDescriptor) {
		Object.defineProperty(navigator, 'sendBeacon', originalSendBeaconDescriptor);
	} else if (Object.prototype.hasOwnProperty.call(navigator, 'sendBeacon')) {
		delete (navigator as { sendBeacon?: unknown }).sendBeacon;
	}
});

describe('src/index.jsx 부트 비콘 4 불변식 (REQ-094)', () => {

	it('B1/FR-01: sendToAnalytics 콜백이 getAPI() URL + JSON.stringify(metric) 로 sendBeacon 을 호출한다', async () => {
		const sendBeaconSpy = vi.fn(() => true);
		Object.defineProperty(navigator, 'sendBeacon', {
			value: sendBeaconSpy,
			configurable: true,
			writable: true,
		});

		await import('./index.jsx');

		// 모듈 즉시 발화: sendCounter 1회 → counter URL.
		expect(sendBeaconSpy).toHaveBeenCalledTimes(1);

		// reportWebVitals 콜백 추출 후 직접 발화 → sendToAnalytics URL/body 단언.
		expect(reportWebVitalsMock).toHaveBeenCalledTimes(1);
		const sendToAnalyticsCb = reportWebVitalsMock.mock.calls[0]![0];
		expect(typeof sendToAnalyticsCb).toBe('function');

		const metric = { id: 'metric-1', value: 42 };
		sendToAnalyticsCb(metric);

		expect(sendBeaconSpy).toHaveBeenCalledTimes(2);
		expect(sendBeaconSpy).toHaveBeenNthCalledWith(
			2,
			MOCK_API_URL,
			JSON.stringify(metric),
		);
	});

	it('B2/FR-02: sendCounter 가 getAPI()+"/useragent" URL + JSON.stringify(userAgentParser()) 로 1회 호출한다', async () => {
		const sendBeaconSpy = vi.fn(() => true);
		Object.defineProperty(navigator, 'sendBeacon', {
			value: sendBeaconSpy,
			configurable: true,
			writable: true,
		});

		await import('./index.jsx');

		expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
		expect(sendBeaconSpy).toHaveBeenNthCalledWith(
			1,
			`${MOCK_API_URL}/useragent`,
			JSON.stringify(MOCK_UA_PAYLOAD),
		);
		expect(userAgentParserMock).toHaveBeenCalledTimes(1);
	});

	it('B3/FR-03: navigator.sendBeacon 이 undefined 면 silent no-op — 모듈 import + reportWebVitals 콜백 발화 모두 throw 없음', async () => {
		// 명시적으로 sendBeacon 을 undefined 로 정의 — falsy 가드 진입 경로.
		Object.defineProperty(navigator, 'sendBeacon', {
			value: undefined,
			configurable: true,
			writable: true,
		});

		await expect(import('./index.jsx')).resolves.toBeDefined();

		// reportWebVitals 등록은 가드와 무관 — 콜백 자체는 등록된다.
		expect(reportWebVitalsMock).toHaveBeenCalledTimes(1);
		const sendToAnalyticsCb = reportWebVitalsMock.mock.calls[0]![0];
		expect(typeof sendToAnalyticsCb).toBe('function');

		// 콜백 직접 발화 — sendBeacon 가드 falsy 분기로 throw 없이 silent.
		expect(() => sendToAnalyticsCb({ id: 'metric-x', value: 1 })).not.toThrow();
	});

	it('B4/FR-04: 모듈 로드 1회 발화 카운트 — 두 번째 import 는 캐시 사용으로 추가 호출 0 + reportWebVitals 1회 등록', async () => {
		const sendBeaconSpy = vi.fn(() => true);
		Object.defineProperty(navigator, 'sendBeacon', {
			value: sendBeaconSpy,
			configurable: true,
			writable: true,
		});

		await import('./index.jsx');
		const firstCallCount = sendBeaconSpy.mock.calls.length;
		const firstRwvCount = reportWebVitalsMock.mock.calls.length;

		// 두 번째 import — 모듈 캐시 사용 → 즉시 발화 코드 재실행 없음.
		await import('./index.jsx');

		expect(sendBeaconSpy.mock.calls.length).toBe(firstCallCount);
		expect(reportWebVitalsMock.mock.calls.length).toBe(firstRwvCount);
		expect(reportWebVitalsMock).toHaveBeenCalledTimes(1);
		expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
	});
});
