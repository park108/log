import { vi } from 'vitest';

import * as common from '../common/common';
import { getLogs, getNextLogs } from './api';

// 목록 조회는 모든 페이지가 같은 신분으로 나가야 한다.
//
// 첫 페이지만 `&admin=true` 를 실었고 "See more" 는 아무것도 싣지 않았다. 같은
// 사용자가 같은 목록을 훑는 동안 1페이지와 2페이지가 서로 다른 신분으로 요청됐다.
// 이 파라미터가 임시 저장 글의 노출을 가르므로 결과는 하나다 — 관리자가 자기
// 임시 글을 첫 페이지에서는 보고 그 아래에서는 못 본다.
//
// 게이트는 두 함수를 **나란히** 본다. 한쪽만 재면 다음에 갈라져도 알 수 없다.

const ORIGINAL_FETCH = globalThis.fetch;

let urls: string[] = [];

beforeEach(() => {
	urls = [];
	globalThis.fetch = vi.fn(async (url: unknown) => {
		urls.push(String(url));
		return { json: async () => ({}) } as unknown as Response;
	}) as unknown as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH;
	vi.restoreAllMocks();
});

const ADMIN_MARK = 'admin=true';

describe('목록 조회의 신분은 페이지마다 같다', () => {

	it('관리자면 두 페이지 다 관리자로 나간다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		await getLogs();
		await getNextLogs(1655736946977);

		expect(urls, 'fetch 를 잡지 못했다 — 판정이 공허하다').toHaveLength(2);
		expect(urls[0]).toContain(ADMIN_MARK);
		expect(urls[1]).toContain(ADMIN_MARK);
	});

	it('방문자면 두 페이지 다 방문자로 나간다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(false);

		await getLogs();
		await getNextLogs(1655736946977);

		expect(urls).toHaveLength(2);
		expect(urls[0]).not.toContain(ADMIN_MARK);
		expect(urls[1]).not.toContain(ADMIN_MARK);
	});

	// 신분 말고 다른 것이 흔들리면 안 된다 — 다음 페이지 경계와 개수는 그대로다.
	it('다음 페이지 요청은 경계와 개수를 그대로 싣는다', async () => {

		vi.spyOn(common, 'isAdmin').mockReturnValue(true);

		await getNextLogs(1655736946977, 25);

		expect(urls[0]).toContain('lastTimestamp=1655736946977');
		expect(urls[0]).toContain('limit=25');
	});
});
