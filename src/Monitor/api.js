export const getAPI = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

const getApiUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

export const getContentItemCount = async(path, from, to) => {
	return await fetch(getApiUrl() + "/" + path + "?fromTimestamp=" + from + "&toTimestamp=" + to);
}

export const getVisitors = async(from, to) => {
	return await fetch(getApiUrl() + "/useragent?fromTimestamp=" + from + "&toTimestamp=" + to);
}

export const getWebVitals = async(name) => {
	return await fetch(getApiUrl() + "?name=" + name);
}

export const getApiCallStats = async(service, from, to) => {
	return await fetch(getApiUrl() + "/api/" + service + "?fromTimestamp=" + from + "&toTimestamp=" + to);
}