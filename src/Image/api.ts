import { isDev, isProd } from '../common/env';

const BASE = import.meta.env.VITE_IMAGE_API_BASE as string;
const getApiUrl = (): string | undefined => {
	if (isProd()) return BASE + "/prod";
	if (isDev()) return BASE + "/test";
	return undefined;
}

export const getImages = async (): Promise<Response> => {
	return await fetch(getApiUrl() as string);
}

export const getNextImages = async (timestamp: number | string): Promise<Response> => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp);
}
