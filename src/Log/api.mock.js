import { rest } from 'msw'
import { setupServer } from 'msw/node'

const API_URL = "https://7jpt5rjs99.execute-api.ap-northeast-2.amazonaws.com";

export const prodServerHasNoData = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOGS - No Data");
		return res( ctx.json({ body:{
			Items: [],
			Count: 0,
			ScannedCount: 0
		} }) );
	}),

	rest.get(API_URL + "/prod/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOG - No Data");
		return res( ctx.json({ body: { Count: 0 } }) );
	}),
);

export const prodServerOk = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let params = [];

		if(url.length > 1) {
			queryString = url[1];
			queryString = queryString.replaceAll("\"", "");
			params = queryString.split("&");
		}

		// Fetch first: 7 items
		if(params[0].startsWith("limit=")) {

			console.log("[MOCK API][PROD] GET LOGS");

			return res(
				ctx.json({
					body:{
						Items:[
							{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
							,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
							,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
							,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
							,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
							,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
							,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200,"temporary": true}
						],
						"Count":7,
						"ScannedCount":7,
						"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654520402200}
					}
				})
			);
		}
		// Fetch more: 3 items
		else if(params[0].startsWith("lastTimestamp=1654520402200")) {

			console.log("[MOCK API][PROD] GET MORE LOGS");

			return res(
				ctx.json({
					body:{
						Items:[
							{"contents":"New!!!!!!","author":"park108@gmail.com","timestamp":1654520368510}
							,{"contents":"New test ","author":"park108@gmail.com","timestamp":1654520347146}
							,{"contents":"Noew Version 10! Can i success? Change once again! ...","author":"park108@gmail.com","timestamp":1654501373940}
						],
						"Count":3,
						"ScannedCount":3,
						"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654501373940}
					}
				})
			);
		}
		// Fetch more: no data 
		else if(params[0].startsWith("lastTimestamp=1654501373940")) {
			console.log("[MOCK API][PROD] GET MORE LOGS - No Data");
			return res( ctx.json({ body:{} }) );
		}
	}),

	rest.get(API_URL + "/prod/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOG");
		return res(
			ctx.json({
				body: {
					Count: 1,
					Items: [
						{
							author: "park108@gmail.com",
							timestamp: 1656034616036,
							logs: [
								{
									contents: "Test Contents",
									timestamp: 1656034616036,
								}
							]
						},
					]
				}
			})
		);
	}),

	rest.post(API_URL + "/prod", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] POST LOG");
		return res( ctx.json({ statusCode: 200 }) );
	}),

	rest.put(API_URL + "/prod/timestamp/1234567890", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] PUT LOG");
		return res( ctx.json({ statusCode: 200 }) );
	}),

	rest.delete(API_URL + "/prod/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] DELETE LOG");
		return res( ctx.json({ statusCode: 200 }) );
	}),
);

export const prodServerFirstOkNextFailed = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let params = [];

		if(url.length > 1) {
			queryString = url[1];
			queryString = queryString.replaceAll("\"", "");
			params = queryString.split("&");
		}

		// Fetch first: 7 items
		if(params[0].startsWith("limit=")) {

			console.log("[MOCK API][PROD] GET LOGS - FIRST OK NEXT FAILED");

			return res(
				ctx.json({
					body:{
						Items:[
							{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
							,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
							,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
							,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
							,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
							,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
							,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
						],
						"Count":7,
						"ScannedCount":7,
						"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654520402200}
					}
				})
			);
		}
		// Fetch more: 3 items
		else if(params[0].startsWith("lastTimestamp=1654520402200")) {
			console.log("[MOCK API][PROD] GET MORE LOGS - FIRST OK NEXT FAILED");
			return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
		}
	}),
);

export const prodServerFirstOkNextError = setupServer(
	rest.get(API_URL + "/prod", async (req, res, ctx) => {

		const url = JSON.stringify(req.url).split("?");

		let queryString = "";
		let params = [];

		if(url.length > 1) {
			queryString = url[1];
			queryString = queryString.replaceAll("\"", "");
			params = queryString.split("&");
		}

		// Fetch first: 7 items
		if(params[0].startsWith("limit=")) {

			console.log("[MOCK API][PROD] GET LOGS - FIRST OK NEXT ERROR");

			return res(
				ctx.json({
					body:{
						Items:[
							{"contents":"123456","author":"park108@gmail.com","timestamp":1655736946977}
							,{"contents":"이노베이션 사이트의 연이은 인력 이탈, 무리한 사업 수주로 인한 외부 사업 투입, 강요된 거짓말, 실망스런 회사의 관리자들, 고객사에 들통나 버린 거짓말, 가시화되는 운영 조직의  ...","author":"park108@gmail.com","timestamp":1655302060414}
							,{"contents":"const makeSummary = (contents) => {\tconst trimmedContents = markdownToHtml(contents).replace(/(]+)>) ...","author":"park108@gmail.com","timestamp":1654639495093}
							,{"contents":"Test over 50 characters.Is it make summary well???","author":"park108@gmail.com","timestamp":1654639469843}
							,{"contents":"Test Now","author":"park108@gmail.com","timestamp":1654639443910}
							,{"contents":"첫 화면을 목록 형태로 변경했다.이 블로그는 변경 이력을 모두 저장하도록 설계, 구현했다. 개별 건의 CRUD 뿐 만 아니라, 목록 조회를 할 때에도 동일한 테이블에서 쿼리를 했기 ...","author":"park108@gmail.com","timestamp":1654526208951}
							,{"contents":"Ver 4.Real! New!!! and long string over the FIFTY! ...","author":"park108@gmail.com","timestamp":1654520402200}
						],
						"Count":7,
						"ScannedCount":7,
						"LastEvaluatedKey":{"author":"park108@gmail.com","timestamp":1654520402200}
					}
				})
			);
		}
		// Fetch more: 3 items
		else if(params[0].startsWith("lastTimestamp=1654520402200")) {
			console.log("[MOCK API][PROD] GET MORE LOGS - FIRST OK NEXT ERROR");
			return res.networkError('Failed to connect');
		}
	}),
);

export const prodServerFailed = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOGS - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),

	rest.get(API_URL + "/prod/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOG - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),

	rest.post(API_URL + "/prod", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] POST LOG - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),
);

export const prodServerNetworkError = setupServer(
	rest.get(API_URL + "/prod", (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOGS - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),

	rest.get(API_URL + "/prod/timestamp/1656034616036", (req, res, ctx) => {
		console.log("[MOCK API][PROD] GET LOG - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),

	rest.post(API_URL + "/prod", async (req, res, ctx) => {
		console.log("[MOCK API][PROD] POST LOG - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),
);

export const devServerOk = setupServer(
	rest.get(API_URL + "/test/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] GET LOG");
		return res(
			ctx.json({
				body: {
					Count: 1,
					Items: [
						{
							author: "park108@gmail.com",
							timestamp: 1656034616036,
							logs: [
								{
									contents: "Test Contents",
									timestamp: 1656034616036,
								}
							]
						},
					]
				}
			})
		)
	}),

	rest.put(API_URL + "/test/timestamp/1234567890", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] PUT LOG");
		return res( ctx.json({ statusCode: 200 }) );
	}),

	rest.delete(API_URL + "/test/timestamp/1655736946977", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] DELETE LOG");
		return res( ctx.json({ statusCode: 200 }) );
	}),
);

export const devServerGetOkDeleteFailed = setupServer(
	rest.get(API_URL + "/test/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] GET LOG");
		return res(
			ctx.json({
				body: {
					Count: 1,
					Items: [
						{
							author: "park108@gmail.com",
							timestamp: 1656034616036,
							logs: [
								{
									contents: "# Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit. Duis vel urna mollis arcu suscipit ultricies eu eget dolor. Integer in enim sed lectus cursus aliquam. Ut porttitor augue nec auctor scelerisque. Pellentesque tellus tortor, tempus cursus ipsum et, fringilla efficitur risus. Nunc a sollicitudin nibh. Praesent placerat, libero eget fermentum fermentum, arcu ipsum euismod purus, ac vestibulum libero enim et lorem. Curabitur non urna vel massa suscipit molestie nec vitae ligula. Suspendisse quam augue, convallis sed magna ac, cursus convallis purus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Vivamus sit amet feugiat est, id cursus purus. Nullam sollicitudin a enim sed imperdiet.",
									timestamp: 1656034616036,
								}
							]
						},
					]
				}
			})
		)
	}),

	rest.delete(API_URL + "/test/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] DELETE LOG - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),
);

export const devServerFailed = setupServer(
	rest.put(API_URL + "/test/timestamp/1234567890", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] PUT LOG - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),

	rest.delete(API_URL + "/test/timestamp/1655736946977", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] DELETE LOG - FAILED");
		return res( ctx.json({ errorType: "500", errorMessage: "Test Error Message!" }) );
	}),
);

export const devServerGetOkDeleteNetworkError = setupServer(
	rest.get(API_URL + "/test/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] GET LOG");
		return res(
			ctx.json({
				body: {
					Count: 1,
					Items: [
						{
							author: "park108@gmail.com",
							timestamp: 1656034616036,
							logs: [
								{
									contents: "Test Contents",
									timestamp: 1656034616036,
								}
							]
						},
					]
				}
			})
		)
	}),

	rest.delete(API_URL + "/test/timestamp/1656034616036", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] DELETE LOG - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),
);

export const devServerNetworkError = setupServer(
	rest.put(API_URL + "/test/timestamp/1234567890", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] PUT LOG - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),

	rest.delete(API_URL + "/test/timestamp/1655736946977", async (req, res, ctx) => {
		console.log("[MOCK API][DEV] DELETE LOG - NETWORK ERROR");
		return res.networkError('Failed to connect');
	}),
);