import { rest } from 'msw'
import { setupServer } from 'msw/node'

const API_URL = "https://4568z7p97l.execute-api.ap-northeast-2.amazonaws.com";

export const prodServerOk = setupServer(
	rest.get(API_URL + "/prod/api/log", async (req, res, ctx) => {

		console.info("[MOCK API][PROD] GET API CALL STATS");

		const fromTimestamp = 1643375805000; // 2022.01.28

		return res(
			ctx.json({
				statusCode: 200,
				body:{
					totalCount: 700,
					ProcessingTime: 1000,
					Items:[
						{ timestamp: fromTimestamp, succeed: 50, failed: 50, total: 100 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24), succeed: 61, failed: 39, total: 100 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 2, succeed: 71, failed: 29, total: 100 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 3, succeed: 81, failed: 19, total: 100 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 4, succeed: 91, failed: 9, total: 100 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 5, succeed: 96, failed: 4, total: 100 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 6, succeed: 100, failed: 200, total: 100 },
					]
				}
			})
		);
	})
);

export const prodServerHasNoTotalCount = setupServer(
	rest.get(API_URL + "/prod/api/log", async (req, res, ctx) => {

		console.info("[MOCK API][PROD] GET API CALL STATS - No Data");

		const fromTimestamp = 1643375805000; // 2022.01.28

		return res(
			ctx.json({
				statusCode: 200,
				body:{
					ProcessingTime: 1000,
					Items:[
						{ timestamp: fromTimestamp, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24), succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 2, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 3, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 4, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 5, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 6, succeed: 0, failed: 0, total: 0 },
					]
				}
			})
		);
	})
);

export const prodServerHasNoCount = setupServer(
	rest.get(API_URL + "/prod/api/log", async (req, res, ctx) => {

		console.info("[MOCK API][PROD] GET API CALL STATS - No Data");

		const fromTimestamp = 1643375805000; // 2022.01.28

		return res(
			ctx.json({
				statusCode: 200,
				body:{
					totalCount: 0,
					ProcessingTime: 1000,
					Items:[
						{ timestamp: fromTimestamp, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24), succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 2, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 3, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 4, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 5, succeed: 0, failed: 0, total: 0 },
						{ timestamp: fromTimestamp + (1000 * 60 * 60 * 24) * 6, succeed: 0, failed: 0, total: 0 },
					]
				}
			})
		);
	})
);

export const prodServerFailed = setupServer(
	rest.get(API_URL + "/prod/api/log", (req, res, ctx) => {
		console.info("[MOCK API][PROD] GET API CALL STATS - FAILED");
		return res(
			ctx.json({
				errorType: "500",
				errorMessage: "Test Error Message!"
			})
		);
	})
);

export const prodServerNetworkError = setupServer(
	rest.get(API_URL + "/prod/api/log", (req, res, ctx) => {
		console.info("[MOCK API][PROD] GET API CALL STATS - NETWORK ERROR");
		return res.networkError('Failed to connect');
	})
);