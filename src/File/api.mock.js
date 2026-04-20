import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ERROR_500, OK_200 } from '../__fixtures__/common'
import { PRESIGNED_URL, filesListFirst7, filesListNext3, filesListNext3NoKey } from './__fixtures__/files'

const API_URL = import.meta.env.VITE_FILE_API_BASE;

const lastTimestampParam = (request) => {
	const qs = request.url.split("?")[1];
	return qs ? qs.split("=")[1] : "";
}

export const prodServerHasNoData = setupServer(
	http.get(API_URL + "/prod", async () => HttpResponse.json({ body: {} })),
);

export const prodServerOk = setupServer(
	http.get(API_URL + "/prod", async ({ request }) => {
		const qs = request.url.split("?")[1] || "";
		const ts = lastTimestampParam(request);
		if (qs === "") return HttpResponse.json({ body: filesListFirst7 });
		if (ts === "1643637384614") return HttpResponse.json({ body: filesListNext3 });
		if (ts === "1638746700070") return HttpResponse.json({ body: {} });
	}),
	http.get(API_URL + "/prod/key/testname/type/testtype", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.put(PRESIGNED_URL, async () => HttpResponse.json(OK_200)),
	http.delete(API_URL + "/prod/key/20220606_log_CQRS.png", async () => HttpResponse.json(OK_200)),
);

export const prodServerFailed = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.json(ERROR_500)),
	http.get(API_URL + "/prod/key/testname/type/testtype", async () => {}),
	http.put(PRESIGNED_URL, async () => new HttpResponse(null, { status: 500 })),
	http.delete(API_URL + "/prod/key/20220606_log_CQRS.png", async () => HttpResponse.json(ERROR_500)),
);

export const prodServerNetworkError = setupServer(
	http.get(API_URL + "/prod", () => HttpResponse.error()),
	http.put(PRESIGNED_URL, async () => HttpResponse.error()),
	http.delete(API_URL + "/prod/key/20220606_log_CQRS.png", async () => HttpResponse.error()),
);

export const devServerOk = setupServer(
	http.get(API_URL + "/test", async ({ request }) => {
		const qs = request.url.split("?")[1] || "";
		const ts = lastTimestampParam(request);
		if (qs === "") return HttpResponse.json({ body: filesListFirst7 });
		if (ts === "1643637384614") return HttpResponse.json({ body: filesListNext3NoKey });
	}),
	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.put(PRESIGNED_URL, async () => HttpResponse.json(OK_200)),
	http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => HttpResponse.json(OK_200)),
);

export const failedGetHandler = http.get(API_URL + "/test", () => HttpResponse.json(ERROR_500));
export const failedPresignedFile1Handler = http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => HttpResponse.json(ERROR_500));
export const failedPresignedFile2Handler = http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => HttpResponse.json(ERROR_500));
export const failedPutHandler = http.put(PRESIGNED_URL, async () => new HttpResponse(null, { status: 500 }));
export const failedDeleteHandler = http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => HttpResponse.json(ERROR_500));
export const networkErrorGetHandler = http.get(API_URL + "/test", () => HttpResponse.error());
export const networkErrorPresignedFile1Handler = http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => HttpResponse.error());
export const networkErrorPresignedFile2Handler = http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => HttpResponse.error());
export const networkErrorPutHandler = http.put(PRESIGNED_URL, async () => HttpResponse.error());
export const networkErrorDeleteHandler = http.delete(API_URL + "/test/key/20220606_log_CQRS.png", async () => HttpResponse.error());

export const devServerFailed = setupServer(
	failedGetHandler,
	failedPresignedFile1Handler,
	failedPresignedFile2Handler,
	failedPutHandler,
	failedDeleteHandler,
);

export const devServerNetworkError = setupServer(
	networkErrorGetHandler,
	networkErrorPresignedFile1Handler,
	networkErrorPresignedFile2Handler,
	networkErrorPutHandler,
	networkErrorDeleteHandler,
);

export const devServerPresignedUrlOkButUploadFailed = setupServer(
	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.put(PRESIGNED_URL, async () => new HttpResponse(null, { status: 500 })),
);

export const devServerPresignedUrlOkButUploadNetworkError = setupServer(
	http.get(API_URL + "/test/key/testfile1.txt/type/text", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.get(API_URL + "/test/key/testfile2.txt/type/text", async () => HttpResponse.json({ body: { UploadUrl: PRESIGNED_URL } })),
	http.put(PRESIGNED_URL, async () => HttpResponse.error()),
);
