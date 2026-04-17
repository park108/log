import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import * as common from '../common/common'

const API_URL = import.meta.env.VITE_MONITOR_API_BASE;

export const prodServerOk = setupServer(
	http.get(API_URL + "/prod", async () => {

		console.log("[MOCK API][PROD] GET WEB VITAL STATS");

		return HttpResponse.json({
			body:{
				Count: 3,
				Items: [
					{
						evaluation: "GOOD",
						id: "v2-1656034616036-7298271418539",
						name: "CLS",
						timestamp: 1656034616036,
						value: 0.009544711182232976
					},
					{
						evaluation: "POOR",
						id: "v2-1656034635378-2481399101706",
						name: "CLS",
						timestamp: 16560346353781,
						value: 0.340741517698529
					},
					{
						evaluation: "NEEDS IMPROVEMENT",
						id: "v2-1656035041776-4470523187290",
						name: "CLS",
						timestamp: 1656035041776,
						value: 0.126102708124442
					},
					{
						evaluation: "BAD DATA",
						id: "v2-1656035041776-4470523187290",
						name: "CLS",
						timestamp: 1656035041776,
						value: 0.126102708124442
					}
				],
				ScannedCount: 12725
			}
		});
	}),

	http.get(API_URL + "/prod/api/log", async () => {

		console.log("[MOCK API][PROD] GET API CALL STATS");

		const fromTimestamp = 1643375805000; // 2022.01.28

		return HttpResponse.json({
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
		});
	}),

	http.get(API_URL + "/prod/useragent", async () => {

		console.log("[MOCK API][PROD] GET VISITOR STATS");

		const testTime = 1643673600000; // 2022.02.01
		let prevDay = 144000000;

		return HttpResponse.json({
			statusCode: 200,
			body:{
				totalCount: 2533,
				periodData: {
					Count: 7,
					Items: [
						{
							browser: "Firefox",
							date: common.getFormattedDate(testTime - prevDay),
							operatingSystem: "Windows",
							originalText: "Test Text",
							renderingEngine: "Gecko",
							time: common.getFormattedTime(testTime - prevDay),
							timestamp: (testTime - prevDay),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime),
							timestamp: testTime,
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 2),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 2),
							timestamp: (testTime - prevDay * 2),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 3),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 3),
							timestamp: (testTime - prevDay * 3),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 4),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 4),
							timestamp: (testTime - prevDay * 4),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 5),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 5),
							timestamp: (testTime - prevDay * 5),
							url: "http://localhost:3000/",
						},
						{
							browser: "Chrome",
							date: common.getFormattedDate(testTime - prevDay * 6),
							operatingSystem: "Mac OS X",
							originalText: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
							renderingEngine: "Webkit",
							time: common.getFormattedTime(testTime - prevDay * 6),
							timestamp: (testTime - prevDay * 6),
							url: "http://localhost:3000/",
						}
					]
				}
			}
		});
	})
);

export const prodServerHasNoTotalCount = setupServer(
	http.get(API_URL + "/prod/api/log", async () => {

		console.log("[MOCK API][PROD] GET API CALL STATS - No Data");

		const fromTimestamp = 1643375805000; // 2022.01.28

		return HttpResponse.json({
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
		});
	})
);

export const prodServerHasNoCount = setupServer(
	http.get(API_URL + "/prod/api/log", async () => {

		console.log("[MOCK API][PROD] GET API CALL STATS - No Data");

		const fromTimestamp = 1643375805000; // 2022.01.28

		return HttpResponse.json({
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
		});
	})
);

export const prodServerFailed = setupServer(
	http.get(API_URL + "/prod", () => {
		console.log("[MOCK API][PROD] GET WEB VITAL STATS - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	}),
	http.get(API_URL + "/prod/api/log", () => {
		console.log("[MOCK API][PROD] GET API CALL STATS - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	}),
	http.get(API_URL + "/prod/useragent", () => {
		console.log("[MOCK API][PROD] GET VISITOR STATS - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	})
);

export const prodServerNetworkError = setupServer(
	http.get(API_URL + "/prod", () => {
		console.log("[MOCK API][PROD] GET WEB VITAL STATS - NETWORK ERROR");
		return HttpResponse.error();
	}),
	http.get(API_URL + "/prod/api/log", () => {
		console.log("[MOCK API][PROD] GET API CALL STATS - NETWORK ERROR");
		return HttpResponse.error();
	}),
	http.get(API_URL + "/prod/useragent", () => {
		console.log("[MOCK API][PROD] GET VISITOR STATS - NETWORK ERROR");
		return HttpResponse.error();
	})
);

export const devServerOk = setupServer(
	http.get(API_URL + "/test/content/log", async () => {

		console.log("[MOCK API][DEV] GET CONTENT/LOG STATS");

		const testTime = 1643375805000; // 2022.01.28
		const day = 144000000;
		const month = day * 30;

		return HttpResponse.json({
			statusCode: 200,
			body:{
				Count: 6,
				ProcessingTime: 1000,
				Items: [
					{timestamp: testTime, size: 3, sortKey: testTime},
					{timestamp: testTime - month * 1, size: 5, sortKey: -testTime},
					{timestamp: testTime - month * 2},
					{timestamp: testTime - month * 3},
					{timestamp: testTime - month * 4},
					{timestamp: testTime - month * 5},
				]
			}
		});
	}),

	http.get(API_URL + "/test/content/file", async () => {

		console.log("[MOCK API][DEV] GET CONTENT/FILE STATS");

		const testTime = 1643375805000; // 2022.01.28
		const day = 144000000;
		const month = day * 30;

		return HttpResponse.json({
			statusCode: 200,
			body:{
				Count: 6,
				ProcessingTime: 1000,
				Items: [
					{timestamp: testTime, size: 3, sortKey: testTime},
					{timestamp: testTime - month * 1, size: 5, sortKey: -testTime},
					{timestamp: testTime - month * 2, size: 20},
					{timestamp: testTime - month * 3, size: 3100},
					{timestamp: testTime - month * 4, size: 5550},
					{timestamp: testTime - month * 5, size: 1927590},
				]
			}
		});
	})
);

export const devServerHasNoCount = setupServer(
	http.get(API_URL + "/test/content/log", async () => {

		console.log("[MOCK API][DEV] GET CONTENT/LOG STATS - No Data");

		return HttpResponse.json({
			statusCode: 200,
			body:{
				Count: 0,
				ProcessingTime: 1000,
				Items: []
			}
		});
	})
);

export const devServerFailed = setupServer(
	http.get(API_URL + "/test/content/log", () => {
		console.log("[MOCK API][DEV] GET CONTENT/LOG STATS - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	})
);

export const devServerNetworkError = setupServer(
	http.get(API_URL + "/test/content/log", () => {
		console.log("[MOCK API][DEV] GET CONTENT/LOG STATS - NETWORK ERROR");
		return HttpResponse.error();
	})
);