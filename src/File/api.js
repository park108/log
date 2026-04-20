import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_FILE_API_BASE;
const getApiUrl = () => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getFiles = async() => {
	return await fetch(getApiUrl());
}

export const getNextFiles = async(timestamp) => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp);
}

export const getPreSignedUrl = async(name, type) => {
	return await fetch(getApiUrl() + "/key/" + name + "/type/" + type);
}

export const putFile = async(preSignedUrl, type, item) => {
	return await fetch(preSignedUrl, {
		method: "PUT",
		headers: { "Content-Type": type },
		body: item
	});
}

export const deleteFile = async(fileName) => {
	return await fetch(getApiUrl() + "/key/" + fileName, {
		method: "DELETE",
		headers: { "Content-Type": "application/json"},
		body: JSON.stringify({ key: fileName })
	});
}