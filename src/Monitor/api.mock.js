import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500 } from '../__fixtures__/common'
import {
	webVitalsProd,
	apiCallStats700,
	apiCallStatsNoTotalCount,
	apiCallStatsNoCount,
	visitorsProd,
	contentLogStats,
	contentFileStats,
} from './__fixtures__/monitor'

const API_URL = import.meta.env.VITE_MONITOR_API_BASE;

export const prodServerOk = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: webVitalsProd })),
	http.get(API_URL + "/prod/api/log", async () => HttpResponse.json({ statusCode: 200, body: apiCallStats700 })),
	http.get(API_URL + "/prod/useragent", async () => HttpResponse.json({ statusCode: 200, body: visitorsProd() })),
);

export const prodServerHasNoTotalCount = setupServer(
	http.get(API_URL + "/prod/api/log", async () => HttpResponse.json({ statusCode: 200, body: apiCallStatsNoTotalCount })),
);

export const prodServerHasNoCount = setupServer(
	http.get(API_URL + "/prod/api/log", async () => HttpResponse.json({ statusCode: 200, body: apiCallStatsNoCount })),
);

export const prodServerFailed = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500)),
	http.get(API_URL + "/prod/api/log", () => HttpResponse.json(ERROR_500)),
	http.get(API_URL + "/prod/useragent", () => HttpResponse.json(ERROR_500)),
);

export const prodServerNetworkError = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.error()),
	http.get(API_URL + "/prod/api/log", () => HttpResponse.error()),
	http.get(API_URL + "/prod/useragent", () => HttpResponse.error()),
);

export const devServerOk = setupServer(
	http.get(API_URL + "/test/content/log", async () => HttpResponse.json({ statusCode: 200, body: contentLogStats })),
	http.get(API_URL + "/test/content/file", async () => HttpResponse.json({ statusCode: 200, body: contentFileStats })),
);

export const devServerHasNoCount = setupServer(
	http.get(API_URL + "/test/content/log", async () => HttpResponse.json({ statusCode: 200, body: { Count: 0, ProcessingTime: 1000, Items: [] } })),
);

export const devServerFailed = setupServer(
	http.get(API_URL + "/test/content/log", () => HttpResponse.json(ERROR_500)),
);

export const devServerNetworkError = setupServer(
	http.get(API_URL + "/test/content/log", () => HttpResponse.error()),
);
