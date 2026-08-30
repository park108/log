import fs from 'node:fs';
import path from 'node:path';

// 파일 업로드 절차는 한 곳에만 있어야 한다.
//
// 이 60줄은 `FileUpload.tsx`(모바일 입력)와 `FileDrop.tsx`(데스크톱 드롭)에 각각
// 복사돼 있었다. 두 사본은 **딱 두 줄의 순서**만 달랐고, 그 어긋남이 실제 결함을
// 냈다 — 모바일 쪽은 주소를 대입하기 전에 로그를 찍어 presigned URL 자리가 비었다.
//
// 문구를 맞추는 것으로는 다음 어긋남을 막지 못한다. 사본이 다시 생기는 것 자체를
// 막는다. 게이트는 **두 방향**을 본다:
//   (1) 업로드 절차의 표지 문구가 공유 모듈 밖에서 다시 나타나는가
//   (2) 두 소비자가 실제로 그 모듈을 쓰는가 (자기 사본으로 돌아가지 않았는가)

const SRC = path.join(process.cwd(), 'src');
const SHARED = 'src/File/uploadFile.ts';

const read = (relative: string): string =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

// 주석은 코드가 아니다. 걷어내지 않으면 "왜 이렇게 했는가" 를 적어 둔 문장이
// 위반으로 읽힌다 — 실제로 두 소비자 모두 주석에만 남은 `getPreSignedUrl`
// 때문에 붉어졌다. 문자열 리터럴 안의 `//` 는 건드리지 않는다.
const stripComments = (source: string): string =>
	source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split('\n')
		.map((line) => {
			let quote: string | null = null;
			for(let i = 0; i < line.length; i += 1) {
				const c = line[i];
				if(quote) {
					if('\\\\' === c) { i += 1; continue; }
					if(c === quote) quote = null;
					continue;
				}
				if('"' === c || "'" === c || '`' === c) { quote = c; continue; }
				if('/' === c && '/' === line[i + 1]) return line.slice(0, i);
			}
			return line;
		})
		.join('\n');

const code = (relative: string): string => stripComments(read(relative));

const walk = (dir: string): string[] =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});

// 측정 대상은 열거로 산출한다 — 하드코딩한 목록은 이후 추가된 파일을 숨긴다.
const sources = (): string[] =>
	walk(SRC)
		.filter((f) => /\.(ts|tsx)$/.test(f))
		.filter((f) => !/\.test\.(ts|tsx)$/.test(f))
		.map((f) => path.relative(process.cwd(), f));

// 업로드 절차 고유의 표지. 이 문구가 있는 곳이 곧 그 절차의 사본이다.
const MARKERS = [
	'[API GET] OK - Presigned URL',
	'[API GET] FAILED - Presigned URL',
	'[API PUT] OK - File: ',
	'[API PUT] FAILED - File: ',
];

describe('업로드 절차는 단일 출처다', () => {

	it.each(MARKERS)('`%s` 는 공유 모듈에만 있다', (marker) => {

		const holders = sources().filter((f) => code(f).includes(marker));

		expect(holders).toEqual([SHARED]);
	});

	it.each([
		['모바일 입력', 'src/File/FileUpload.tsx'],
		['데스크톱 드롭', 'src/File/FileDrop.tsx'],
	])('%s 는 공유 모듈을 쓴다', (_label, consumer) => {

		const body = code(consumer);

		expect(body).toMatch(/from\s+'\.\/uploadFile'/);
		// 직접 API 를 부르면 절차를 다시 쓰고 있다는 뜻이다.
		expect(body).not.toMatch(/getPreSignedUrl|putFile/);
	});

	// 공유 모듈은 취소 판정을 **함수**로 받는다 — 값으로 받으면 await 를 건너뛰는
	// 동안의 변화를 못 보고, 언마운트 후 무발화 보장이 거기 달려 있다.
	it('취소 판정을 함수로 받는다', () => {

		expect(code(SHARED)).toMatch(/isCancelled\s*:\s*\(\s*\)\s*=>\s*boolean/);
	});
});
