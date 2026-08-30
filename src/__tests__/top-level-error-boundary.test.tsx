import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';

import ErrorBoundary from '../common/ErrorBoundary';
import ErrorFallback from '../common/ErrorFallback';

// 마운트한 뒤 렌더에서 던지면 React 는 트리 전체를 걷어 내고 `#root` 를 비운다.
// `App` 안의 경계들은 **라우트 요소**를 감싸므로 그 바깥에서 던진 오류 —
// `App` 자신의 본문, `Navigation`, `Footer`, 라우터 설정 — 는 아무도 잡지 않는다.
//
// 실측 (환경변수가 빠진 빌드를 `vite preview` 로 띄움, Chrome 375px):
//   고치기 전  `#root` 자식 0개 · `h1` 부재 · `nav` 부재  → 아무 글자도 없는 흰 화면
//   고친 뒤    `.error-fallback` 박스 h=125 · 글자 "오류" · 재시도 버튼
//
// 이 게이트는 두 축이다 — 엔트리에 경계가 실재하는가(정적), 그리고 그 경계가
// 실제로 던진 것을 잡아 안내를 내는가(런타임).

const read = (relative: string): string =>
	fs.readFileSync(path.join(process.cwd(), relative), 'utf-8');

// 주석은 코드가 아니다. 걷어내지 않으면 "왜 이렇게 했는가" 를 적어 둔 문장이
// 충족으로 읽힌다.
const stripComments = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/[^\n]*$/gm, '');

describe('엔트리에 최상위 경계가 있다', () => {

	const entry = () => stripComments(read('src/index.tsx'));

	it('경계와 안내 화면을 들여온다', () => {

		// 따옴표 종류는 이 저장소가 강제하지 않는다 (실측: 큰따옴표로 바꿔도
		// `npm run lint` rc=0). 어느 쪽이든 받는다 — 표기까지 못 박으면 정당한
		// 변경이 게이트에 걸린다.
		expect(entry()).toMatch(/import\s+ErrorBoundary\s+from\s+['"]\.\/common\/ErrorBoundary['"]/);
		expect(entry()).toMatch(/import\s+ErrorFallback\s+from\s+['"]\.\/common\/ErrorFallback['"]/);
	});

	it('`App` 을 그 경계로 감싼다', () => {

		const source = entry();

		// `<ErrorBoundary …> … <App /> … </ErrorBoundary>` 순서를 본다 — 들여옴만
		// 확인하면 감싸지 않은 구현도 통과한다.
		const opened = source.indexOf('<ErrorBoundary');
		const app = source.indexOf('<App', opened);
		const closed = source.indexOf('</ErrorBoundary>', app);

		expect(opened, '엔트리에 <ErrorBoundary> 가 없다').toBeGreaterThan(-1);
		expect(app, '<ErrorBoundary> 안에 <App /> 이 없다').toBeGreaterThan(-1);
		expect(closed, '</ErrorBoundary> 가 <App /> 뒤에 없다').toBeGreaterThan(-1);
	});

	it('오류를 보고 채널에 넘긴다', () => {

		expect(entry()).toMatch(/onError=\{\s*reportError\s*\}/);
	});
});

// 위 정적 판정은 "그렇게 쓰여 있다" 까지만 말한다. 아래는 그 조합이 실제로
// 안내를 내는지 본다 — 같은 `fallback` 표현식을 쓴다.
describe('경계가 실제로 안내를 낸다', () => {

	const Boom = (): React.ReactElement => { throw new Error('render exploded'); };

	it('던진 트리 대신 오류 안내가 남는다', () => {

		const onError = vi.fn();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const { container } = render(
			<ErrorBoundary fallback={(p) => <ErrorFallback {...p} />} onError={onError}>
				<Boom />
			</ErrorBoundary>
		);

		// 빈 화면이 아니어야 한다 — 이것이 이 축의 전부다.
		expect(container.textContent).not.toBe('');
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(onError).toHaveBeenCalled();

		vi.restoreAllMocks();
	});
});
