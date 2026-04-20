import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_COMMENT_API_BASE;
const getApiUrl = () => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
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