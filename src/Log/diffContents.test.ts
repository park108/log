import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../common/markdownParser';
import sanitizeHtml from '../common/sanitizeHtml';
import { markChangedLines, CHANGED_CLASS } from './diffContents';
import { HIGHLIGHT_OPEN, HIGHLIGHT_CLOSE } from '../common/markdownParser';

// 표식은 마크업 문자를 쓰지 않는다 — 본문 escape 를 통과해야 하기 때문이다.
// 단정은 그 표식이 아니라 **렌더된 결과**를 본다. 이전에는 문자열 형태
// (`<span class=...>`) 를 박고 있었고, 그래서 escape 도입으로 하이라이트가
// 통째로 글자가 됐을 때 이 스위트가 아무것도 잡지 못했다.
const MARK = HIGHLIGHT_OPEN;

/** 실제 화면에 닿는 경로 그대로 — 표식이 태그가 되는지까지 본다. */
const highlighted = (marked: string): string[] => {
	const el = document.createElement('div');
	el.innerHTML = sanitizeHtml(markdownToHtml(marked));
	return Array.from(el.querySelectorAll('span.' + CHANGED_CLASS)).map((n) => n.textContent ?? '');
};

describe('markChangedLines', () => {

	it('이전 판본이 없으면 원문을 그대로 돌려준다', () => {
		// 가장 오래된 판본은 비교 대상이 없다.
		const src = '# 제목\n\n본문';
		expect(markChangedLines(src, undefined)).toBe(src);
	});

	it('바뀐 줄만 표식한다', () => {
		const older = '# 제목\n\n그대로인 문단\n\n예전 문장';
		const newer = '# 제목\n\n그대로인 문단\n\n바뀐 문장';
		const out = markChangedLines(newer, older);

		expect(out).toContain(MARK + '바뀐 문장' + HIGHLIGHT_CLOSE);
		// 그리고 실제로 강조로 렌더돼야 한다.
		expect(highlighted(out)).toEqual(['바뀐 문장']);
		// 대조 — 안 바뀐 줄까지 표식하면 강조가 무의미해진다.
		expect(out).toContain('\n그대로인 문단\n');
		expect(out).toContain('# 제목');
		expect(out.split(MARK).length - 1).toBe(1);
	});

	it('제목·목록은 마크다운 표기 뒤쪽만 감싼다', () => {
		// `# ` 앞을 건드리면 제목 인식이 깨진다.
		const out = markChangedLines('# 새 제목\n- 새 항목', '# 옛 제목\n- 옛 항목');
		expect(out).toContain('# ' + MARK + '새 제목' + HIGHLIGHT_CLOSE);
		expect(out).toContain('- ' + MARK + '새 항목' + HIGHLIGHT_CLOSE);
	});

	it('코드 블록 안은 표식하지 않는다', () => {
		// 넣으면 태그가 글자로 보인다.
		const older = ['```', 'const x = 1;', '```'].join('\n');
		const newer = ['```', 'const y = 2;', '```'].join('\n');
		const out = markChangedLines(newer, older);

		expect(out).toBe(newer);
		expect(out).not.toContain(MARK);
	});

	it('코드 블록이 끝나면 다시 표식한다', () => {
		// 대조 — fence 상태를 토글하지 않으면 이후 본문이 전부 빠진다.
		const older = ['```', 'a', '```', '', '옛 문단'].join('\n');
		const newer = ['```', 'a', '```', '', '새 문단'].join('\n');
		expect(markChangedLines(newer, older)).toContain(MARK + '새 문단' + HIGHLIGHT_CLOSE);
	});

	it('빈 줄과 표기만 있는 줄은 건드리지 않는다', () => {
		const out = markChangedLines('# 제목\n\n- \n새 줄', '# 제목\n\n다른 줄');
		expect(out).toContain('\n\n');
		expect(out).toContain('\n- \n');
	});

	it('줄이 추가되면 추가분만 표식한다', () => {
		const older = 'A\nB';
		const newer = 'A\n새 줄\nB';
		const out = markChangedLines(newer, older);
		expect(out).toBe('A\n' + MARK + '새 줄' + HIGHLIGHT_CLOSE + '\nB');
		expect(highlighted(out)).toEqual(['새 줄']);
	});

	it('줄이 삭제돼도 남은 줄은 표식하지 않는다', () => {
		// 삭제는 현 판본에 흔적이 없다 — 없는 것을 표식할 수는 없다.
		expect(markChangedLines('A\nC', 'A\nB\nC')).toBe('A\nC');
	});
});

// 표식이 실제로 강조가 되는 경로를 따로 박는다. 이 스위트가 문자열 형태만
// 보던 동안, 본문 escape 도입으로 하이라이트가 통째로 글자가 된 것을 903건이
// 통과하는 상태에서 아무도 잡지 못했다.
describe('markChangedLines 렌더 결과', () => {

	it('바뀐 줄이 강조 span 으로 렌더된다', () => {
		const out = markChangedLines('첫 줄이다.\n바뀐 줄이다.', '첫 줄이다.\n예전 줄이다.');
		const el = document.createElement('div');
		el.innerHTML = sanitizeHtml(markdownToHtml(out));

		expect(el.querySelectorAll('span.' + CHANGED_CLASS).length).toBe(1);
		// 표식 문자가 화면에 남아서는 안 된다.
		expect(el.textContent).toBe('첫 줄이다.바뀐 줄이다.');
		expect(el.innerHTML).not.toContain(HIGHLIGHT_OPEN);
	});

	it('강조 안의 꺾쇠는 여전히 글자로 남는다', () => {
		const out = markChangedLines('List<String> 이다', '예전 줄이다.');
		const el = document.createElement('div');
		el.innerHTML = sanitizeHtml(markdownToHtml(out));

		expect(el.textContent).toBe('List<String> 이다');
		expect(el.querySelectorAll('span.' + CHANGED_CLASS).length).toBe(1);
	});

	it('붙여넣기로 들어온 표식 문자는 걷어낸다', () => {
		const out = markChangedLines('앞' + HIGHLIGHT_OPEN + '가짜' + HIGHLIGHT_CLOSE + '뒤', '다른 줄');
		const el = document.createElement('div');
		el.innerHTML = sanitizeHtml(markdownToHtml(out));

		// 줄 전체가 하나로 강조되고, 가짜 표식이 만든 span 은 없다.
		expect(el.querySelectorAll('span.' + CHANGED_CLASS).length).toBe(1);
		expect(el.textContent).toBe('앞가짜뒤');
	});

	// 대조 — 안 바뀐 줄에는 span 이 생기지 않아야 한다.
	it('바뀌지 않은 줄에는 강조가 없다', () => {
		const out = markChangedLines('그대로', '그대로');
		const el = document.createElement('div');
		el.innerHTML = sanitizeHtml(markdownToHtml(out));

		expect(el.querySelectorAll('span.' + CHANGED_CLASS).length).toBe(0);
	});
});
