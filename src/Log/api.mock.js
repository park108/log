import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500, OK_200 } from '../__fixtures__/common'
import { logListFirst7, logListFirst7WithTemporary, logListNext3, logSingle, logSingleLorem } from './__fixtures__/logs'

const API_URL = import.meta.env.VITE_LOG_API_BASE;

const firstParam = (request) => {
	const qs = request.url.split("?")[1];
	return qs ? qs.split("&")[0] : "";
}

export const prodServerHasNoData = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: { Items: [], Count: 0, ScannedCount: 0 } })),
	http.get(API_URL + "/prod/timestamp/1656034616036", async () => HttpResponse.json({ body: { Count: 0 } })),
);

export const prodServerOk = setupServer(
	http.get(API_URL + "/prod", async ({ request }) => {
		const p = firstParam(request);
		if (p.startsWith("limit=")) return HttpResponse.json({ body: logListFirst7WithTemporary });
		if (p.startsWith("lastTimestamp=1654520402200")) return HttpResponse.json({ body: logListNext3 });
		if (p.startsWith("lastTimestamp=1654501373940")) return HttpResponse.json({ body: {} });
	}),
	http.get(API_URL + "/prod/timestamp/1656034616036", async () => HttpResponse.json({ body: logSingle })),
	http.post(API_URL + "/prod", async () => HttpResponse.json(OK_200)),
	http.put(API_URL + "/prod/timestamp/1234567890", async () => HttpResponse.json(OK_200)),
	http.delete(API_URL + "/prod/timestamp/1656034616036", async () => HttpResponse.json(OK_200)),
);

export const prodServerFirstOkNextFailed = setupServer(
	http.get(API_URL + "/prod", async ({ request }) => {
		const p = firstParam(request);
		if (p.startsWith("limit=")) return HttpResponse.json({ body: logListFirst7 });
		if (p.startsWith("lastTimestamp=1654520402200")) return HttpResponse.json(ERROR_500);
	}),
);

export const prodServerFirstOkNextError = setupServer(
	http.get(API_URL + "/prod", async ({ request }) => {
		const p = firstParam(request);
		if (p.startsWith("limit=")) return HttpResponse.json({ body: logListFirst7 });
		if (p.startsWith("lastTimestamp=1654520402200")) return HttpResponse.error();
	}),
);

export const prodServerFailed = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500)),
	http.get(API_URL + "/prod/timestamp/1656034616036", async () => HttpResponse.json(ERROR_500)),
	http.post(API_URL + "/prod", async () => HttpResponse.json(ERROR_500)),
);

export const prodServerNetworkError = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.error()),
	http.get(API_URL + "/prod/timestamp/1656034616036", () => HttpResponse.error()),
	http.post(API_URL + "/prod", async () => HttpResponse.error()),
);

export const devServerOk = setupServer(
	http.get(API_URL + "/test/timestamp/1656034616036", async () => HttpResponse.json({ body: logSingle })),
	http.put(API_URL + "/test/timestamp/1234567890", async () => HttpResponse.json(OK_200)),
	http.delete(API_URL + "/test/timestamp/1655736946977", async () => HttpResponse.json(OK_200)),
);

export const devServerGetOkDeleteFailed = setupServer(
	http.get(API_URL + "/test/timestamp/1656034616036", async () => HttpResponse.json({ body: logSingleLorem })),
	http.delete(API_URL + "/test/timestamp/1656034616036", async () => HttpResponse.json(ERROR_500)),
);

export const devServerFailed = setupServer(
	http.put(API_URL + "/test/timestamp/1234567890", async () => HttpResponse.json(ERROR_500)),
	http.delete(API_URL + "/test/timestamp/1655736946977", async () => HttpResponse.json(ERROR_500)),
);

export const devServerGetOkDeleteNetworkError = setupServer(
	http.get(API_URL + "/test/timestamp/1656034616036", async () => HttpResponse.json({ body: logSingle })),
	http.delete(API_URL + "/test/timestamp/1656034616036", async () => HttpResponse.error()),
);

export const devServerNetworkError = setupServer(
	http.put(API_URL + "/test/timestamp/1234567890", async () => HttpResponse.error()),
	http.delete(API_URL + "/test/timestamp/1655736946977", async () => HttpResponse.error()),
);
