import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import SearchInput from './SearchInput';

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// 주소와 그 검색어를 그대로 드러내고, 임의 이동을 걸 수 있게 하는 관측용 조각.
const Probe = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const routed = (location.state as { queryString?: string } | null)?.queryString ?? null;
	return (
		<>
			<div data-testid="where">{location.pathname}</div>
			<div data-testid="routed-query">{JSON.stringify(routed)}</div>
			<button data-testid="to-list" onClick={() => navigate("/log")}>To list</button>
			<button data-testid="to-search" onClick={() => navigate("/log/search", { state: { queryString: "지난 검색어" } })}>
				To search
			</button>
		</>
	);
};

const renderInput = (initial = "/log") => render(
	<MemoryRouter initialEntries={[initial]}>
		<Probe />
		<Routes>
			<Route path="*" element={<SearchInput />} />
		</Routes>
	</MemoryRouter>
);

const box = () => document.getElementById('query-string-by-enter') as HTMLInputElement;
const where = () => document.querySelector('[data-testid="where"]')?.textContent;
const routedQuery = () => document.querySelector('[data-testid="routed-query"]')?.textContent;
const click = async (testid: string) => {
	await act(async () => {
		fireEvent.click(document.querySelector(`[data-testid="${testid}"]`) as HTMLElement);
	});
};
const type = async (value: string) => {
	await act(async () => { fireEvent.change(box(), { target: { value } }); });
};
const pressEnter = async () => {
	await act(async () => { fireEvent.keyUp(box(), { keyCode: 13 }); });
};

describe('검색 상자는 주소를 따라간다', () => {

	// 구 구현은 `Search.tsx` 에서 `getElementById(...).value = ""` 로 DOM 만 지웠다.
	// controlled input 이라 React 상태에는 옛 검색어가 남았고, 실측 결과 빈 상자에서
	// Enter 를 치면 **보이지 않는 옛 검색어**로 검색됐다.
	it('목록으로 돌아온 뒤 빈 상자에서 Enter 를 쳐도 옛 검색어로 검색되지 않는다', async () => {

		renderInput();

		await type('옛 검색어');
		await pressEnter();
		expect(where()).toBe('/log/search');
		expect(routedQuery()).toBe('"옛 검색어"');

		await click('to-list');
		expect(box().value).toBe('');

		await pressEnter();
		expect(where()).toBe('/log');
		expect(routedQuery()).toBe('null');
	});

	// 같은 결함의 다른 얼굴 — 상태가 남아 있으면 아무 리렌더에나 상자로 되돌아온다.
	it('목록으로 돌아온 뒤 리렌더해도 옛 검색어가 되살아나지 않는다', async () => {

		renderInput();

		await type('옛 검색어');
		await pressEnter();
		await click('to-list');

		await act(async () => { fireEvent.click(box()); await new Promise(resolve => setTimeout(resolve, 30)); });

		expect(box().value).toBe('');
	});

	// 뒤로가기·새로고침으로 결과 화면에 도착하면 상자는 그 화면이 쓰는 검색어를
	// 보여줘야 한다 — 결과와 상자가 다른 말을 하면 안 된다.
	it('검색 결과 주소로 들어가면 그 검색어가 상자에 보인다', async () => {

		renderInput();

		expect(box().value).toBe('');

		await click('to-search');

		expect(where()).toBe('/log/search');
		expect(box().value).toBe('지난 검색어');
	});

	// 주소가 그대로인 동안에는 끼어들지 않는다.
	it('같은 주소에서 리렌더해도 입력 중인 글자를 지우지 않는다', async () => {

		renderInput();

		await type('입력 중');
		await act(async () => { fireEvent.click(box()); await new Promise(resolve => setTimeout(resolve, 30)); });

		expect(box().value).toBe('입력 중');
	});
});
