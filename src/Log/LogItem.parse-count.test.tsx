import type React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LogItem from './LogItem';
import * as common from '../common/common';
import * as api from './api';
import * as parser from '../common/markdownParser';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// **이 파일은 lazy 청크를 미리 데우지 않는다.** `LogItem.test.tsx` 는 파일 단위
// `beforeAll` 에서 한 번 렌더해 dynamic import 를 module cache 에 고정해 둔다 —
// 그 상태에서는 suspend 자체가 일어나지 않아 Suspense 경계의 효과를 잴 수 없다
// (실측: 경계를 통째로 들어내도 그 파일에서는 초록이었다). 차가운 캐시가
// 이 게이트의 전제다.

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

const withQuery = (node: React.ReactNode) => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

// 본문은 `contents` 에만 의존하는데, 예전에는 글 하나를 여는 동안 마크다운
// 파싱이 여러 번 돌았다. 두 가지가 겹쳐 있었다 (실측):
//
//   memo 없음   첫 렌더 2회 · 상태 변화 후 4회  — 자기 상태가 바뀔 때마다 재파싱
//   경계 없음   첫 렌더 3회                    — lazy 자식의 청크가 도착할 때까지
//                                              렌더가 통째로 폐기·재시도된다
//
// `useMemo` 는 **커밋 전 폐기** 를 건너뛰지 못하므로 memo 만으로는 후자를 막을 수
// 없다. `LogItemInfo` 에 자기 Suspense 경계를 주어야 한다. 14KB 글의 파싱+정제는
// 1회 43ms 라, 보여주기만 하는 데 그 세 배를 쓰고 있었다.
describe('LogItem 본문 파싱 횟수', () => {

	const parseCount = () => (parser.markdownToHtml as unknown as { mock: { calls: unknown[] } }).mock.calls.length;

	const renderItem = () => render(withQuery(
		<MemoryRouter>
			<LogItem author="park108@gmail.com" timestamp={1700000000000} contents={'# 제목\n\n본문'} showActions={true} />
		</MemoryRouter>
	));

	it('글 하나를 여는 동안 한 번만 파싱한다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(parser, 'markdownToHtml');

		renderItem();
		await screen.findByTestId('delete-button');

		expect(parseCount()).toBe(1);
	});

	it('자기 상태가 바뀌어도 다시 파싱하지 않는다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		vi.spyOn(api, 'deleteLog').mockImplementation(() => new Promise<Response>(() => {}));
		vi.spyOn(parser, 'markdownToHtml');

		renderItem();
		const button = await screen.findByTestId('delete-button');

		await act(async () => { fireEvent.click(button); });
		await waitFor(() => expect(screen.getByTestId('delete-button')).toBeDisabled());

		expect(parseCount()).toBe(1);
	});
});
