import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Log from '../Log/Log';
import ImageItem from '../Image/ImageItem';
import * as common from '../common/common';

// 아이콘·글리프만 담은 인터랙티브 요소는 접근 가능한 이름이 없다. 화면에서는
// 멀쩡해 보이므로 시각 검토로는 잡히지 않고, 스크린리더에서만 "플러스, 버튼"
// 으로 읽힌다. 실측으로 두 건이 그 상태였다.

describe('새 글 진입점 (Log.tsx)', () => {

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
	});

	it('접근 가능한 이름을 갖는다 — 글리프는 이름이 되지 못한다', () => {

		render(<MemoryRouter><Log /></MemoryRouter>);

		// getByRole 의 name 옵션은 접근 가능한 이름으로 조회한다 —
		// aria-label 이 사라지면 이 조회가 실패한다.
		expect(screen.getByRole('link', { name: 'Write a new log' })).toBeInTheDocument();
	});

	it('링크 안에 버튼을 중첩하지 않는다', () => {

		const { container } = render(<MemoryRouter><Log /></MemoryRouter>);

		// `<a>` 안의 `<button>` 은 인터랙티브 요소 중첩이라 유효하지 않은 HTML 이고
		// 보조기술에서 동작이 예측 불가다. 중첩 자체를 금지한다.
		expect(container.querySelector('a button')).toBeNull();
	});
});

describe('이미지 항목 (ImageItem.tsx)', () => {

	const url = 'https://example.invalid/thumbnail/x.png';

	it('fileName 이 없어도 접근 가능한 이름을 갖는다', () => {

		// fileName 은 선택적 prop 이다. 없으면 alt 속성 자체가 사라져
		// role="button" 인 요소가 이름 없는 상태가 된다.
		render(<ImageItem url={url} copyMarkdownString={vi.fn()} />);

		const el = screen.getByTestId('imageItem');
		expect(el).toHaveAttribute('alt');
		expect(el.getAttribute('alt')).not.toBe('');
	});

	it('fileName 이 있으면 그것을 이름으로 쓴다', () => {

		render(<ImageItem url={url} fileName="photo.png" copyMarkdownString={vi.fn()} />);
		expect(screen.getByTestId('imageItem')).toHaveAttribute('alt', 'photo.png');
	});
});
