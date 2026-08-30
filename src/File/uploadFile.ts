// 파일 한 개를 올리는 절차 — **단일 출처**.
//
// 이 60줄은 `FileUpload.tsx`(모바일 입력)와 `FileDrop.tsx`(데스크톱 드롭)에
// 각각 복사돼 있었고, 두 사본은 딱 두 줄의 **순서**만 달랐다:
//
//   FileDrop    uploadUrl = …UploadUrl;  log("… Presigned URL: " + uploadUrl);   ← 주소가 찍힌다
//   FileUpload  log("… Presigned URL: " + uploadUrl);  uploadUrl = …UploadUrl;   ← 빈 문자열이 찍힌다
//
// 모바일에서 올린 파일은 로그에 `[API GET] OK - Presigned URL: ` 만 남았다.
// 업로드가 어디로 갔는지 물어야 할 때 답이 없는 로그다. 사본이 둘이라 생긴
// 어긋남이므로 사본을 하나로 만든다 — 문구를 맞추는 것으로는 다음 어긋남을
// 막지 못한다.
//
// 취소 판정을 값이 아니라 **함수**로 받는다. 호출처는 ref 를 갖고 있고, 값으로
// 받으면 await 를 건너뛰는 동안의 변화를 못 본다 — 언마운트 후 무발화 보장이
// 정확히 그 변화에 달려 있다.

import { log, hasValue } from '../common/common';
import { reportError } from '../common/errorReporter';
import { getPreSignedUrl, putFile } from './api';

interface PreSignedUrlResponse {
	errorType?: string;
	body?: {
		UploadUrl?: string;
	};
}

export const uploadFile = async (
	item: File,
	isCancelled: () => boolean,
): Promise<boolean> => {

	const name = item.name;
	const type = encodeURIComponent(item.type);

	let uploadUrl = "";

	try {
		const res = await getPreSignedUrl(name, type);
		const preSignedUrlData = await res.json() as PreSignedUrlResponse;

		if(isCancelled()) return false;

		if(hasValue(preSignedUrlData.errorType)) {
			log("[API GET] FAILED - Presigned URL", "ERROR");
			reportError(preSignedUrlData);
			return false;
		}

		uploadUrl = preSignedUrlData.body!.UploadUrl as string;
		log("[API GET] OK - Presigned URL: " + uploadUrl, "SUCCESS");
	}
	catch(err) {
		if(isCancelled()) return false;
		log("[API GET] FAILED - Presigned URL", "ERROR");
		reportError(err);
		return false;
	}

	try {
		const res = await putFile(uploadUrl, item.type, item);

		if(isCancelled()) return false;

		if(200 === res.status) {
			log("[API PUT] OK - File: " + name, "SUCCESS");
			return true;
		}

		log("[API PUT] FAILED - File: " + name, "ERROR");
		reportError(res);
		return false;
	}
	catch(err) {
		if(isCancelled()) return false;
		log("[API PUT] FAILED - File: " + name, "ERROR");
		reportError(err);
		return false;
	}
};

export default uploadFile;
