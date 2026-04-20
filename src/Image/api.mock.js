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

export const prodFailedHandler = http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500));
export const prodNetworkErrorHandler = http.get(API_URL + "/prod", () => HttpResponse.error());
export const devFailedHandler = http.get(API_URL + "/test", () => HttpResponse.json(ERROR_500));
export const devNetworkErrorHandler = http.get(API_URL + "/test", () => HttpResponse.error());

export const prodServerOk = setupServer(imageListHandler(API_URL + "/prod"));
export const prodServerFailed = setupServer(prodFailedHandler);
export const prodServerNetworkError = setupServer(prodNetworkErrorHandler);

export const devServerOk = setupServer(imageListHandler(API_URL + "/test"));
export const devServerFailed = setupServer(devFailedHandler);
export const devServerNetworkError = setupServer(devNetworkErrorHandler);
