import { reportError } from './errorReporter';

describe('reportError', () => {
	it('delegates to console.error with error object and info', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const err = new Error('boom');
		const info = { componentStack: 'at X' };

		reportError(err, info);

		expect(spy).toHaveBeenCalledWith('[reportError]', err, info);
		spy.mockRestore();
	});
});
