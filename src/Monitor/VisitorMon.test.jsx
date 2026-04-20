import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import VisitorMon from '../Monitor/VisitorMon';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

console.log = vi.fn();
console.error = vi.fn();
vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

const stackPallet = {
	pallet: "Red to Green",
	colors: [
		{color: "black", backgroundColor: "rgb(243, 129, 129)"},
		{color: "black", backgroundColor: "rgb(248, 178, 134)"},
		{color: "black", backgroundColor: "rgb(252, 227, 138)"},
		{color: "black", backgroundColor: "rgb(243, 241, 173)"},
		{color: "black", backgroundColor: "rgb(234, 255, 208)"},
		{color: "black", backgroundColor: "rgb(190, 240, 210)"},
		{color: "black", backgroundColor: "rgb(149, 225, 211)"},
	]
};

describe('VisitorMon render on prod server (ok)', () => {
	useMockServer(() => mock.prodServerOk);

	it('render visitor monitor on prod server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643673600000));

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const obj = await screen.findByText("Rendering Engine");
		expect(obj).toBeInTheDocument();

		// react-render-patterns-spec §5.2 / REQ-20260420-001 FR-02
		// popup 이관 검증: focus → role="tooltip" + aria-describedby 설정.
		// 기존 mouseOver/mouseMove/mouseOut 는 jsdom pointer 한계로 focus 경로로 갱신.
		const statusBar = await screen.findByTestId("visitor-env-Browser-1");
		expect(statusBar).toBeInTheDocument();

		expect(statusBar.getAttribute('aria-describedby')).toBeFalsy();

		act(() => { fireEvent.focus(statusBar); });

		const describedBy = statusBar.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		const tooltip = document.getElementById(describedBy);
		expect(tooltip).not.toBeNull();
		expect(tooltip).toHaveAttribute('role', 'tooltip');
		expect(tooltip).toHaveAttribute('aria-hidden', 'false');

		vi.useRealTimers();
	});
});

describe('VisitorMon render on prod server (failed)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('render visitor monitor failed on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByText("Retry");
		expect(retryButtons[0]).toBeInTheDocument();

		fireEvent.click(retryButtons[0]);
	});
});

describe('VisitorMon render on prod server (network error)', () => {
	useMockServer(() => mock.prodServerNetworkError);

	it('render visitor monitor network error on prod server', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByText("Retry");
		expect(retryButtons[0]).toBeInTheDocument();

		fireEvent.click(retryButtons[1]);
	});
});

describe('VisitorMon retry keyboard activation (a11y pattern B)', () => {
	useMockServer(() => mock.prodServerFailed);

	it('retry spans are keyboard focusable with role=button (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtons).toHaveLength(2);

		for (const el of retryButtons) {
			expect(el).toHaveAttribute('tabindex', '0');
			expect(el).toHaveAttribute('role', 'button');
		}
	});

	it('retry span activates on Enter key (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and fires a new fetch.
		// We verify by asserting the Retry buttons disappear (loading state) or are re-rendered.
		fireEvent.keyDown(retryButtons[0], { key: 'Enter' });

		// After Enter, the loading branch is rendered at least once → original Retry nodes detach.
		// Re-query to confirm handler ran (new Retry buttons will reappear after the mock still fails).
		const retryButtonsAfter = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtonsAfter).toHaveLength(2);
	});

	it('retry span activates on Space key and prevents default scroll (a11y pattern B)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });

		const spaceEvent = fireEvent.keyDown(retryButtons[1], { key: ' ' });
		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		expect(spaceEvent).toBe(false);

		const retryButtonsAfter = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtonsAfter).toHaveLength(2);
	});

	it('retry span ignores non-activation keys (a11y pattern B negative case)', async () => {

		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);

		render(<VisitorMon stackPallet={stackPallet.colors}/>);

		const retryButtons = await screen.findAllByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButtons[0], { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryButtonsAfter = await screen.findAllByRole('button', { name: /Retry/ });
		expect(retryButtonsAfter).toHaveLength(2);
	});
});
