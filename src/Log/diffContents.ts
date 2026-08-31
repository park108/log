import { HIGHLIGHT_OPEN, HIGHLIGHT_CLOSE, HIGHLIGHT_CLASS,
	THEMATIC_BREAK_PATTERN, stripHeadingClosingSequence } from '../common/markdownParser';
// 변경 이력에서 **바뀐 줄**을 표시용으로 표식한다.
//
// 이력은 각 판본을 그대로 렌더할 뿐이라, 무엇이 달라졌는지 눈으로 찾아야 했다.
// 이전 판본과 줄 단위로 비교해 새로 생기거나 바뀐 줄에 표식을 붙인다.
//
// 표식은 마크다운 원문에 `<span class="...">` 로 넣는다. 파서가 raw HTML 을
// 통과시키고 sanitize 의 허용 목록에 span·class 가 있어 렌더까지 살아남는다
// (실측 확인). LogItem 을 고치지 않고 contents 만 바꿔 끼울 수 있다.
//
// **줄 단위로 감싸는 이유** — span 은 문단 경계를 넘지 못한다. 여러 줄을 한
// 번에 감싸면 첫 줄만 표식되고 나머지가 빠진다 (실측).

// 클래스 이름의 단일 출처는 파서다 — 표식을 태그로 되돌리는 쪽이 거기다.
export const CHANGED_CLASS = HIGHLIGHT_CLASS;

/** 줄 앞의 마크다운 표기(제목·목록·인용)와 본문을 가른다. 표기 안쪽만 감싼다. */
const LINE_PREFIX = /^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)?)([\s\S]*)$/;

const isFence = (line: string): boolean => /^\s*```/.test(line);

/** 최장 공통 부분수열 — 어느 줄이 그대로 남았는지 판정한다. */
const commonLineSet = (a: string[], b: string[]): Set<number> => {
	const n = a.length, m = b.length;
	// n·m 이 큰 문서에서도 이력은 판본 하나 분량이라 실용적이다.
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
		}
	}
	const kept = new Set<number>();
	let i = 0, j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) { kept.add(i); i++; j++; }
		else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
		else j++;
	}
	return kept;
};

/**
 * `contents` 중 `previous` 에 없던 줄을 표식한다.
 * `previous` 가 없으면(가장 오래된 판본) 원문을 그대로 돌려준다.
 */
export const markChangedLines = (contents: string, previous?: string): string => {

	// 사용자가 붙여넣기로 표식 문자를 들여올 수 있다 (private-use 영역은 아이콘
	// 폰트가 쓴다). 먼저 걷어 우리 표식과 섞이지 않게 한다 — 파서가 코드 스팬
	// 자리표시자에 대해 하는 것과 같은 방어다.
	const strip = (s: string): string =>
		s.replace(new RegExp('[' + HIGHLIGHT_OPEN + HIGHLIGHT_CLOSE + ']', 'g'), '');


	if (undefined === previous) return strip(contents);

	const lines = strip(contents).split('\n');
	const kept = commonLineSet(lines, strip(previous).split('\n'));

	let inFence = false;

	return lines.map((line, index) => {

		// 코드 블록 안에는 표식을 넣지 않는다 — 태그가 글자로 보인다.
		if (isFence(line)) { inFence = !inFence; return line; }
		if (inFence) return line;

		if (kept.has(index)) return line;
		if ('' === line.trim()) return line;

		// **줄 전체가 표기인 것에는 강조할 내용이 없다.**
		//
		// 수평선을 표식으로 감싸면 파서가 더 이상 수평선으로 읽지 못한다 — 변경
		// 이력에서만 선이 사라지고 `---` 라는 글자가 나온다 (실측). 규칙은 파서에서
		// 가져온다. 여기 다시 적으면 사본 둘이 갈라진다.
		if (THEMATIC_BREAK_PATTERN.test(line.trim())) return line;

		const m = LINE_PREFIX.exec(line);
		if (!m) return line;

		const [, prefix, body] = m;
		if ('' === (body ?? '').trim()) return line;

		// 태그를 직접 끼우지 않는다 — `markdownToHtml` 이 본문을 escape 하므로
		// 꺾쇠가 글자로 보인다 (실제로 그렇게 깨졌다). 마크업 문자를 쓰지 않는
		// 표식을 두고 파서가 태그로 되돌린다.
		// 제목의 닫는 `#` 시퀀스도 표기이지 내용이 아니다. 표식 안에 넣으면 줄
		// 끝이 `#` 이 아니게 되어 파서의 닫는 시퀀스 규칙이 매치하지 못하고,
		// 변경 이력에서만 `## 제목 ##` 이 `제목 ##` 으로 보인다 (실측).
		// 판정은 그 규칙을 아는 쪽(파서)에 맡기고 여기서는 자리만 가른다.
		const isHeading = /^\s*#{1,6}\s+$/.test(prefix ?? '');
		const content = isHeading ? stripHeadingClosingSequence(body ?? '') : (body ?? '');
		const trailing = (body ?? '').slice(content.length);

		return prefix + HIGHLIGHT_OPEN + content + HIGHLIGHT_CLOSE + trailing;
	}).join('\n');
};

export default markChangedLines;
