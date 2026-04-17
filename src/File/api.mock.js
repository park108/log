import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const API_URL = "https://urruauaj81.execute-api.ap-northeast-2.amazonaws.com";
const PRESIGNED_URL = "https://aws.test.upload.url.com";

export const prodServerHasNoData = setupServer(
	http.get(API_URL + "/prod", async () => {
		console.log("[MOCK API][PROD] GET FILES - No Data");
		return HttpResponse.json({ body:{} });
	}),
);

export const prodServerOk = setupServer(
	http.get(API_URL + "/prod", async ({ request }) => {

		const url = request.url.split("?");

		let queryString = "";
		let lastTimestamp = "";

		if(url.length > 1) {
			queryString = url[1];
			lastTimestamp = queryString.split("=")[1];
		}

		// Fetch first: 7 items
		if("" === queryString) {

			console.log("[MOCK API][PROD] GET FILES");

			return HttpResponse.json({
				body:{
					Items:[
						{"size":49955,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220606_log_CQRS.png","key":"20220606_log_CQRS.png","timestamp":1654522279342}
						,{"size":34022,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_ecr_repo.png","key":"20220221_ecr_repo.png","timestamp":1645425962599}
						,{"size":96824,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_actions.png","key":"20220221_actions.png","timestamp":1645425938601}
						,{"size":109294,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_IAM.png","key":"20220221_IAM.png","timestamp":1645425938587}
						,{"size":7498,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/ansi-html-community-0.0.8.tgz","key":"ansi-html-community-0.0.8.tgz","timestamp":1644038129605}
						,{"size":198298,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/2021_hometax.pdf","key":"2021_hometax.pdf","timestamp":1643637384681}
						,{"size":940719,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/house_price.pdf","key":"house_price.pdf","timestamp":1643637384614}
					],
					"Count":7,
					"ScannedCount":7,
					"LastEvaluatedKey":{"key":"house_price.pdf","bucket":"park108-log-dev","timestamp":1643637384614}
				}
			});
		}
		// Fetch more: 3 items
		else if("1643637384614" === lastTimestamp) {

			console.log("[MOCK API][PROD] GET MORE FILES");

			return HttpResponse.json({
				body:{
					Items:[
						{"size":8836521,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/308142rg.jpg","key":"308142rg.jpg","timestamp":1639269515238}
						,{"size":2942795,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/501985ld.jpg","key":"501985ld.jpg","timestamp":1639268308087}
						,{"size":7682046,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/227100fg.jpg","key":"227100fg.jpg","timestamp":1638746700070}
					],
					"Count":3,
					"ScannedCount":3,
					"LastEvaluatedKey":{"key":"227100fg.jpg","bucket":"park108-log-dev","timestamp":1638746700070}
				}
			});
		}
		// Fetch more: no data
		else if("1638746700070" === lastTimestamp) {

			console.log("[MOCK API][PROD] GET MORE FILES - No Data");

			return HttpResponse.json({ body:{} });
		}
	}),

	http.get(API_URL + "/prod/key/testname/type/testtype", async () => {

		console.log("[MOCK API][PROD] GET PRESIGNED URL");

		return HttpResponse.json({
			body:{
				UploadUrl: PRESIGNED_URL
			}
		});
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][PROD] PUT FILE");
		return HttpResponse.json({ statusCode: 200 });
	}),

	http.delete(API_URL + "/prod/key/20220606_log_CQRS.png", async () => {

		console.log("[MOCK API][PROD] DELETE FILE");

		return HttpResponse.json({
			statusCode: 200
		});
	})
);

export const prodServerFailed = setupServer(
	http.get(API_URL + "/prod", () => {

		console.log("[MOCK API][PROD] GET FILES - FAILED");

		return HttpResponse.json({
			errorType: "500",
			errorMessage: "Test Error Message!"
		});
	}),

	http.get(API_URL + "/prod/key/testname/type/testtype", async () => {

		console.log("[MOCK API][PROD] GET PRESIGNED URL - FAILED");

	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][PROD] PUT FILE - FAILED");
		return new HttpResponse(null, { status: 500 });
	}),

	http.delete(API_URL + "/prod/key/20220606_log_CQRS.png", async () => {

		console.log("[MOCK API][PROD] DELETE FILE - FAILED");

		return HttpResponse.json({
			errorType: "500",
			errorMessage: "Test Error Message!"
		});
	})
);

export const prodServerNetworkError = setupServer(
	http.get(API_URL + "/prod", () => {
		console.log("[MOCK API][PROD] GET FILES - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][PROD] PUT FILE - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.delete(API_URL + "/prod/key/20220606_log_CQRS.png", async () => {
		console.log("[MOCK API][PROD] DELETE FILE - NETWORK ERROR");
		return HttpResponse.error();
	})
);

export const devServerOk = setupServer(
	http.get(API_URL + "/test", async ({ request }) => {

		console.log("[MOCK API][DEV] GET FILES");

		const url = request.url.split("?");

		let queryString = "";
		let lastTimestamp = "";

		if(url.length > 1) {
			queryString = url[1];
			lastTimestamp = queryString.split("=")[1];
		}

		// Fetch first: 7 items
		if("" === queryString) {
			return HttpResponse.json({
				body:{
					Items:[
						{"size":49955,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220606_log_CQRS.png","key":"20220606_log_CQRS.png","timestamp":1654522279342}
						,{"size":34022,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_ecr_repo.png","key":"20220221_ecr_repo.png","timestamp":1645425962599}
						,{"size":96824,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_actions.png","key":"20220221_actions.png","timestamp":1645425938601}
						,{"size":109294,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/20220221_IAM.png","key":"20220221_IAM.png","timestamp":1645425938587}
						,{"size":7498,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/ansi-html-community-0.0.8.tgz","key":"ansi-html-community-0.0.8.tgz","timestamp":1644038129605}
						,{"size":198298,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/2021_hometax.pdf","key":"2021_hometax.pdf","timestamp":1643637384681}
						,{"size":940719,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/house_price.pdf","key":"house_price.pdf","timestamp":1643637384614}
					],
					"Count":7,
					"ScannedCount":7,
					"LastEvaluatedKey":{"key":"house_price.pdf","bucket":"park108-log-dev","timestamp":1643637384614}
				}
			});
		}
		// Fetch more: 3 items
		else if("1643637384614" === lastTimestamp) {
			return HttpResponse.json({
				body:{
					Items:[
						{"size":8836521,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/308142rg.jpg","key":"308142rg.jpg","timestamp":1639269515238}
						,{"size":2942795,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/501985ld.jpg","key":"501985ld.jpg","timestamp":1639268308087}
						,{"size":7682046,"bucket":"park108-log-dev","url":"https://park108-log-dev.s3.ap-northeast-2.amazonaws.com/227100fg.jpg","key":"227100fg.jpg","timestamp":1638746700070}
					],
					"Count":3,
					"ScannedCount":3,
				}
			});
		}
	}),

	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL");
		return HttpResponse.json({ body:{ UploadUrl: PRESIGNED_URL } });
	}),

	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL");
		return HttpResponse.json({ body:{ UploadUrl: PRESIGNED_URL } });
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][DEV] PUT FILE");
		return HttpResponse.json({ statusCode: 200 });
	}),

	http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => {

		console.log("[MOCK API][DEV] DELETE FILE");

		return HttpResponse.json({
			statusCode: 200
		});
	})
);

export const devServerFailed = setupServer(
	http.get(API_URL + "/test", () => {

		console.log("[MOCK API][DEV] GET FILES - FAILED");

		return HttpResponse.json({
			errorType: "500",
			errorMessage: "Test Error Message!"
		});
	}),

	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL(testfile1) - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	}),

	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL(testfile2) - FAILED");
		return HttpResponse.json({ errorType: "500", errorMessage: "Test Error Message!" });
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][DEV] PUT FILE - FAILED");
		return new HttpResponse(null, { status: 500 });
	}),

	http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => {

		console.log("[MOCK API][DEV] DELETE FILE - FAILED");

		return HttpResponse.json({
			errorType: "500",
			errorMessage: "Test Error Message!"
		});
	})
);

export const devServerNetworkError = setupServer(
	http.get(API_URL + "/test", () => {
		console.log("[MOCK API][DEV] GET FILES - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL(testfile1) - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL(testfile2) - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][DEV] PUT FILE - NETWORK ERROR");
		return HttpResponse.error();
	}),

	http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => {
		console.log("[MOCK API][DEV] DELETE FILE - NETWORK ERROR");
		return HttpResponse.error();
	})
);

export const devServerPresignedUrlOkButUploadFailed = setupServer(

	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL - URL OK, Upload Failed");
		return HttpResponse.json({ body:{ UploadUrl: PRESIGNED_URL } });
	}),

	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL - URL OK, Upload Failed");
		return HttpResponse.json({ body:{ UploadUrl: PRESIGNED_URL } });
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][DEV] PUT FILE - URL OK, Upload Failed");
		return new HttpResponse(null, { status: 500 });
	}),
);

export const devServerPresignedUrlOkButUploadNetworkError = setupServer(

	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL - URL OK, Upload Failed");
		return HttpResponse.json({ body:{ UploadUrl: PRESIGNED_URL } });
	}),

	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => {
		console.log("[MOCK API][DEV] GET PRESIGNED URL - URL OK, Upload Failed");
		return HttpResponse.json({ body:{ UploadUrl: PRESIGNED_URL } });
	}),

	http.put(PRESIGNED_URL, async () => {
		console.log("[MOCK API][DEV] PUT FILE - URL OK, Upload Failed");
		return HttpResponse.error();
	}),
);