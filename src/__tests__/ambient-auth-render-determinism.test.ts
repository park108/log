import fs from 'node:fs';
import path from 'node:path';

// **쿠키에 기대 렌더하는 테스트는 그 자체로 비결정적이다.**
//
// `isAdmin()` · `isLoggedIn()` 은 `access_token` 쿠키를 읽는다. 이 둘을 부르는
// 컴포넌트를 목 없이 렌더하면, 어느 갈래가 그려지는지가 **앞선 테스트 파일이 남긴
// 쿠키 상태**에 달린다.
//
// 이 비결정성은 붉은 테스트로 드러나지 않는다. 두 갈래가 같은 id·같은 문구를
// 갖는 경우가 흔해 단언은 어느 쪽이든 통과하고, 달라지는 것은 **무엇을 쟀는가**
// 뿐이기 때문이다. 실측 2건 (2026-08-30, 둘 다 같은 날 새로 쓰인 파일):
//
//   `SearchInput.location-sync.test.tsx` — 관리자/방문자 어느 입력의 onChange 가
//       불렸는지가 실행 순서에 따라 갈렸다.
//   `minimal-props-render-leak.test.tsx` — 누출 게이트가 어느 마크업을 검사하는지가
//       갈렸다. 관리자 갈래에만 있는 누출은 쿠키가 맞아떨어질 때만 잡혔다.
//
// ── 판정 범위 (과신 금지) ─────────────────────────────────────────────────────
// **직접 import 한정이다.** 테스트가 렌더하는 컴포넌트가 자식을 거쳐 간접적으로
// ambient 를 부르는 경우(예: LogSingle → LogItem → LogItemInfo)는 보지 못한다.
// 정적으로 렌더 트리를 따라가려면 AST 가 필요하고, 그 비용을 지금 지불하지 않는다.
// 이 공백을 여기 박제한다 — 기록되지 않은 검출 공백은 없는 것으로 오독된다.
// ─────────────────────────────────────────────────────────────────────────────

const SRC = path.join(process.cwd(), 'src');

const walk = (dir: string, out: string[] = []): string[] => {
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		if (fs.statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(full);
	}
	return out;
};

const isTest = (file: string): boolean => /\.test\.[jt]sx?$/.test(file);

const AMBIENT_CALL = /\b(isAdmin|isLoggedIn)\s*\(/;
const RENDERS = /\b(render|renderHook)\s*\(/;
// 목하는 방식은 둘이다 — `vi.spyOn(common, 'isAdmin')` 과 `vi.mock` 팩토리의
// 속성 선언. 후자는 따옴표가 있을 수도 없을 수도 있다 (`isAdmin: () => true`).
// 처음에는 따옴표 있는 형태만 봐서 정당한 목을 위반으로 읽었다 (대조에서 적발).
const MOCKS_AMBIENT = /spyOn\([^)]*['"](isAdmin|isLoggedIn)['"]|['"]?(isAdmin|isLoggedIn)['"]?\s*:/;

const allFiles = walk(SRC);

/**
 * 렌더 갈래를 ambient 로 가르는 **컴포넌트** 의 basename 집합 — 열거하지 않고 도출한다.
 *
 * `.tsx`/`.jsx` 로 좁히는 것이 판정의 핵심이다. 정의처(`common.ts`)와 데이터 계층
 * (`api.ts`) 도 이 함수들을 부르지만 **렌더 갈래를 가르지 않는다** — 전자는 자기
 * 구현이고, 후자는 요청 URL 에 관여할 뿐이다. 그 둘을 모집단에 넣으면
 * `getFormattedDate` 하나 쓰려고 `common` 을 import 한 테스트가 전부 위반이 되어
 * 특이도가 무너진다 (실측: 그렇게 두니 7개 파일이 오탐으로 걸렸다).
 */
const ambientModules = new Set(
	allFiles
		.filter(file => !isTest(file))
		.filter(file => /\.[jt]sx$/.test(file))
		.filter(file => AMBIENT_CALL.test(fs.readFileSync(file, 'utf-8')))
		.map(file => path.basename(file).replace(/\.[jt]sx?$/, ''))
);

/** `import ... from '.../<name>'` 의 <name> 들. */
const importedNames = (source: string): Set<string> => {
	const names = new Set<string>();
	const pattern = /from\s+['"]([^'"]+)['"]/g;
	let matched: RegExpExecArray | null;
	while ((matched = pattern.exec(source)) !== null) {
		const spec = matched[1] ?? '';
		if (!spec.startsWith('.')) continue;
		names.add(path.basename(spec).replace(/\.[jt]sx?$/, ''));
	}
	return names;
};

/** `vi.mock('<path>'` 로 통째로 대체된 모듈 basename 들 — 그 안의 ambient 는 도달하지 않는다. */
const modulesMocked = (source: string): Set<string> => {
	const names = new Set<string>();
	const pattern = /vi\.mock\(\s*['"]([^'"]+)['"]/g;
	let matched: RegExpExecArray | null;
	while ((matched = pattern.exec(source)) !== null) {
		names.add(path.basename(matched[1] ?? '').replace(/\.[jt]sx?$/, ''));
	}
	return names;
};

describe('쿠키에 기대 렌더하는 테스트가 없다', () => {

	it('도출이 공집합이 아니다', () => {
		// 도출이 0 이면 게이트가 영구 초록이 된다 (vacuous zero).
		expect(ambientModules.size).toBeGreaterThan(0);
		expect(allFiles.filter(isTest).length).toBeGreaterThan(0);
	});

	it('ambient 호출 모듈을 렌더하는 테스트는 그것을 목한다', () => {

		const violations: string[] = [];

		for (const file of allFiles.filter(isTest)) {

			const source = fs.readFileSync(file, 'utf-8');
			if (!RENDERS.test(source)) continue;
			if (MOCKS_AMBIENT.test(source)) continue;

			const mocked = modulesMocked(source);
			const reached = Array.from(importedNames(source))
				.filter(name => ambientModules.has(name))
				.filter(name => !mocked.has(name));

			if (reached.length) {
				violations.push(`${path.relative(SRC, file)} → ${reached.sort().join(', ')}`);
			}
		}

		expect(violations).toEqual([]);
	});
});
