import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_FILE_API_BASE as string;
const getApiUrl = (): string => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getFiles = async (): Promise<Response> => {
	return await fetch(getApiUrl());
}

export const getNextFiles = async (timestamp: number | string): Promise<Response> => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp);
}

export const getPreSignedUrl = async (name: string, type: string): Promise<Response> => {
	return await fetch(getApiUrl() + "/key/" + name + "/type/" + type);
}

export const putFile = async (preSignedUrl: string, type: string, item: Blob | File): Promise<Response> => {
	return await fetch(preSignedUrl, {
		method: "PUT",
		headers: { "Content-Type": type },
		body: item
	});
}

export const deleteFile = async (fileName: string): Promise<Response> => {
	return await fetch(getApiUrl() + "/key/" + fileName, {
		method: "DELETE",
		headers: { "Content-Type": "application/json"},
		body: JSON.stringify({ key: fileName })
	});
}
