import { describe, it, expect } from 'vitest';
import { markChangedLines, CHANGED_CLASS } from './diffContents';

const MARK = '<span class="' + CHANGED_CLASS + '">';

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

		expect(out).toContain(MARK + '바뀐 문장</span>');
		// 대조 — 안 바뀐 줄까지 표식하면 강조가 무의미해진다.
		expect(out).toContain('\n그대로인 문단\n');
		expect(out).toContain('# 제목');
		expect(out.split(MARK).length - 1).toBe(1);
	});

	it('제목·목록은 마크다운 표기 뒤쪽만 감싼다', () => {
		// `# ` 앞을 건드리면 제목 인식이 깨진다.
		const out = markChangedLines('# 새 제목\n- 새 항목', '# 옛 제목\n- 옛 항목');
		expect(out).toContain('# ' + MARK + '새 제목</span>');
		expect(out).toContain('- ' + MARK + '새 항목</span>');
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
		expect(markChangedLines(newer, older)).toContain(MARK + '새 문단</span>');
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
		expect(out).toBe('A\n' + MARK + '새 줄</span>\nB');
	});

	it('줄이 삭제돼도 남은 줄은 표식하지 않는다', () => {
		// 삭제는 현 판본에 흔적이 없다 — 없는 것을 표식할 수는 없다.
		expect(markChangedLines('A\nC', 'A\nB\nC')).toBe('A\nC');
	});
});
