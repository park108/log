import type React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Writer from './Writer';
import * as common from '../common/common';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';

// 작성기 툴바의 문법 템플릿 계약 (spec `writer-syntax-templates` §동작 1~6).
//
// 템플릿과 파서는 서로를 모른다. 템플릿이 파서가 소화하지 못하는 표기를 담거나,
// 선택 항목에 자리표시자를 채우거나, 블록 템플릿이 앞 문단과 붙으면 — 어느 것도
// 다른 테스트를 붉히지 않고 발행된 글에서 독자가 먼저 본다. 실측된 두 건:
//
//   이미지 템플릿의 제목 자리표시자 → <img … title="OPTIONAL_TITLE">  (독자에게 툴팁)
//   문단 바로 아랫줄의 `---`          → <h2>문단 줄</h2>              (앞 문단이 제목)
//
// 템플릿은 소스의 맵이 아니라 **렌더된 툴바**에서 얻는다. 버튼을 하나씩 눌러
// 클립보드에 실린 문자열을 그 버튼의 템플릿으로 삼는다 — 맵을 export 해 읽으면
// 맵과 버튼이 갈라져도 초록이다.

const PLACEHOLDER = /[A-Z][A-Z0-9_]*/g;
const MIN_TEMPLATE_BUTTONS = 13;

let writeText: ReturnType<typeof vi.fn>;

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	writeText = vi.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText },
		configurable: true,
		writable: true,
	});
});

afterEach(() => {
	localStorage.clear();
	if (originalClipboard) {
		Object.defineProperty(navigator, 'clipboard', originalClipboard);
	} else {
		delete (navigator as { clipboard?: unknown }).clipboard;
	}
});

const withQuery = (node: React.ReactNode) => {
	const { Wrapper } = createQueryTestWrapper();
	return <Wrapper>{node}</Wrapper>;
};

const renderWriter = () => {
	vi.spyOn(common, 'isLoggedIn').mockReturnValue(true);
	vi.spyOn(common, 'isAdmin').mockReturnValue(true);
	vi.spyOn(common, 'setFullscreen').mockResolvedValue(undefined);

	return render(withQuery(
		<div id="root" className="div fullscreen">
			<MemoryRouter initialEntries={[{ pathname: '/log/write', state: null }]}>
				<Writer />
			</MemoryRouter>
		</div>
	));
};

/** 렌더된 툴바에서 `value` 가 비어 있지 않은 버튼 전부 — 템플릿 버튼의 모집단. */
const templateButtons = async (): Promise<{ toolbar: HTMLElement; buttons: HTMLButtonElement[] }> => {
	await screen.findByTestId('writer-form');
	const toolbar = document.querySelector<HTMLElement>('.div--writer-toolbar');
	expect(toolbar, '툴바(.div--writer-toolbar)를 찾지 못했다 — 판정이 공허하다').not.toBeNull();

	const buttons = [...toolbar!.querySelectorAll<HTMLButtonElement>('button')]
		.filter((b) => '' !== (b.getAttribute('value') ?? ''));

	expect(buttons.length, '템플릿 버튼을 하나도 도출하지 못했다 — 무판정').toBeGreaterThan(0);
	expect(buttons.length, `템플릿 버튼이 ${MIN_TEMPLATE_BUTTONS}개 미만이다`).toBeGreaterThanOrEqual(MIN_TEMPLATE_BUTTONS);

	return { toolbar: toolbar!, buttons };
};

/** 버튼(또는 그 안의 요소)을 눌러 클립보드에 실린 문자열을 얻는다. */
const copiedBy = async (target: Element): Promise<unknown> => {
	writeText.mockClear();
	fireEvent.click(target);
	await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
	return writeText.mock.calls[0]![0];
};

/** 도출한 버튼마다 `[value, 템플릿]`. */
const derivedTemplates = async (): Promise<Array<[string, string]>> => {
	renderWriter();
	const { buttons } = await templateButtons();
	const out: Array<[string, string]> = [];
	for (const b of buttons) {
		const t = await copiedBy(b);
		expect(typeof t, `${b.value}: 복사된 값이 문자열이 아니다`).toBe('string');
		expect(t, `${b.value}: 빈 템플릿이 복사됐다`).not.toBe('');
		out.push([b.value, t as string]);
	}
	return out;
};

const toDom = (html: string): HTMLDivElement => {
	const host = document.createElement('div');
	host.innerHTML = html;
	return host;
};

const rendered = (markdown: string): HTMLDivElement => toDom(sanitizeHtml(markdownToHtml(markdown)));

describe('작성기 툴바 문법 템플릿', () => {

	// §1 · §5 — 폼 비제출과 접근 이름이 **모든** 템플릿 버튼에 걸린다.
	it('모든 템플릿 버튼은 폼을 제출하지 않고 비어 있지 않은 접근 이름을 갖는다', async () => {
		renderWriter();
		const { toolbar, buttons } = await templateButtons();

		// 접근 이름은 testing-library 의 계산(name 옵션)으로 잰다 — 글자가 아니라 이름이다.
		const named = new Set(within(toolbar).queryAllByRole('button', { name: /\S/ }));

		for (const b of buttons) {
			expect(b, `${b.value}: type="button" 이 아니다 — 누르면 글이 제출된다`).toHaveAttribute('type', 'button');
			expect(named.has(b), `${b.value}: 접근 이름이 비어 있다`).toBe(true);
		}
	});

	// §2 — 템플릿은 파서가 마크업으로 소화하고, 렌더 텍스트에는 자리표시자 낱말만 남는다.
	it('모든 템플릿은 파서가 마크업으로 소화한다', async () => {
		for (const [key, t] of await derivedTemplates()) {
			const host = rendered(t);

			const markup = [...host.querySelectorAll('*')].filter((el) => 'P' !== el.tagName);
			expect(markup.length, `${key}: 문단 외 마크업이 없다 — ${host.innerHTML}`).toBeGreaterThan(0);

			const residue = (host.textContent ?? '').replace(PLACEHOLDER, '').replace(/\s/g, '');
			expect(residue, `${key}: 자리표시자 밖의 글자가 남았다 — ${host.innerHTML}`).toBe('');
		}
	});

	// §3 — 선택 항목(제목)에 자리표시자를 채우지 않는다.
	it('이미지·링크 템플릿의 렌더 결과에 title 속성이 없다', async () => {
		let checked = 0;
		for (const [key, t] of await derivedTemplates()) {
			for (const el of rendered(t).querySelectorAll('img, a')) {
				checked += 1;
				expect(el.hasAttribute('title'), `${key}: <${el.tagName.toLowerCase()} title="${el.getAttribute('title')}">`).toBe(false);
			}
		}
		expect(checked, '이미지·링크 템플릿을 하나도 찾지 못했다 — 판정이 공허하다').toBeGreaterThanOrEqual(2);
	});

	// §4 — 블록 템플릿은 붙여 넣는 자리의 앞 줄을 바꾸지 않는다.
	//
	// 블록 판정은 "단독 산출의 최상위 자식 중 p 가 아닌 것이 하나라도 있다" 다.
	// "첫 최상위 자식" 으로 보면 빈 줄로 경계를 낸 템플릿(`<p></p><hr>`)이 빠진다.
	it('블록 템플릿은 앞 문단을 제목으로 바꾸지 않고 자기 블록을 낸다', async () => {
		let blocks = 0;
		for (const [key, t] of await derivedTemplates()) {
			const alone = [...toDom(markdownToHtml(t)).children].map((el) => el.tagName).filter((tag) => 'P' !== tag);
			if (0 === alone.length) continue;
			blocks += 1;

			const host = toDom(markdownToHtml('문단 줄\n' + t));
			const top = [...host.children];

			expect(
				top.some((el) => 'P' === el.tagName && '문단 줄' === (el.textContent ?? '').trim()),
				`${key}: 앞 문단이 문단으로 남지 않았다 — ${host.innerHTML}`,
			).toBe(true);

			for (const h of host.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
				expect(h.textContent ?? '', `${key}: 앞 문단이 제목이 됐다 — ${host.innerHTML}`).not.toContain('문단 줄');
			}

			const tags = top.map((el) => el.tagName);
			for (const tag of alone) {
				expect(tags, `${key}: <${tag.toLowerCase()}> 가 생기지 않았다 — ${host.innerHTML}`).toContain(tag);
			}
		}
		expect(blocks, '블록 템플릿을 하나도 찾지 못했다 — 판정이 공허하다').toBeGreaterThan(0);
	});

	// §6 (a) — 클릭 대상이 버튼의 자식이어도 그 버튼의 템플릿이 복사된다.
	// 마크업에 자식이 없어도 재현되도록 테스트가 자식을 붙인다.
	it('버튼 안의 자식을 눌러도 그 버튼의 템플릿이 복사된다', async () => {
		renderWriter();
		const { buttons } = await templateButtons();

		for (const b of buttons) {
			const expected = await copiedBy(b);

			const child = document.createElement('span');
			child.textContent = '·';
			b.appendChild(child);
			try {
				expect(await copiedBy(child), `${b.value}: 자식을 누르면 다른 값이 복사된다`).toBe(expected);
			} finally {
				child.remove();
			}
		}
	});

	// §6 (b) — 키를 찾지 못하면 복사하지 않고 성공 토스트를 띄우지 않는다.
	it('맵에 없는 키는 복사하지 않고 성공 토스트를 띄우지 않는다', async () => {
		renderWriter();
		const { buttons } = await templateButtons();
		const b = buttons[0]!;
		const original = b.getAttribute('value')!;

		writeText.mockClear();
		b.setAttribute('value', '__not_a_template__');
		fireEvent.click(b);
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

		expect(writeText).not.toHaveBeenCalled();
		expect(screen.queryByText('Markdown string copied.')).toBeNull();

		// 위 부재가 공허하지 않음을 같은 버튼으로 확인한다 — 원래 키면 토스트가 뜬다.
		b.setAttribute('value', original);
		fireEvent.click(b);
		expect(await screen.findByText('Markdown string copied.')).toBeInTheDocument();
	});
});
