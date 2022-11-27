import { rest } from 'msw'
import { setupServer } from 'msw/node'

const API_URL = "https://jjm9z7h606.execute-api.ap-northeast-2.amazonaws.com";

export const prodServerOk = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET IMAGES");

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let lastTimestamp = "";

		if(url.length > 1) {
			queryString = url[1];
			queryString = queryString.replaceAll("\"", "");
			lastTimestamp = queryString.split("=")[1];
		}

		// Fetch first: 4 items
		if("" === queryString) {
			return res(
				ctx.json({
					body:{
						Items:[
							{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
							,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
							,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
							,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
						],
						"Count":4,
						"ScannedCount":4,
						"LastEvaluatedKey":{"key":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","bucket":"park108-image-dev","timestamp":1645425943454}
					}
				})
			);
		}
		// Fetch more: 2 items
		else if("1645425943454" === lastTimestamp) {
			return res(
				ctx.json({
					body:{
						Items:[
							{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
							,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
						],
						"Count":2,
						"ScannedCount":2,
						"LastEvaluatedKey":{"key":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","bucket":"park108-image-dev","timestamp":1645425943454}
					}
				})
			);
		}
	})
);

export const prodServerFailed = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET IMAGES - FAILED");

		return res(
			ctx.json({
				errorType: "500",
				errorMessage: "Test Error Message!"
			})
		);
	})
);

export const prodServerNetworkError = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {

		console.log("[MOCK API][PROD] GET IMAGES - NETWORK ERROR");

		return res.networkError('Failed to connect');
	})
);

export const devServerOk = setupServer(
	rest.get(API_URL + "/test", async (req, res, ctx) => {

		console.log("[MOCK API][DEV] GET IMAGES");

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let lastTimestamp = "";

		if(url.length > 1) {
			queryString = url[1];
			queryString = queryString.replaceAll("\"", "");
			lastTimestamp = queryString.split("=")[1];
		}

		// Fetch first: 4 items
		if("" === queryString) {
			return res(
				ctx.json({
					body:{
						Items:[
							{"size":6203,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","key":"thumbnail/20220606-2b06c374-1b08-4e40-887c-4209f3912272.png","timestamp":1654522284871}
							,{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","key":"thumbnail/20220221-69732ca3-b1c6-4285-a840-0f36ac5b1da4.png","timestamp":1645425964565}
							,{"size":6005,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","key":"thumbnail/20220221-38a6c2fd-9f42-44e8-854a-327704aa40be.png","timestamp":1645425945152}
							,{"size":7070,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","key":"thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","timestamp":1645425943454}
						],
						"Count":4,
						"ScannedCount":4,
						"LastEvaluatedKey":{"key":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","bucket":"park108-image-dev","timestamp":1645425943454}
					}
				})
			);
		}
		// Fetch more: 2 items
		else if("1645425943454" === lastTimestamp) {
			return res(
				ctx.json({
					body:{
						Items:[
							{"size":3567,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","key":"thumbnail/20220221-5d50f8e3-ee14-4627-bd34-b0405bd52d14.png","timestamp":1645425942996}
							,{"size":2488,"bucket":"park108-image-dev","url":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","key":"thumbnail/20211212-676e3432-1e1b-4f10-8f29-afba42da9ce9.jpg","timestamp":1639269525326}
						],
						"Count":2,
						"ScannedCount":2,
						"LastEvaluatedKey":{"key":"https://park108-image-dev.s3.ap-northeast-2.amazonaws.com/thumbnail/20220221-adef6fdb-00fb-49af-bdb6-72b42054a19d.png","bucket":"park108-image-dev","timestamp":1645425943454}
					}
				})
			);
		}
	})
);

export const devServerFailed = setupServer(
	rest.get(API_URL + "/test", (req, res, ctx) => {

		console.log("[MOCK API][DEV] GET IMAGES - FAILED");

		return res(
			ctx.json({
				errorType: "500",
				errorMessage: "Test Error Message!"
			})
		);
	})
);

export const devServerNetworkError = setupServer(
	rest.get(API_URL + "/test", (req, res, ctx) => {

		console.log("[MOCK API][DEV] GET IMAGES - NETWORK ERROR");

		return res.networkError('Failed to connect');
	})
);