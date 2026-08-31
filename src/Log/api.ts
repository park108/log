import { markdownToHtml } from '../common/markdownParser';
import { isAdmin } from "../common/common";
import { isProd } from '../common/env';

export interface LogRevision {
	contents: string;
	timestamp: number;
}

export interface LogItemPayload {
	author?: string;
	timestamp: number;
	summary?: string;
	temporary?: boolean;
	// 서버가 함께 내려주는 정렬 키. 앱은 쓰지 않지만 응답 형상의 일부다.
	sortKey?: number;
	logs: LogRevision[];
}

const BASE = import.meta.env.VITE_LOG_API_BASE;
const getApiUrl = (): string => {
	if (!BASE) throw new Error("VITE_LOG_API_BASE 미정의 — base URL 도출 불가");
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

const DEFAULT_ITEM_PER_PAGE = 10;

// 목록 조회는 **모든 페이지가 같은 신분으로** 나가야 한다.
//
// 첫 페이지만 `&admin=true` 를 실었고 "See more" 는 아무것도 싣지 않았다. 같은
// 사용자가 같은 목록을 훑는 동안 1페이지와 2페이지가 서로 다른 신분으로 요청된
// 것이다. 이 파라미터가 임시 저장 글의 노출을 가르므로, 방향은 하나뿐이다 —
// 관리자가 자기 글을 첫 페이지에서는 보고 그 아래에서는 못 본다.
//
// 방문자에게는 어느 쪽도 `isAdmin()` 이 거짓이라 요청이 한 글자도 달라지지 않는다.
const adminParam = (): string => isAdmin() ? "&admin=true" : "";

export const getLogs = async(limit: number = DEFAULT_ITEM_PER_PAGE): Promise<Response> => {
	return await fetch(getApiUrl() + "?limit=" + limit + adminParam());
}

export const getNextLogs = async(timestamp: number | string, limit: number = DEFAULT_ITEM_PER_PAGE): Promise<Response> => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp + "&limit=" + limit + adminParam());
}

export const getLog = async(timestamp: number | string): Promise<Response> => {
	return await fetch(getApiUrl() + "/timestamp/" + timestamp);
}

// 목록 요약 — 마크다운을 HTML 로 만든 뒤 태그를 걷어낸다.
//
// 태그를 빈 문자열로 지우면 블록 경계가 사라져 단어가 붙는다:
//   <h1>제목</h1><p>본문</p>  ->  "제목본문"
// 실제로 목록에 "AI 시대의 소프트웨어 엔지니어2025년까지만 해도" 처럼
// 제목과 본문이 이어붙어 나왔다. 블록 태그는 공백으로 치환해 경계를
// 보존하고, 인라인 태그(<strong> 등)는 단어 중간에 있을 수 있으므로
// 그대로 지운다. 마지막에 연속 공백을 하나로 접는다.
const BLOCK_TAGS = 'h[1-6]|p|div|li|ul|ol|blockquote|pre|br|hr|tr|td|th';

// LogSingle 의 meta description 도 같은 변환을 쓴다 — 그쪽은 태그를 공백 없이
// 지우고 있어 "하나둘셋" 처럼 붙어 나갔다. 규칙을 두 벌 두면 한쪽만 고쳐지므로
// 여기서 내보내 단일 출처로 삼는다.
// 요약은 HTML 이 아니라 평문이다. `markdownToHtml` 이 본문을 escape 하므로
// 태그를 걷어낸 뒤에는 `&lt;` 같은 엔티티가 남는데, 그대로 저장하면 목록과
// 검색 미리보기에 `List&lt;String&gt;` 이 글자 그대로 보인다.
//
// `&amp;` 를 **마지막에** 되돌린다 — 먼저 풀면 `&amp;lt;` 가 `<` 가 되어
// 사용자가 실제로 쓴 문자열을 왜곡한다.
const decodeEntities = (s: string): string => s
	.replace(/&lt;/g, '<')
	.replace(/&gt;/g, '>')
	.replace(/&quot;/g, '"')
	.replace(/&#39;/g, "'")
	.replace(/&amp;/g, '&');

// 태그를 걷는 단계만 떼어 내보낸다. 규칙은 여전히 `BLOCK_TAGS` 한 곳에 있고
// 동작도 그대로다 — 게이트가 **"이 태그가 낱말 경계를 공급하는가"** 를 마크다운을
// 거치지 않고 직접 물을 수 있게 하려는 것이다.
//
// 마크다운으로는 물을 수 없는 태그가 있다. 파서가 내지 못하는 태그(`div` · 새로
// 허용된 태그)는 입력을 만들 방법이 없고, 그런 태그가 경계 목록에서 빠지는 것이
// 정확히 이 축의 회귀다. 목록끼리 비교하는 게이트는 정합이 맞는 동안 늘 초록이라
// `h[1-6]` 이 빠져도 못 봤다 (요약 3스위트 45개가 전부 통과했다).
export const stripTagsForSummary = (html: string): string => {
	return decodeEntities(
		html
			.replace(new RegExp(`</?(?:${BLOCK_TAGS})(?:\\s[^>]*)?>`, 'gi'), ' ')
			.replace(/(<([^>]+)>)/gi, '')
	)
		.replace(/\s+/g, ' ')
		.trim();
}

export const trimmedContents = (contents: string): string => {
	return stripTagsForSummary(markdownToHtml(contents));
}

export const postLog = async(now: number, contents: string, isTemporary: boolean): Promise<Response> => {

	return await fetch(getApiUrl(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"timestamp": now,
			"summary": trimmedContents(contents),
			"temporary": isTemporary,
			"logs": [{
				"contents": contents,
				"timestamp": now
			}]
		})
	});
}

export const putLog = async(newItem: LogItemPayload, isTemporary: boolean): Promise<Response> => {

	// `logs[0]` 이 최신 리비전이다. 빈 배열이면 요약을 만들 근거가 없으므로
	// 조용히 빈 요약으로 저장하지 않고 호출처에 실패를 알린다 — 요약은 목록
	// 화면이 보여주는 유일한 본문 단서라 비면 사용자에게 빈 글로 보인다.
	const latest = newItem.logs[0];
	if (!latest) throw new Error("putLog: logs 가 비어 있어 요약을 도출할 수 없다");

	newItem.summary = trimmedContents(latest.contents);
	newItem.temporary = isTemporary;

	return await fetch(getApiUrl() + "/timestamp/" + newItem.timestamp, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(newItem)
	});
}

export const deleteLog = async(author: string, timestamp: number): Promise<Response> => {
	return await fetch(getApiUrl() + "/timestamp/" + timestamp, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			author: author,
			timestamp: timestamp
		})
	});
}