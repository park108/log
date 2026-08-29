import { render, fireEvent, act, waitFor } from '@testing-library/react';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import * as api from './api';
import FileItem from './FileItem';

// TSK-20260825-04 / REQ-20260825-002 — setter 계수 관측기.
// React 18.2 의 `dispatchSetState` 는 unmount 된 fiber 에서 `root === null` 경로로
// **경고 없이** bail out 한다. 따라서 post-await 발화가 state setter 뿐인 표면
// (`copyFileUrl`) 은 console spy 로는 민감도 0 이다 — 가드를 제거해도 콘솔 단정은
// 계속 통과한다. 그 표면을 관측하려면 setter 호출 자체를 세야 한다.
// ESM namespace 는 non-configurable 이라 `vi.spyOn(React, 'useState')` 가 불가하고,
// 모듈 mock 으로 `useState` 를 감싸는 형태만 성립한다. 팩토리는 호이스트되므로
// 카운터는 `vi.hoisted` 로 바인딩한다. wrapper 는 원본 `useState` 에 그대로 위임해
// 기존 케이스의 동작을 바꾸지 않는다.
const setterRec = vi.hoisted(() => ({ calls: 0 }));

vi.mock('react', async (importOriginal) => {
	const actual = await importOriginal<typeof import('react') & { default: Record<string, unknown> }>();
	const useState = (init?: unknown): [unknown, (next: unknown) => void] => {
		const [value, setValue] = actual.useState(init as never);
		const counted = (next: unknown): void => {
			setterRec.calls += 1;
			(setValue as (n: unknown) => void)(next);
		};
		return [value, counted];
	};
	return { ...actual, useState };
});

/** 외부에서 결말을 제어하는 pending Promise — unmount 와 resolve 사이 창을 연다. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
	let resolve!: (v: T) => void;
	let reject!: (e: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(async () => true);
	vi.spyOn(console, 'error').mockImplementation(async () => true);
});

const defaultProps = {
	fileName: 'sample.png',
	url: 'https://example.test/sample.png',
	lastModified: 1700000000000,
	size: 1234,
	deleted: () => {},
};

// a11y 패턴 B 단독 단위 테스트 — accessibility-spec §2 (WIP-A) 표 행 #6 (filename div copyFileUrl) + #7 (delete span confirmDelete).
// REQ-20260418-017 FR-01/FR-02/FR-05/FR-07. 선행 패턴: TSK-24/27/28/29/33.

describe('FileItem keyboard activation (a11y pattern B) — filename div', () => {

	it('파일명이 네이티브 button 이다', () => {

		const { container } = render(<FileItem {...defaultProps} />);

		// div[role=button] + activateOnKey 손조립을 네이티브 button 으로 바꿨다.
		// 손조립은 키 핸들러를 빠뜨리면 조용히 키보드 접근을 잃는다.
		const el = container.querySelector('.button--fileitem-filename') as HTMLElement;
		expect(el).toBeInTheDocument();
		expect(el.tagName).toBe('BUTTON');

		// 손조립 잔재 금지 — onKeyDown 이 남으면 Enter 에서 이중 발화한다.
		expect(el).not.toHaveAttribute('role');
		expect(el).not.toHaveAttribute('tabindex');
		expect(el).toHaveAttribute('type', 'button');

		// tabindex 없이 초점을 받는다.
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it('파일명 클릭이 URL 을 복사한다', async () => {

		const spy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		fireEvent.click(container.querySelector('.button--fileitem-filename')!);

		await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
	});

	it('existing click path still triggers copyFileUrl (regression guard)', () => {

		const spy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		const filenameDiv = container.querySelector('.button--fileitem-filename');
		fireEvent.click(filenameDiv!);

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(defaultProps.url);

		spy.mockRestore();
	});
});

describe('FileItem keyboard activation (a11y pattern B) — delete span', () => {

	it('삭제가 네이티브 button 이다', () => {

		const { container } = render(<FileItem {...defaultProps} />);

		const el = container.querySelector('.button--fileitem-delete') as HTMLElement;
		expect(el).toBeInTheDocument();
		expect(el.tagName).toBe('BUTTON');

		expect(el).not.toHaveAttribute('role');
		expect(el).not.toHaveAttribute('tabindex');
		expect(el).toHaveAttribute('type', 'button');

		// ✕ 글리프는 이름이 되지 못하므로 aria-label 이 이름을 진다.
		expect(el).toHaveAttribute('aria-label', 'Delete ' + defaultProps.fileName);

		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it('삭제 클릭이 확인 절차를 탄다', () => {

		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

		const { container } = render(<FileItem {...defaultProps} />);
		fireEvent.click(container.querySelector('.button--fileitem-delete')!);

		expect(confirmSpy).toHaveBeenCalledTimes(1);
	});

	it('existing click path still triggers confirmDelete (regression guard)', () => {

		const confirmAction = vi.fn();
		vi.spyOn(common, 'confirm').mockReturnValue(confirmAction);

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.button--fileitem-delete');
		fireEvent.click(deleteSpan!);

		expect(confirmAction).toHaveBeenCalledTimes(1);

		vi.restoreAllMocks();
	});
});

// REQ-20260419-015 FR-01/FR-02/FR-03/FR-04/FR-05/FR-06. 선행 패턴: REQ-20260418-026 (ImageItem data-enlarged), REQ-20260419-010 (FileDrop data-dragover).
// setItemClass 명령형 → 선언적 className 파생 + data-deleting HTML5 속성 전환 회귀 가드.

describe('FileItem className transition (declarative pattern)', () => {

	it('renders base className when isDeleting=false (FR-03, FR-04)', () => {

		const { container } = render(<FileItem {...defaultProps} />);

		const root = container.querySelector('.div--fileitem');
		expect(root).toBeInTheDocument();
		expect(root).not.toHaveClass('div--fileitem-delete');
		expect(root).toHaveAttribute('data-deleting', 'N');
		expect(root).toHaveAttribute('role', 'listitem');
	});

	it('toggles className and data-deleting on delete confirm (FR-03, FR-04, FR-05)', async () => {

		vi.spyOn(window, 'confirm').mockReturnValue(true);
		vi.spyOn(api, 'deleteFile').mockResolvedValue({
			json: async () => ({ statusCode: 200 }),
		} as unknown as Response);

		const { container } = render(<FileItem {...defaultProps} />);

		const root = container.querySelector('.div--fileitem');
		expect(root).toHaveAttribute('data-deleting', 'N');
		expect(root).not.toHaveClass('div--fileitem-delete');

		const deleteSpan = container.querySelector('.button--fileitem-delete');

		await act(async () => {
			fireEvent.click(deleteSpan!);
		});

		await waitFor(() => {
			expect(root).toHaveClass('div--fileitem-delete');
		});
		expect(root).toHaveAttribute('data-deleting', 'Y');

		vi.restoreAllMocks();
	});

	it('preserves data-deleting across parent rerender (FR-06)', async () => {

		vi.spyOn(window, 'confirm').mockReturnValue(true);
		vi.spyOn(api, 'deleteFile').mockResolvedValue({
			json: async () => ({ statusCode: 200 }),
		} as unknown as Response);

		const { container, rerender } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.button--fileitem-delete');
		await act(async () => {
			fireEvent.click(deleteSpan!);
		});

		await waitFor(() => {
			const rootBefore = container.querySelector('.div--fileitem');
			expect(rootBefore).toHaveAttribute('data-deleting', 'Y');
		});

		// 부모가 동일 props 로 리렌더해도 로컬 isDeleting 상태 기반 파생 값은 보존되어야 한다.
		rerender(<FileItem {...defaultProps} />);

		const rootAfter = container.querySelector('.div--fileitem');
		expect(rootAfter).toHaveAttribute('data-deleting', 'Y');
		expect(rootAfter).toHaveClass('div--fileitem-delete');

		vi.restoreAllMocks();
	});
});

// REQ-20260421-039 FR-03 — errorReporter 채널 단일화 (D4 FileItem.jsx).
// Delete file API 의 errorType 분기 또는 catch 에서 reportError 가 호출된다.

describe('FileItem reportError 채널 (REQ-20260421-039 FR-03)', () => {

	it('reports error via reportError when deleteFile catch path is taken (network error)', async () => {

		vi.spyOn(window, 'confirm').mockReturnValue(true);
		vi.spyOn(api, 'deleteFile').mockRejectedValue(new Error('network down'));

		const spy = vi.spyOn(errorReporter, 'reportError').mockImplementation(async () => true);

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.button--fileitem-delete');

		await act(async () => {
			fireEvent.click(deleteSpan!);
		});

		await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

		spy.mockRestore();
		vi.restoreAllMocks();
	});
});

// ── TSK-20260825-04 / REQ-20260825-002 — post-unmount 무발화 race fixture ──────
// 출처 spec: testing/runtime-fetch-unmount-safety §동작 (I1)(I2)(I8) · (FR-06)(FR-10).
// 이 컴포넌트의 async continuation 은 effect 가 아니라 이벤트 핸들러에 있다.
// 삭제 버튼을 누른 직후 이탈하면 `await` 이후 코드가 그대로 실행돼 계약이 금지한
// 발화(log · reportError · state setter · 부모 콜백)를 낸다.
//
// 관측 표면을 2종 모두 둔다 (하나로 갈음하지 않는다):
//   (F1 계열) 콘솔류 관측 — `deleteFileItem` 갈래 (log 3 · reportError 2).
//   (F2 계열) setter 계수 관측 — `copyFileUrl` 갈래 (콘솔류 0 · setter 5).
// 단정은 전부 **무필터** 다 — 문구 필터를 끼우면 현 React 버전에서 도달 불가한
// 경고 문구만 세는 공허한 fixture 가 된다.

describe('FileItem post-unmount 무발화 (race fixture)', () => {

	it('F1: deleteFile 이 unmount 후 resolve 해도 log · reportError · console 무발화', async () => {

		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const pending = deferred<Response>();
		vi.spyOn(api, 'deleteFile').mockReturnValue(pending.promise);

		const logSpy = vi.spyOn(common, 'log').mockImplementation(async () => true);
		const reportSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(async () => true);
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(async () => true);

		const { container, unmount } = render(<FileItem {...defaultProps} />);

		await act(async () => {
			fireEvent.click(container.querySelector('.button--fileitem-delete')!);
		});

		unmount();
		// 관측 창은 unmount 이후로 한정한다 — 마운트 중 정상 발화까지 세면 단정 불가.
		logSpy.mockClear();
		reportSpy.mockClear();
		consoleErrorSpy.mockClear();

		// 첫 await 경계의 가드를 단독으로 관측한다. 응답 본문 파싱(`res.json()`) 자체가
		// 언마운트 뒤 continuation 이므로, 그것이 호출되면 첫 가드가 사라진 것이다.
		// (뒤 경계의 가드가 콘솔 발화를 대신 막아 주더라도 이 단정은 통과하지 않는다.)
		const jsonSpy = vi.fn(async () => ({ statusCode: 200 }));

		await act(async () => {
			pending.resolve({ json: jsonSpy } as unknown as Response);
			await Promise.resolve();
		});

		expect(jsonSpy).not.toHaveBeenCalled();
		expect(logSpy).not.toHaveBeenCalled();
		expect(reportSpy).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	it('F1b: res.json() 이 unmount 후 resolve 해도 무발화 (두 번째 await 경계)', async () => {

		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const jsonPending = deferred<{ statusCode: number }>();
		vi.spyOn(api, 'deleteFile').mockResolvedValue({
			json: () => jsonPending.promise,
		} as unknown as Response);

		const logSpy = vi.spyOn(common, 'log').mockImplementation(async () => true);
		const reportSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(async () => true);

		const { container, unmount } = render(<FileItem {...defaultProps} />);

		// 이 시점에 첫 await 는 이미 통과했고 (컴포넌트는 아직 마운트 상태),
		// 실행은 `await res.json()` 에서 멈춰 있다.
		await act(async () => {
			fireEvent.click(container.querySelector('.button--fileitem-delete')!);
		});

		unmount();
		logSpy.mockClear();
		reportSpy.mockClear();

		await act(async () => {
			jsonPending.resolve({ statusCode: 400 });
			await Promise.resolve();
		});

		expect(logSpy).not.toHaveBeenCalled();
		expect(reportSpy).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	it('F1c: deleteFile reject 가 unmount 후 도달해도 무발화 (catch 경로)', async () => {

		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const pending = deferred<Response>();
		vi.spyOn(api, 'deleteFile').mockReturnValue(pending.promise);

		const logSpy = vi.spyOn(common, 'log').mockImplementation(async () => true);
		const reportSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(async () => true);

		const { container, unmount } = render(<FileItem {...defaultProps} />);

		await act(async () => {
			fireEvent.click(container.querySelector('.button--fileitem-delete')!);
		});

		unmount();
		logSpy.mockClear();
		reportSpy.mockClear();

		await act(async () => {
			pending.reject(new Error('network down'));
			await Promise.resolve();
		});

		expect(logSpy).not.toHaveBeenCalled();
		expect(reportSpy).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	it('F2: copyToClipboard 가 unmount 후 resolve 해도 state setter 호출 0 (setter 전용 표면)', async () => {

		const pending = deferred<boolean>();
		vi.spyOn(common, 'copyToClipboard').mockReturnValue(pending.promise);

		const { container, unmount } = render(<FileItem {...defaultProps} />);

		fireEvent.click(container.querySelector('.button--fileitem-filename')!);

		setterRec.calls = 0;
		unmount();

		await act(async () => {
			pending.resolve(true);
			await Promise.resolve();
		});

		expect(setterRec.calls).toBe(0);

		vi.restoreAllMocks();
	});

	it('F2b: 마운트 상태의 copy 성공 경로는 그대로 setter 를 발화한다 (가드 분기 양쪽 도달)', async () => {

		vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		setterRec.calls = 0;
		await act(async () => {
			fireEvent.click(container.querySelector('.button--fileitem-filename')!);
		});

		expect(setterRec.calls).toBeGreaterThan(0);
		expect(container.querySelector('.button--fileitem-filename')).toBeInTheDocument();

		vi.restoreAllMocks();
	});
});

// 파일 크기 표기.
//
// 구 구현은 원시 바이트 수를 그대로 냈다 — 164,016,161 bytes 는 읽기 어렵다.
// 더 나쁜 것은 `size` 가 선택적 prop 인데 `(undefined) * 1` 로 NaN 을 만들어
// **"NaN bytes"** 를 렌더했다는 점이다 (조용한 오표기).
describe('파일 크기 표기', () => {

	it('사람이 읽는 단위로 그린다', () => {

		const { container } = render(<FileItem {...defaultProps} size={164016161} />);
		const el = container.querySelector('.span--fileitem-size') as HTMLElement;

		expect(el).toBeInTheDocument();
		expect(el.textContent).toContain('MB');
		expect(el.textContent).not.toContain('164,016,161');

		// 정확한 값은 잃지 않는다 — title 로 남긴다.
		expect(el).toHaveAttribute('title', '164,016,161 bytes');
	});

	it('size 가 없으면 크기 자리를 그리지 않는다', () => {

		const props = { ...defaultProps };
		delete (props as { size?: number }).size;

		const { container } = render(<FileItem {...props} />);

		// 구 구현은 여기서 "NaN bytes" 를 냈다.
		expect(container.querySelector('.span--fileitem-size')).toBeNull();
		expect(container.textContent).not.toContain('NaN');
	});

	it('0 바이트도 자리를 그린다 (없음과 구별한다)', () => {

		// 대조 — 위 케이스가 "0 이면 falsy 라 안 그린다" 로 통과하지 않게 한다.
		const { container } = render(<FileItem {...defaultProps} size={0} />);
		expect(container.querySelector('.span--fileitem-size')).not.toBeNull();
	});
});

// `lastModified` 도 선택적 prop 이다. 없으면 Date(NaN) 이 되어 화면에
// `NaN-NaN-NaN` · `NaN:NaN:NaN` 이 그려진다 — size 와 같은 부류의 조용한 오표기.
describe('수정 일시 표기', () => {

	it('lastModified 가 없으면 날짜·시각 자리를 그리지 않는다', () => {

		const props = { ...defaultProps };
		delete (props as { lastModified?: number }).lastModified;

		const { container } = render(<FileItem {...props} />);

		expect(container.querySelector('.span--fileitem-modifieddate')).toBeNull();
		expect(container.querySelector('.span--fileitem-modifiedtime')).toBeNull();
		// 구 구현은 여기서 NaN-NaN-NaN 을 냈다.
		expect(container.textContent).not.toContain('NaN');
	});

	it('lastModified 가 있으면 날짜와 시각을 함께 그린다', () => {

		const { container } = render(<FileItem {...defaultProps} lastModified={1656034616036} />);

		expect(container.querySelector('.span--fileitem-modifieddate')?.textContent).toContain('2022');
		expect(container.querySelector('.span--fileitem-modifiedtime')?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
	});

	it('타임스탬프 0 도 자리를 그린다 (없음과 구별한다)', () => {

		// 대조 — truthy 검사로 가드하면 1970-01-01 이 통째로 사라진다.
		const { container } = render(<FileItem {...defaultProps} lastModified={0} />);
		expect(container.querySelector('.span--fileitem-modifieddate')).not.toBeNull();
	});
});

// `url` 은 선택적 prop 이다. 없으면 copyToClipboard 의 기본값(빈 문자열)이
// 들어가 빈 값을 복사하고 true 를 돌려준다 — 사용자는 "URL copied" 를 보지만
// 클립보드는 비어 있다. 거짓 성공이다.
describe('URL 복사 — url 부재', () => {

	it('URL 이 없으면 성공을 알리지 않는다', async () => {

		const copySpy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const props = { ...defaultProps };
		delete (props as { url?: string }).url;

		const { container } = render(<FileItem {...props} />);

		await act(async () => {
			fireEvent.click(container.querySelector('.button--fileitem-filename')!);
		});

		// 클립보드에 손대지 않는다 — 이것을 안 보면 "빈 값을 복사하고 성공" 도 통과한다.
		expect(copySpy).not.toHaveBeenCalled();

		await waitFor(() => {
			expect(container.textContent).toContain('URL is not available');
		});
		expect(container.textContent).not.toContain('URL copied');
	});

	it('대조 — URL 이 있으면 복사하고 성공을 알린다', async () => {

		const copySpy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		await act(async () => {
			fireEvent.click(container.querySelector('.button--fileitem-filename')!);
		});

		expect(copySpy).toHaveBeenCalledWith(defaultProps.url);
		await waitFor(() => {
			expect(container.textContent).toContain('URL copied');
		});
	});
});
