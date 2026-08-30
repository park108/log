import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import * as common from '../common/common';
import LogItemInfo from './LogItemInfo';

// env-spec §5.2 / REQ-20260420-002 — `vi.stubEnv('MODE', ...)` + 짝맞춘 DEV/PROD.
// 전역 `afterEach(vi.unstubAllEnvs)` 는 `src/setupTests.js` 에서 등록됨.
const stubMode = (mode: string) => {
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

		const linkTrigger = screen.getByTestId('link-copy-button');
		expect(linkTrigger).toBeInTheDocument();

		act(() => {
			fireEvent.focus(linkTrigger);
		});

		const popup = screen.getByText('Click to Clipboard');
		expect(popup).toBeInTheDocument();
		expect(popup).toHaveAttribute('role', 'tooltip');
		expect(popup).toHaveAttribute('aria-hidden', 'false');

		const describedBy = linkTrigger.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		expect(popup!.getAttribute('id')).toBe(describedBy);

		await act(async () => {
			fireEvent.blur(linkTrigger);
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
		const popup = document.getElementById(describedBy!);
		expect(popup).not.toBeNull();
		expect(popup).toHaveAttribute('role', 'tooltip');
		expect(popup).toHaveAttribute('aria-hidden', 'false');
		// 버전 히스토리 항목 텍스트 "v.2" / "v.1" 가 popup 내부에 렌더.
		expect(popup!.textContent).toMatch(/v\.2/);
		expect(popup!.textContent).toMatch(/v\.1/);
	});

	it('Escape key closes the popup immediately (dismissible, WCAG 2.1 SC 1.4.13)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const linkTrigger = screen.getByTestId('link-copy-button');
		act(() => {
			fireEvent.focus(linkTrigger);
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
		const copySpy = vi.spyOn(common, 'copyToClipboard').mockImplementation(async () => true);
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const el = screen.getByTestId('link-copy-button');
		fireEvent.keyDown(el, { key: 'Enter' });

		expect(copySpy).toHaveBeenCalledTimes(1);
		expect(copySpy).toHaveBeenCalledWith(expect.stringContaining('log/1655736946977'));
	});

	it('M3: Space 키로 link-copy 가 활성된다 (preventDefault + copyToClipboard 호출)', () => {
		const copySpy = vi.spyOn(common, 'copyToClipboard').mockImplementation(async () => true);
		vi.spyOn(common, 'isAdmin').mockReturnValue(false);
		renderInfo();

		const el = screen.getByTestId('link-copy-button');
		const spaceEvent = fireEvent.keyDown(el, { key: ' ', cancelable: true });

		// activateOnKey 가 preventDefault 호출 → fireEvent 반환값 false (cancelled).
		expect(spaceEvent).toBe(false);
		expect(copySpy).toHaveBeenCalledTimes(1);
	});

	it('M6: delete-button 은 네이티브 button 이다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ delete: vi.fn() });

		const el = screen.getByTestId('delete-button');

		// span[role=button] + activateOnKey 손조립을 네이티브 button 으로 바꿨다.
		expect(el.tagName).toBe('BUTTON');

		// 손조립 잔재 금지 — onKeyDown 이 남으면 Enter 에서 이중 발화한다.
		expect(el).not.toHaveAttribute('role');
		expect(el).not.toHaveAttribute('tabindex');
		expect(el).toHaveAttribute('type', 'button');

		// tabindex 없이 초점을 받는다.
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it('M6: 클릭 → confirm 승인 시 delete 가 실행된다', () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const deleteFn = vi.fn();
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ delete: deleteFn });

		fireEvent.click(screen.getByTestId('delete-button'));

		expect(confirmSpy).toHaveBeenCalledWith('Are you sure delete the log?');
		expect(deleteFn).toHaveBeenCalledTimes(1);
	});

	it('M6: 클릭 → confirm 거절 시 abort 콜백이 발화한다', () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		// 발화 관측기 (TSK-20260828-09 / FR-02) — abort 콜백은 log("Deleting aborted")
		// 를 발화하며, confirm 이 false 를 돌려주는 이 경로가 그 콜백을 태우는
		// **유일한 경로**다. 관측기가 없으면 이 파일이 감사에서 단락된다.
		const emissionSpy = vi.spyOn(common, 'log');
		renderInfo({ delete: vi.fn() });

		fireEvent.click(screen.getByTestId('delete-button'));

		expect(confirmSpy).toHaveBeenCalledWith('Are you sure delete the log?');
		expect(emissionSpy).toHaveBeenCalledWith('Deleting aborted');
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

	it('edit-button 은 anchor 안에서 role 을 중복 주장하지 않는다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ delete: vi.fn() });

		const el = screen.getByTestId('edit-button');

		// 조작부는 anchor(Link) 자신이다. 자식 span 이 role="button" 을 달면
		// anchor 의 link role 과 충돌해 보조기술에 두 겹으로 읽힌다.
		expect(el).not.toHaveAttribute('role');
		expect(el.closest('a')).not.toBeNull();

		// 자식에 tabIndex 를 주면 anchor 와 포커스가 중복된다.
		expect(el).not.toHaveAttribute('tabindex');
	});

	it('M4: versions-button 은 role 을 주장하지 않고 초점만 받는다 (admin)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const el = screen.getByTestId('versions-button');

		// 이 요소에는 onClick 이 없다 — hover/focus 로 팝업을 여는 트리거일 뿐이다.
		// role="button" 은 활성을 약속하므로, 스크린리더가 "버튼" 이라 읽고 Enter 를
		// 눌러도 아무 일이 없는 상태가 된다. 이 파일의 기존 주석도 "activation 의미
		// 부재" 라 적고 있었으나 role 은 남아 있었다.
		expect(el).not.toHaveAttribute('role');

		// 포커스로도 팝업이 떠야 하므로 tabIndex 는 남는다 (WCAG 1.4.13).
		expect(el).toHaveAttribute('tabIndex', '0');
	});

	it('M4: versions-button focus 시 버전 히스토리 popup 이 표시된다 (aria-describedby 설정)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const el = screen.getByTestId('versions-button');
		// 초기: popup 미렌더.
		expect(el!.getAttribute('aria-describedby')).toBeNull();

		act(() => {
			fireEvent.focus(el);
		});

		// focus → aria-describedby 설정 + 동일 id 의 tooltip 렌더.
		const describedBy = el!.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const popup = document.getElementById(describedBy!);
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
		expect(anchor!.getAttribute('href')).toBe('/log/write');

		// anchor 에 포커스 + Enter keyDown 후, 브라우저의 기본 활성 경로를 대신해 click 을 발화.
		// (jsdom 은 anchor 의 Enter→click 기본 동작을 자동 매핑하지 않음.)
		fireEvent.keyDown(anchor!, { key: 'Enter' });
		fireEvent.click(anchor!);

		// Routes 가 /log/write 로 전환됨을 확인.
		expect(screen.getByTestId('route-probe').textContent).toBe('/log/write');
		expect(screen.getByTestId('write-page')).toBeInTheDocument();
	});

	it('M5: Edit Link 의 자식 <span data-testid="edit-button"> 에는 tabIndex 가 부여되어 있지 않다 (중복 포커스 방지)', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo();

		const el = screen.getByTestId('edit-button');

		// §예외 확정: 자식 span 은 속성 부여 금지. getAttribute 는 미부여 시 null.
		expect(el!.getAttribute('tabIndex')).toBeNull();
		expect(el!.getAttribute('onkeydown')).toBeNull();
	});

	it('temporary=true 이면 제목에 임시 글 마커가 노출된다', () => {
		renderInfo({ temporary: true });

		expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('✍️');
	});

	it('item 이 없으면 관리자 툴바에서 버전 버튼을 렌더하지 않는다', () => {
		// 버전 버튼은 관리자 툴바 안에 있으므로 isAdmin()=true 로 툴바를 노출시킨 뒤
		// `hasValue(item)` 거짓 분기를 확인한다.
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		renderInfo({ item: undefined });

		expect(screen.queryByTestId('versions-button')).not.toBeInTheDocument();
	});
});

// 변경 이력은 LogItem 을 그대로 재사용한다. 그 안의 툴바가 함께 그려져
// **지난 판본에 Edit/Delete 가 붙어 나왔다** (운영자 지적). 이미 지나간
// 판본을 편집·삭제한다는 것이 성립하지 않는다.
describe('showActions — 지난 판본에는 조작부를 그리지 않는다', () => {

	const toolbarText = (container: HTMLElement): string =>
		(container.querySelector('.div--logitem-toolbar')?.textContent ?? '')
			.replace(/\s+/g, ' ').trim();

	it('기본(본문 화면)은 지금까지대로 Edit·Delete 를 그린다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		const { container } = renderInfo({ delete: vi.fn() });

		// 대조 — 이 케이스가 없으면 "언제나 숨김" 구현도 통과한다.
		expect(container.querySelector('[data-testid="edit-button"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="delete-button"]')).not.toBeNull();
	});

	it('showActions=false 면 조작부가 사라진다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		const { container } = renderInfo({ delete: vi.fn(), showActions: false });

		expect(container.querySelector('[data-testid="edit-button"]')).toBeNull();
		expect(container.querySelector('[data-testid="delete-button"]')).toBeNull();
		expect(container.querySelector('[data-testid="versions-button"]')).toBeNull();
	});

	it('조작부를 끄면 시각은 남기되 구분선은 남기지 않는다', () => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		const { container } = renderInfo({ delete: vi.fn(), showActions: false });

		// "12:37:38 |" 처럼 아무것도 가르지 않는 선이 남으면 안 된다.
		expect(toolbarText(container)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
		expect(container.querySelector('.span--logitem-separator')).toBeNull();
	});
});

// Edit 는 `state.from` 으로 글 전체를 넘기고, Writer 는 그 형상으로 수정/새 글을
// 가른다. `item` 이 없으면 `from` 도 undefined 라 Writer 가 새 글 모드로 열리고,
// 그대로 저장하면 수정이 아니라 중복 글이 된다 (실측: from=undefined).
describe('LogItemInfo 수정 링크의 대상', () => {

	const withItem = {
		author: 'park108@gmail.com',
		timestamp: 1656034616036,
		logs: [{ contents: '본문', timestamp: 1656034616036 }],
	};

	const renderInfo = (item: unknown) => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
		return render(
			<MemoryRouter>
				<LogItemInfo item={item as never} timestamp={1656034616036} showLink={true} delete={() => {}} />
			</MemoryRouter>
		);
	};

	it('대상이 없으면 수정 링크를 내지 않는다', () => {

		const { container } = renderInfo(undefined);

		expect(screen.queryByTestId('edit-button')).toBeNull();
		// 아무것도 가르지 않는 구분선이 남으면 안 된다. 시각과 Delete 사이의 선
		// 하나는 정당하다 — 겨누는 것은 **연달아 붙은** 선이다.
		const toolbar = container.querySelector('.div--logitem-toolbar');
		expect((toolbar?.textContent ?? '').replace(/\s/g, '')).not.toContain('||');
	});

	// 대조 — 대상이 있으면 링크가 그 글을 싣는다. 없으면 "언제나 숨김" 구현도 통과한다.
	it('대상이 있으면 그 글을 실어 보낸다', () => {

		renderInfo(withItem);

		const edit = screen.getByTestId('edit-button');
		expect(edit).toBeInTheDocument();
		// Link 는 anchor 로 렌더된다 — 수정 경로를 가리켜야 한다.
		expect(edit.closest('a')?.getAttribute('href')).toBe('/log/write');
	});
});
