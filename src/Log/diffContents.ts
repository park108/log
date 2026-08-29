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

export const CHANGED_CLASS = 'span--logitem-changed';

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

	if (undefined === previous) return contents;

	const lines = contents.split('\n');
	const kept = commonLineSet(lines, previous.split('\n'));

	let inFence = false;

	return lines.map((line, index) => {

		// 코드 블록 안에는 표식을 넣지 않는다 — 태그가 글자로 보인다.
		if (isFence(line)) { inFence = !inFence; return line; }
		if (inFence) return line;

		if (kept.has(index)) return line;
		if ('' === line.trim()) return line;

		const m = LINE_PREFIX.exec(line);
		if (!m) return line;

		const [, prefix, body] = m;
		if ('' === (body ?? '').trim()) return line;

		return prefix + '<span class="' + CHANGED_CLASS + '">' + body + '</span>';
	}).join('\n');
};

export default markChangedLines;
