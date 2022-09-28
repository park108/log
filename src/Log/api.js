import { markdownToHtml } from '../common/markdownParser';
import { isAdmin } from "../common/common";

const getApiUrl = () => {
	if (process.env.NODE_ENV === 'production') {
		return "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/prod";
	}
	else if (process.env.NODE_ENV === 'development') {
		return "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com/test";
	}
}

const DEFAULT_ITEM_PER_PAGE = 10;
export const getLogs = async(limit = DEFAULT_ITEM_PER_PAGE) => {
	const admin = isAdmin() ? "&admin=true" : "";
	return await fetch(getApiUrl() + "?limit=" + limit + admin);
}

export const getNextLogs = async(timestamp, limit = DEFAULT_ITEM_PER_PAGE) => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp + "&limit=" + limit);
}

export const getLog = async(timestamp) => {
	return await fetch(getApiUrl() + "/timestamp/" + timestamp);
}

const trimSize = 100;

const trimmedContents = (contents) => {
	return  markdownToHtml(contents).replace(/(<([^>]+)>)/gi, '');
}

export const postLog = async(now, contents, isTemporary) => {

	return await fetch(getApiUrl(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"timestamp": now,
			"summary": trimmedContents(contents),
			"temporary": isTemporary,
			"logs": [{
				"contents": contents,
				"timestamp": now
			}]
		})
	});
}

export const putLog = async(newItem, isTemporary) => {

	newItem.summary = trimmedContents(newItem.logs[0].contents);
	newItem.temporary = isTemporary;

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