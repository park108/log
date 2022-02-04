const getApiUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://k7aiaqwk1e.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://k7aiaqwk1e.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export const getComments = async(timestamp, admin) => {
	return await fetch(getApiUrl() + "?logTimestamp=" + timestamp + "&isAdmin=" + admin);
}

export const postComment = async(comment) => {
	return await fetch(getApiUrl(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(comment)
	});
}