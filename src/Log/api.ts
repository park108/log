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
export const getLogs = async(limit: number = DEFAULT_ITEM_PER_PAGE): Promise<Response> => {
	const admin = isAdmin() ? "&admin=true" : "";
	return await fetch(getApiUrl() + "?limit=" + limit + admin);
}

export const getNextLogs = async(timestamp: number | string, limit: number = DEFAULT_ITEM_PER_PAGE): Promise<Response> => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp + "&limit=" + limit);
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

const trimmedContents = (contents: string): string => {
	return markdownToHtml(contents)
		.replace(new RegExp(`</?(?:${BLOCK_TAGS})(?:\\s[^>]*)?>`, 'gi'), ' ')
		.replace(/(<([^>]+)>)/gi, '')
		.replace(/\s+/g, ' ')
		.trim();
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