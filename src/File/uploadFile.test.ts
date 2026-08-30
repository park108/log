import { vi } from 'vitest';

import * as common from '../common/common';
import * as errorReporter from '../common/errorReporter';
import * as api from './api';
import { uploadFile } from './uploadFile';

// 이 절차는 원래 `FileUpload.tsx`(모바일)와 `FileDrop.tsx`(데스크톱)에 60줄씩
// 복사돼 있었고, 두 사본은 두 줄의 **순서**만 달랐다. 모바일 쪽은 주소를 대입하기
// 전에 로그를 찍어 `[API GET] OK - Presigned URL: ` 만 남겼다 — 업로드가 어디로
// 갔는지 물어야 할 때 답이 없다.

const PRESIGNED = 'https://bucket.example.com/upload?sig=abc';

const file = (name = 'a.png', type = 'image/png'): File =>
	new File(['x'], name, { type });

const never = (): boolean => false;

describe('uploadFile', () => {

	let logSpy: ReturnType<typeof vi.spyOn>;
	let reportSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		logSpy = vi.spyOn(common, 'log').mockImplementation(async () => true);
		reportSpy = vi.spyOn(errorReporter, 'reportError').mockImplementation(async () => true);
	});

	afterEach(() => { vi.restoreAllMocks(); });

	const messages = (): string[] =>
		logSpy.mock.calls.map((call: unknown[]) => String(call[0]));

	it('성공 로그에 실제 presigned URL 이 담긴다', async () => {

		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue({
			json: async () => ({ body: { UploadUrl: PRESIGNED } }),
		} as unknown as Response);
		vi.spyOn(api, 'putFile').mockResolvedValue({ status: 200 } as Response);

		await expect(uploadFile(file(), never)).resolves.toBe(true);

		const line = messages().find((m) => m.startsWith('[API GET] OK - Presigned URL:'));
		expect(line).toBeDefined();
		// 주소가 비어 있으면 로그가 아무것도 알려 주지 않는다.
		expect(line).toContain(PRESIGNED);
	});

	it('errorType 이 있으면 올리지 않는다', async () => {

		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue({
			json: async () => ({ errorType: 'AccessDenied' }),
		} as unknown as Response);
		const put = vi.spyOn(api, 'putFile');

		await expect(uploadFile(file(), never)).resolves.toBe(false);

		expect(put).not.toHaveBeenCalled();
		expect(messages()).toContain('[API GET] FAILED - Presigned URL');
		// **무엇을** 보고했는지까지 본다. 응답 자체가 아니라 예외가 올라오면
		// errorType 분기가 아니라 크래시다 — 이 단언이 없으면 분기를 통째로
		// 지워도 통과한다 (실측: 주입 6방향 중 이 한 방향만 검출 실패했다).
		expect(reportSpy).toHaveBeenCalledWith({ errorType: 'AccessDenied' });
	});

	it('PUT 이 200 이 아니면 실패다', async () => {

		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue({
			json: async () => ({ body: { UploadUrl: PRESIGNED } }),
		} as unknown as Response);
		vi.spyOn(api, 'putFile').mockResolvedValue({ status: 403 } as Response);

		await expect(uploadFile(file(), never)).resolves.toBe(false);

		expect(messages()).toContain('[API PUT] FAILED - File: a.png');
	});

	it('presigned URL 을 그대로 PUT 대상으로 쓴다', async () => {

		vi.spyOn(api, 'getPreSignedUrl').mockResolvedValue({
			json: async () => ({ body: { UploadUrl: PRESIGNED } }),
		} as unknown as Response);
		const put = vi.spyOn(api, 'putFile').mockResolvedValue({ status: 200 } as Response);

		await uploadFile(file('b.jpg', 'image/jpeg'), never);

		expect(put).toHaveBeenCalledWith(PRESIGNED, 'image/jpeg', expect.anything());
	});

	// 언마운트 후 무발화 — 취소 판정은 **함수**로 받는다. 값으로 받으면 await 를
	// 건너뛰는 동안의 변화를 못 본다.
	describe('취소', () => {

		it.each([
			['presigned 응답 직후', 1],
			['PUT 응답 직후', 2],
		])('%s 에 취소되면 그 뒤로 아무것도 발화하지 않는다', async (_label, cancelAfter) => {

			let step = 0;
			const isCancelled = (): boolean => step >= cancelAfter;

			vi.spyOn(api, 'getPreSignedUrl').mockImplementation(async () => {
				step = 1;
				return { json: async () => ({ body: { UploadUrl: PRESIGNED } }) } as unknown as Response;
			});
			vi.spyOn(api, 'putFile').mockImplementation(async () => {
				step = 2;
				return { status: 500 } as Response;
			});

			await expect(uploadFile(file(), isCancelled)).resolves.toBe(false);

			// 취소된 뒤에는 실패 보고도 하지 않는다 — 사라진 화면의 실패다.
			expect(reportSpy).not.toHaveBeenCalled();
			expect(messages().filter((m) => m.includes('FAILED'))).toEqual([]);
		});
	});
});
