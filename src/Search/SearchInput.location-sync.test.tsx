import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import SearchInput from './SearchInput';
import * as common from '../common/common';

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

// 주소와 그 검색어를 그대로 드러내고, 임의 이동을 걸 수 있게 하는 관측용 조각.
const Probe = () => {
	const location = useLocation();
	const navigate = useNavigate();
	// 검색어의 출처는 **주소** 다. `history.state` 를 쓰던 동안에는 새로고침·
	// 북마크·공유가 전부 질의를 잃었다.
	const routed = new URLSearchParams(location.search).get('q');
	return (
		<>
			<div data-testid="where">{location.pathname}</div>
			<div data-testid="routed-query">{JSON.stringify(routed)}</div>
			<button data-testid="to-list" onClick={() => navigate("/log")}>To list</button>
			<button data-testid="to-search" onClick={() => navigate("/log/search?q=" + encodeURIComponent("지난 검색어"))}>
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

// **관리자 여부를 목한다.** 이 파일은 처음에 `isAdmin` 을 목하지 않았다. 그러면
// `SearchInput` 이 어느 갈래를 그리는지가 **앞선 테스트 파일이 남긴 쿠키 상태**에
// 달린다 — `isAdmin()` 은 `access_token` 쿠키를 읽기 때문이다.
//
// 단언은 어느 쪽이든 통과한다. `query-string-by-enter` 라는 같은 id 가 두 갈래에
// 모두 있어서다. 그래서 이 비결정성은 붉은 테스트로 드러나지 않는다 — 달라지는
// 것은 **어느 갈래의 핸들러가 실행됐는가** 뿐이고 그것은 커버리지에만 보인다.
//
// 두 갈래를 모두 돈다. 상자가 주소를 따라간다는 성질은 관리자와 방문자 모두에게
// 성립해야 하므로 이것은 커버리지 배관이 아니라 실제 계약이다 — 관리자 화면은
// 모바일 검색창을 하나 더 갖는데, 그쪽 갈래를 아무도 결정적으로 돌지 않고 있었다.
describe.each([
	['관리자', true],
	['방문자', false],
])('검색 상자는 주소를 따라간다 (%s)', (_who, isAdmin) => {

	beforeEach(() => {
		vi.spyOn(common, 'isAdmin').mockReturnValue(isAdmin);
	});


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

	// Enter 가 아닌 키는 검색을 걸지 않는다. 이 갈래(`13 === e.keyCode` 의 거짓
	// 쪽)를 아무도 결정적으로 돌지 않아 실행 순서에 따라 덮이거나 말거나 했다.
	it('Enter 가 아닌 키로는 검색하지 않는다', async () => {

		renderInput();

		await type('아직 입력 중');
		await act(async () => { fireEvent.keyUp(box(), { keyCode: 65 }); });

		expect(where()).toBe('/log');
		expect(routedQuery()).toBe('null');
		expect(box().value).toBe('아직 입력 중');
	});

	// 주소가 그대로인 동안에는 끼어들지 않는다.
	it('같은 주소에서 리렌더해도 입력 중인 글자를 지우지 않는다', async () => {

		renderInput();

		await type('입력 중');
		await act(async () => { fireEvent.click(box()); await new Promise(resolve => setTimeout(resolve, 30)); });

		expect(box().value).toBe('입력 중');
	});
});
