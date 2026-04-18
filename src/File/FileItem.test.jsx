import { render, fireEvent } from '@testing-library/react';
import * as common from '../common/common';
import FileItem from './FileItem';

console.log = vi.fn();
console.error = vi.fn();

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

	it('filename div is keyboard focusable with role=button + tabindex=0', () => {

		const { container } = render(<FileItem {...defaultProps} />);

		const filenameDiv = container.querySelector('.div--fileitem-filename');
		expect(filenameDiv).toBeInTheDocument();
		expect(filenameDiv).toHaveAttribute('role', 'button');
		expect(filenameDiv).toHaveAttribute('tabindex', '0');
	});

	it('filename div activates on Enter key → copyToClipboard called', async () => {

		const spy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		const filenameDiv = container.querySelector('.div--fileitem-filename');
		fireEvent.keyDown(filenameDiv, { key: 'Enter' });

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(defaultProps.url);

		spy.mockRestore();
	});

	it('filename div activates on Space key and prevents default scroll', () => {

		const spy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		const filenameDiv = container.querySelector('.div--fileitem-filename');
		// fireEvent.keyDown returns false when the event was cancelled (preventDefault called).
		const spaceEvent = fireEvent.keyDown(filenameDiv, { key: ' ' });
		expect(spaceEvent).toBe(false);
		expect(spy).toHaveBeenCalledTimes(1);

		spy.mockRestore();
	});

	it('filename div ignores non-activation keys (negative case)', () => {

		const spy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		const filenameDiv = container.querySelector('.div--fileitem-filename');
		const otherEvent = fireEvent.keyDown(filenameDiv, { key: 'x' });
		expect(otherEvent).toBe(true);
		expect(spy).not.toHaveBeenCalled();

		spy.mockRestore();
	});

	it('existing click path still triggers copyFileUrl (regression guard)', () => {

		const spy = vi.spyOn(common, 'copyToClipboard').mockResolvedValue(true);

		const { container } = render(<FileItem {...defaultProps} />);

		const filenameDiv = container.querySelector('.div--fileitem-filename');
		fireEvent.click(filenameDiv);

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(defaultProps.url);

		spy.mockRestore();
	});
});

describe('FileItem keyboard activation (a11y pattern B) — delete span', () => {

	it('delete span is keyboard focusable with role=button + tabindex=0', () => {

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.span--fileitem-delete');
		expect(deleteSpan).toBeInTheDocument();
		expect(deleteSpan).toHaveAttribute('role', 'button');
		expect(deleteSpan).toHaveAttribute('tabindex', '0');
	});

	it('delete span activates on Enter key → confirmDelete handler invoked', () => {

		const confirmAction = vi.fn();
		vi.spyOn(common, 'confirm').mockReturnValue(confirmAction);

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.span--fileitem-delete');
		fireEvent.keyDown(deleteSpan, { key: 'Enter' });

		expect(confirmAction).toHaveBeenCalledTimes(1);

		vi.restoreAllMocks();
	});

	it('delete span activates on Space key and prevents default scroll', () => {

		const confirmAction = vi.fn();
		vi.spyOn(common, 'confirm').mockReturnValue(confirmAction);

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.span--fileitem-delete');
		const spaceEvent = fireEvent.keyDown(deleteSpan, { key: ' ' });

		expect(spaceEvent).toBe(false);
		expect(confirmAction).toHaveBeenCalledTimes(1);

		vi.restoreAllMocks();
	});

	it('delete span ignores non-activation keys (negative case)', () => {

		const confirmAction = vi.fn();
		vi.spyOn(common, 'confirm').mockReturnValue(confirmAction);

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.span--fileitem-delete');
		const otherEvent = fireEvent.keyDown(deleteSpan, { key: 'x' });

		expect(otherEvent).toBe(true);
		expect(confirmAction).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	it('existing click path still triggers confirmDelete (regression guard)', () => {

		const confirmAction = vi.fn();
		vi.spyOn(common, 'confirm').mockReturnValue(confirmAction);

		const { container } = render(<FileItem {...defaultProps} />);

		const deleteSpan = container.querySelector('.span--fileitem-delete');
		fireEvent.click(deleteSpan);

		expect(confirmAction).toHaveBeenCalledTimes(1);

		vi.restoreAllMocks();
	});
});
