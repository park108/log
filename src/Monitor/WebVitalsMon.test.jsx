import { render, screen } from '@testing-library/react';
import WebVitalsMon from './WebVitalsMon';

// REQ-20260421-036 FR-05 / TSK-20260421-73 — console spy 비파괴 이디엄.
// 전역 `vi.restoreAllMocks()` (setupTests.js) 가 spy 를 원본으로 복원한다.
beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Stub the lazy-loaded WebVitalsItem so the test only asserts the list
// composition rendered by WebVitalsMon (name/description pairs), not the
// item's fetch / evaluation behaviour (covered by WebVitalsItem.test.jsx).
vi.mock('./WebVitalsItem', () => ({
	default: ({ name, description }) => (
		<div data-testid={`web-vital-item-${name}`}>
			<span>{name}</span>
			<span>{description}</span>
		</div>
	),
}));

it('renders INP and omits FID in the web vitals list', async () => {

	render(<WebVitalsMon />);

	const lcp = await screen.findByTestId('web-vital-item-LCP');
	expect(lcp).toBeInTheDocument();

	const inp = await screen.findByTestId('web-vital-item-INP');
	expect(inp).toBeInTheDocument();

	expect(screen.queryByTestId('web-vital-item-FID')).toBeNull();
	expect(screen.queryByText('First Input Delay')).toBeNull();

	expect(await screen.findByTestId('web-vital-item-CLS')).toBeInTheDocument();
	expect(await screen.findByTestId('web-vital-item-FCP')).toBeInTheDocument();
	expect(await screen.findByTestId('web-vital-item-TTFB')).toBeInTheDocument();

	expect(screen.getByText('Interaction to Next Paint')).toBeInTheDocument();
});
