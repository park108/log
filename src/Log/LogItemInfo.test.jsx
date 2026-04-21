import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import * as common from '../common/common';
import LogItemInfo from './LogItemInfo';

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02, FR-07
// 목적: hoverPopup(legacy imperative) 호출을 useHoverPopup 훅으로 이관한
// LogItemInfo 의 popup (클립보드 링크 + 버전 히스토리) 이
//   1) 초기 미표시 (isVisible=false) 상태로 DOM 에 없고,
//   2) focus 시 렌더 + role="tooltip" + aria-describedby 설정,
//   3) blur 후 HIDE_DELAY_MS(100ms) 이후 언마운트
// 되는지 확인. mouseOver 는 jsdom 의 pointer event 한계로 불안정하여 focus 경로로 검증.

const baseItem = {
	logs: [
		{ contents: "v2 contents", timestamp: 1655737033793 },
		{ contents: "v1 contents", timestamp: 1655736946977 },
	],
	summary: "summary",
	sortKey: 1655736946977,
	timestamp: 1655736946977,
	author: "park108@gmail.com",
};

const renderInfo = (overrides = {}) => render(
	<MemoryRouter>
		<Suspense fallback={null}>
			<LogItemInfo
				timestamp={1655736946977}
				item={baseItem}
				showLink={true}
				{...overrides}
			/>
		</Suspense>
	</MemoryRouter>
);

describe('LogItemInfo hoverPopup migration', () => {

	beforeEach(() => {
		// getUrl() 은 isProd()/isDev() 가 true 일 때만 URL 을 반환.
		// 테스트 환경(vitest 기본 MODE='test') 에서는 undefined → 링크 텍스트 매칭 실패.
		// env stub 해제는 `src/setupTests.js` 의 전역 `afterEach(vi.unstubAllEnvs)` 가 담당.
		stubMode('production');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('click-to-clipboard popup is not in DOM until the link receives focus', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		// 초기 상태: popup content 미렌더.
		expect(screen.queryByText('Click to Clipboard')).toBeNull();
	});

	it('focus on link shows the clipboard popup with role=tooltip + aria-describedby; blur hides after 100ms', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const linkUrl = screen.getByText('https://www.park108.net/log/1655736946977');
		expect(linkUrl).toBeInTheDocument();

		act(() => {
			fireEvent.focus(linkUrl);
		});

		const popup = screen.getByText('Click to Clipboard');
		expect(popup).toBeInTheDocument();
		expect(popup).toHaveAttribute('role', 'tooltip');
		expect(popup).toHaveAttribute('aria-hidden', 'false');

		const describedBy = linkUrl.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		expect(popup.getAttribute('id')).toBe(describedBy);

		await act(async () => {
			fireEvent.blur(linkUrl);
			await vi.advanceTimersByTimeAsync(100);
		});

		expect(screen.queryByText('Click to Clipboard')).toBeNull();
	});

	it('version history popup is hidden initially and opens on focus (admin)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const versionButton = screen.getByTestId('versions-button');
		// 초기: aria-describedby 미설정 → popup 미렌더.
		expect(versionButton.getAttribute('aria-describedby')).toBeNull();

		act(() => {
			fireEvent.focus(versionButton);
		});

		// focus 후 aria-describedby 가 설정되고, 같은 id 의 tooltip 이 DOM 에 추가된다.
		const describedBy = versionButton.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const popup = document.getElementById(describedBy);
		expect(popup).not.toBeNull();
		expect(popup).toHaveAttribute('role', 'tooltip');
		expect(popup).toHaveAttribute('aria-hidden', 'false');
		// 버전 히스토리 항목 텍스트 "v.2" / "v.1" 가 popup 내부에 렌더.
		expect(popup.textContent).toMatch(/v\.2/);
		expect(popup.textContent).toMatch(/v\.1/);
	});

	it('Escape key closes the popup immediately (dismissible, WCAG 2.1 SC 1.4.13)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const linkUrl = screen.getByText('https://www.park108.net/log/1655736946977');
		act(() => {
			fireEvent.focus(linkUrl);
		});
		expect(screen.getByText('Click to Clipboard')).toBeInTheDocument();

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		});

		expect(screen.queryByText('Click to Clipboard')).toBeNull();
	});
});

// a11y-spec §패턴 B (REQ-20260421-033 FR-03) — M3 link-copy / M6 delete 회귀.
describe('LogItemInfo a11y 패턴 B (REQ-20260421-033 FR-03)', () => {

	beforeEach(() => {
		stubMode('production');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('M3: link-copy-button 에 role="button" + tabIndex=0 이 부여된다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const el = screen.getByTestId('link-copy-button');

		expect(el).toHaveAttribute('role', 'button');
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('M3: Enter 키로 link-copy 가 활성된다 (click 과 동일 핸들러 → copyToClipboard 호출)', () => {
		const copySpy = vi.spyOn(common, 'copyToClipboard').mockImplementation(() => {});
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const el = screen.getByTestId('link-copy-button');
		fireEvent.keyDown(el, { key: 'Enter' });

		expect(copySpy).toHaveBeenCalledTimes(1);
		expect(copySpy).toHaveBeenCalledWith(expect.stringContaining('log/1655736946977'));
	});

	it('M3: Space 키로 link-copy 가 활성된다 (preventDefault + copyToClipboard 호출)', () => {
		const copySpy = vi.spyOn(common, 'copyToClipboard').mockImplementation(() => {});
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const el = screen.getByTestId('link-copy-button');
		const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });

		// activateOnKey 가 preventDefault 호출 → fireEvent 반환값 false (cancelled).
		expect(spaceEvent).toBe(false);
		expect(copySpy).toHaveBeenCalledTimes(1);
	});

	it('M6: delete-button 에 role="button" + tabIndex=0 이 부여된다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ delete: vi.fn() });

		const el = screen.getByTestId('delete-button');

		expect(el).toHaveAttribute('role', 'button');
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('M6: Enter 키로 delete 가 활성된다 (window.confirm 호출 → props.delete 실행)', () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const deleteFn = vi.fn();
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ delete: deleteFn });

		const el = screen.getByTestId('delete-button');
		fireEvent.keyDown(el, { key: 'Enter' });

		expect(confirmSpy).toHaveBeenCalledWith('Are you sure delete the log?');
		expect(deleteFn).toHaveBeenCalledTimes(1);
	});

	it('M6: Space 키로 delete 가 활성된다 (preventDefault + window.confirm 호출)', () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ delete: vi.fn() });

		const el = screen.getByTestId('delete-button');
		const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });

		expect(spaceEvent).toBe(false);
		expect(confirmSpy).toHaveBeenCalledWith('Are you sure delete the log?');
	});
});

// a11y-spec §패턴 B (REQ-20260421-033 FR-03) — M4 versions-button Tab 포커스 접근 경로.
// 본 요소는 activation 의미 부재 (hover/focus popup 트리거) → tabIndex={0} 만 부여.
// onClick / onKeyDown={activateOnKey} 는 부여하지 않는다 (TSK-20260421-76 결정 박제).
describe('LogItemInfo a11y 패턴 B (REQ-20260421-033 FR-03) — M4 versions-button', () => {

	beforeEach(() => {
		stubMode('production');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('M4: versions-button 에 role="button" + tabIndex=0 이 부여된다 (admin)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const el = screen.getByTestId('versions-button');

		expect(el).toHaveAttribute('role', 'button');
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('M4: versions-button focus 시 버전 히스토리 popup 이 표시된다 (aria-describedby 설정)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const el = screen.getByTestId('versions-button');
		// 초기: popup 미렌더.
		expect(el.getAttribute('aria-describedby')).toBeNull();

		act(() => {
			fireEvent.focus(el);
		});

		// focus → aria-describedby 설정 + 동일 id 의 tooltip 렌더.
		const describedBy = el.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const popup = document.getElementById(describedBy);
		expect(popup).not.toBeNull();
		expect(popup).toHaveAttribute('role', 'tooltip');
	});
});

// a11y-spec §패턴 B (REQ-20260421-033 FR-05) — M5 Edit Link span §예외 확정 박제.
// 부모 <Link> 는 react-router 가 native <a href> 로 렌더 → 브라우저가 Tab 포커스 + Enter 활성
// 기본 제공. 자식 <span data-testid="edit-button"> 에 tabIndex/onKeyDown 을 부여하면
// (a) Tab 이 anchor+span 두 번 stop, (b) Enter 가 이중 활성 유발. §예외 §M5 분기 ①
// ("이미 활성 가능 — 면제 확정") 으로 확정하고 본 블록에서 불변식을 어설션으로 박제한다.
describe('LogItemInfo a11y 패턴 B (REQ-20260421-033 FR-05) — M5 Edit Link span §예외', () => {

	beforeEach(() => {
		stubMode('production');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('M5: Edit Link 의 부모 <a> 에 Enter keyDown → /log/write 로 네비게이션이 트리거된다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		// MemoryRouter + Routes 로 라우팅 전환 관측. LocationProbe 가 현재 pathname 을 DOM 에 노출.
		const LocationProbe = () => {
			const loc = useLocation();
			return <div data-testid="route-probe">{loc.pathname}</div>;
		};

		render(
			<MemoryRouter initialEntries={['/log/1655736946977']}>
				<Suspense fallback={null}>
					<Routes>
						<Route
							path="/log/:timestamp"
							element={
								<LogItemInfo
									timestamp={1655736946977}
									item={baseItem}
									showLink={true}
								/>
							}
						/>
						<Route path="/log/write" element={<div data-testid="write-page">write</div>} />
					</Routes>
				</Suspense>
				<LocationProbe />
			</MemoryRouter>
		);

		// 초기: /log/1655736946977 경로.
		expect(screen.getByTestId('route-probe').textContent).toBe('/log/1655736946977');

		// 자식 span 의 조상 <a> 를 찾아 Enter keyDown + click.
		// react-router <Link> 는 내부적으로 anchor 클릭 이벤트에서 navigate 하므로,
		// Enter 키에 대한 브라우저 기본 동작 (anchor 활성 → click 발화) 을 시뮬레이션한다.
		const editSpan = screen.getByTestId('edit-button');
		const anchor = editSpan.closest('a');
		expect(anchor).not.toBeNull();
		expect(anchor.getAttribute('href')).toBe('/log/write');

		// anchor 에 포커스 + Enter keyDown 후, 브라우저의 기본 활성 경로를 대신해 click 을 발화.
		// (jsdom 은 anchor 의 Enter→click 기본 동작을 자동 매핑하지 않음.)
		fireEvent.keyDown(anchor, { key: 'Enter' });
		fireEvent.click(anchor);

		// Routes 가 /log/write 로 전환됨을 확인.
		expect(screen.getByTestId('route-probe').textContent).toBe('/log/write');
		expect(screen.getByTestId('write-page')).toBeInTheDocument();
	});

	it('M5: Edit Link 의 자식 <span data-testid="edit-button"> 에는 tabIndex 가 부여되어 있지 않다 (중복 포커스 방지)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const el = screen.getByTestId('edit-button');

		// §예외 확정: 자식 span 은 속성 부여 금지. getAttribute 는 미부여 시 null.
		expect(el.getAttribute('tabIndex')).toBeNull();
		expect(el.getAttribute('onkeydown')).toBeNull();
	});
});
