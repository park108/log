import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

import FileItem from '../File/FileItem';
import ImageItem from '../Image/ImageItem';
import CommentItem from '../Comment/CommentItem';
import CommentForm from '../Comment/CommentForm';
import LogItemInfo from '../Log/LogItemInfo';
import Toaster from '../Toaster/Toaster';
import Skeleton from '../common/Skeleton';
import ErrorFallback from '../common/ErrorFallback';

// **선택적 prop 이 오지 않았을 때 화면에 무엇이 남는가.**
//
// 이 부류는 실제로 두 번 나갔다 (둘 다 실측):
//   • 파일 크기가 없으면 `(undefined) * 1` 이 NaN 이 되어 "NaN bytes" 를 그렸다.
//   • 수정 시각이 없으면 `Date(NaN)` 이 되어 "NaN-NaN-NaN · NaN:NaN:NaN" 을 그렸다.
//
// 각 컴포넌트의 자기 테스트는 대개 **값이 있는** 경우를 재고, 없는 경우는 새
// 컴포넌트가 생길 때마다 잊힌다. 여기서는 타입이 허용하는 **최소 props** 로만
// 렌더해, 빠진 값이 사용자 화면으로 새지 않는지 한 자리에서 본다.
//
// 타입이 요구하는 prop 은 반드시 준다 — 넘기지 않으면 타입상 도달 불가한 상태를
// 재게 되고, 그것은 결함이 아니라 잘못 만든 입력이다 (실제로 한 번 그렇게 오탐했다).

const LEAK = /undefined|NaN|\[object Object\]/;

const CASES: Array<[string, React.ReactElement]> = [
	['FileItem', <FileItem />],
	['ImageItem', <ImageItem url="https://example.com/thumbnail/a.png" copyMarkdownString={() => {}} />],
	['CommentItem', <CommentItem isHidden={false} isAdminComment={false} message="메시지" name="이름" timestamp={1700000000000} openReplyForm={() => {}} reply={() => {}} />],
	['CommentForm', <CommentForm post={() => {}} />],
	['LogItemInfo', <LogItemInfo timestamp={1700000000000} />],
	['Toaster', <Toaster />],
	['Skeleton', <Skeleton />],
	['ErrorFallback', <ErrorFallback error={new Error('boom')} />],
];

describe('최소 props 렌더 — 빠진 값이 화면으로 새지 않는다', () => {

	it.each(CASES)('%s', (_name, element) => {

		const { Wrapper } = createQueryTestWrapper();

		// **두 벌 그린다.** 이 컴포넌트들은 대개 목록 안에서 여러 번 뜬다. 고정
		// `id` 를 박아 두면 그때 같은 id 가 둘이 되고, `label[for]` 은 문서에서
		// 처음 만나는 것에 붙는다 — 실측: 두 번째 답글 폼의 "🥷 Hidden Message" 를
		// 눌렀는데 첫 번째 폼의 체크박스가 켜졌다. 한 벌만 그리면 이 축의
		// 검출력이 0 이다 (주입으로 확인).
		const { container, unmount } = render(
			<Wrapper>
				<MemoryRouter>
					{React.cloneElement(element, { key: 'a' })}
					{React.cloneElement(element, { key: 'b' })}
				</MemoryRouter>
			</Wrapper>
		);

		try {
			expect(container.textContent ?? '').not.toMatch(LEAK);

			// 속성으로 샌 것도 본다 — `title="NaN bytes"` 처럼 화면에 늦게 드러난다.
			// `id` 와 그것을 가리키는 참조는 제외한다 (useId 가 만든 값에 숫자가 섞인다).
			const leakedAttributes = Array.from(container.querySelectorAll('*'))
				.flatMap(element => Array.from(element.attributes).map(a => `${a.name}=${a.value}`))
				.filter(pair => LEAK.test(pair) && !/^(id|for|aria-describedby|aria-labelledby|htmlFor)=/.test(pair));

			expect(leakedAttributes).toEqual([]);

			// 같은 화면에 같은 id 가 둘이면 `label[for]` 이 엉뚱한 것에 붙는다.
			const ids = Array.from(container.querySelectorAll('[id]')).map(element => element.id);
			expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
		}
		finally {
			unmount();
		}
	});
});
