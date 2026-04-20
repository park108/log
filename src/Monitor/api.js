import { isProd } from '../common/env';

const BASE = import.meta.env.VITE_MONITOR_API_BASE;
export const getAPI = () => {
	if (isProd()) return BASE + "/prod";
	return BASE + "/test";
}

const getApiUrl = () => {
	return getAPI();
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
	return await fetch(getApiUrl() + "/api/log"
		+ "?service=" + service
		+ "&fromTimestamp=" + from
		+ "&toTimestamp=" + to);
}