import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_SEARCH_API_BASE;
const getApiUrl = () => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getSearchList = async (searchString, { signal } = {}) => {
	return await fetch(getApiUrl() + "?q=" + encodeURI(searchString), { signal });
}