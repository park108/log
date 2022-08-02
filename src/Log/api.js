import { markdownToHtml } from '../common/markdownParser';

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

const trimSize = 100;

const trimmedContents = (contents) => {
	return  markdownToHtml(contents).replace(/(<([^>]+)>)/gi, '');
}

// const makeSummary = (contents) => {
// 	const trimmed = trimmedContents(contents);
// 	const contentsLength = trimmed.length;
// 	return contentsLength > trimSize ? trimmed.substr(0, trimSize) + " ..." : trimmed;
// }

export const postLog = async(now, contents) => {

	return await fetch(getApiUrl(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"timestamp": now,
			"summary": trimmedContents(contents),
			"logs": [{
				"contents": contents,
				"timestamp": now
			}]
		})
	});
}

export const putLog = async(newItem) => {

	newItem.summary = trimmedContents(newItem.logs[0].contents);

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