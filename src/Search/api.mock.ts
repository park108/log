import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500 } from '../__fixtures__/common'
import { searchResults6, searchResults1, searchResultsNoData } from './__fixtures__/search'

const API_URL = import.meta.env.VITE_SEARCH_API_BASE;

export const prodServerGetList = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: searchResults6 })),
);

export const prodServerGetSingle = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: searchResults1 })),
);

export const prodServerNoData = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: searchResultsNoData })),
);

export const prodServerFailed = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500)),
);

export const prodServerNetworkError = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.error()),
);
