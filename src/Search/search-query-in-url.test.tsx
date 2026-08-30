import type React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Search from './Search';
import SearchInput, { QUERY_PARAM } from './SearchInput';
import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// 검색어가 `history.state` 에만 있었다.
//
// `history.state` 는 새로고침으로 살아남지 못하고 링크에도 담기지 않는다. 그래서
// 검색 결과 화면을 새로 고치거나 그 주소를 공유하면 **방금 한 검색이 사라지고**
// "Type a keyword to search." 가 뜬다. 검색 결과를 남에게 보낼 방법도 없었다.
//
// 주소에 실으면 새로고침·북마크·공유가 모두 성립하고, 검색 상자와 결과 화면이
// 같은 한 곳을 읽게 된다.

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
	vi.spyOn(common, 'isAdmin').mockReturnValue(false);
	vi.stubEnv('PROD', true);
	vi.stubEnv('DEV', false);
});

afterEach(() => { vi.restoreAllMocks(); });

const Where = (): React.ReactElement => {
	const location = useLocation();
	return <div data-testid="url">{ location.pathname + location.search }</div>;
};

const withQuery = (node: React.ReactNode): React.ReactElement => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

const QUERY = '한글 검색어';

describe('검색어는 주소에 실린다', () => {

	it('검색하면 주소에 남는다', async () => {

		render(withQuery(
			<MemoryRouter initialEntries={['/log']}>
				<Where />
				<Routes><Route path="*" element={<SearchInput />} /></Routes>
			</MemoryRouter>
		));

		const box = document.getElementById('query-string-by-enter') as HTMLInputElement;
		await act(async () => { fireEvent.change(box, { target: { value: QUERY } }); });
		await act(async () => { fireEvent.keyUp(box, { keyCode: 13 }); });

		const url = screen.getByTestId('url').textContent ?? '';
		expect(url.startsWith('/log/search?')).toBe(true);
		expect(new URLSearchParams(url.split('?')[1]).get('q')).toBe(QUERY);
	});

	// 새로 마운트하는 것이 새로고침·북마크·공유의 공통 모양이다 — 앞선 이동의
	// `history.state` 가 없는 상태에서 시작한다.
	it('그 주소로 새로 들어가면 검색어가 살아 있다', async () => {

		render(withQuery(
			<MemoryRouter initialEntries={[{
				pathname: '/log/search',
				search: '?q=' + encodeURIComponent(QUERY),
				hash: '',
				state: null,
				key: 'default',
			}]}>
				<Search />
			</MemoryRouter>
		));

		// 질의가 살아 있으면 조회로 넘어간다 — "Type a keyword to search." 가 아니다.
		expect(await screen.findByText(new RegExp(QUERY))).toBeInTheDocument();
		expect(screen.queryByText('Type a keyword to search.')).toBeNull();
	});

	it('검색 상자도 그 주소를 따라 채워진다', async () => {

		render(
			<MemoryRouter initialEntries={[{
				pathname: '/log/search',
				search: '?q=' + encodeURIComponent(QUERY),
				hash: '',
				state: null,
				key: 'default',
			}]}>
				<Routes><Route path="*" element={<SearchInput />} /></Routes>
			</MemoryRouter>
		);

		expect((document.getElementById('query-string-by-enter') as HTMLInputElement).value).toBe(QUERY);
	});

	// 주소에 그대로 실으면 `&` 뒤가 다른 파라미터로 읽혀 잘린다. 앞의 왕복
	// 케이스들은 이미 인코딩된 주소로 들어가므로 이 갈래를 지나지 않는다 —
	// **입력에서 주소로** 가는 방향을 따로 본다 (실측: 이 케이스가 없으면
	// `encodeURIComponent` 를 통째로 지워도 게이트가 통과했다).
	it.each([
		['앰퍼샌드', 'a & b'],
		['샵', 'C# 과 F#'],
		['등호', 'a=b'],
	])('%s 를 입력해도 주소가 잘리지 않는다', async (_label, query) => {

		render(withQuery(
			<MemoryRouter initialEntries={['/log']}>
				<Where />
				<Routes><Route path="*" element={<SearchInput />} /></Routes>
			</MemoryRouter>
		));

		const box = document.getElementById('query-string-by-enter') as HTMLInputElement;
		await act(async () => { fireEvent.change(box, { target: { value: query } }); });
		await act(async () => { fireEvent.keyUp(box, { keyCode: 13 }); });

		const url = screen.getByTestId('url').textContent ?? '';
		expect(new URLSearchParams(url.split('?')[1]).get(QUERY_PARAM)).toBe(query);
	});

	// 결과 화면에 머문 채 다시 검색하면 주소만 바뀐다. 그 변화에 반응하지 않으면
	// 앞선 질의의 결과가 그대로 남는다.
	it('머문 채로 다시 검색하면 새 질의를 따라간다', async () => {

		const Renavigate = (): React.ReactElement => {
			const navigate = useNavigate();
			return <button data-testid="again" onClick={() => navigate('/log/search?' + QUERY_PARAM + '=두번째')}>다시</button>;
		};

		render(withQuery(
			<MemoryRouter initialEntries={[{
				pathname: '/log/search', search: '?' + QUERY_PARAM + '=' + encodeURIComponent('첫번째'),
				hash: '', state: null, key: 'default',
			}]}>
				<Renavigate />
				<Search />
			</MemoryRouter>
		));

		// 관측 표면은 **문서 제목**이다. 본문은 조회 결과에 따라 로딩·0건·오류로
		// 갈리지만 제목은 질의어에서 바로 나온다 (`setHtmlTitle`). 목 서버 없이
		// 이 축만 재려는 것이므로 갈래에 의존하지 않는 쪽을 고른다.
		await waitFor(() => expect(document.title).toContain('첫번째'));

		await act(async () => { fireEvent.click(screen.getByTestId('again')); });

		await waitFor(() => expect(document.title).toContain('두번째'));
		expect(document.title).not.toContain('첫번째');
	});

	// **질의 이름은 계약이다.** 이미 공유된 주소가 그 이름을 담고 있으므로 바꾸면
	// 남이 가진 링크가 전부 빈 검색 화면이 된다. 대조가 아니라 검출 방향이다.
	it('주소의 질의 이름은 `q` 다', () => {

		expect(QUERY_PARAM).toBe('q');
	});

	// 비어 있음과 검색함은 다르다 — 이 단언이 없으면 "늘 질의가 있다" 도 통과한다.
	it('질의 없는 주소로 들어가면 검색하지 않는다', async () => {

		render(withQuery(
			<MemoryRouter initialEntries={[{
				pathname: '/log/search', search: '', hash: '', state: null, key: 'default',
			}]}>
				<Search />
			</MemoryRouter>
		));

		expect(await screen.findByText('Type a keyword to search.')).toBeInTheDocument();
	});

	// 주소는 사람이 손으로 고칠 수 있다. 인코딩이 필요한 글자가 그대로 돌아와야 한다.
	it.each([
		['공백과 한글', '두 단어 검색'],
		['앰퍼샌드', 'a & b'],
		['물음표', 'why?'],
		['등호', 'a=b'],
	])('%s 도 그대로 오간다', async (_label, query) => {

		render(
			<MemoryRouter initialEntries={[{
				pathname: '/log/search',
				search: '?q=' + encodeURIComponent(query),
				hash: '',
				state: null,
				key: 'default',
			}]}>
				<Routes><Route path="*" element={<SearchInput />} /></Routes>
			</MemoryRouter>
		);

		expect((document.getElementById('query-string-by-enter') as HTMLInputElement).value).toBe(query);
	});
});
