const getApiUrl= () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://kw7u2k9pv4.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://kw7u2k9pv4.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export const getSearchList = async(searchString) => {
	const query = getApiUrl() + "?q=" + encodeURI(searchString);
	console.log(query);
	return await fetch(query);
}

// export const getNextSearchList = async(searchString, timestamp) => {
// 	return await fetch(getApiUrl() + "?search=" + searchString + "?lastTimestamp=" + timestamp);
// }