import { isDev, isProd } from '../common/env';

const BASE = import.meta.env.VITE_IMAGE_API_BASE;
const getApiUrl = () => {
	if (isProd()) return BASE + "/prod";
	if (isDev()) return BASE + "/test";
}

export const getImages = async() => {
	return await fetch(getApiUrl());
}

export const getNextImages = async(timestamp) => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp);
}