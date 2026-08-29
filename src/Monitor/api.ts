import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_MONITOR_API_BASE;
export const getAPI = (): string => {
	if (!BASE) throw new Error("VITE_MONITOR_API_BASE 미정의 — base URL 도출 불가");
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

const getApiUrl = (): string => {
	return getAPI();
}

export const getContentItemCount = async(path: string, from: number, to: number): Promise<Response> => {
	return await fetch(getApiUrl() + "/" + path + "?fromTimestamp=" + from + "&toTimestamp=" + to);
}

export const getVisitors = async(from: number, to: number): Promise<Response> => {
	return await fetch(getApiUrl() + "/useragent?fromTimestamp=" + from + "&toTimestamp=" + to);
}

export const getWebVitals = async(name: string): Promise<Response> => {
	return await fetch(getApiUrl() + "?name=" + name);
}

export const getApiCallStats = async(service: string, from: number, to: number): Promise<Response> => {
	return await fetch(getApiUrl() + "/api/log"
		+ "?service=" + service
		+ "&fromTimestamp=" + from
		+ "&toTimestamp=" + to);
}