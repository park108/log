import { render, screen } from '@testing-library/react';
import { highlightKeyword } from './Search';

// 하이라이트는 `split(queryString)` 리터럴 분할에서 대소문자 무시 정규식으로
// 바뀌었다. 그 교체가 (i) 원래 못 잡던 것을 잡고 (ii) 원문 표기를 보존하며
// (iii) 리터럴 분할에는 없던 정규식 예외를 들여오지 않음을 못 박는다.

const CLS = 'kw';
const renderHL = (contents: string, q: string) =>
	render(<div data-testid="out">{highlightKeyword(contents, q, CLS)}</div>);

const marks = (): string[] =>
	Array.from(screen.getByTestId('out').querySelectorAll(`.${CLS}`)).map(
		(n) => n.textContent ?? '',
	);

it('대소문자가 달라도 강조한다', () => {
	renderHL('Github Actions 로 Github 에 푸시', 'github');
	expect(marks()).toEqual(['Github', 'Github']);
});

it('강조 자리에 질의어가 아니라 본문 표기를 그린다', () => {
	renderHL('Kotlin 과 KOTLIN', 'kotlin');
	// 질의어를 그리던 구현이면 둘 다 'kotlin' 이 된다.
	expect(marks()).toEqual(['Kotlin', 'KOTLIN']);
});

it('전체 텍스트는 보존된다', () => {
	renderHL('사과 배 사과', '사과');
	expect(screen.getByTestId('out').textContent).toBe('사과 배 사과');
	expect(marks()).toEqual(['사과', '사과']);
});

it('정규식 메타문자를 리터럴로 다룬다 — 예외를 던지지 않는다', () => {
	// 이스케이프가 없으면 new RegExp("(") 가 던져 화면이 죽는다.
	expect(() => renderHL('foo (bar) baz', '(bar)')).not.toThrow();
	expect(marks()).toEqual(['(bar)']);
});

it('메타문자가 와일드카드로 새지 않는다', () => {
	// 이스케이프 없으면 '.' 이 아무 글자나 매치해 'axc' 까지 잡는다.
	renderHL('a.c 와 axc', 'a.c');
	expect(marks()).toEqual(['a.c']);
});

it('빈 질의어는 글자마다 조각내지 않는다', () => {
	renderHL('사과', '');
	expect(marks()).toEqual([]);
	expect(screen.getByTestId('out').textContent).toBe('사과');
});

it('매치가 없으면 강조가 0건이고 본문은 그대로다', () => {
	renderHL('사과 배', '포도');
	expect(marks()).toEqual([]);
	expect(screen.getByTestId('out').textContent).toBe('사과 배');
});
