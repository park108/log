import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_SEARCH_API_BASE;
const getApiUrl = (): string => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getSearchList = async (
	searchString: string,
	{ signal }: { signal?: AbortSignal } = {}
): Promise<Response> => {
	return await fetch(getApiUrl() + "?q=" + encodeURI(searchString), { signal });
}
