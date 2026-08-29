// 목록 요약 생성 계약.
//
// 요약은 마크다운을 HTML 로 만든 뒤 태그를 걷어내 만든다. 태그를 빈 문자열로
// 지우면 블록 경계가 사라져 단어가 붙는다:
//   <h1>제목</h1><p>본문</p>  ->  "제목본문"
// 실제로 목록에 "AI 시대의 소프트웨어 엔지니어2025년까지만 해도" 처럼 제목과
// 본문이 이어붙어 나왔다 (2026-08-29 관측).
//
// 요약은 postLog / putLog 가 서버로 보내는 값이므로, 이 계약이 깨지면 저장된
// 데이터 자체가 오염된다 — 렌더 시점 보정으로는 되돌릴 수 없다.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// getApiUrl 은 모듈 로드 시점에 env 를 읽는다. 요약 생성만 판정하므로
// fetch 를 가로채 요청 본문에서 summary 를 꺼낸다.
const ORIGINAL_FETCH = globalThis.fetch;

let captured: Record<string, unknown> | null = null;

beforeEach(() => {
	captured = null;
	vi.stubEnv('MODE', 'test');
	vi.stubEnv('DEV', false);
	vi.stubEnv('PROD', false);
	globalThis.fetch = vi.fn(async (_url: unknown, init?: { body?: string }) => {
		captured = init?.body ? JSON.parse(init.body) : null;
		return new Response('{}');
	}) as unknown as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH;
});

const summaryOf = async (markdown: string): Promise<string> => {
	const { postLog } = await import('./api');
	await postLog(1, markdown, false);
	expect(captured, 'fetch 본문을 잡지 못했다 — 판정이 공허하다').not.toBeNull();
	return String((captured as { summary?: unknown }).summary ?? '');
};

describe("목록 요약 생성 (trimmedContents)", () => {

	it("블록 경계가 공백으로 보존된다 — 제목과 본문이 붙지 않는다", async () => {

		const summary = await summaryOf('# AI 시대의 소프트웨어 엔지니어\n2025년까지만 해도 AI는 보조 도구였다.');

		expect(summary).toContain('엔지니어 2025년');
		expect(summary, '제목과 본문이 이어붙었다').not.toContain('엔지니어2025년');
	});

	it("목록 항목 사이에도 경계가 남는다", async () => {

		const summary = await summaryOf('- 첫째 항목\n- 둘째 항목');

		expect(summary).toContain('첫째 항목 둘째 항목');
	});

	it("인라인 강조는 붙은 채로 둔다 — 단어 중간일 수 있다 (음성 대조)", async () => {

		// 블록 경계만 공백으로 바꾸는 것이 계약이다. 인라인까지 공백으로
		// 바꾸면 "**굵게**이어짐" 이 "굵게 이어짐" 으로 벌어져 원문이 바뀐다.
		const summary = await summaryOf('**굵게**이어짐');

		expect(summary).toContain('굵게이어짐');
	});

	it("연속 공백이 하나로 접힌다", async () => {

		const summary = await summaryOf('# 제목\n\n\n본문');

		expect(summary, `공백이 접히지 않았다: ${JSON.stringify(summary)}`).not.toMatch(/\s{2,}/);
	});

	it("앞뒤 공백이 없다", async () => {

		const summary = await summaryOf('# 제목\n본문');

		expect(summary).toBe(summary.trim());
	});
});
