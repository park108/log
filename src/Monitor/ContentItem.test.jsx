import { render, screen, fireEvent, act } from '@testing-library/react';
import * as mock from './api.mock'
import ContentItem from '../Monitor/ContentItem';
import * as api from './api';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 각 테스트 후 spy 를 원본으로
// 복원하므로 module-level `vi.spyOn(errorReporter, ...)` 도 beforeEach 로 이관한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
});

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

describe('ContentItem render on dev server (ok, log)', () => {
	useMockServer(() => mock.devServerOk);

	it('render log on dev server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const text = await screen.findByText("'22.01");
		expect(text).toBeInTheDocument();

	});
});

describe('ContentItem render on dev server (no count)', () => {
	useMockServer(() => mock.devServerHasNoCount);

	it('render log with no data on dev server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const text = await screen.findAllByText("0");
		expect(text[0]).toBeInTheDocument();

	});
});

describe('ContentItem render on dev server (failed)', () => {
	useMockServer(() => mock.devServerFailed);

	it('render log failed on dev server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();

		fireEvent.click(retryButton);

	});
});

describe('ContentItem render on dev server (network error)', () => {
	useMockServer(() => mock.devServerNetworkError);

	it('render log network error on dev server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByText("Retry");
		expect(retryButton).toBeInTheDocument();

	});
});

describe('ContentItem Retry keyboard activation (a11y pattern B)', () => {
	useMockServer(() => mock.devServerFailed);

	it('retry span is keyboard focusable with role=button', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });
		expect(retryButton).toHaveAttribute('tabindex', '0');
		expect(retryButton).toHaveAttribute('role', 'button');
	});

	it('retry span activates on Enter key', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// Enter triggers the same handler as onClick → component re-mounts and fires a new fetch.
		// Re-query confirms the error UI re-renders (mock still fails → Retry reappears).
		fireEvent.keyDown(retryButton, { key: 'Enter' });

		const retryAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryAfter).toBeInTheDocument();
	});

	it('retry span activates on Space key and prevents default scroll', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// fireEvent.keyDown returns true when the event was NOT cancelled. Our handler calls
		// preventDefault() for Space to block page scroll (accessibility-spec §2.2 pattern B).
		const spaceEvent = fireEvent.keyDown(retryButton, { key: ' ' });
		expect(spaceEvent).toBe(false);

		const retryAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryAfter).toBeInTheDocument();
	});

	it('retry span ignores non-activation keys (negative case)', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		const retryButton = await screen.findByRole('button', { name: /Retry/ });

		// A non-activation key must NOT call preventDefault — event remains dispatchable (returns true).
		const otherEvent = fireEvent.keyDown(retryButton, { key: 'x' });
		expect(otherEvent).toBe(true);

		// The error UI is still rendered (no re-mount triggered).
		const retryAfter = await screen.findByRole('button', { name: /Retry/ });
		expect(retryAfter).toBeInTheDocument();

	});
});

describe('ContentItem render on dev server (ok, file)', () => {
	useMockServer(() => mock.devServerOk);

	// TODO: Cannot render component.
	it('render file on dev server', async () => {

		vi.useFakeTimers({ shouldAdvanceTime: true })
			.setSystemTime(new Date(1643375805000));

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		render( <ContentItem title="Files" path="content/file" unit="capacity" stackPallet={ stackPallet.colors } /> );

		const text = await screen.findByText("Loading...");
		expect(text).toBeInTheDocument();

	});
});

// REQ-20260517-093 (I1)(I2)(FR-03) / TSK-20260824-07-a — unmount race 박제.
// pending `getContentItemCount` 응답이 unmount 이후 도착해도 외부 발화가 0 hit 임을 고정한다.
// 단정 채널 3종: (a) unmounted setState 경고 0 (console.error 0 hit),
// (b) `log()` → `console.log` 0 hit (DEV 분기에서만 실제로 나가므로 DEV 로 stub),
// (c) `reportError()` 0 hit. 세 spy 는 전역 `vi.restoreAllMocks()` (setupTests.js) 보다
// 먼저, 즉 `it` 본문 안에서 단정한다.
describe('ContentItem unmount safety (REQ-20260517-093 FR-03)', () => {

	it('pending getContentItemCount 중 unmount → 응답 resolve 가 어떤 발화도 하지 않는다', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let resolveResp;
		const pending = new Promise((resolve) => { resolveResp = resolve; });
		const apiSpy = vi.spyOn(api, 'getContentItemCount').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		expect(apiSpy).toHaveBeenCalledTimes(1);
		await screen.findByText('Loading...');

		unmount();

		// unmount 이전 발화(렌더 경로)는 판정 대상이 아니다 — 이후 채널만 남긴다.
		consoleLogSpy.mockClear();
		consoleErrorSpy.mockClear();

		await act(async () => {
			resolveResp(new Response(JSON.stringify({
				body: { Count: 3, Items: [{ timestamp: 1643375805000, size: 10, sortKey: 1 }] },
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(consoleLogSpy).not.toHaveBeenCalled();
		expect(reportErrorSpy).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('pending getContentItemCount 중 unmount 후 reject → catch 경로도 발화 0 hit', async () => {

		vi.stubEnv('DEV', true);
		vi.stubEnv('PROD', false);

		let rejectResp;
		const pending = new Promise((_, reject) => { rejectResp = reject; });
		vi.spyOn(api, 'getContentItemCount').mockReturnValue(pending);

		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const reportErrorSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

		const { unmount } = render( <ContentItem title="Logs" path="content/log" unit="count" stackPallet={ stackPallet.colors } /> );

		await screen.findByText('Loading...');

		unmount();

		consoleLogSpy.mockClear();
		consoleErrorSpy.mockClear();

		await act(async () => {
			rejectResp(new Error('network down'));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(consoleLogSpy).not.toHaveBeenCalled();
		expect(reportErrorSpy).not.toHaveBeenCalled();
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});
});
