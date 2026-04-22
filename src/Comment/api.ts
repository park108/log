import { isProd } from '../common/env';

interface CommentPayload {
	logTimestamp: number;
	isAdminComment: boolean;
	message: string;
	name: string;
	commentTimestamp?: number;
	isHidden: boolean;
}

const BASE = import.meta.env.VITE_COMMENT_API_BASE as string;
const getApiUrl = (): string => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getComments = async (timestamp: number, admin: boolean): Promise<Response> => {
	return await fetch(getApiUrl() + "?logTimestamp=" + timestamp + "&isAdmin=" + admin);
}

export const postComment = async (comment: CommentPayload): Promise<Response> => {
	return await fetch(getApiUrl(), {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(comment)
	});
}
