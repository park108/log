import fs from 'node:fs';
import path from 'node:path';

import type React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Log from '../Log/Log';
import * as common from '../common/common';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// `<main>` 에 `role="application"` 이 붙어 있었다.
//
// 그 role 은 보조기술에게 "여기서부터는 문서가 아니라 앱이니 읽기 모드를 끄고
// 모든 키를 넘겨라" 라고 말한다. 스크린리더 사용자는 제목 이동·링크 목록·화살표
// 읽기를 잃는다. 이 화면들이 하는 일은 **글을 보여주는 것**이고 자체 키보드
// 모델을 구현하지도 않는다 — 넘겨받은 키로 할 일이 없다.
//
// 게다가 명시 role 은 `<main>` 의 암묵 main 랜드마크를 덮는다. 랜드마크로
// 건너뛰는 길까지 함께 사라진다 — 그것이 아래 런타임 축이 재는 것이다.

const SRC = path.join(process.cwd(), 'src');

const walk = (dir: string): string[] =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});

// 측정 대상은 열거로 산출한다 — 하드코딩한 목록은 이후 추가된 화면을 숨긴다.
const productionSources = (): string[] =>
	walk(SRC)
		.filter((f) => /\.(ts|tsx)$/.test(f))
		.filter((f) => !/\.test\.(ts|tsx)$/.test(f))
		.map((f) => path.relative(process.cwd(), f));

// 주석은 코드가 아니다. 걷어내지 않으면 "왜 안 쓰는가" 를 적어 둔 문장이 위반으로
// 읽힌다 — 실제로 이 게이트를 세우면서 그 일이 났다.
const stripComments = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/[^\n]*$/gm, '');

describe('읽는 화면에 application role 을 붙이지 않는다', () => {

	it('제품 소스 어디에도 없다', () => {

		const holders = productionSources().filter((f) =>
			/role\s*=\s*["'{]?\s*["']application["']/.test(
				stripComments(fs.readFileSync(path.join(process.cwd(), f), 'utf-8'))
			)
		);

		expect(holders).toEqual([]);
	});
});

describe('main 랜드마크에 닿을 수 있다', () => {

	afterEach(() => { vi.restoreAllMocks(); });

	const renderLog = (): void => {
		const { Wrapper } = createQueryTestWrapper();
		render(
			<Wrapper>
				<MemoryRouter initialEntries={['/']}>
					<Log />
				</MemoryRouter>
			</Wrapper>
		);
	};

	it.each([
		['방문자', false],
		['관리자', true],
	])('%s 화면에서 main 랜드마크가 잡힌다', (_label, admin) => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(admin);

		renderLog();

		// `role="application"` 이 붙어 있으면 이 조회가 실패한다 — 명시 role 이
		// `<main>` 의 암묵 랜드마크를 덮기 때문이다.
		expect(screen.getByRole('main')).toBeInTheDocument();
	});

	it('application 랜드마크로는 잡히지 않는다', () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		renderLog();

		expect(screen.queryByRole('application')).toBeNull();
	});
});
