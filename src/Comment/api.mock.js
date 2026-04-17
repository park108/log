import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500, OK_200 } from '../__fixtures__/common'
import { commentsProdOne, commentsDevTen } from './__fixtures__/comments'

const API_URL = import.meta.env.VITE_COMMENT_API_BASE;

const server = setupServer();
let active = false;

const scenario = (...handlers) => ({
	listen: () => {
		if (!active) {
			server.listen({ onUnhandledRequest: 'bypass' });
			active = true;
		}
		server.resetHandlers(...handlers);
	},
	resetHandlers: () => server.resetHandlers(),
	close: () => {
		if (active) {
			server.close();
			active = false;
		}
	},
});

export const prodServerOk = scenario(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: commentsProdOne })),
	http.post(API_URL + "/prod", async () => HttpResponse.json(OK_200)),
);

export const prodServerFailed = scenario(
	http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500)),
	http.post(API_URL + "/prod", async () => HttpResponse.json(ERROR_500)),
);

export const prodServerNetworkError = scenario(
	http.get(API_URL + "/prod", () => HttpResponse.error()),
	http.post(API_URL + "/prod", () => HttpResponse.error()),
);

export const devServerOk = scenario(
	http.get(API_URL + "/test", async () => HttpResponse.json({ body: commentsDevTen })),
	http.post(API_URL + "/test", async () => HttpResponse.json(OK_200)),
);

export const devServerFailed = scenario(
	http.get(API_URL + "/test", () => HttpResponse.json(ERROR_500)),
	http.post(API_URL + "/test", async () => HttpResponse.json(ERROR_500)),
);

export const devServerNetworkError = scenario(
	http.get(API_URL + "/test", () => HttpResponse.error()),
	http.post(API_URL + "/test", async () => HttpResponse.error()),
);
