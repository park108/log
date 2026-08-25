import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_IMAGE_API_BASE;
const getApiUrl = (): string => {
	if (!BASE) throw new Error("VITE_IMAGE_API_BASE 미정의 — base URL 도출 불가");
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

export const getImages = async (): Promise<Response> => {
	return await fetch(getApiUrl());
}

export const getNextImages = async (timestamp: number | string): Promise<Response> => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp);
}
