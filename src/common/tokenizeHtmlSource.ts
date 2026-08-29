// HTML 원본 보기의 구문 강조용 토큰화.
//
// 외부 라이브러리를 쓰지 않는다 — CSP 가 `script-src 'self'` 라 CDN 은 막혀
// 있고, 이 용도에 하이라이터 의존성을 더하는 것은 과하다. 대상이 마크다운
// 파서의 산출물이라 태그 집합이 한정적이므로 이 정도로 충분하다.
//
// **불변식: 토큰 값을 이어붙이면 입력과 정확히 같다.** 강조는 표시일 뿐이라
// 글자가 사라지거나 순서가 바뀌면 안 된다. 테스트가 이것을 직접 잰다.

export type TokenKind = 'punc' | 'tag' | 'attr' | 'value' | 'text';

export interface Token {
	kind: TokenKind;
	value: string;
}

const TAG_SPLIT = /(<\/?[a-zA-Z][^>]*>)/g;

/** 태그 하나를 구두점·이름·속성·값으로 쪼갠다. */
const tokenizeTag = (tag: string, out: Token[]): void => {

	// `<` 또는 `</`
	const openLen = tag.startsWith('</') ? 2 : 1;
	out.push({ kind: 'punc', value: tag.slice(0, openLen) });

	const inner = tag.slice(openLen, tag.endsWith('/>') ? -2 : -1);
	const closePunc = tag.endsWith('/>') ? '/>' : '>';

	// 태그 이름
	const nameMatch = /^[a-zA-Z][a-zA-Z0-9]*/.exec(inner);
	const name = nameMatch ? nameMatch[0] : '';
	if (name !== '') out.push({ kind: 'tag', value: name });

	let rest = inner.slice(name.length);

	// 속성 — 이름, 등호, 따옴표 값. 매칭되지 않는 나머지는 통째로 흘려보낸다
	// (글자를 잃지 않는 것이 강조보다 우선이다).
	const ATTR = /^(\s+)([a-zA-Z-]+)(\s*=\s*)(("[^"]*")|('[^']*'))/;
	for (;;) {
		const m = ATTR.exec(rest);
		if (!m) break;
		out.push({ kind: 'text', value: m[1]! });
		out.push({ kind: 'attr', value: m[2]! });
		out.push({ kind: 'punc', value: m[3]! });
		out.push({ kind: 'value', value: m[4]! });
		rest = rest.slice(m[0].length);
	}
	if (rest !== '') out.push({ kind: 'text', value: rest });

	out.push({ kind: 'punc', value: closePunc });
};

export const tokenizeHtmlSource = (source: string): Token[] => {

	if (!source) return [];

	const out: Token[] = [];

	for (const part of source.split(TAG_SPLIT)) {
		if (part === '') continue;
		if (TAG_SPLIT.test(part) || (part.startsWith('<') && part.endsWith('>'))) {
			TAG_SPLIT.lastIndex = 0;
			tokenizeTag(part, out);
		} else {
			out.push({ kind: 'text', value: part });
		}
	}

	return out;
};

export default tokenizeHtmlSource;
