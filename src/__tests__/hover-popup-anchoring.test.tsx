import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import LogItemInfo from '../Log/LogItemInfo';
import CommentItem from '../Comment/CommentItem';
import * as common from '../common/common';
import { createQueryTestWrapper } from '../test-utils/queryWrapper';
import { describe, it, expect } from 'vitest';

// 호버 팝업은 **기준점이 있어야** 한다.
//
// 이 팝업들은 `position: absolute` + `top: 100%` 를 쓴다. 위치 지정된 조상이
// 없으면 그 100% 는 뷰포트 높이를 뜻하고 팝업이 화면 밖으로 밀린다 — 실제
// 브라우저 측정에서 y=1298 이 나왔다.
//
// 좌표가 `auto` 이던 이전에는 배치가 DOM 상의 **정적 위치**에 딸려 있었다.
// 그래서 트리거의 `display` 한 줄(inline ↔ inline-block)이면 팝업이 말없이
// 옮겨갔다. 좌표를 명시해 그 의존을 끊었고, 이 게이트가 두 절반(호스트의
// position, 팝업의 좌표)이 함께 유지되는지 본다.
//
// 배치가 이전과 같은지는 실제 브라우저로 확인했다 (280·320·375·414·768·900·
// 1200·1440px). 그 측정은 CI 에 들어갈 수 없으므로 — 헤드리스 브라우저가
// 의존성에 없다 — 이 게이트는 **계약의 형태**를 지킨다.

const SRC = join(process.cwd(), 'src');

const walk = (dir: string, test: RegExp, out: string[] = []): string[] => {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, test, out);
		else if (test.test(name) && !/\.test\./.test(name)) out.push(p);
	}
	return out;
};

const allCss = (): string =>
	walk(SRC, /\.css$/).map((f) => readFileSync(f, 'utf8')).join('\n');

/** 클래스 선택자의 규칙 본문을 모두 모은다 (여러 규칙에 흩어져 있을 수 있다). */
const rulesFor = (css: string, className: string): string => {
	const found: string[] = [];
	const re = new RegExp('(^|[,{}\\s])\\.' + className.replace(/[-]/g, '\\-') + '(?=[\\s,{:])', 'g');
	let m: RegExpExecArray | null;
	while ((m = re.exec(css)) !== null) {
		const open = css.indexOf('{', m.index);
		const close = css.indexOf('}', open);
		if (open > -1 && close > open) found.push(css.slice(open + 1, close));
	}
	return found.join('\n');
};

const POPUPS = ['div--logitem-linkmessage', 'div--logitem-versionhistory'];

// 팝업을 품는 요소와 그 기준점. 새 사용처가 생기면 이 목록도 함께 바뀌어야 한다 —
// 그것이 이 게이트의 요지다. 기준을 정하지 않은 채 팝업만 얹으면 화면 밖으로 간다.
const HOSTS: Array<{ file: string; popup: string; anchor: string }> = [
	{ file: 'Log/LogItemInfo.tsx',  popup: 'div--logitem-linkmessage',    anchor: 'span--logitem-toolbaricon' },
	{ file: 'Log/LogItemInfo.tsx',  popup: 'div--logitem-versionhistory', anchor: 'div--logitem-toolbar' },
	{ file: 'Comment/CommentItem.tsx', popup: 'div--logitem-linkmessage', anchor: 'div--comment-replybutton' },
];

describe('호버 팝업 기준점', () => {

	it('팝업은 좌표와 폭을 스스로 정한다', () => {

		const css = allCss();

		for (const popup of POPUPS) {
			const rule = rulesFor(css, popup);
			expect(rule, popup + ' 규칙을 찾지 못했다 — 판정이 공허하다').not.toBe('');
			expect(rule, popup + ' 에 position: absolute 가 없다').toMatch(/position:\s*absolute/);
			expect(rule, popup + ' 에 top 좌표가 없다 — 정적 위치에 의존하게 된다').toMatch(/\btop:\s*[^;]+/);
			expect(rule, popup + ' 에 left 좌표가 없다').toMatch(/\bleft:\s*[^;]+/);
			// 기준을 좁히면 shrink-to-fit 가용 폭도 좁아져 글자가 세로로 접힌다
			// (실측: version 팝업 높이 77 → 194).
			expect(rule, popup + ' 에 width: max-content 가 없다 — 글자가 세로로 접힌다').toMatch(/width:\s*max-content/);
		}
	});

	it('팝업을 품는 요소는 위치 지정돼 있다', () => {

		const css = allCss();

		for (const { anchor, popup } of HOSTS) {
			const rule = rulesFor(css, anchor);
			expect(rule, anchor + ' 규칙을 찾지 못했다').not.toBe('');
			expect(
				rule,
				anchor + ' 가 위치 지정돼 있지 않다 — ' + popup + ' 의 top:100% 가 뷰포트 높이를 잡는다',
			).toMatch(/position:\s*(relative|absolute|fixed|sticky)/);
		}
	});

	it('팝업 사용처가 목록과 일치한다', () => {

		const files = walk(SRC, /\.tsx$/);
		expect(files.length, '스캔 대상이 없다').toBeGreaterThan(10);

		const seen: string[] = [];
		for (const file of files) {
			const text = readFileSync(file, 'utf8');
			for (const popup of POPUPS) {
				if (text.includes(popup)) seen.push(file.replace(SRC + '/', '') + ' → ' + popup);
			}
		}

		const declared = HOSTS.map((h) => h.file + ' → ' + h.popup).sort();
		// 새 사용처가 생기면 여기서 걸린다 — 기준점을 정하라는 뜻이다.
		expect(seen.sort(), '팝업 사용처가 늘거나 줄었다. HOSTS 목록에 기준점을 함께 적어야 한다').toEqual(declared);
	});
});

// ── 실제 DOM 조상 (2026-08-31 추가) ──────────────────────────────────────────
//
// 위 세 검사는 **CSS 규칙** 과 **파일 목록** 만 본다. 팝업의 실제 DOM 부모가 그
// 기준점인지는 아무도 검증하지 않았다 — 팝업을 다른 래퍼 밑으로 옮겨도 세 검사가
// 모두 통과한다. 그런데 이 게이트가 막으려는 사고가 정확히 그 이동이다
// (`top: 100%` 는 위치 지정 조상이 없으면 뷰포트를 기준으로 잡는다).
//
// 파이프라인의 inspector 가 이 공백을 지적했다 (2026-08-31, REQ-20260830-047 흡수
// 중). 지적이 옳아 런타임 축을 더한다 — CSS 는 정적으로, 조상 관계는 실제 렌더로.
//
// jsdom 은 레이아웃을 계산하지 않으므로 **좌표** 는 여전히 못 잰다. 여기서 재는
// 것은 "팝업이 기준점의 자손인가" 라는 구조 명제다. 좌표 동일성은 브라우저
// 측정(`scripts/measure-layout.mjs`)의 몫이고 CI 에 없다.

const anchorsOf = (popupClass: string): string[] =>
	HOSTS.filter(host => host.popup === popupClass).map(host => host.anchor);

/**
 * `element` 의 조상 중 `className` 을 가진 것이 있는가.
 *
 * CSS 모듈 클래스는 DOM 에서 해시된 이름으로 나온다 (`_div--comment-replybutton_x1y2`).
 * 원래 이름이 그 안에 남으므로 부분 일치로 본다 — 전역 클래스는 정확히 일치한다.
 */
const hasAncestorWithClass = (element: Element, className: string): boolean => {
	let current: Element | null = element.parentElement;
	while (current) {
		for (const cls of Array.from(current.classList)) {
			if (cls === className || cls.includes(className)) return true;
		}
		current = current.parentElement;
	}
	return false;
};

describe('팝업은 선언된 기준점의 자손이다', () => {

	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(common, 'isAdmin').mockReturnValue(true);
	});

	const openAndCheck = async (
		ui: React.ReactElement,
		triggerTestId: string,
		popupClass: string,
	): Promise<void> => {

		const { Wrapper } = createQueryTestWrapper();
		render(<Wrapper><MemoryRouter>{ui}</MemoryRouter></Wrapper>);

		const trigger = await screen.findByTestId(triggerTestId);
		await act(async () => { fireEvent.focus(trigger); });

		const popup = document.querySelector('.' + popupClass);
		expect(popup, popupClass + ' 이 뜨지 않았다 — 판정이 공허하다').not.toBeNull();

		const anchors = anchorsOf(popupClass);
		expect(anchors.length, popupClass + ' 의 기준점이 HOSTS 에 없다').toBeGreaterThan(0);

		const anchored = anchors.some(anchor => hasAncestorWithClass(popup as Element, anchor));
		expect(
			anchored,
			popupClass + ' 이 선언된 기준점(' + anchors.join(' | ') + ') 의 자손이 아니다'
				+ ' — 옮겨진 팝업은 위치 지정 조상을 잃고 뷰포트 기준으로 잡힌다',
		).toBe(true);
	};

	it('링크 복사 팝업', async () => {
		await openAndCheck(
			<LogItemInfo timestamp={1700000000000} showLink={true} />,
			'link-copy-button',
			'div--logitem-linkmessage',
		);
	});

	it('판본 이력 팝업', async () => {
		await openAndCheck(
			<LogItemInfo
				timestamp={1700000000000}
				item={{ timestamp: 1700000000000, author: 'a', logs: [{ timestamp: 1, contents: 'c' }] } as never}
			/>,
			'versions-button',
			'div--logitem-versionhistory',
		);
	});

	it('답글 팝업', async () => {
		await openAndCheck(
			<CommentItem
				isHidden={false}
				isAdminComment={false}
				message="메시지"
				name="이름"
				timestamp={1700000000000}
				openReplyForm={() => {}}
				reply={() => {}}
			/>,
			'reply-toggle-button',
			'div--logitem-linkmessage',
		);
	});
});
