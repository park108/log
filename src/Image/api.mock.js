import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500 } from '../__fixtures__/common'
import { imagesListFirst4, imagesListNext2 } from './__fixtures__/images'

const API_URL = import.meta.env.VITE_IMAGE_API_BASE;

const imageListHandler = (path) => http.get(path, async ({ request }) => {
	const qs = request.url.split("?")[1] || "";
	const ts = qs.split("=")[1];
	if (qs === "") return HttpResponse.json({ body: imagesListFirst4 });
	if (ts === "1645425943454") return HttpResponse.json({ body: imagesListNext2 });
});

export const prodServerOk = setupServer(imageListHandler(API_URL + "/prod"));
export const prodServerFailed = setupServer(http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500)));
export const prodServerNetworkError = setupServer(http.get(API_URL + "/prod", () => HttpResponse.error()));

export const devServerOk = setupServer(imageListHandler(API_URL + "/test"));
export const devServerFailed = setupServer(http.get(API_URL + "/test", () => HttpResponse.json(ERROR_500)));
export const devServerNetworkError = setupServer(http.get(API_URL + "/test", () => HttpResponse.error()));
