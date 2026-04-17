import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

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
	http.get(API_URL + "/prod", async () => {

		console.log("[MOCK API][PROD] GET COMMENTS");

		// 1 comment
		return HttpResponse.json({
			body:{
				Items:[
					{"sortKey":"1655392348834-0000000000000","logTimestamp":1655302060414,"timestamp":1655392348834,"message":"Posting Test","isHidden":false,"isAdminComment":false,"name":"Posting Test"}
				]
				,"Count":1,
				"ScannedCount":1
			}
		});
	}),

	http.post(API_URL + "/prod", async () => {
		console.log("[MOCK API][PROD] POST COMMENT");
		return HttpResponse.json({ statusCode: 200 });
	})
);

export const prodServerFailed = scenario(
	http.get(API_URL + "/prod", () => {
		console.log("[MOCK API][PROD] GET COMMENTS - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	}),

	http.post(API_URL + "/prod", async () => {
		console.log("[MOCK API][PROD] POST COMMENT - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	})
);

export const prodServerNetworkError = scenario(
	http.get(API_URL + "/prod", () => {
		console.log("[MOCK API][PROD] GET COMMENT - NETWORK ERROR");
		return HttpResponse.error();
	}),
	http.post(API_URL + "/prod", () => {
		console.log("[MOCK API][PROD] POST COMMENT - NETWORK ERROR");
		return HttpResponse.error();
	})
);

export const devServerOk = scenario(
	http.get(API_URL + "/test", async () => {

		console.log("[MOCK API][DEV] GET COMMENTS");

		// 10 comments
		return HttpResponse.json({
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
		});
	}),

	http.post(API_URL + "/test", async () => {
		console.log("[MOCK API][DEV] POST COMMENT");
		return HttpResponse.json({ statusCode: 200 });
	})
);

export const devServerFailed = scenario(
	http.get(API_URL + "/test", () => {
		console.log("[MOCK API][DEV] GET COMMENTS - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	}),

	http.post(API_URL + "/test", async () => {
		console.log("[MOCK API][DEV] POST COMMENT - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	})
);

export const devServerNetworkError = scenario(
	http.get(API_URL + "/test", () => {
		console.log("[MOCK API][DEV] GET IMAGES - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.post(API_URL + "/test", async () => {
		console.log("[MOCK API][DEV] POST COMMENT - NETWORK ERROR");
		return HttpResponse.error();
	})
);
