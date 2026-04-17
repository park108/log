const BASE = import.meta.env.VITE_SEARCH_API_BASE;
const getApiUrl = () => {
	if (process.env.NODE_ENV === 'production') return BASE + "/prod";
	return BASE + "/test";
}

export const getSearchList = async(searchString) => {
	return await fetch(getApiUrl() + "?q=" + encodeURI(searchString));
}