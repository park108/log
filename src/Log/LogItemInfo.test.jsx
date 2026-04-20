import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
		vi.useRealTimers();
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
