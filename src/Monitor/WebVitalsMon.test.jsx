import { render, screen } from '@testing-library/react';
import WebVitalsMon from './WebVitalsMon';

console.log = vi.fn();
console.error = vi.fn();

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
