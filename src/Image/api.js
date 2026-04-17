const BASE = import.meta.env.VITE_IMAGE_API_BASE;
const getApiUrl = () => {
	if (process.env.NODE_ENV === 'production') return BASE + "/prod";
	if (process.env.NODE_ENV === 'development') return BASE + "/test";
}

export const getImages = async() => {
	return await fetch(getApiUrl());
}

export const getNextImages = async(timestamp) => {
	return await fetch(getApiUrl() + "?lastTimestamp=" + timestamp);
}