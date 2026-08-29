// 생성된 HTML 을 사람이 읽도록 개행·들여쓰기한다.
//
// Writer 의 HTML 보기가 한 줄로 이어져 나와 구조를 눈으로 좇을 수 없었다.
// 이 변환은 **표시 전용**이다 — 저장·게시에는 원본 HTML 이 그대로 쓰인다.
//
// 파서가 내는 태그 집합이 한정적이므로(마크다운 산출물) 전면 HTML 파서가
// 아니라 태그 경계 분할로 충분하다. 알 수 없는 입력이 와도 원문을 잃지
// 않도록, 태그가 아닌 조각은 그대로 통과시킨다.

/** 여는 태그이지만 닫는 짝이 없는 것 — 들여쓰기 깊이를 늘리지 않는다. */
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

/** 안쪽을 건드리면 의미가 바뀌는 태그 — 내용을 한 줄로 유지한다. */
const PRESERVE_TAGS = new Set(['pre', 'code', 'textarea']);

const INDENT = '  ';

const tagNameOf = (tag: string): string => {
	const m = /^<\/?([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
	return m ? m[1]!.toLowerCase() : '';
};

export const formatHtml = (html: string): string => {

	if (!html) return '';

	// 태그와 텍스트로 자른다. 빈 조각은 버린다.
	const parts = html.split(/(<[^>]+>)/g).filter((p) => p !== '');

	const lines: string[] = [];
	let depth = 0;
	let preserveDepth = 0;
	let buffer = '';

	const flush = (): void => {
		if (buffer !== '') {
			lines.push(INDENT.repeat(Math.max(0, depth)) + buffer);
			buffer = '';
		}
	};

	for (const part of parts) {
		const isTag = part.startsWith('<') && part.endsWith('>');

		if (!isTag) {
			// 텍스트 — 보존 구간에서는 이어붙이고, 아니면 한 줄로 낸다.
			const text = preserveDepth > 0 ? part : part.replace(/\s+/g, ' ').trim();
			if (text === '') continue;
			if (preserveDepth > 0) buffer += text;
			else { buffer = text; flush(); }
			continue;
		}

		const name = tagNameOf(part);
		const isClose = part.startsWith('</');
		const isSelfClosing = /\/>$/.test(part) || VOID_TAGS.has(name);

		if (preserveDepth > 0) {
			buffer += part;
			if (isClose && PRESERVE_TAGS.has(name)) {
				preserveDepth -= 1;
				if (preserveDepth === 0) flush();
			}
			continue;
		}

		if (isClose) {
			depth -= 1;

			// 여는 태그 + (선택적) 텍스트 한 줄만 있는 요소는 한 줄로 접는다.
			// 세 줄로 늘어놓으면 `<p>텍스트</p>` 같은 흔한 요소가 화면을 채워
			// 오히려 구조가 안 보인다.
			const open = INDENT.repeat(Math.max(0, depth)) + '<' + name;
			const prev = lines[lines.length - 1] ?? '';
			const prev2 = lines[lines.length - 2] ?? '';

			if (prev.startsWith(open) && prev.endsWith('>')) {
				// 여는 태그 바로 뒤 — 빈 요소
				lines[lines.length - 1] = prev + part;
				continue;
			}
			if (prev2.startsWith(open) && prev2.endsWith('>') && !prev.trimStart().startsWith('<')) {
				// 여는 태그 + 텍스트 한 줄
				lines.splice(lines.length - 2, 2, prev2 + prev.trim() + part);
				continue;
			}

			lines.push(INDENT.repeat(Math.max(0, depth)) + part);
			continue;
		}

		// 보존 구간은 여는 태그부터 닫는 태그까지 한 줄로 모은다.
		if (PRESERVE_TAGS.has(name) && !isSelfClosing) {
			preserveDepth = 1;
			buffer = part;
			continue;
		}

		lines.push(INDENT.repeat(Math.max(0, depth)) + part);
		if (!isSelfClosing) depth += 1;
	}

	flush();
	return lines.join('\n');
};

export default formatHtml;
