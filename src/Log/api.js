const getApiUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export const getLogs = async(limit) => {
	limit = undefined === limit ? 1 : limit;
	return await fetch(getApiUrl() + "?limit=" + limit);
}

export const getNextLogs = async(timestamp, limit) => {
	limit = undefined === limit ? 1 : limit;
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp + "&limit=" + limit);
}

export const getLog = async(timestamp) => {
	return await fetch(getApiUrl() + "/timestamp/" + timestamp);
}

export const postLog = async(now, contents) => {
	return await fetch(getApiUrl(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"timestamp": now,
			"logs": [{
				"contents": contents,
				"timestamp": now
			}]
		})
	});
}

export const putLog = async(newItem) => {
	return await fetch(getApiUrl() + "/timestamp/" + newItem.timestamp, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(newItem)
	});
}

export const deleteLog = async(author, timestamp) => {
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