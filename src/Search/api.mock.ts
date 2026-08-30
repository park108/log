import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500 } from '../__fixtures__/common'
import { searchResults6, searchResults1, searchResultsNoData, searchResultsLateMatch } from './__fixtures__/search'

const API_URL = import.meta.env.VITE_SEARCH_API_BASE;

export const prodServerGetList = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: searchResults6 })),
);

export const prodServerGetSingle = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: searchResults1 })),
);

// 매치가 본문 뒤쪽에 있는 경우 — 미리보기 한 줄에 매치가 들어오는지 재는 데 쓴다.
export const prodServerLateMatch = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: searchResultsLateMatch })),
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
