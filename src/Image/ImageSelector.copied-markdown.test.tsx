import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import ImageSelector from './ImageSelector';
import * as mock from './api.mock';
import * as errorReporter from '../common/errorReporter';
import { useMockServer } from '../test-utils/msw';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';

// 이미지를 고르면 마크다운 한 줄이 클립보드에 담긴다. 그 한 줄은 **그대로
// 붙여넣어도 옳은 글**이어야 한다.
//
// 예전 템플릿은 `![ALT_TEXT](url "OPTIONAL_TITLE")` 였다. 제목은 선택 항목인데
// 자리표시자를 채워 두어서, 글쓴이가 지우는 것을 잊는 순간 그 글자가 발행된 글에
// 그대로 실린다. `title` 은 독자가 마우스를 올리면 보이는 툴팁이다. 실측:
//
//   ![ALT_TEXT](<이미지 주소> "OPTIONAL_TITLE")
//     → <img src="<이미지 주소>" alt="ALT_TEXT" title="OPTIONAL_TITLE">
//
// (예시 주소를 실제 호스트로 적지 않는다 — `csp-origin-coverage` 가 소스에 있는
//  외부 출처를 CSP 허용 목록과 대조하므로, 주석 속 예시도 위반으로 계수된다.
//  실측: `e.com` 이 그 게이트를 붉혔다.)
//
// 게이트는 복사한 문자열과 **그것을 렌더한 결과**를 함께 본다 — 문자열만 보면
// 파서가 제목을 어떻게 다루는지는 알 수 없다.

let copied: string[] = [];

beforeEach(() => {
	copied = [];
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
	Object.assign(navigator, {
		clipboard: {
			writeText: vi.fn().mockImplementation(async (text: string) => { copied.push(text); }),
		},
	});
});

afterEach(() => { vi.restoreAllMocks(); });

const copyFirstImage = async (): Promise<string> => {

	render(<ImageSelector show={true} />);

	const items = await screen.findAllByTestId('imageItem');
	fireEvent.click(items[0]!);  // 확대
	fireEvent.click(items[0]!);  // 축소 + 마크다운 복사

	await waitFor(() => expect(copied).toHaveLength(1));
	return copied[0]!;
};

describe('복사되는 마크다운', () => {

	useMockServer(() => mock.prodServerOk);

	beforeEach(() => {
		vi.stubEnv('PROD', true);
		vi.stubEnv('DEV', false);
	});

	it('선택 항목인 제목에 자리표시자를 넣지 않는다', async () => {

		const markdown = await copyFirstImage();

		expect(markdown).not.toContain('OPTIONAL_TITLE');
	});

	it('그대로 렌더해도 title 속성이 생기지 않는다', async () => {

		const markdown = await copyFirstImage();

		const host = document.createElement('div');
		host.innerHTML = sanitizeHtml(markdownToHtml(markdown));
		const img = host.querySelector('img');

		expect(img, '이미지가 렌더되지 않았다 — 판정이 공허하다').not.toBeNull();
		expect(img?.hasAttribute('title')).toBe(false);
	});

	// 대체 텍스트 자리표시자는 **의도적으로 남긴다.** 대체 텍스트는 선택 항목이
	// 아니고, 눈에 띄어야 채워 넣게 된다. 이 단언이 없으면 "둘 다 지운다" 는
	// 구현도 위 두 케이스를 통과한다.
	it('대체 텍스트 자리표시자는 남긴다', async () => {

		const markdown = await copyFirstImage();

		expect(markdown).toContain('ALT_TEXT');
	});

	it('주소는 원본 크기 이미지를 가리킨다', async () => {

		const markdown = await copyFirstImage();

		const host = document.createElement('div');
		host.innerHTML = sanitizeHtml(markdownToHtml(markdown));

		const src = host.querySelector('img')?.getAttribute('src') ?? '';
		expect(src).not.toBe('');
		expect(src).not.toContain('thumbnail/');
	});
});
