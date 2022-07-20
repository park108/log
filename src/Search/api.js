const getApiUrl= () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://kw7u2k9pv4.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://kw7u2k9pv4.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export const getSearchList = async(searchString) => {
	return await fetch(getApiUrl() + "?q=" + encodeURI(searchString));
}