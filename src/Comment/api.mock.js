import { rest } from 'msw'
import { setupServer } from 'msw/node'

const API_URL = "https://k7aiaqwk1e.execute-api.ap-northeast-2.amazonaws.com";

export const prodServerOk = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		console.info("[MOCK API][PROD] GET COMMENTS");

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let logTimestamp = "";
		let isAdmin = "";

		if(url.length > 1) {
			queryString = queryString.replaceAll("\"", "");
			queryString = (url[1]).replaceAll("\"", "").split("&");
			logTimestamp = queryString[0].split("=")[1];
			isAdmin = queryString[1].split("=")[1];
		}

		// 1 comment
		return res(
			ctx.json({
				body:{
					Items:[
						{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
					]
					,"Count":1,
					"ScannedCount":1
				}
			})
		);
	}),

	rest.post(API_URL + "/prod", async (req, res, ctx) => {

		console.info("[MOCK API][PROD] POST COMMENT");

		return res(
			ctx.json({
				statusCode: 200
			})
		);
	})
);

export const prodServerFailed = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {

		console.info("[MOCK API][PROD] GET COMMENTS - FAILED");

		return res(
			ctx.json({
				errorType: "500",
				errorMessage: "Test Error Message!"
			})
		);
	}),

	rest.post(API_URL + "/prod", async (req, res, ctx) => {

		console.info("[MOCK API][PROD] POST COMMENT - FAILED");

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

		console.info("[MOCK API][PROD] GET COMMENT - NETWORK ERROR");

		return res.networkError('Failed to connect');
	}),
	rest.post(API_URL + "/prod", (req, res, ctx) => {

		console.info("[MOCK API][PROD] POST COMMENT - NETWORK ERROR");

		return res.networkError('Failed to connect');
	})
);

export const devServerOk = setupServer(
	rest.get(API_URL + "/test", async (req, res, ctx) => {

		console.info("[MOCK API][DEV] GET COMMENTS");

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let logTimestamp = "";
		let isAdmin = "";

		if(url.length > 1) {
			queryString = queryString.replaceAll("\"", "");
			queryString = (url[1]).replaceAll("\"", "").split("&");
			logTimestamp = queryString[0].split("=")[1];
			isAdmin = queryString[1].split("=")[1];
		}

		// 10 comments
		return res(
			ctx.json({
				body:{
					Items:[
						{"sortKey":"1655389504138-0000000000000","logTimestamp":1655302060414,"timestamp":1655389504138,"message":"나는 엉망으로 살고 있구나!","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655389797918-0000000000000","logTimestamp":1655302060414,"timestamp":1655389797918,"message":"내가 썼지만 숨겨져서 못보지롱?","isHidden":true,"isAdminComment":false,"name":"숨겨져있는 나"}
						,{"commentTimestamp":1655389797918,"sortKey":"1655389797918-1655389832698","logTimestamp":1655302060414,"timestamp":1655389832698,"message":"비밀 댓글이 아니지만, 비밀 댓글에 대댓글을 달았다.","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655392096432-0000000000000","logTimestamp":1655302060414,"timestamp":1655392096432,"message":"Posting Lock Test","isHidden":false,"isAdminComment":false,"name":"Posting!"}
						,{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392394275-0000000000000","logTimestamp":1655302060414,"timestamp":1655392394275,"message":"Posting Test 2","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392503660-0000000000000","logTimestamp":1655302060414,"timestamp":1655392503660,"message":"Posting Test4","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655392407974-0000000000000","logTimestamp":1655302060414,"timestamp":1655392407974,"message":"Posting Test3","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
						,{"sortKey":"1655589447546-0000000000000","logTimestamp":1655302060414,"timestamp":1655589447546,"message":"Admin comment","isHidden":false,"isAdminComment":true,"name":"Jongkil Park"}
						,{"sortKey":"1655589469726-0000000000000","logTimestamp":1655302060414,"timestamp":1655589469726,"message":"Admin Hidden","isHidden":true,"isAdminComment":true,"name":"Jongkil Park"}
					]
					,"Count":10,
					"ScannedCount":10
				}
			})
		);
	}),

	rest.post(API_URL + "/test", async (req, res, ctx) => {

		console.info("[MOCK API][DEV] POST COMMENT");

		return res(
			ctx.json({
				statusCode: 200
			})
		);
	})
);

export const devServerFailed = setupServer(
	rest.get(API_URL + "/test", (req, res, ctx) => {

		console.info("[MOCK API][DEV] GET COMMENTS - FAILED");

		return res(
			ctx.json({
				errorType: "500",
				errorMessage: "Test Error Message!"
			})
		);
	}),

	rest.post(API_URL + "/test", async (req, res, ctx) => {

		console.info("[MOCK API][DEV] POST COMMENT - FAILED");

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

		console.info("[MOCK API][DEV] GET IMAGES - NETWORK ERROR");

		return res.networkError('Failed to connect');
	}),

	rest.post(API_URL + "/test", async (req, res, ctx) => {

		console.info("[MOCK API][DEV] POST COMMENT - NETWORK ERROR");

		return res.networkError('Failed to connect');
	})
);