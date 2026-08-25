import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_SEARCH_API_BASE;
const getApiUrl = (): string => {
	if (!BASE) throw new Error("VITE_SEARCH_API_BASE 미정의 — base URL 도출 불가");
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getSearchList = async (
	searchString: string,
	{ signal }: { signal?: AbortSignal } = {}
): Promise<Response> => {
	return await fetch(getApiUrl() + "?q=" + encodeURI(searchString), { signal });
}
