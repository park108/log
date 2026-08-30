import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import { render, cleanup } from '@testing-library/react';

import Toaster from '../Toaster/Toaster';

// 동시에 뜬 바닥 토스터 둘이 서로를 가렸다.
//
// 실측 (Chrome, 375px, 실제 CSS — 각자 `position: fixed; left:0; bottom:0`):
//
//   #a  "annual-report-2026.pdf URL copied."   박스 x=0 y=1352 w=407 h=48
//   #b  "budget.pdf URL copied."               박스 x=0 y=1352 w=407 h=48
//
// 완전히 같은 사각형이고 z-index 도 같으므로 DOM 뒤쪽이 앞쪽을 덮는다. 이 컴포넌트는
// **목록 항목마다 하나씩** 마운트된다 (`FileItem` · `LogItem` · `LogItemInfo`). 따라서
// 목록에서 아래 항목을 먼저 누르고 위 항목을 누르면 방금 누른 쪽이 가려진다 —
// 사용자는 건드리지도 않은 파일 이름이 붙은 "URL copied." 를 읽는다.
//
// 고침은 배치가 아니라 **구조**다: 바닥 토스터는 전부 하나의 열(column) 상자에
// 들어간다. 그래서 게이트도 두 축이다 — 같은 상자에 들어가는가(런타임),
// 그 상자가 열을 이루고 개별 토스터가 다시 fixed 로 돌아가지 않았는가(CSS).

const read = (relative: string): string =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

const ruleBody = (css: string, selector: string): string | null => {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const matched = new RegExp(`(^|\\})\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'm').exec(css);
	return matched ? (matched[2] ?? null) : null;
};

const bottoms = (): HTMLElement[] =>
	Array.from(document.querySelectorAll<HTMLElement>('[role="alert"][data-position="bottom"]'));

describe('동시에 뜬 바닥 토스터는 서로를 가리지 않는다', () => {

	afterEach(() => { cleanup(); });

	it('서로 다른 부모가 띄운 둘이 같은 쌓임 상자에 들어간다', () => {

		// 두 개의 독립된 마운트 — 목록의 두 항목이 각자 띄운 상황 그대로다.
		render(<Toaster show={1} position="bottom" type="success" message="annual-report-2026.pdf URL copied." />);
		render(<Toaster show={1} position="bottom" type="success" message="budget.pdf URL copied." />);

		const visible = bottoms();
		expect(visible).toHaveLength(2);

		const parents = new Set(visible.map((el) => el.parentElement));
		expect(parents.size).toBe(1);

		const [parent] = Array.from(parents);
		expect(parent).not.toBeNull();
		expect(parent).toHaveAttribute('data-toaster-stack', 'bottom');
	});

	it('가운데 토스터는 상자에 들어가지 않는다', () => {

		render(<Toaster show={1} position="center" message="Loading files..." />);

		expect(document.querySelector('[data-toaster-stack="bottom"]')).toBeNull();
	});

	it('마지막 바닥 토스터가 사라지면 상자도 걷힌다', () => {

		const first = render(<Toaster show={1} position="bottom" message="하나" />);
		const second = render(<Toaster show={1} position="bottom" message="둘" />);

		expect(document.querySelector('[data-toaster-stack="bottom"]')).not.toBeNull();

		first.unmount();
		expect(document.querySelector('[data-toaster-stack="bottom"]')).not.toBeNull();

		second.unmount();
		expect(document.querySelector('[data-toaster-stack="bottom"]')).toBeNull();
	});

	describe('배치 규칙', () => {

		const css = () => read('src/Toaster/Toaster.module.css');

		it('쌓임 상자가 열을 이룬다', () => {

			const body = ruleBody(css(), '.div--toaster-bottom-stack');

			expect(body).not.toBeNull();
			expect(body ?? '').toMatch(/display\s*:\s*flex/);
			expect(body ?? '').toMatch(/flex-direction\s*:\s*column/);
			// 상자 자신은 화면 아래에 고정된다.
			expect(body ?? '').toMatch(/position\s*:\s*fixed/);
		});

		it('개별 바닥 토스터는 다시 고정 배치로 돌아가지 않는다', () => {

			const body = ruleBody(css(), '.div--toaster-bottom');

			expect(body).not.toBeNull();
			// `position: fixed` 가 하나라도 있으면 상자에서 빠져나와 다시 겹친다.
			expect(body ?? '').not.toMatch(/position\s*:\s*(fixed|absolute)/);
		});

		it('패딩이 폭 밖으로 삐져나가지 않는다', () => {

			// 실측 375px: `width: 100%` + 좌우 1em 패딩 = 407px.
			const body = ruleBody(css(), '.div--toaster-bottom');

			expect(body ?? '').toMatch(/box-sizing\s*:\s*border-box/);
		});
	});
});
