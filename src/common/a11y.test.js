import { activateOnKey } from './a11y';

describe('activateOnKey', () => {
	it('invokes handler when key is Enter', () => {
		const handler = vi.fn();
		const preventDefault = vi.fn();
		activateOnKey(handler)({ key: 'Enter', preventDefault });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(preventDefault).toHaveBeenCalledTimes(1);
	});

	it('invokes handler when key is Space (" ")', () => {
		const handler = vi.fn();
		const preventDefault = vi.fn();
		activateOnKey(handler)({ key: ' ', preventDefault });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(preventDefault).toHaveBeenCalledTimes(1);
	});

	it('ignores non-target keys (Tab / Escape / arbitrary character)', () => {
		const handler = vi.fn();
		const preventDefault = vi.fn();
		const wrapped = activateOnKey(handler);
		wrapped({ key: 'Tab', preventDefault });
		wrapped({ key: 'Escape', preventDefault });
		wrapped({ key: 'a', preventDefault });
		expect(handler).not.toHaveBeenCalled();
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('forwards the event object to the handler', () => {
		const handler = vi.fn();
		const event = { key: 'Enter', preventDefault: vi.fn() };
		activateOnKey(handler)(event);
		expect(handler).toHaveBeenCalledWith(event);
	});

	it('can be called repeatedly without state leakage (factory purity)', () => {
		const handler = vi.fn();
		const wrapped = activateOnKey(handler);
		wrapped({ key: 'Enter', preventDefault: vi.fn() });
		wrapped({ key: ' ', preventDefault: vi.fn() });
		expect(handler).toHaveBeenCalledTimes(2);
	});
});
