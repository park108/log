import { codeHighlighter } from './codeHighlighter';

// 표시 텍스트 escape. 본문 전체가 이 함수를 지나므로, 속성값에 넣을 때는
// 따옴표만 추가로 처리한다 (`escapeHtmlQuotes`) — 두 번 escape 하지 않기 위해서다.
// 이전에는 속성 전용 `escapeHtmlAttr` 이 `& < > " '` 를 한꺼번에 처리했는데,
// 본문 escape 가 생기면서 `&amp;` → `&amp;amp;` 가 되어 역할을 나눴다.
const escapeHtmlText = (s: unknown): string => {
	if(s === undefined || s === null) return '';
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
};

// 이미 `& < >` 가 처리된 문자열을 속성값에 넣을 때 쓴다. `escapeHtmlAttr` 을
// 그대로 쓰면 `&amp;` 가 `&amp;amp;` 로 두 번 escape 된다.
const escapeHtmlQuotes = (s: unknown): string => {
	if(s === undefined || s === null) return '';
	return String(s)
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

// 엔티티 참조 해석 (CommonMark §6.2). 이름 엔티티는 파일 끝의 `NAMED_ENTITY_TABLE`
// 에서 찾는다. 파서는 DOM 을 쓰지 않는다 — 요약(`trimmedContents`)이 DOM 없는
// 환경에서도 같은 산출을 내야 하기 때문이다 (`check:summary-drift` 가 Node 에서 돈다).
let namedEntities: Map<string, string> | undefined;

const lookupNamedEntity = (name: string): string | undefined => {
	if(undefined === namedEntities) {
		namedEntities = new Map();
		for(const entry of NAMED_ENTITY_TABLE.trim().split(/\s+/)) {
			const at = entry.indexOf(":");
			const codePoints = entry.slice(at + 1).split(".").map((hex) => parseInt(hex, 16));
			namedEntities.set(entry.slice(0, at), String.fromCodePoint(...codePoints));
		}
	}
	return namedEntities.get(name);
};

// `reference` 는 `&` 부터 `;` 까지다. 무효한 이름이면 undefined — 호출처가 글자로 남긴다.
// `&#0;` · 서로게이트 · `0x10FFFF` 초과는 U+FFFD 다.
const decodeEntityReference = (reference: string): string | undefined => {
	const body = reference.slice(1, -1);
	if("#" !== body[0]) return lookupNamedEntity(body);
	const hex = "x" === body[1] || "X" === body[1];
	const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
	if(0 === code || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return "\uFFFD";
	return String.fromCodePoint(code);
};

// Compute indentation depth of a list item line.
// - Leading tabs take precedence: 1 tab = depth+1.
// - When no leading tabs are present, floor(leading spaces / 2) = depth.
// Returns { depth, prefixLength } so the caller can strip the prefix
// before running the marker detection on the remainder.
export const computeDepth = (line: unknown): { depth: number; prefixLength: number } => {

	if(typeof line !== "string" || line.length === 0) {
		return { depth: 0, prefixLength: 0 };
	}

	let tabs = 0;
	while(tabs < line.length && '\t' === line.charAt(tabs)) {
		tabs++;
	}

	if(tabs > 0) {
		return { depth: tabs, prefixLength: tabs };
	}

	let spaces = 0;
	while(spaces < line.length && ' ' === line.charAt(spaces)) {
		spaces++;
	}

	return { depth: Math.floor(spaces / 2), prefixLength: spaces };
}

// 목록 마커 줄의 모양.
//
// `contentColumn` 은 **내용 열**이다 — 마커 줄 들여쓰기 + 마커 폭 + 뒤따르는 공백
// 수 (`- `→2 · `1. `→3 · `10. `→4). 마커 없는 블록이 이 항목에 속하는지를 이
// 값으로 판정한다. 내용 열은 **여기서만** 센다 — 귀속 판정이 두 곳에서 갈리면
// 같은 줄이 패스에 따라 항목 안팎을 오간다.
//
// 중첩 깊이(`depth`)는 내용 열과 **별개**다. 마커 줄의 중첩은 종전대로
// `computeDepth` 가 판정한다 — 둘을 합치면 `1. a\n  - b` (2칸 < 내용 열 3) 처럼
// 지금 중첩되는 입력이 평탄해진다.
interface ListMarker {
	kind: "ul" | "ol";
	depth: number;
	contentColumn: number;
}

// 목록 항목의 마커 판정. 검출 패스(`ul` · `ol`)가 쓰는 규칙과 **같은 규칙**이어야
// 한다 — 여기서 마커로 보지 않는 줄을 검출 패스가 마커로 보면 그 줄이 이어짐으로
// 흡수돼 항목이 사라진다. 마커면 그 모양을, 아니면 null 을 돌려준다.
const listMarker = (text: string): ListMarker | null => {

	const { depth, prefixLength } = computeDepth(text);
	const stripped = text.substring(prefixLength);

	let kind: "ul" | "ol";
	let width: number;

	// `- ` · `* ` (ul 검출 패스와 같은 조건)
	if(stripped.length > 1
		&& ('*' === stripped.charAt(0) || '-' === stripped.charAt(0))
		&& ' ' === stripped.charAt(1)) {
		kind = "ul";
		width = 1;
	}
	// `1. ` (ol 검출 패스와 같은 조건 — 숫자 뒤 점, 그 뒤에 공백 한 칸.
	// 점 뒤에 공백이 없는 `1.5 초` 는 마커가 아니다.)
	else if(stripped.length > 2 && /^[0-9]+\. /.test(stripped)) {
		kind = "ol";
		width = stripped.indexOf(".") + 1;
	}
	else {
		return null;
	}

	let spaces = 0;
	while(' ' === stripped.charAt(width + spaces)) spaces++;

	return { kind, depth, contentColumn: prefixLength + width + spaces };
}

// 마커면 그 줄의 깊이를, 아니면 null 을 돌려준다.
const listMarkerDepth = (text: string): number | null =>
	listMarker(text)?.depth ?? null;

// 제목 마커 판정. `# ` ~ `###### ` 의 단계를 돌려주고, 제목이 아니면 0 이다.
//
// headers 패스 안에 있던 조건을 모듈 스코프로 올린다 — 인용 패스가 "이 줄이
// 블록을 여는가" 를 물어야 하는데, 규칙을 그쪽에 다시 적으면 사본 둘이 갈라진다
// (`THEMATIC_BREAK_PATTERN` 을 올린 것과 같은 이유다). 판정은 규칙을 아는 쪽이 한다.
const headingMarkerLevel = (text: string): number => {

	let sharps = "";

	for(let i = 1; i < 7; i++) {

		sharps += "#";

		if(text.length > i && (sharps + " ") === text.substr(0, i + 1)) {
			return i;
		}
	}

	return 0;
}

// 수평선. `-`·`*`·`_` 중 하나를 **3개 이상** 반복한 줄이다.
//
// 함수 안에 있던 것을 모듈 스코프로 올려 내보낸다 — 변경 이력 강조(`Log/diffContents`)
// 가 "이 줄에 강조할 내용이 있는가" 를 물어야 하는데, 규칙을 그쪽에 다시 적으면
// 사본 둘이 갈라진다. 오늘 같은 부류를 두 번 봤다 (업로드 절차 사본, 게이트에
// 박힌 예시 값). 판정은 규칙을 아는 쪽이 한다.
export const THEMATIC_BREAK_PATTERN = /^(-{3,}|\*{3,}|_{3,})$/;

// 밑줄식 제목의 밑줄. 가로줄과 **하한이 다르다** — setext 밑줄은 1개 이상이고
// (CommonMark 0.31.2 §4.3) 가로줄은 3개 이상이다. 그리고 `*` 와 `_` 는 밑줄이
// **아니다**. 같은 자리에 두 규칙을 나란히 두는 이유가 이 차이다.
export const SETEXT_UNDERLINE_PATTERN = /^(-+|=+)$/;

// 밑줄식 제목 판정 본체. **최상위와 인용 내용이 이 함수 하나를 공유한다.**
//
// 인용 패스는 이 판정보다 **뒤에** 돌기 때문에, 인용 줄이 평탄한 값 노드로
// 확정되고 나면 그 안의 밑줄을 볼 기회가 이미 지나 있다. 그래서 인용 패스가
// 자기 내용에 대해 같은 함수를 한 번 더 부른다 — 규칙을 다시 쓰는 것이 아니라
// 같은 함수를 부르는 것이다 (`opensBlock` 이 목록·제목 규칙을 다시 쓰지 않는
// 것과 같은 원리).
const applySetextHeading = (nodes: ParsedNode[]): ParsedNode[] => {

	let index = 0;
	while(index < nodes.length) {

		const underline = nodes[index];
		const heading = nodes[index - 1];

		if(index > 0
			&& undefined !== underline
			&& undefined !== heading
			&& "value" === underline.type
			&& "" === underline.closure
			&& SETEXT_UNDERLINE_PATTERN.test(underline.text.trim())
			&& "value" === heading.type
			&& "" === heading.closure
			&& heading.text.trim().length > 0
			&& null === listMarkerDepth(heading.text)
			&& 0 === headingMarkerLevel(heading.text)
			&& !THEMATIC_BREAK_PATTERN.test(heading.text.trim())) {

			const level = ('=' === underline.text.trim().charAt(0)) ? 1 : 2;

			nodes.splice(index - 1, 2
				, {type: "tag", text: "<h" + level + ">"}
				, {type: "value", text: heading.text, closure: "header"}
				, {type: "tag", text: "</h" + level + ">"});

			index += 2;
			continue;
		}

		index++;
	}

	return nodes;
};

// 제목의 닫는 `#` 시퀀스는 표기이지 제목 글자가 아니다 (CommonMark 0.31.2 §4.2).
//
// 제목 패스가 여는 쪽만 보던 동안 `## 제목 ##` 은 `제목 ##` 을 화면에 남겼다 —
// 글쓴이가 내보내려던 적 없는 글자다.
//
// **판정 기준은 `#` 런의 바로 앞 문자다.** 그 자리가 공백·탭이면 표기이고, 아니면
// 내용이다. "줄 끝 `#` 을 지운다" 로 구현하면 `## C# 과 F#` 의 언어 이름이 잘려
// 나간다 — 지금 맞는 것을 깨는 방향이며, 두 축은 함께 성립해야 한다.
//
// 닫는 개수는 여는 쪽과 무관하다 (`## 제목 #` 도 `## 제목 ######` 도 표기다).
export const stripHeadingClosingSequence = (content: string): string => {

	// 줄 끝 공백도 제목 내용이 아니다. 닫는 시퀀스 뒤에 붙은 공백을 먼저 걷어야
	// 런이 줄 끝에 닿는다.
	let text = content.replace(/[ \t]+$/, "");

	const closing = /(?:^|[ \t])#+$/.exec(text);

	if(null !== closing) {
		text = text.substring(0, closing.index).replace(/[ \t]+$/, "");
	}

	return text;
}

// 펜스 코드 블록의 여는 펜스.
interface CodeFence {
	char: string;   // '`' 또는 '~'
	length: number; // 펜스 문자 개수 (3 이상)
	indent: number; // 여는 펜스 앞 공백 칸 수 (0~3)
	info: string;   // 정보 문자열 (앞뒤 공백 제외) — 언어 표기로 쓴다
}

// 펜스 줄 하나. 앞 공백 0~3칸 · 같은 문자 3개 이상 · 나머지. 여는 줄과 닫는 줄이
// **이 정규식 하나**를 공유한다 — 사본을 두면 여는 쪽과 닫는 쪽이 조용히 갈린다.
// 나머지를 `.` 이 아니라 `[\s\S]` 로 받는 것은 줄 끝 `\r` 때문이다.
const FENCE_LINE = /^( {0,3})(`{3,}|~{3,})([\s\S]*)$/;

// 물결 펜스의 정보 문자열은 비었거나 **언어 이름 꼴**이어야 한다.
//
// CommonMark 는 제한하지 않는다. 그러나 정보 문자열은 화면에 나가지 않으므로,
// 표준대로면 한국어 늘임 표기로 시작하는 산문 줄(`~~~ 그렇구나`)이 통째로 사라지고
// 닫는 펜스가 없으면 문서 끝까지가 코드가 된다.
const TILDE_FENCE_INFO = /^[A-Za-z]\S*$/;

// 펜스 판정 — 여는 줄. 펜스면 그 모양을, 아니면 null 을 돌려준다.
//
// 이전 판정은 "trim 한 줄의 앞 3자가 백틱" 이었다. 그래서 들여쓰기 깊이와 무관하게
// 열렸고, 닫는 줄은 여는 펜스 길이와 무관하게 정확히 백틱 3개였으며, 물결 펜스는
// 인식하지 않았고, 정보 문자열에 백틱이 있어도 열렸다 — `` ```인라인``` 문장 `` 한
// 줄이 문서 끝까지를 코드로 만들고 그 줄의 글자는 언어 자리라 화면에 나가지 않았다.
//
// **줄 문자열 하나만 받는다.** 인용·목록 항목 안에서도 같은 판정을 부르기 때문이다
// — 최상위 패스의 상태(노드 배열 위치 등)에 묶이면 그쪽에서 사본을 만들게 된다.
const codeFenceOpening = (line: string): CodeFence | null => {

	const match = FENCE_LINE.exec(line);
	if(null === match) return null;

	const run = match[2] as string;
	const char = run.charAt(0);
	const info = (match[3] as string).trim();

	// 백틱 펜스의 정보 문자열에 백틱이 있으면 펜스가 아니다 — 인라인 코드다.
	if('`' === char && info.includes('`')) return null;

	if('~' === char && "" !== info && !TILDE_FENCE_INFO.test(info)) return null;

	return { char, length: run.length, indent: (match[1] as string).length, info };
}

// 펜스 판정 — 닫는 줄. 여는 펜스와 **같은 문자**이고 **개수가 같거나 많으며**
// 뒤에 공백밖에 없는 펜스 줄만 닫는다. 그보다 짧거나 다른 문자의 펜스 줄은
// 코드 내용이다 — 코드 블록 안에 펜스를 적어 보이려면 바깥 펜스를 길게 쓴다.
const closesCodeFence = (fence: CodeFence, line: string): boolean => {

	const match = FENCE_LINE.exec(line);
	if(null === match) return false;

	const run = match[2] as string;

	return fence.char === run.charAt(0)
		&& run.length >= fence.length
		&& "" === (match[3] as string).trim();
}

// 줄 머리 공백을 **최대** `max` 칸 걷는다. 그보다 깊은 들여쓰기는 남는다.
// 펜스 안 내용 줄(여는 펜스 들여쓰기)과 목록 항목 안 줄(내용 열)이 함께 쓴다.
const stripLeadingSpaces = (line: string, max: number): string => {

	let strip = 0;
	while(strip < max && ' ' === line.charAt(strip)) strip++;

	return line.substring(strip);
}

// 펜스 안 내용 줄. 여는 펜스가 N칸 들여쓰여 있으면 각 줄에서 **최대** N칸 걷는다
// — 그보다 깊은 들여쓰기는 코드의 것이다.
const codeFenceContent = (fence: CodeFence, line: string): string =>
	stripLeadingSpaces(line, fence.indent);

interface ParsedNode {
	type: string;
	text: string;
	closure?: string;
	itemOf?: string;
	depth?: number;
	// 펜스 패스가 세운 노드의 원래 줄. 목록 항목 안의 코드 블록은 그 항목의 내용
	// 열을 걷은 줄로 다시 판정해야 하는데, 최상위 펜스 패스는 목록을 모른 채
	// 먼저 돌므로 원래 줄을 들고 있어야 되돌릴 수 있다.
	source?: string;
	// 번호 목록 항목의 마커 번호 (10진 정규화한 숫자 문자 — `003.` → `3`).
	// `bindListItem` 이 목록을 여는 자리에서 첫 항목의 이 값으로 `start` 를 정한다.
	ordinal?: string;
}

// 빈 줄 노드 — 공백·탭만 있는 줄을 포함한다. 코드 블록 안의 줄(`closure: "pre"`)은
// 사용자 글자이므로 제외한다. **이 술어는 파서 안에 하나다** — 목록 결합 패스와
// 항목 이어짐 패스가 함께 쓴다.
const isBlankLine = (n: ParsedNode): boolean =>
	n.type === "value" && n.closure === "" && n.text.trim() === "";

// 펜스 코드 블록 패스 본체. **최상위와 인용 내용이 이 함수 하나를 공유한다.**
//
// 최상위 패스는 인용 패스보다 먼저 돌고 `>` 로 시작하는 줄은 펜스가 아니므로,
// 인용 안의 펜스는 최상위에서 볼 기회가 없다. 그래서 인용 패스가 자기 내용에
// 대해 이 함수를 한 번 더 부른다 — `applySetextHeading` 과 같은 원리다. 인용 안에서
// 펜스 판정을 다시 쓰면 판정이 둘로 갈라진다 (`` ```인라인``` `` 이 인용 안에서만
// 코드 블록을 여는 식으로).
//
// 코드 줄은 `closure: "pre"` 로 세운다 — 뒤따르는 escape·인라인 패스가 모두 이
// 값을 건너뛰므로 코드 줄은 escape 와 하이라이트만 거친다. 닫히지 않은 펜스는
// 배열 끝에서 닫는다 (인용 안이면 인용이 끝나는 자리다).
const applyCodeFence = (nodes: ParsedNode[]): ParsedNode[] => {

	let fence: CodeFence | null = null;

	for(let index = 0; index < nodes.length; index++) {

		const node = nodes[index] as ParsedNode;

		const opening: CodeFence | null = (null === fence && "value" === node.type && "" === node.closure)
			? codeFenceOpening(node.text) : null;

		if(null !== opening) {

			nodes.splice(index, 1, {type: "tag", text: "<pre>", closure: "pre", source: node.text});

			fence = opening;
		}
		else if(null !== fence
			&& "value" === node.type
			&& "" === node.closure
			&& closesCodeFence(fence, node.text)) {

			nodes.splice(index, 1, {type: "tag", text: "</pre>", closure: "pre", source: node.text});

			fence = null;
		}
		else if(null !== fence) {

			// 코드 블록도 사용자 글자다. escape 하지 않으면 `List<String>` 이
			// sanitize 단계에서 미지의 태그로 삭제돼 `List` 만 남았다 (실측).
			// 강조기가 <span> 을 넣으므로 **넘기기 전에** escape 한다.
			// 물결 펜스도 같은 강조기 경로를 탄다 — 언어 표기는 펜스 문자와 무관하다.
			const text = codeHighlighter(fence.info, escapeHtmlText(codeFenceContent(fence, node.text)));

			nodes.splice(index, 1
				, {type: "value", text: text + "<br />", closure: "pre", source: node.text});
		}
	}

	if(null !== fence) {
		nodes.push({type: "tag", text: "</pre>", closure: "pre"});
	}

	return nodes;
};

// 강조 구간 표식 — 호출처(`Log/diffContents`)가 끼우고 이 파서가 태그로 되돌린다.
// 마크업 문자를 쓰지 않으므로 본문 escape 를 통과한다.
export const HIGHLIGHT_OPEN = "\uE002";
export const HIGHLIGHT_CLOSE = "\uE003";
export const HIGHLIGHT_CLASS = "span--logitem-changed";

// 목록 항목에 이어지는 줄의 구조 표식.
//
// 이어짐은 **줄이 아니라 항목의 내용**이 돼야 하므로 검출 패스에 닿기 전에 마커
// 줄로 흡수된다 (그래야 `bindListItem` 이 비-list 노드를 보고 목록을 닫지 않는다).
// 흡수된 자리에 태그를 바로 쓸 수는 없다 — 본문 escape 가 그 꺾쇠를 글자로 만든다.
// 코드 스팬·강조 표식과 같은 수를 쓴다: 마크업 문자가 아닌 private-use 문자로
// 표시했다가 모든 인라인 패스가 끝난 뒤 태그로 되돌린다.
const ITEM_BREAK = "\uE004";
const ITEM_QUOTE_OPEN = "\uE005";
const ITEM_QUOTE_CLOSE = "\uE006";

export const markdownToHtml = (rawInput: string): string => {

	// inline code 보호에 쓰는 자리표시자와 같은 문자가 입력에 있으면 복원 단계가
	// 사용자 글자를 코드 스팬으로 오치환한다 (실측: `\uE000c9\uE001` → `<code></code>`).
	// private-use 영역은 아이콘 폰트가 쓰므로 붙여넣기로 유입될 수 있다. 입력에서
	// 먼저 걷어 충돌 가능성 자체를 없앤다 — 이 두 코드포인트는 본문에서 의미가 없다.
	const input = rawInput.replace(/[\uE000\uE001\uE004\uE005\uE006]/g, "");

	// 강조 구간 표식. 호출처가 "이 범위를 강조해 달라" 고 표시하는 유일한 수단이다.
	//
	// 본문 escape 가 생기면서 호출처가 `<span>` 을 직접 끼워 넣던 방법이 막혔다 —
	// 그 꺾쇠도 사용자 글자와 구별되지 않으므로 escape 된다 (Change History 의
	// 변경 줄 강조가 실제로 그렇게 글자로 보였다). 마크업 문자를 쓰지 않는
	// 표식이라야 escape 를 통과한다. 코드 스팬 자리표시자와 같은 원리다.
	//
	// 짝: `src/Log/diffContents.ts` 가 이 두 문자를 끼우고, 아래 복원 단계가
	// 태그로 되돌린다. 클래스 이름은 그쪽 CSS 와 같은 문자열이다.

	let parsed: ParsedNode[] = [];
	let str = input;
	let prev = 0;

	// Separate line by line
	for(let i = 0; i < input.length; i++) {

		if('\n' === input.charAt(i)) {

			parsed.push({type: "value", text: input.substring(prev, i), closure: ""});
			prev = i + 1;
		}
	}
	if(prev < input.length) {
		
		parsed.push({type: "value", text: input.substring(prev, input.length), closure: ""});
	}

	// pre — 펜스 판정은 `codeFenceOpening` · `closesCodeFence` 가 진다.
	parsed = applyCodeFence(parsed);

	let index = 0;

	// 밑줄식(setext) 제목. 문단 바로 밑에 `-` 또는 `=` 만으로 이뤄진 줄이 오면
	// 그 문단이 제목이다 (CommonMark 0.31.2 §4.3).
	//
	// 이것이 없을 때 `제목\n---` 은 `<p>제목</p><hr />` 이었다 — 화면에는 글자와 그
	// 아래 선이 나타나 글쓴이가 의도한 것과 비슷해 보이므로 **아무도 신고하지 않은 채**
	// 목차·스크린리더·검색엔진에서 제목만 조용히 사라진다. `===` 는 어느 패스도
	// 인식하지 않아 독자가 `===` 를 글자로 봤다.
	//
	// 위험한 쪽은 과소 인식이 아니라 **과잉 인식**이다. 앞 줄을 보지 않고 밑줄만 보면
	// 기존 글의 가로줄이 전부 제목이 된다. 그래서 앞 줄 조건을 좁게 든다 — 빈 줄이
	// 아니고 · 목록 마커가 아니고 · 그 자체가 가로줄이나 제목이 아닌 **문단 줄**.
	// (`밑줄식 제목은 가로줄을 가로채지 않는다` 게이트가 그 다섯 자리를 지킨다.)
	//
	// 밑줄은 **1개 이상**이다. 가로줄의 하한(3개)을 밑줄에 그대로 재사용하면
	// `제목\n--` 이 남아 독자가 `--` 를 본다.
	//
	// 가로줄 판정보다 **먼저** 돈다 — 뒤에 돌면 `---` 이 이미 `<hr />` 이라 앞 줄을
	// 볼 기회가 없다.
	//
	// 판정을 **노드 배열 하나에 대한 함수**로 둔다. 최상위 줄들과 인용 내용이
	// 같은 함수를 부르므로 같은 표기가 인용 안팎에서 같게 동작한다 — 인용 안에서만
	// 도는 축소판 판정을 만들면 그 둘이 조용히 갈린다.
	parsed = applySetextHeading(parsed);

	// hr
	//
	// 이전에는 정확히 3자인 `---` 만 인식했다. CommonMark 는 `-` · `*` · `_` 세 문자
	// 모두를 **3개 이상** 반복하면 수평선으로 규정한다. 그래서 `***` 는 수평선이
	// 되지 못한 채 emphasis 파서에 걸려 `<em></em>*` 라는 깨진 출력을 냈다
	// (실측 2026-08-30). `___` 도 같은 부류였다.
	index = 0;
	for(const node of parsed) {

		if("value" === node.type
			&& "" === node.closure
			&& THEMATIC_BREAK_PATTERN.test(node.text.trim())) {

			parsed.splice(index, 1
				, {type: "tag", text: "<hr />", closure: "hr"});
		}
		index++;
	}

	// blockquote — **연달아 붙은 인용 줄은 한 덩어리다.**
	//
	// 줄마다 `<blockquote>` 를 따로 열고 닫았다. 인용에는 좌측 선과 아래 여백이
	// 붙으므로(`styles/typography.css`), 세 줄짜리 인용 하나가 화면에서는 서로
	// 떨어진 인용 **셋**으로 보인다. 실측 (Chrome, 375px, 실제 CSS):
	//
	//   3줄 인용 — 줄마다 blockquote   전체 높이 144.72 (34.38 짜리 상자 3개 + 사이 여백)
	//   3줄 인용 — 하나의 blockquote   전체 높이  93.56
	//
	// 빈 줄은 이 묶음을 끊는다 — CommonMark 에서도 그 자리가 인용의 경계다.
	//
	// `>` 뒤의 공백 한 칸은 표기이지 내용이 아니다. 남겨 두면 인용문만 한 칸씩
	// 들여쓰인 것처럼 보인다.
	const isQuoteLine = (node: ParsedNode | undefined): boolean =>
		undefined !== node
		&& "value" === node.type
		&& "" === node.closure
		&& node.text.length > 0
		&& '>' === node.text.charAt(0);

	// 인용 줄의 내용이 **블록을 여는 줄**인가.
	//
	// 인용 안에 쓴 목록·제목·중첩 인용이 글자로 보였다. 인용 패스가 줄들을 평탄한
	// 값 노드로 확정해 버려서 뒤에 도는 블록 패스들이 그 안의 마커를 보지 못한
	// 것이다. 인라인 패스는 값 노드의 **본문**에 적용되므로 정상 동작했고,
	// 그 비대칭이 이 결함의 진단이었다.
	//
	// 규칙은 여기서 다시 쓰지 않는다. 목록은 `listMarkerDepth`, 제목은
	// `headingMarkerLevel`, 중첩 인용은 `>` — 전부 최상위와 같은 판정이다.
	const opensBlock = (text: string): boolean =>
		'>' === text.charAt(0)
		|| null !== listMarkerDepth(text)
		|| headingMarkerLevel(text) > 0;

	index = 0;
	while(index < parsed.length) {

		if(!isQuoteLine(parsed[index])) {
			index++;
			continue;
		}

		let end = index;
		while(isQuoteLine(parsed[end + 1])) end++;

		// 인용 내용을 먼저 **평범한 줄들로** 세운 뒤 밑줄식 제목 판정을 그 배열에
		// 적용한다. 이 패스는 최상위 setext 판정보다 뒤에 돌므로, 여기서 부르지
		// 않으면 인용 안의 밑줄은 볼 기회가 이미 지나 있다 — 실제로 `> 제목`
		// 아래 `> ---` 이 **글자 세 개로 독자에게 보였다.** ATX 제목(`> # 제목`)은
		// 되던 자리라 표기에 따라 제목이 되기도 안 되기도 했다.
		const inner: ParsedNode[] = [];
		for(let i = index; i <= end; i++) {
			let text = (parsed[i] as ParsedNode).text.substring(1);
			if(' ' === text.charAt(0)) text = text.substring(1);
			inner.push({type: "value", text, closure: ""});
		}

		// 펜스 코드 블록을 밑줄식 제목보다 **먼저** 세운다 — 최상위 순서와 같다.
		// 코드 안의 `---` 가 앞 줄을 제목으로 만들면 안 된다. 세워진 `pre` 노드는
		// 아래 루프에서 블록 갈래로 그대로 실린다.
		applyCodeFence(inner);
		applySetextHeading(inner);

		const replacement: ParsedNode[] = [{type: "tag", text: "<blockquote>"}];
		let previousWasPlain = false;

		for(const node of inner) {

			if("value" === node.type && "" === node.closure && !opensBlock(node.text)) {
				// 블록이 없는 줄들은 종전대로 한 덩어리 안에서 `<br />` 로 이어진다.
				// **이 자리가 (I5) 다** — 줄마다 블록 판정을 붙이는 구현이 정확히
				// 여기서 평탄 인용을 쪼갠다.
				if(previousWasPlain) replacement.push({type: "tag", text: "<br />"});
				replacement.push({type: "value", text: node.text, closure: "blockquote"});
				previousWasPlain = true;
			}
			else {
				// 블록을 여는 줄은 **평범한 줄로 되돌려** 뒤따르는 최상위 패스
				// (`ul` · `ol` · `bindListItem` · headers · 이 인용 패스 자신) 가
				// 처리하게 한다. 인용 안에서만 도는 축소판 파서를 만들면 같은 표기가
				// 인용 안팎에서 다르게 동작한다. 밑줄식 제목이 만들어 낸 태그 노드도
				// 이 갈래로 그대로 실린다.
				replacement.push(node);
				previousWasPlain = false;
			}
		}

		replacement.push({type: "tag", text: "</blockquote>"});

		parsed.splice(index, end - index + 1, ...replacement);

		// 넣은 내용을 **다시 훑는다**. 중첩 인용(`> > 안쪽`) 이 그 자리에서 다시
		// 열리는 것이 이 재훑기다 — `>` 가 한 겹씩 벗겨지므로 반드시 끝난다.
		index += 1;
	}

	// 파이프 표.
	//
	// `| 이름 | 값 |` 로 쓴 표가 **줄 수만큼의 문단**으로 쪼개져 파이프 문자와
	// 구분선(`|---|---|`) 까지 독자에게 보였다.
	//
	// **구분선 행 요구가 이 축의 절반이다.** 파이프가 든 문단을 전부 표로 만들면
	// 피해 범위가 표 표기를 쓴 글보다 **넓다** — 산문 속 파이프(`명령은 a | b 이다`)
	// 는 흔하다. 그래서 머리 행 **바로 다음 줄**이 구분선 행이고 **셀 수가 같을 때만**
	// 표로 읽는다.
	//
	// 셀 안의 `\|` 는 셀을 가르지 않는다. 백슬래시 이스케이프 패스는 이보다 **뒤에**
	// 돌므로 이 패스는 자리표시자가 아니라 **날것의 `\|`** 를 본다 — 표기를 그대로
	// 넘겨 그쪽이 글자로 되돌리게 한다. 표 패스를 이스케이프 뒤로 옮기는 방향은
	// 코드 스팬·이스케이프의 현 계약이 기대는 순서를 깬다.
	//
	// 셀 본문은 값 노드로 남긴다 — 뒤따르는 인라인 패스가 강조·코드 스팬·링크를
	// 종전대로 처리한다. 축소판 인라인 파서를 여기에 두지 않는다.
	const splitTableCells = (line: string): string[] => {

		const cells: string[] = [];
		let current = "";

		for(let i = 0; i < line.length; i++) {

			const character = line.charAt(i);

			if('\\' === character && '|' === line.charAt(i + 1)) {
				current += "\\|";
				i++;
				continue;
			}

			if('|' === character) {
				cells.push(current);
				current = "";
				continue;
			}

			current += character;
		}

		cells.push(current);

		// 줄 양끝의 파이프가 만드는 빈 칸은 표기이지 셀이 아니다.
		if(cells.length > 0 && 0 === (cells[0] as string).trim().length) cells.shift();
		if(cells.length > 0 && 0 === (cells[cells.length - 1] as string).trim().length) cells.pop();

		return cells.map((cell) => cell.trim());
	};

	// 구분선 셀. 정렬 표기(`:--` · `--:` · `:-:`) 도 구분선이다.
	const DELIMITER_CELL_PATTERN = /^:?-+:?$/;

	const isTableLine = (node: ParsedNode | undefined): boolean =>
		undefined !== node
		&& "value" === node.type
		&& "" === node.closure
		&& node.text.includes("|");

	const isDelimiterRow = (node: ParsedNode | undefined, cellCount: number): boolean => {

		if(!isTableLine(node)) return false;

		const cells = splitTableCells((node as ParsedNode).text);

		return cells.length === cellCount
			&& cells.length > 0
			&& cells.every((cell) => DELIMITER_CELL_PATTERN.test(cell));
	};

	// 구분선 셀의 정렬 표기가 그 열의 정렬이다 — `:--` 왼쪽 · `:-:` 가운데 · `--:` 오른쪽.
	//
	// 구분선으로 인정만 하고 셀에 아무것도 싣지 않았을 때는 전역 `th, td` 규칙
	// (`text-align: left`) 아래에서 모든 열이 왼쪽으로 보였다.
	//
	// 표지는 `class` 다. `style`·`align` 은 정제 정책(`sanitizeHtml`)을 넓혀야 하고,
	// `align` 은 넣어도 작성자 CSS 가 이겨 여전히 왼쪽이다. 규칙은
	// `styles/typography.css` 의 표 절에 있다 — 파서 산출은 CSS 모듈의 해시 이름이
	// 닿지 않으므로 전역 이름이다.
	//
	// 표기 없는 열(`---`)은 null — 속성을 내지 않는다. 정렬 표기가 없는 표의 산출은
	// 종전과 같다.
	const delimiterAlignClass = (cell: string): string | null => {

		const left = ':' === cell.charAt(0);
		const right = ':' === cell.charAt(cell.length - 1);

		if(left && right) return "cell--align-center";
		if(right) return "cell--align-right";
		if(left) return "cell--align-left";

		return null;
	};

	const openCellTag = (tagName: string, alignClass: string | null | undefined): string =>
		(null === alignClass || undefined === alignClass)
			? "<" + tagName + ">"
			: "<" + tagName + " class=\"" + alignClass + "\">";

	index = 0;
	while(index < parsed.length) {

		const header = parsed[index];

		if(!isTableLine(header)) {
			index++;
			continue;
		}

		const headerCells = splitTableCells((header as ParsedNode).text);

		if(0 === headerCells.length || !isDelimiterRow(parsed[index + 1], headerCells.length)) {
			index++;
			continue;
		}

		let end = index + 1;
		while(isTableLine(parsed[end + 1])) end++;

		// 열 대응은 **위치**다 — 본문 행의 셀 수가 머리 행과 달라도 k 번째 셀은 구분선
		// k 번째 셀의 정렬을 받는다. 구분선보다 많은 셀은 정렬이 없다.
		const alignClasses = splitTableCells((parsed[index + 1] as ParsedNode).text)
			.map(delimiterAlignClass);

		const replacement: ParsedNode[] = [
			{type: "tag", text: "<table>"}
			, {type: "tag", text: "<thead>"}
			, {type: "tag", text: "<tr>"}
		];

		for(let column = 0; column < headerCells.length; column++) {
			replacement.push({type: "tag", text: openCellTag("th", alignClasses[column])});
			replacement.push({type: "value", text: headerCells[column] as string, closure: "cell"});
			replacement.push({type: "tag", text: "</th>"});
		}

		replacement.push({type: "tag", text: "</tr>"});
		replacement.push({type: "tag", text: "</thead>"});

		if(end > index + 1) {

			replacement.push({type: "tag", text: "<tbody>"});

			for(let i = index + 2; i <= end; i++) {

				replacement.push({type: "tag", text: "<tr>"});

				const rowCells = splitTableCells((parsed[i] as ParsedNode).text);

				for(let column = 0; column < rowCells.length; column++) {
					replacement.push({type: "tag", text: openCellTag("td", alignClasses[column])});
					replacement.push({type: "value", text: rowCells[column] as string, closure: "cell"});
					replacement.push({type: "tag", text: "</td>"});
				}

				replacement.push({type: "tag", text: "</tr>"});
			}

			replacement.push({type: "tag", text: "</tbody>"});
		}

		replacement.push({type: "tag", text: "</table>"});

		parsed.splice(index, end - index + 1, ...replacement);
		index += replacement.length;
	}

	// 목록 항목에 이어지는 마커 없는 줄은 **그 항목의 내용**이다 (CommonMark 0.31.2
	// §5.2 continuation line). **들여쓰기는 조건이 아니다** — 같은 절의 lazy
	// continuation 이 문단 계속에 한해 들여쓰기 요구를 면제한다. 목록을 쓰다 줄이
	// 길어져 그냥 엔터를 친 표기가 그것이며, 들여쓰기를 요구하면 그 줄이 목록을
	// 쪼개고 번호 목록은 `<ol>` 이 다시 열려 **독자가 `1.` 을 두 번 본다**.
	//
	// 넓히는 것은 검출 패스의 **입력**이다. 이어짐을 검출 뒤에 처리하면 이미
	// `bindListItem` 의 `flushAll()` 이 목록을 닫은 뒤라 늦다 — 마커 없는 줄은
	// 비-list 노드로 도착하고, 그것이 열린 목록을 전부 닫는 것이 이 결함의 원인이다.
	// 그래서 검출 전에 앞선 마커 줄로 흡수한다. 흡수되면 그 줄은 배열에서 사라지므로
	// 목록이 끊길 이유 자체가 없어진다 — 번호 목록의 `<ol>` 이 다시 열리지 않는 것도
	// 같은 이유다 (그렇지 않으면 독자가 `1.` 을 두 번 본다).
	//
	// 들여쓰기는 표기이지 내용이 아니므로 걷어낸다 (`computeDepth` — 공백으로 쓰든
	// 탭으로 쓰든 같은 결과). 걷어내기만 할 뿐 **바로 이어지는 문단 줄의 판정에는
	// 쓰지 않는다** (빈 줄 뒤 · 코드 블록 뒤의 귀속과 항목 안 펜스는 아래 예외).
	//
	// 남는 판정 조건은 둘뿐이다.
	//   - **열린 항목이 있을 것.** 앞선 마커 줄이 없는 줄은 그대로 문단이다
	//     (`markdownToHtml("  hello")` → `<p>  hello</p>`). 들여쓰기를 빼면서 이
	//     조건까지 빼면 그 대조가 깨진다.
	//   - **줄이 비어 있지 않을 것.** 빈 줄은 이어짐이 아니라 목록의 경계다
	//     (`1. 하나` / 빈 줄 / `문단` 은 한 항목이 아니다). lazy continuation 의
	//     면제는 문단 계속에 한하며 빈 줄에는 적용되지 않는다.
	//
	// **내용 열까지 들여쓴 블록은 예외다** (spec `markdown-rendering` §19). 빈 줄
	// 뒤에 와도 그 항목 안에 있다. 없던 동안 항목 사이에 코드 블록이나 둘째 문단을
	// 넣으면 목록이 끊기고 번호가 되감겼다 — 독자는 `1.` 을 두 번 봤다. 들여쓰기는
	// 여기서만 판정에 쓰인다: 기준은 `listMarker` 가 센 내용 열 하나다.
	{
		const merged: ParsedNode[] = [];

		// 열린 항목. `target` 은 이어지는 줄이 붙는 값 노드다 — 처음에는 마커 줄
		// 자신이고, 항목 안 코드 블록 뒤에는 없다 (그 뒤 문단 줄이 새 노드를 연다).
		let openItem: { marker: ListMarker; target: ParsedNode | null } | null = null;
		let isQuoteOpen = false;

		// 인용은 블록이라 열면 닫아야 한다. 이어짐이 끝나는 자리는 다섯 곳이다 —
		// 인용 아닌 이어짐 · 다음 마커 줄 · 이어짐이 아닌 줄 · 항목 안 블록 · 입력의 끝.
		const closeQuote = (): void => {
			if(isQuoteOpen && null !== openItem && null !== openItem.target) {
				openItem.target.text += ITEM_QUOTE_CLOSE;
			}
			isQuoteOpen = false;
		};

		// 열린 항목의 내용 열까지 들여썼는가 — 마커 없는 블록의 귀속 판정.
		const reachesContentColumn = (text: string): boolean => {
			if(null === openItem) return false;
			const column = openItem.marker.contentColumn;
			return text.length - stripLeadingSpaces(text, column).length === column;
		};

		// 최상위 펜스 패스가 세운 코드 블록의 여는 노드.
		const isFenceOpenNode = (n: ParsedNode | undefined): n is ParsedNode & { source: string } =>
			undefined !== n
			&& "tag" === n.type
			&& "pre" === n.closure
			&& "<pre>" === n.text
			&& undefined !== n.source;

		// 열린 항목 안에 있는 블록인가 — 내용 열까지 들여쓴 펜스로 연 코드 블록,
		// 또는 내용 열까지 들여쓴 마커 없는 줄. 빈 줄 뒤에서도 이 판정이 같다.
		const belongsToOpenItem = (n: ParsedNode | undefined): boolean => {
			if(isFenceOpenNode(n)) return reachesContentColumn(n.source);
			return undefined !== n
				&& "value" === n.type
				&& "" === n.closure
				&& !isBlankLine(n)
				&& null === listMarker(n.text)
				&& reachesContentColumn(n.text);
		};

		for(let index = 0; index < parsed.length; index++) {

			// 항목 안 코드 블록을 원래 줄로 되돌린다. 최상위 펜스 패스는 목록을 모르고
			// 먼저 돌았다 — 0~3칸 펜스는 이미 `pre` 노드로, 4칸 이상 펜스는 (최상위에선
			// 펜스가 아니므로) 값 노드로 여기 도착한다. 되돌려 두면 두 경로가 아래의
			// 같은 판정(내용 열을 걷은 줄에 대고 부르는 펜스 판정)을 지난다.
			if(null !== openItem && isFenceOpenNode(parsed[index]) && belongsToOpenItem(parsed[index])) {

				let end = index + 1;
				while(end < parsed.length
					&& !("tag" === (parsed[end] as ParsedNode).type && "</pre>" === (parsed[end] as ParsedNode).text)) {
					end++;
				}

				const lines: ParsedNode[] = [];
				for(const n of parsed.slice(index, end + 1)) {
					if(undefined !== n.source) lines.push({type: "value", text: n.source, closure: ""});
				}

				parsed.splice(index, end - index + 1, ...lines);
			}

			const node = parsed[index] as ParsedNode;

			// 빈 줄 뒤가 이 항목 안의 블록이면 빈 줄은 항목 안에서 투명하다 — 같은
			// 종류 목록 사이의 빈 줄(§6)과 같다. 빈 줄은 항목 안 인용을 끝낸다.
			if(null !== openItem && isBlankLine(node)) {

				let next = index + 1;
				while(next < parsed.length && isBlankLine(parsed[next] as ParsedNode)) next++;

				if(belongsToOpenItem(parsed[next])) {
					closeQuote();
					index = next - 1;
					continue;
				}
			}

			// 이미 다른 패스가 가져간 줄(코드 블록 · 수평선 · 줄 머리 인용)은
			// 이어짐의 대상도 시작점도 아니다.
			if("value" !== node.type || "" !== node.closure) {
				closeQuote();
				openItem = null;
				merged.push(node);
				continue;
			}

			const marker = listMarker(node.text);

			if(null !== marker) {
				closeQuote();
				openItem = { marker, target: node };
				merged.push(node);
				continue;
			}

			const item = openItem;

			// 항목 안 펜스 코드 블록. 펜스 판정은 **내용 열을 걷은 줄**에 댄다 —
			// 최상위와 같은 판정 함수다. 코드 줄도 내용 열까지 걷히고 그 너머의
			// 들여쓰기는 코드의 것이다 (§9). 닫는 펜스까지가 블록이다.
			const fence = (null !== item && reachesContentColumn(node.text))
				? codeFenceOpening(stripLeadingSpaces(node.text, item.marker.contentColumn))
				: null;

			if(null !== item && null !== fence) {

				const column = item.marker.contentColumn;
				const inner: ParsedNode[] = [{type: "value", text: stripLeadingSpaces(node.text, column), closure: ""}];

				while(index + 1 < parsed.length) {

					const next = parsed[index + 1] as ParsedNode;
					if("value" !== next.type || "" !== next.closure) break;

					const text = stripLeadingSpaces(next.text, column);
					inner.push({type: "value", text, closure: ""});
					index++;

					if(closesCodeFence(fence, text)) break;
				}

				closeQuote();

				// 항목의 종류·깊이를 달아 두면 `bindListItem` 이 이 블록을 열린 `<li>`
				// 안으로 흘려보낸다 — 비-list 노드로 도착해 `flushAll()` 로 목록을
				// 닫던 것이 번호가 되감기던 원인이었다.
				for(const block of applyCodeFence(inner)) {
					merged.push({...block, itemOf: item.marker.kind, depth: item.marker.depth});
				}

				item.target = null;
				continue;
			}

			const { prefixLength } = computeDepth(node.text);
			const stripped = node.text.substring(prefixLength);

			// 코드 블록 뒤에는 이어 붙일 문단이 없다 — 내용 열까지 들여쓴 줄만 그
			// 항목에 새 문단을 연다. 게으른 이어짐은 문단 뒤에만 있다.
			const isContinuation = null !== item
				&& stripped.trim().length > 0
				&& (null !== item.target || reachesContentColumn(node.text));

			if(!isContinuation) {
				closeQuote();
				openItem = null;
				merged.push(node);
				continue;
			}

			if(null === item.target) {
				item.target = {type: "value", text: "", itemOf: item.marker.kind, closure: "li", depth: item.marker.depth};
				merged.push(item.target);
			}

			const target = item.target;

			if('>' === stripped.charAt(0)) {

				// `>` 뒤 공백 한 칸은 표기다 — 줄 머리 인용 패스와 같은 규칙.
				let quoted = stripped.substring(1);
				if(' ' === quoted.charAt(0)) quoted = quoted.substring(1);

				// 연달아 붙은 인용 줄은 한 덩어리다 (줄 머리 인용과 같다).
				target.text += isQuoteOpen ? ITEM_BREAK + quoted : ITEM_QUOTE_OPEN + quoted;
				isQuoteOpen = true;
			}
			else {
				closeQuote();
				target.text += ("" === target.text ? "" : ITEM_BREAK) + stripped;
			}
		}

		closeQuote();
		parsed = merged;
	}

	// unordered list
	index = 0;
	for(let node of parsed) {

		if("value" === node.type
			&& "" === node.closure
			&& node.text.length > 1) {

			const { depth, prefixLength } = computeDepth(node.text);
			const stripped = node.text.substring(prefixLength);

			if(stripped.length > 1
				&& ('*' === stripped.charAt(0) || '-' === stripped.charAt(0))
				&& ' ' === stripped.charAt(1)) {

				parsed.splice(index, 1
					, {type: "tag", text: "<li>", itemOf: "ul", depth: depth}
					, {type: "value", text: stripped.substring(2), itemOf: "ul", closure: "li", depth: depth}
					, {type: "tag", text: "</li>", itemOf: "ul", depth: depth});
			}
		}

		index++;
	}

	// ordered list
	index = 0;
	let isDot = false;
	for(let node of parsed) {

		if("value" === node.type
			&& "" === node.closure
			&& node.text.length > 2) {

			const { depth, prefixLength } = computeDepth(node.text);
			const stripped = node.text.substring(prefixLength);

			if(stripped.length > 2 && isNumeric(stripped.charAt(0))) {

				for(let i = 1; i < stripped.length; i++) {

					if(!isDot && isNumeric(stripped.charAt(i))) {
						continue;
					}
					else if(!isDot && '.' === stripped.charAt(i)) {
						isDot = true;
						continue;
					}
					else if(!isDot && !isNumeric(stripped.charAt(i))) {
						break;
					}
					else if(isDot && ' ' === stripped.charAt(i)) {

						// 마커 번호는 점 앞의 숫자들이다. 앞자리 0 은 걷는다 (`003` → `3` ·
						// `0` → `0`). 수로 바꾸지 않고 문자로 걷는 것은 큰 번호가 지수
						// 표기로 바뀌지 않게 하기 위해서다 — 값은 숫자 문자만 담는다.
						const ordinal = stripped.substring(0, i - 1).replace(/^0+(?=[0-9])/, "");

						parsed.splice(index, 1,
							{type: "tag", text: "<li>", itemOf: "ol", depth: depth, ordinal: ordinal}
							// `i` 는 마커 뒤 공백의 자리다. 그 공백은 **표기이지 내용이 아니므로**
							// 건너뛴다 — `substring(i)` 로 두면 원문에 없는 공백 한 칸이 항목
							// 본문 앞에 생긴다 (`1. 하나` → `<li> 하나`). 글머리 목록은 위
							// `substring(2)` 로 이미 마커와 공백을 함께 건너뛰고 있다.
							, {type: "value", text: stripped.substring(i + 1), itemOf: "ol", closure: "li", depth: depth}
							, {type: "tag", text: "</li>", itemOf: "ol", depth: depth});
						break;
					}
					else {
						break;
					}
				}
			}
		}
		index++;
		isDot = false;
	}

	// 두 종류의 항목이 **모두 검출된 뒤에** 결합한다. 한 종류를 먼저 결합해 버리면
	// 다른 종류의 줄이 그 패스에서 아직 평범한 값 노드라 `flushAll()` 에 걸리고,
	// 열린 목록이 그 자리에서 닫힌다 — 바깥 목록이 쪼개지는 직접 원인이다.
	parsed = bindListItem(parsed, "ul");
	parsed = bindListItem(parsed, "ol");
		
	// headers
	index = 0;

	for(let node of parsed) {

		if("value" === node.type && "" === node.closure) {

			const level = headingMarkerLevel(node.text);

			if(level > 0) {

				parsed.splice(index, 1,
					{type: "tag", text: "<h" + level + ">"}
					, {type: "value", text: stripHeadingClosingSequence(node.text.substring(level + 1)), closure: "header"}
					, {type: "tag", text: "</h" + level + ">"});
			}
		}

		index++;
	}

	// inline code 는 **리터럴**이다 — 안의 `*` · `_` · `[](...)` 는 마크업이 아니다.
	//
	// 이전에는 code 패스가 인라인 처리의 **마지막**(강조 뒤)이었다. 그래서
	// `` `src/**/*.js` `` 가 `<code>src/<em></em>/*.js</code>` 로 뭉개졌다 — 코드
	// 안의 `**` 가 강조로 먹힌 것이다 (실측 2026-08-30). 기술 글에서 glob·곱셈·
	// 포인터 표기가 그대로 깨진다.
	//
	// 코드 스팬을 가장 먼저 뽑아 자리표시자로 치환하고, 모든 인라인 처리가 끝난
	// 뒤 되돌린다. 자리표시자는 사용자 문서에 나타나지 않는 private-use 문자로
	// 감싼다 — 마크업 문자를 포함하지 않으므로 이후 어떤 인라인 패스에도 걸리지
	// 않는다. NUL 은 쓰지 않는다: 정규식에 제어문자를 넣는 것을 lint 가 막는다
	// (no-control-regex) 는 것을 게이트가 잡았다.
	const codeSpans: string[] = [];

	// 링크·이미지가 만들어 낸 **태그 조각**도 자리표시자로 빼 둔다.
	//
	// 강조 패스는 노드의 text 를 문자열로 훑으므로, 앞선 패스가 이미 써 넣은
	// 속성값 안까지 다시 쓴다. 실측 (2026-08-30):
	//
	//   [문서](https://example.com/a**b**c.html)
	//     → href='https://example.com/a<strong>b</strong>c.html'
	//
	// 링크가 깨지고 마크업도 망가진다. `~~` 도 같다. 태그 조각을 빼 두면 강조
	// 패스가 볼 수 있는 것은 사용자가 쓴 글자뿐이다.
	//
	// 빼는 단위는 **여는 태그까지**다. 앵커의 링크 텍스트는 강조를 받아야
	// 하기 때문이다 (`[**굵게**](url)` → `<a ...><strong>굵게</strong></a>`).
	// 이미지와 autolink 는 안쪽에 사용자 마크다운이 없으므로 통째로 뺀다
	// (CommonMark 에서 autolink 의 텍스트는 문자 그대로다).
	const tagChunks: string[] = [];
	const stashTag = (html: string): string => {
		tagChunks.push(html);
		return "\uE000t" + (tagChunks.length - 1) + "\uE001";
	};


	// 백슬래시 이스케이프 (CommonMark §6.1).
	//
	// `\*` 는 "별표를 글자로 보여 달라" 는 뜻이다. 그런데 이 파서는 백슬래시를
	// 글자로 남기고 별표는 별표대로 강조에 썼다 — 뜻이 정확히 뒤집혔다 (실측):
	//
	//   `\*별표\*`   →  <p>\<em>별표\</em></p>     기대: <p>*별표*</p>
	//   `\_밑줄\_`   →  <p>\_밑줄\_</p>           기대: <p>_밑줄_</p>
	//
	// 두 경우 모두 독자가 백슬래시를 본다. 글쓴이가 화면에 내보내려던 적이 없는
	// 글자다. 별표를 글자로 쓰는 유일한 방법이 코드 스팬뿐이었다.
	//
	// 코드 스팬과 같은 수를 쓴다 — 이스케이프된 글자를 자리표시자로 빼 두면
	// 이후의 블록·링크·강조 패스가 그 자리를 마크업으로 읽을 수 없다. `#` 을
	// 이스케이프한 줄이 제목이 되지 않는 것도 이 때문이다.
	//
	// 본문 escape **전에** 뺀다. 원래 글자를 그대로 보관했다가 복원 시점에
	// escape 하므로 `\<` 같은 표기도 `&lt;` 로 안전하게 돌아온다.
	// 이스케이프와 코드 스팬은 **한 번의 스캔**으로 함께 처리한다.
	//
	// 따로 돌리면 순서가 어느 쪽이든 틀린다. 코드 스팬이 먼저면 `\`` 가 스팬을
	// 열어 버리고 (실측: `\`코드 아님\`` → `\<code>코드 아님\</code>`),
	// 이스케이프가 먼저면 코드 스팬 **안쪽**의 백슬래시까지 걷어 간다 — 코드는
	// 보이는 그대로여야 하므로 그것도 틀리다.
	//
	// 왼쪽에서 오른쪽으로 한 번 훑으면 우선순위가 저절로 맞는다. `\X` 를 만나면
	// 그 자리에서 글자로 소비하므로 그 백틱은 스팬을 열 수 없고, 스팬이 열리면
	// 그 안쪽은 통째로 보관되므로 이스케이프가 손대지 않는다.
	//
	// 엔티티 참조(`&copy;` · `&#35;` · `&#x41;`)도 같은 스캔의 갈래다. 그래서
	// `\&copy;` 는 백슬래시가 `&` 를 먼저 소비해 글자로 남고, 코드 스팬 안은 해석되지
	// 않는다. 해석된 문자는 이스케이프된 글자와 같은 자리표시자로 보관한다 — 그래야
	// `&#42;` 가 강조를 열지 않고 `&lt;script&gt;` 가 요소가 되지 않는다.
	const ESCAPABLE = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
	const escapedChars: string[] = [];

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(
				/\\([\s\S])|`([^`]+)`|&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{0,30});/g,
				(whole: string, escaped: string | undefined, code: string | undefined): string => {

					if(undefined !== escaped) {
						// 구두점이 아니면 백슬래시는 그냥 글자다 (`C:\Users`, `\d+`).
						if(!ESCAPABLE.includes(escaped)) return whole;
						escapedChars.push(escaped);
						return "\uE000e" + (escapedChars.length - 1) + "\uE001";
					}

					if(undefined !== code) {
						codeSpans.push(code);
						return "\uE000c" + (codeSpans.length - 1) + "\uE001";
					}

					// 무효한 `&…;` (`&없는이름;` 은 패턴 밖, `&nosuch;` 는 표 밖) 는 글자다.
					const decoded = decodeEntityReference(whole);
					if(undefined === decoded) return whole;
					escapedChars.push(decoded);
					return "\uE000e" + (escapedChars.length - 1) + "\uE001";
				}
			);
		}
	}

	// 본문 escape.
	//
	// 여기까지 value 노드의 text 는 순수 사용자 글자다 (블록 마크업은 별도 tag
	// 노드이고, 코드 스팬은 방금 자리표시자로 빠졌다). 이 지점을 지나면 인라인
	// 패스가 태그를 섞기 시작하므로, 지금 escape 하지 않으면 사용자가 쓴 꺾쇠를
	// 나중에 구별할 수 없다.
	//
	// escape 하지 않던 동안 글자가 조용히 사라졌다 (실측):
	//   "제네릭은 List<String> 이다"  → "제네릭은 List 이다"
	//   "조건은 a<b 이고 c>d 이다"    → "조건은 ad 이다"
	// 브라우저가 `<String>` 을 태그로 읽고 sanitize 가 미지의 태그를 지운 결과다.
	// 이 수리는 저장된 원문을 읽을 때마다 적용되므로 **이미 올라간 글에도 반영된다.**
	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = escapeHtmlText(node.text);
		}
	}

	// 참조 정의 수집 (spec `markdown-rendering` §24). `[라벨]: 주소` 와 선택적 제목.
	//
	// 줄 단위이고 **문단 줄(`closure: ""`)에서만** 모은다 — 코드 블록 줄은 `pre` 라
	// 대상 밖이고, 코드 스팬은 바로 위 스캔이 자리표시자로 뺐으므로 그 안의 정의 꼴은
	// 이 패턴에 닿지 않는다. 본문 escape 뒤에 모으는 것은 주소·제목이 인라인 링크와
	// **같은 표현**(자리표시자를 품은 escape 된 글자)이어야 하기 때문이다 — 그래야
	// 주소 안 엔티티가 태그 조각 복원에서 인라인 링크와 같이 풀린다 (§23).
	//
	// 정의는 사용 앞에 와도 뒤에 와도 된다. 그래서 참조 해석(아래 anchor 패스 뒤)
	// 보다 먼저 문서 전체를 훑는다. 같은 라벨이 여럿이면 첫 정의가 쓰인다.
	const DEFINITION_PATTERN = /^ {0,3}\[([^[\]]+)\]:[ \t]*(\S+)(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/;

	// 라벨 대조 — 대소문자 접기 · 앞뒤 공백 제거 · 내부 공백 연속 축약. 이스케이프·
	// 코드 스팬 자리표시자는 번호가 등장 순서라 같은 글자도 다른 표기가 되므로 그
	// 내용으로 되돌린 뒤 비교한다.
	const normalizeLabel = (label: string): string =>
		label
			.replace(/e(\d+)/g, (_m, i: string) => escapedChars[Number(i)] ?? "")
			.replace(/c(\d+)/g, (_m, i: string) => "`" + (codeSpans[Number(i)] ?? "") + "`")
			.trim()
			.replace(/\s+/g, " ")
			.toLowerCase();

	const definitions = new Map<string, { url: string; title: string | undefined }>();
	const definitionLines = new Map<ParsedNode, string>();

	for(const node of parsed) {
		if("value" !== node.type || "" !== node.closure) continue;

		const match = DEFINITION_PATTERN.exec(node.text);
		if(null === match) continue;

		const label = normalizeLabel(match[1] as string);
		if("" === label) continue;

		definitionLines.set(node, label);
		if(!definitions.has(label)) {
			definitions.set(label, { url: match[2] as string, title: match[3] ?? match[4] ?? match[5] });
		}
	}

	// image
	//
	// 이전 구현은 `[`, `](`, ` "`, `")` 를 indexOf 로 순서 비교해, **제목이 있어야만**
	// 매치했다. 그래서 표준 형식 `![alt](url)` 이 조용히 문자 그대로 남았다 (실측
	// 2026-08-30). Writer 의 삽입 템플릿이 제목 자리를 `OPTIONAL_TITLE` 이라 부르는
	// 것과도 어긋났다 — 실제로는 필수였다.
	//
	// 제목은 선택으로 두고, 있으면 title 속성을 붙이고 없으면 생략한다.
	// URL 안의 균형 잡힌 괄호를 한 겹 허용한다. `[^)\s]+` 는 첫 `)` 에서 끊겨,
	// `[wiki](https://example.com/wiki/C_(프로그래밍_언어))` 가
	// href='...C_(프로그래밍_언어' 로 잘리고 남은 `)` 가 본문에 샜다 (실측).
	// (주석의 호스트도 csp-origin-coverage 게이트의 스캔 대상이라 example.com 을 쓴다.)
	// 위키·MSDN 처럼 괄호가 든 주소는 흔하다.
	const IMAGE_PATTERN = /!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"([^"]*)")?\)/g;

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(IMAGE_PATTERN, (_m, alt, url, title) =>
				stashTag(
					"<img src='" + escapeHtmlQuotes(url) + "' alt='" + escapeHtmlQuotes(alt) + "'"
					+ (undefined === title ? "" : " title='" + escapeHtmlQuotes(title) + "'")
					+ " />"
				)
			);
		}
	}

	// autolink — `<https://example.com>` 형식.
	//
	// 지원하지 않으면 이 표기는 raw HTML 로 흘러가 sanitize 단계에서 **통째로
	// 삭제된다**. 즉 사용자가 쓴 글자가 화면에서 사라진다 (실측 2026-08-30:
	// `<https://example.com>` → `<p></p>`). CommonMark 는 이 형식을 링크로
	// 규정하므로 표준에 맞춘다.
	//
	// 스킴을 http/https/mailto 로 한정한다 — sanitize 의 ALLOWED_URI_REGEXP 와
	// 같은 정책이며, 여기서 넓히면 그쪽에서 잘려 다시 글자가 사라진다.
	// 본문이 이미 escape 됐으므로 꺾쇠는 `&lt;` · `&gt;` 로 들어온다.
	// 새 탭은 **사이트 밖으로 나갈 때만** 연다.
	//
	// 이전에는 모든 링크에 `target='_blank'` 를 붙였다. 그래서 `[지난 글](/log/…)`
	// 처럼 이 사이트 안을 가리키는 링크도 새 탭을 열어 앱이 처음부터 다시 뜨고,
	// 뒤로 가기가 원래 탭에 남는다. `[맨 위로](#top)` 은 같은 문서 안을 가리키는데
	// 새 탭을 열었다 — 제자리 이동이어야 할 것이 전체 재적재가 됐다.
	//
	// 스킴 없는 주소(`/a` · `./a` · `a/b` · `#a`)는 전부 이 사이트 안이다.
	// 프로토콜 상대(`//host`)는 밖이므로 함께 잡는다.
	const isExternalUrl = (url: string): boolean =>
		/^(?:https?:)?\/\//i.test(url) || /^mailto:/i.test(url);

	const linkTarget = (url: string): string =>
		isExternalUrl(url) ? " target='_blank' rel='noreferrer'" : "";

	const AUTOLINK_PATTERN = /&lt;((?:https?:\/\/|mailto:)[^\s]+?)&gt;/g;

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(AUTOLINK_PATTERN, (_m, url) =>
				stashTag(
					"<a href='" + escapeHtmlQuotes(url) + "'" + linkTarget(url) + ">"
					+ url + "</a>"
				)
			);
		}
	}

	// anchor
	//
	// image 와 동일한 결함이 있었다 — 제목이 없으면 매치하지 않아 표준 형식
	// `[텍스트](url)` 이 문자 그대로 남았다. 블로그 본문에서 가장 흔한 형식이다.
	//
	// `!` 선행은 negative lookbehind 로 배제한다. 다만 이 가드는 **현재 도달하지
	// 않는다** — 두 패턴이 `!` 접두만 다르므로, 앵커가 매치할 자리는 앞선 image
	// 패스가 이미 소비한다 (실측: lookbehind 를 빼도 출력이 같다). 남겨 두는 것은
	// 그 등가성이 두 패턴이 같은 모양일 때만 성립하기 때문이다 — 예컨대 image 쪽만
	// URL 조건을 좁히면 그 순간부터 이 가드가 실제로 필요해진다.
	//
	// 도달하지 않으므로 테스트로 덮지 않았다. 커버리지가 이 분기를 못 덮는 것은
	// 결함이 아니라 위 사실의 반영이다.
	const ANCHOR_PATTERN = /(?<!!)\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"([^"]*)")?\)/g;

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(ANCHOR_PATTERN, (_m, text, url, title) =>
				stashTag(
					"<a href='" + escapeHtmlQuotes(url) + "'"
					+ (undefined === title ? "" : " title='" + escapeHtmlQuotes(title) + "'")
					+ linkTarget(url) + ">"
				) + text + "</a>"
			);
		}
	}

	// 참조 링크 — `[텍스트][라벨]` · `[라벨][]` · `[라벨]` (spec §24).
	//
	// 인라인 링크 패스 **뒤**에 둔다 — 인라인이 먼저 소비하므로 `[a](b)[c]` 에서
	// 남는 참조 후보는 `[c]` 뿐이다. 출력 규칙은 anchor 패스와 같다: 여는 태그만
	// 조각으로 빼고 링크 텍스트는 강조를 받게 남긴다. 스킴 판정은 여기 두지 않는다 —
	// `javascript:` 정의는 정제(`ALLOWED_URI_REGEXP`)가 막는다.
	//
	// 정의 줄 자신은 참조 후보가 아니다 — 보면 `[참고]: …` 한 줄이 자기 라벨을
	// 참조한 셈이 되어 걷힌다. 정의가 없는 꼴(`[메모]` · `![alt]`)은 글자 그대로다.
	const REFERENCE_PATTERN = /(?<!!)\[([^[\]]+)\](?:\[([^[\]]*)\])?/g;
	const referencedLabels = new Set<string>();

	if(definitions.size > 0) {
		for(const node of parsed) {
			if("value" !== node.type || "pre" === node.closure || definitionLines.has(node)) continue;

			node.text = node.text.replace(REFERENCE_PATTERN, (whole: string, text: string, label: string | undefined) => {

				const key = normalizeLabel(undefined === label || "" === label ? text : label);
				const definition = definitions.get(key);
				if(undefined === definition) return whole;

				referencedLabels.add(key);

				return stashTag(
					"<a href='" + escapeHtmlQuotes(definition.url) + "'"
					+ (undefined === definition.title ? "" : " title='" + escapeHtmlQuotes(definition.title) + "'")
					+ linkTarget(definition.url) + ">"
				) + text + "</a>";
			});
		}
	}

	// 참조된 라벨의 정의 줄만 걷는다. **참조되지 않은 정의 줄은 글자로 남는다** —
	// CommonMark §4.7 과 의도적으로 갈린다. 표준대로 전부 걷으면 출처를
	// `[1]: https://…` 꼴로 나열만 해 둔 기존 글의 줄이 통째로 사라진다.
	if(referencedLabels.size > 0) {
		parsed = parsed.filter((node) => {
			const label = definitionLines.get(node);
			return undefined === label || !referencedLabels.has(label);
		});
	}

	// 맨 URL — 꺾쇠 없이 쓴 `https://…` · `www.…` (spec `markdown-rendering` §25).
	//
	// 모든 링크 형성 패스 **뒤**, 강조 패스 **앞**에 둔다. 뒤여야 이미 링크인 것
	// (이미지·꺾쇠 형태·인라인·참조 링크의 주소) 이 조각으로 빠져 있고, 앞이어야
	// 주소 안의 `*` `_` `~` 가 강조가 되지 않는다 (`…/a**b**c` → `strong` 0).
	// 링크는 꺾쇠 형태처럼 통째로 조각으로 뺀다 — 보이는 글자는 원문 그대로다.
	//
	// 본문이 escape 됐으므로 원문 `&` 는 `&amp;` 로, `<` `>` 는 `&lt;` `&gt;` 로 들어온다.
	// 주소의 글자로 받는 것은 공백·`<`·`>`·자리표시자가 아닌 글자와 `&amp;`, 그리고
	// 이스케이프·엔티티 자리표시자다 (범위는 원문 글자로 정한다 — §23·§25).
	// 호스트에는 한글을 받지 않는다 — `https://example.com에서 봐` 의 `에서` 는 링크
	// 밖이다. 경로(`/` `?` `#` 뒤)의 한글은 받는다.
	//
	// 시작 자리는 줄 머리 · 공백 · `*` `_` `~` `(` 뒤다 (항목 이어짐·인용 표식은 줄
	// 머리로, 강조 구간 표식은 없는 것으로 본다). `xhttps://…` 는 링크가 아니다.
	const URL_CHAR = "[^\\s<&\\uE000-\\uE006]|&amp;|\\uE000e\\d+\\uE001";
	const HOST_CHAR = "[^\\s<&/?#\\p{Script=Hangul}\\uE000-\\uE006]|&amp;|\\uE000e\\d+\\uE001";
	const BARE_URL_PATTERN = new RegExp(
		"(?<=(?:^|[\\s*_~(\\uE004-\\uE006])[\\uE002\\uE003]*)"
		+ "(https?:\\/\\/|www\\.)(?:" + HOST_CHAR + ")+(?:[/?#](?:" + URL_CHAR + ")*)?",
		"gu"
	);
	const TRAILING_PUNCTUATION = "?!.,:*_~";
	const countOf = (s: string, c: string): number => s.split(c).length - 1;

	for(const node of parsed) {
		if("value" !== node.type || "pre" === node.closure) continue;

		// 인라인·참조 링크는 여는 태그만 조각으로 빼고 링크 텍스트는 본문에 남긴다
		// (강조를 받게). 그 텍스트 안의 주소를 다시 링크로 만들면 `a` 안에 `a` 가 생겨
		// 정제 뒤 DOM 에서 링크가 둘로 쪼개진다 — 여는 태그 조각부터 `</a>` 까지는 건너뛴다.
		// 꺾쇠 형태 조각은 `</a>` 까지 품고 있어 대상이 아니다.
		const linkTextSpans: [number, number][] = [];
		for(const m of node.text.matchAll(/t(\d+)/g)) {
			const chunk = tagChunks[Number(m[1])] ?? "";
			if(!chunk.startsWith("<a ") || chunk.endsWith("</a>")) continue;
			const close = node.text.indexOf("</a>", m.index);
			linkTextSpans.push([m.index, -1 === close ? node.text.length : close]);
		}

		node.text = node.text.replace(BARE_URL_PATTERN, (whole: string, prefix: string, offset: number): string => {

			if(linkTextSpans.some(([from, to]) => offset >= from && offset < to)) return whole;

			// 끝의 문장부호와 짝 없는 닫는 괄호는 링크 밖이다 — `(https://example.com).`
			let url = whole;
			while(url.length > prefix.length) {
				const last = url.charAt(url.length - 1);
				const unmatchedParen = ")" === last && countOf(url, ")") > countOf(url, "(");
				if(!TRAILING_PUNCTUATION.includes(last) && !unmatchedParen) break;
				url = url.slice(0, -1);
			}
			if(url.length === prefix.length) return whole;

			const href = "www." === prefix ? "http://" + url : url;

			return stashTag(
				"<a href='" + escapeHtmlQuotes(href) + "'" + linkTarget(href) + ">" + url + "</a>"
			) + whole.slice(url.length);
		});
	}

	parsed = inlineParsing(parsed, "**", "strong", true); // bold
	parsed = inlineParsing(parsed, "~~", "del", true); // stroke
	// 겹 `**` 도 홑 `*` 와 같은 공백 규칙 아래 둔다. 이전에는 `**` 가 규칙 밖이었고
	// (`** 굵게 **` 를 굵게로 읽었다) 그 대가로 `2 ** 10 은 1024 이고 2 ** 20 은
	// 1048576 이다` 가 문장 한가운데부터 통째로 굵어지며 구분자 네 글자가 사라졌다.
	// 손상은 본문 · 목록 요약 · 검색 미리보기 세 표면에서 동시에 났다.
	// 뒤집는 대가는 있다 — `** 굵게 **` 처럼 공백을 끼워 굵게 쓴 기존 글은 이제
	// 별표가 글자로 보인다. CommonMark 가 그렇게 읽으므로 그 쪽을 택했다.
	// `~~` 도 같은 규칙 아래 둔다. 이 자리에는 `~~` 는 산문 손상 근거가 없어
	// 그대로 둔다 (별 req) 라고 적혀 있었고, 그 전제는 **거짓이 됐다** — 한국어의
	// 늘임 표기(`와~~` · `헐~~` · `대박~~`)가 그 표본이며 운영자가 직접 재현했다.
	// `와~~ 좋다 정말 대박~~` 이 `와<del> 좋다 정말 대박</del>` 이 되고, 목록
	// 요약 경로에서는 태그가 벗겨져 `와 좋다 정말 대박` 으로 줄어 물결 네 글자가
	// 화면에서 사라진다 — 글쓴이는 자기 원문에서 잘못을 찾을 수 없다. 손상은
	// `**` 와 똑같이 본문 · 목록 요약 · 검색 미리보기 세 표면에서 동시에 났다.
	// 되찾는 것도 있다 — 늘임표기의 여는 런이 뒤따라오는 의도된 취소선의
	// 구분자를 먼저 먹어치우던 것이 멈춘다 (`와~~ 하니 ~~정말~~ 좋다` 가
	// `와<del> 하니 </del>정말~~ 좋다` 에서 `와~~ 하니 <del>정말</del> 좋다` 로).
	// 뒤집는 대가는 `**` 와 같은 형태다 — `~~ 취소 ~~` 처럼 공백을 끼워 취소선을
	// 쓴 기존 글은 이제 물결이 글자로 보인다. 다만 방향이 비대칭이라 그 쪽을
	// 택했다: 지금은 취소선을 **의도하지 않은** 글이 지워지고, 뒤집은 뒤에는
	// 취소선을 **의도한** 글에 물결이 보일 뿐 내용이 남는다.
	// 낱말 안쪽 억제(5번째 인자)는 켜지 않는다 — 그것은 `_` 계열의 것이고,
	// 켜면 `앞a~~b~~c뒤` 가 조용히 평문이 된다.
	parsed = inlineParsing(parsed, "*", "em", true); // emphasis
	// 밑줄 강조. 겹은 `**` 와 같은 `<strong>` 을, 홑은 `*` 와 같은 `<em>` 을
	// 내되 **낱말 안쪽 억제**를 함께 켠다 —
	// `_` 는 `*` 와 달리 식별자에 흔히 쓰이므로(`foo_bar_baz` · `snake_case`)
	// 억제 없이 등록하면 기술 글이 깨진다. CommonMark 가 두 구분자를 가르는
	// 유일한 지점이 이것이라 억제는 `_` 계열에만 건다.
	// 겹 구분자를 홑보다 **먼저** 처리해야 `__bold__` 가 `<em>_bold_</em>` 로
	// 잘리지 않는다 — `"**"` 를 `"*"` 앞에 두는 것과 같은 이유다.
	parsed = inlineParsing(parsed, "__", "strong", true, true); // bold (underscore)
	parsed = inlineParsing(parsed, "_", "em", true, true); // emphasis (underscore)

	// 코드 스팬 복원. 내용은 이스케이프한다 — 코드는 보이는 그대로여야 하고,
	// 이스케이프하지 않으면 `<String>` 같은 표기가 sanitize 에서 삭제돼 글자가
	// 사라진다.
	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(/\uE000c(\d+)\uE001/g, (_m, i: string) =>
				"<code>" + escapeHtmlText(codeSpans[Number(i)]) + "</code>"
			);

			// 이스케이프된 글자 복원. 마크업 패스가 전부 지나간 뒤이므로 이 글자는
			// 어떤 문법에도 참여하지 않았다. 여기서 escape 해 화면에 글자로 남긴다.
			node.text = node.text.replace(/\uE000e(\d+)\uE001/g, (_m, i: string) =>
				escapeHtmlText(escapedChars[Number(i)])
			);

			// 태그 조각 복원. 이미 escape 를 마친 상태로 들어갔으므로 그대로 돌려놓는다.
			// 인덱스는 바로 위 stashTag 가 만든 것이라 항상 존재한다. `?? ""` 는
			// noUncheckedIndexedAccess 를 만족시키기 위한 것이며, 도달하면
			// 자리표시자(보이지 않는 private-use 문자)를 화면에 남기는 대신
			// 아무것도 남기지 않는 쪽을 고른 것이다.
			//
			// 조각 **안**의 자리표시자(주소·제목·alt 에 든 이스케이프 글자·엔티티·백틱)도
			// 여기서 푼다. 위 두 복원은 조각을 넣기 전에 끝나므로 조각 안까지 닿지 않는다 —
			// 닿지 않던 동안 `?a=1&amp;b=2` 의 `href` 가 `?a=1e0b=2` 가 됐다. 조각 안은
			// 속성값이므로 따옴표까지 escape 한다 (해석 뒤에 escape 를 건다). 코드 스팬은
			// 주소·제목 안에서 마크업이 아니므로 백틱째 글자로 되돌린다.
			node.text = node.text.replace(/\uE000t(\d+)\uE001/g, (_m, i: string) =>
				(tagChunks[Number(i)] ?? "")
					.replace(/\uE000e(\d+)\uE001/g, (_e, j: string) =>
						escapeHtmlQuotes(escapeHtmlText(escapedChars[Number(j)]))
					)
					.replace(/\uE000c(\d+)\uE001/g, (_c, j: string) =>
						escapeHtmlQuotes(escapeHtmlText("`" + codeSpans[Number(j)] + "`"))
					)
			);

			// 강조 표식 복원. escape 뒤에 되돌리므로 표식이 감싼 사용자 글자는
			// 이미 안전하다.
			node.text = node.text
				.replace(/\uE002/g, "<span class=\"" + HIGHLIGHT_CLASS + "\">")
				.replace(/\uE003/g, "</span>");

			// 이어짐 표식 복원. 인라인 패스가 전부 지난 뒤라 이 태그는 어떤 문법에도
			// 참여하지 않는다. `br` · `blockquote` 는 sanitize 허용 목록에 이미 있다.
			node.text = node.text
				.replace(/\uE004/g, "<br />")
				.replace(/\uE005/g, "<blockquote>")
				.replace(/\uE006/g, "</blockquote>");
		}
	}

	for(let node of parsed) {
		if("value" === node.type && "" === node.closure) {
			node.text = "<p>" + node.text + "</p>";
		}
	}
	
	str = stringify(parsed);

	return str;
}

// 낱말 안쪽 억제의 "단어 글자" 는 **유니코드 문자·숫자**다. `[A-Za-z0-9]` 로
// 좁히면 `한글_강조_표기` 가 `한글<em>강조</em>표기` 가 된다 — 영문 식별자만
// 지키고 한글 낱말은 깨뜨리는 상태이며, 예시가 한글뿐인 게이트에는 보이지
// 않는다.
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}]/u;

// CommonMark left-flanking 조건 2 의 판정면은 유니코드 `P`(punctuation) + `S`
// (symbol) 카테고리다 (§2.1). ASCII 문장부호 열거로 좁히면 한국어 본문에 오는
// `…` · `·` · `？` 가 그 열거 밖에서 조용히 갈린다 — 바로 위 낱말 술어가
// `[A-Za-z0-9]` 로 좁았을 때와 **같은 실패 형태**다.
const PUNCTUATION_CHARACTER_PATTERN = /[\p{P}\p{S}]/u;

// 줄의 시작·끝은 공백으로 센다. `charAt` 은 범위 밖에서 `""` 를 내므로 그
// 빈 문자열을 공백과 같이 다루지 않으면 줄 첫머리의 구분자가 조건 2 에서
// 앞을 낱말로 오인당한다. 여는 쪽·닫는 쪽 두 관문이 이 술어 하나를 공유한다.
const isBlankBoundary = (character: string): boolean =>
	"" === character || /\s/.test(character);

// 억제는 구분자의 앞뒤가 **둘 다** 단어 글자일 때만 발동한다. "어느 한쪽" 으로
// 보면 여는 구분자의 뒤는 정의상 언제나 강조하려는 낱말의 첫 글자이므로 모든
// 강조가 죽는다 — 낱말 안쪽을 지키려다 강조 자체를 없애는 방향이다.
const isIntraword = (before: string, after: string): boolean =>
	WORD_CHARACTER_PATTERN.test(before) && WORD_CHARACTER_PATTERN.test(after);

const inlineParsing = (parsed: ParsedNode[], delimeter: string, tagName: string, strictFlanking = false, intrawordSuppression = false): ParsedNode[] => {

	let searchFrom = 0;
	let start = -1;
	let end = -1;
	let currentText = "";
	let searchedText = "";
	let delimeterLength = delimeter.length;
	// 구분자 런 판정은 **한 글자 단위**다. `charAt` 산출은 언제나 한 글자인데
	// 겹 구분자(`"__"`)와 통째로 비교하면 그 비교가 결코 참이 되지 않아, 런
	// 가드가 겹 구분자에서 통째로 죽는다. 구분자는 같은 글자의 런이므로 첫
	// 글자가 곧 그 런의 글자다.
	let runCharacter = delimeter.charAt(0);
	let openTag = "<" + tagName + ">";
	let closeTag = "</" + tagName + ">";

	for(let node of parsed) {

		if("value" === node.type && "pre" !== node.closure) {

			while(-1 < searchFrom) {

				searchFrom = node.text.indexOf(delimeter, searchFrom);

				if(0 > searchFrom) {
					continue;
				}
				else if(0 > start) {
					// 여는 구분자 뒤에 공백이 오면 강조가 아니다
					// (CommonMark left-flanking 중 이 글이 실제로 부딪힌 부분).
					//
					// 같은 구분자가 이어지면 그것은 **하나의 런**이지, 안에서 한 개를
					// 떼어 쓸 수 있는 것이 아니다. 앞뒤 **양쪽** 을 봐야 한다 — 뒤만
					// 보면 런의 마지막 하나가 여전히 열린다 (실측: `src/**/*.ts` 가
					// `src//*.ts` → 뒤만 막았을 때 `src/*/.ts`).
					const after = node.text.charAt(searchFrom + delimeterLength);
					const beforeOpen = node.text.charAt(searchFrom - 1);
					if(strictFlanking && ("" === after || /\s/.test(after)
						|| after === runCharacter || beforeOpen === runCharacter)) {
						searchFrom += delimeterLength;
						continue;
					}

					// CommonMark left-flanking **조건 2**. 뒤가 문장부호이면 앞이
					// 공백이거나 문장부호일 때만 연다(2b). 두 조건은 곱이 아니라
					// `(1) 그리고 (2a 또는 2b)` 이므로 조건 1 자리에 합치지 않고
					// **뒤에 붙인다** — 앞을 보지 않는 단순화는 `**"굵게"**` 를
					// 깨뜨리는데 손상 축만 보는 게이트에는 그 파손이 안 보인다.
					if(strictFlanking && PUNCTUATION_CHARACTER_PATTERN.test(after)
						&& !isBlankBoundary(beforeOpen)
						&& !PUNCTUATION_CHARACTER_PATTERN.test(beforeOpen)) {
						searchFrom += delimeterLength;
						continue;
					}
					// 낱말 안쪽이면 열지 않는다 (`foo_bar_baz`).
					if(intrawordSuppression && isIntraword(beforeOpen, after)) {
						searchFrom += delimeterLength;
						continue;
					}
					start = searchFrom;
					searchFrom += delimeterLength;
				}
				else {
					// 닫는 구분자 앞에 공백이 오면 닫는 것이 아니다 (right-flanking).
					// 런 안에서 떼어 오지 않는 것도 여는 쪽과 같다.
					const before = node.text.charAt(searchFrom - 1);
					const afterClose = node.text.charAt(searchFrom + delimeterLength);
					if(strictFlanking && ("" === before || /\s/.test(before)
						|| before === runCharacter || afterClose === runCharacter)) {
						searchFrom += delimeterLength;
						continue;
					}

					// 조건 2 의 닫는 쪽 대칭. 앞이 문장부호이면 뒤가 공백이거나
					// 문장부호일 때만 닫는다. **이 방향의 기대 산출은 구분자가
					// 글자로 남는 것**이다 — 그 run 은 2a·2b 를 둘 다 실패해 닫을
					// 자격이 없고 여는 자격만 남아 짝이 없다. 여는 쪽만 고치면
					// `*가.*나 다` 가 `<em>가.</em>나 다` 로 남는다 (실측 5/5 대칭).
					if(strictFlanking && PUNCTUATION_CHARACTER_PATTERN.test(before)
						&& !isBlankBoundary(afterClose)
						&& !PUNCTUATION_CHARACTER_PATTERN.test(afterClose)) {
						searchFrom += delimeterLength;
						continue;
					}
					// 낱말 안쪽이면 닫지 않는다.
					if(intrawordSuppression && isIntraword(before, afterClose)) {
						searchFrom += delimeterLength;
						continue;
					}
					end = searchFrom;
					currentText = node.text.substring(start + delimeterLength, end);
					searchedText = delimeter + currentText + delimeter;
					node.text = node.text.replace(searchedText, openTag + currentText + closeTag);
					start = end = -1;
				}
			}
		}
		searchFrom = 0;
		start = end = -1;
	}

	return parsed;
}

// Stack-based grouping for same-type nested lists.
// See TSK-20260418-10 for the algorithm.
//
// The detection passes emit each list line as a triple:
//   { <li> open, value, </li> }   (all tagged with itemOf + depth)
// so a deeper line arrives AFTER a fully-closed </li>. To achieve the
// nested shape <li>...<tagName>...</tagName></li> we defer emitting the
// item-closing </li>: if the next <li> open is at a deeper depth we drop
// the pending </li> (the outer <li> stays open to host the nested list);
// otherwise we flush it and continue.
const bindListItem = (parsed: ParsedNode[], tagName: string): ParsedNode[] => {

	const output: ParsedNode[] = [];
	const depthStack: number[] = [];
	let pendingCloseLi: ParsedNode | null = null; // {type,text,itemOf,depth} waiting to be flushed

	// 다른 종류의 중첩 목록을 바깥 항목 **안에** 들이려고 미뤄 둔 `</li>`.
	// 그 목록이 끝나는 자리(같은 종류 항목이 같거나 얕은 깊이로 돌아오는 자리 ·
	// 입력 끝)에서 갚는다. 이 패스에는 다른 종류의 여닫는 태그가 아직 없으므로
	// 그 태그는 상대 패스의 `flushAll()` 이 이 `</li>` 앞에 끼워 넣는다.
	let owedCloseLi: ParsedNode | null = null;

	const openTag = "<" + tagName + ">";
	const closeTag = "</" + tagName + ">";

	// `noUncheckedIndexedAccess` 정합: 호출부는 `depthStack.length > 0` 분기 후 사용 — non-null 보장.
	const top = (): number => depthStack[depthStack.length - 1]!;

	const flushPendingCloseLi = () => {
		if(pendingCloseLi) {
			output.push(pendingCloseLi);
			pendingCloseLi = null;
		}
	};

	const flushOwedCloseLi = () => {
		if(owedCloseLi) {
			output.push(owedCloseLi);
			owedCloseLi = null;
		}
	};

	// 여닫는 태그에도 깊이를 박제한다 — 상대 종류 패스가 "이 목록이 내 항목보다
	// 깊은가" 를 판정하는 유일한 단서다.
	//
	// `first` 는 이 목록을 여는 항목(`<li>`)이다. 번호 목록은 **첫 항목의 번호**
	// 부터 보여야 하므로 그 번호가 1 이 아니면 여는 태그에 `start` 를 싣는다
	// (spec `markdown-rendering` §20). 1 이면 싣지 않는다 — 산출이 종전 그대로다.
	// 둘째 항목 이후의 번호는 쓰지 않는다. 목록은 깊이마다 이 자리에서 열리므로
	// 중첩 번호 목록도 자기 첫 번호를 따른다.
	const openList = (d: number, first: ParsedNode) => {
		const start = first.ordinal;
		const text = (undefined !== start && "1" !== start)
			? "<" + tagName + " start=\"" + start + "\">"
			: openTag;
		output.push({type: "tag", text: text, itemOf: tagName, depth: d});
		depthStack.push(d);
	};

	const closeTopList = () => {
		const d = depthStack.pop();
		output.push({type: "tag", text: closeTag, itemOf: tagName, depth: d});
	};

	// Close every currently open list. Used on non-list nodes and at EOF.
	const flushAll = () => {
		flushOwedCloseLi();
		flushPendingCloseLi();
		while(depthStack.length > 0) {
			closeTopList();
			if(depthStack.length > 0) {
				// The enclosing <li> that held the just-closed inner list
				// is still open; close it before moving further out.
				output.push({type: "tag", text: "</li>", itemOf: tagName});
			}
		}
	};

	// 빈 줄(들) **다음의 첫 유의미 노드가 같은 종류의 목록 항목인가.**
	// `from` 은 빈 줄 노드의 위치다.
	const blankRunLeadsToSameTypeItem = (from: number): boolean => {

		let j = from;
		while(j < parsed.length && isBlankLine(parsed[j]!)) {
			j++;
		}
		if(j >= parsed.length) {
			return false;
		}
		const next = parsed[j]!;
		return next.itemOf === tagName
			&& next.type === "tag"
			&& next.text === "<li>";
	};

	for(let i = 0; i < parsed.length; i++) {

		const node = parsed[i]!;

		const isListNode = node.itemOf === tagName;
		const isOtherListNode = !isListNode
			&& ("ul" === node.itemOf || "ol" === node.itemOf);
		const isOpenLi = isListNode
			&& node.type === "tag"
			&& node.text === "<li>";
		const isCloseLi = isListNode
			&& node.type === "tag"
			&& node.text === "</li>";

		if(isOpenLi) {

			const d = (typeof node.depth === "number") ? node.depth : 0;

			if(depthStack.length === 0) {
				// Starting a fresh list.
				flushOwedCloseLi();
				openList(d, node);
			}
			else if(d > top()) {
				if(owedCloseLi) {
					// 다른 종류 중첩이 진행 중인 자리에서 같은 종류가 **더 깊이**
					// 들어오는 3단계 교대 중첩은 어느 계약도 소유하지 않는다
					// (범위 밖). 빚을 갚고 평탄하게 분기해 균형만 지킨다.
					flushAll();
					openList(d, node);
				}
				else {
					// Nest deeper: keep the previous item's </li> suppressed so
					// the new <tagName> lives inside that still-open <li>.
					pendingCloseLi = null;
					openList(d, node);
				}
			}
			else if(d === top()) {
				// Sibling at the same depth — flush the previous </li>.
				// 다른 종류 중첩이 끝난 자리이므로 미뤄 둔 `</li>` 를 먼저 갚는다.
				flushOwedCloseLi();
				flushPendingCloseLi();
			}
			else {
				// d < top(): close inner lists until depths line up.
				flushOwedCloseLi();
				flushPendingCloseLi();
				while(depthStack.length > 0 && d < top()) {
					closeTopList();
					if(depthStack.length > 0) {
						output.push({type: "tag", text: "</li>", itemOf: tagName});
					}
				}
				if(depthStack.length === 0) {
					// Fell below the outermost: begin a new top-level list.
					openList(d, node);
				}
			}

			output.push(node);
		}
		else if(isCloseLi) {
			// Defer until we know whether the next item nests deeper.
			pendingCloseLi = node;
		}
		else if(isListNode) {
			// value node inside the current list item — pass through.
			output.push(node);
		}
		else if(isOtherListNode) {

			// 종류가 다른 목록 노드. **깊이가 판정면이다.**
			//
			// 바깥 항목보다 깊으면 그 항목 **안에** 들어가야 하므로 투명하게
			// 흘려보내고, 그 항목의 `</li>` 는 미뤄 둔다(빚). 종전에는 이 노드가
			// 비-list 로 취급돼 `flushAll()` 에 걸렸고, 그래서 바깥 목록이
			// 그 자리에서 닫혀 **번호가 되감겼다**.
			//
			// 같거나 얕으면 형제이므로 경계다 — 열린 목록을 닫고 흘려보낸다.
			const d = (typeof node.depth === "number") ? node.depth : null;

			if(depthStack.length > 0 && null !== d && d > top()) {

				if(pendingCloseLi) {
					owedCloseLi = pendingCloseLi;
					pendingCloseLi = null;
				}
				output.push(node);
			}
			else {
				flushAll();
				output.push(node);
			}
		}
		else {
			// 빈 줄은 **같은 종류의 목록 사이에서만** 투명하다.
			//
			// 항목 사이를 빈 줄로 띄우는 것은 CommonMark 표준 표기인데(§5.3 Ex.306),
			// 그 빈 줄이 비-list 노드로 도착해 `flushAll()` 을 부르면 목록이 항목 수만큼
			// 쪼개진다. 쪼개진 자리마다 `<ol>` 이 새로 열리므로 **독자는 `1.` 을 여러 번
			// 본다** — 글쓴이는 표준 표기를 썼으니 자기 원문에서 잘못을 찾을 수 없다.
			//
			// 그렇다고 빈 줄을 무조건 건너뛰면 정확히 반대 방향으로 무너진다: 문단이나
			// 다른 종류 목록 앞에서도 목록이 이어져 `1. 첫째\n\n본문` 의 `<p></p>` 가
			// 사라진다. 그래서 조건은 셋이 모두 참일 때로 한정한다 — 열린 목록이 있고 ·
			// 빈 줄 뒤 첫 유의미 노드가 목록 항목이며 · 그 항목이 같은 종류다.
			// (`빈 줄이 목록을 끝내는 자리` 게이트가 그 반대 방향을 지킨다.)
			//
			// 건너뛴 빈 줄은 `output` 에 넣지 않는다 — 남기면 뒤 문단 패스가 그것을
			// `<p></p>` 로 감싸 목록 **안**에 빈 문단이 끼어든다.
			if(depthStack.length > 0
				&& isBlankLine(node)
				&& blankRunLeadsToSameTypeItem(i)) {

				continue;
			}

			// Non-list node terminates any open lists.
			flushAll();
			output.push(node);
		}
	}

	flushAll();

	return output;
}

const stringify = (arr: ParsedNode[]): string => {

	let str = "";

	for(let node of arr) {
		str += node.text;
	}

	return str;
}

const isNumeric = (str: string): boolean => {
	return /^\d+$/.test(str);
}

// HTML5 이름 엔티티 전부 (WHATWG `entities.json` 의 `;` 로 끝나는 2125 항목).
// 한 항목은 `이름:코드포인트` 이고 코드포인트는 16진, 둘이면 `.` 로 잇는다.
// 이름 최장은 31 자(`CounterClockwiseContourIntegral`)이며 엔티티 스캔 패턴의 상한과 같다.
// `;` 없는 레거시 형태(`&copy`)는 해석하지 않는다 — CommonMark 와 같다.
const NAMED_ENTITY_TABLE = `
AElig:c6 AMP:26 Aacute:c1 Abreve:102 Acirc:c2 Acy:410 Afr:1d504 Agrave:c0 Alpha:391 Amacr:100 And:2a53
Aogon:104 Aopf:1d538 ApplyFunction:2061 Aring:c5 Ascr:1d49c Assign:2254 Atilde:c3 Auml:c4 Backslash:2216
Barv:2ae7 Barwed:2306 Bcy:411 Because:2235 Bernoullis:212c Beta:392 Bfr:1d505 Bopf:1d539 Breve:2d8 Bscr:212c
Bumpeq:224e CHcy:427 COPY:a9 Cacute:106 Cap:22d2 CapitalDifferentialD:2145 Cayleys:212d Ccaron:10c Ccedil:c7
Ccirc:108 Cconint:2230 Cdot:10a Cedilla:b8 CenterDot:b7 Cfr:212d Chi:3a7 CircleDot:2299 CircleMinus:2296
CirclePlus:2295 CircleTimes:2297 ClockwiseContourIntegral:2232 CloseCurlyDoubleQuote:201d CloseCurlyQuote:2019
Colon:2237 Colone:2a74 Congruent:2261 Conint:222f ContourIntegral:222e Copf:2102 Coproduct:2210
CounterClockwiseContourIntegral:2233 Cross:2a2f Cscr:1d49e Cup:22d3 CupCap:224d DD:2145 DDotrahd:2911 DJcy:402
DScy:405 DZcy:40f Dagger:2021 Darr:21a1 Dashv:2ae4 Dcaron:10e Dcy:414 Del:2207 Delta:394 Dfr:1d507
DiacriticalAcute:b4 DiacriticalDot:2d9 DiacriticalDoubleAcute:2dd DiacriticalGrave:60 DiacriticalTilde:2dc
Diamond:22c4 DifferentialD:2146 Dopf:1d53b Dot:a8 DotDot:20dc DotEqual:2250 DoubleContourIntegral:222f
DoubleDot:a8 DoubleDownArrow:21d3 DoubleLeftArrow:21d0 DoubleLeftRightArrow:21d4 DoubleLeftTee:2ae4
DoubleLongLeftArrow:27f8 DoubleLongLeftRightArrow:27fa DoubleLongRightArrow:27f9 DoubleRightArrow:21d2
DoubleRightTee:22a8 DoubleUpArrow:21d1 DoubleUpDownArrow:21d5 DoubleVerticalBar:2225 DownArrow:2193
DownArrowBar:2913 DownArrowUpArrow:21f5 DownBreve:311 DownLeftRightVector:2950 DownLeftTeeVector:295e
DownLeftVector:21bd DownLeftVectorBar:2956 DownRightTeeVector:295f DownRightVector:21c1
DownRightVectorBar:2957 DownTee:22a4 DownTeeArrow:21a7 Downarrow:21d3 Dscr:1d49f Dstrok:110 ENG:14a ETH:d0
Eacute:c9 Ecaron:11a Ecirc:ca Ecy:42d Edot:116 Efr:1d508 Egrave:c8 Element:2208 Emacr:112
EmptySmallSquare:25fb EmptyVerySmallSquare:25ab Eogon:118 Eopf:1d53c Epsilon:395 Equal:2a75 EqualTilde:2242
Equilibrium:21cc Escr:2130 Esim:2a73 Eta:397 Euml:cb Exists:2203 ExponentialE:2147 Fcy:424 Ffr:1d509
FilledSmallSquare:25fc FilledVerySmallSquare:25aa Fopf:1d53d ForAll:2200 Fouriertrf:2131 Fscr:2131 GJcy:403
GT:3e Gamma:393 Gammad:3dc Gbreve:11e Gcedil:122 Gcirc:11c Gcy:413 Gdot:120 Gfr:1d50a Gg:22d9 Gopf:1d53e
GreaterEqual:2265 GreaterEqualLess:22db GreaterFullEqual:2267 GreaterGreater:2aa2 GreaterLess:2277
GreaterSlantEqual:2a7e GreaterTilde:2273 Gscr:1d4a2 Gt:226b HARDcy:42a Hacek:2c7 Hat:5e Hcirc:124 Hfr:210c
HilbertSpace:210b Hopf:210d HorizontalLine:2500 Hscr:210b Hstrok:126 HumpDownHump:224e HumpEqual:224f IEcy:415
IJlig:132 IOcy:401 Iacute:cd Icirc:ce Icy:418 Idot:130 Ifr:2111 Igrave:cc Im:2111 Imacr:12a ImaginaryI:2148
Implies:21d2 Int:222c Integral:222b Intersection:22c2 InvisibleComma:2063 InvisibleTimes:2062 Iogon:12e
Iopf:1d540 Iota:399 Iscr:2110 Itilde:128 Iukcy:406 Iuml:cf Jcirc:134 Jcy:419 Jfr:1d50d Jopf:1d541 Jscr:1d4a5
Jsercy:408 Jukcy:404 KHcy:425 KJcy:40c Kappa:39a Kcedil:136 Kcy:41a Kfr:1d50e Kopf:1d542 Kscr:1d4a6 LJcy:409
LT:3c Lacute:139 Lambda:39b Lang:27ea Laplacetrf:2112 Larr:219e Lcaron:13d Lcedil:13b Lcy:41b
LeftAngleBracket:27e8 LeftArrow:2190 LeftArrowBar:21e4 LeftArrowRightArrow:21c6 LeftCeiling:2308
LeftDoubleBracket:27e6 LeftDownTeeVector:2961 LeftDownVector:21c3 LeftDownVectorBar:2959 LeftFloor:230a
LeftRightArrow:2194 LeftRightVector:294e LeftTee:22a3 LeftTeeArrow:21a4 LeftTeeVector:295a LeftTriangle:22b2
LeftTriangleBar:29cf LeftTriangleEqual:22b4 LeftUpDownVector:2951 LeftUpTeeVector:2960 LeftUpVector:21bf
LeftUpVectorBar:2958 LeftVector:21bc LeftVectorBar:2952 Leftarrow:21d0 Leftrightarrow:21d4
LessEqualGreater:22da LessFullEqual:2266 LessGreater:2276 LessLess:2aa1 LessSlantEqual:2a7d LessTilde:2272
Lfr:1d50f Ll:22d8 Lleftarrow:21da Lmidot:13f LongLeftArrow:27f5 LongLeftRightArrow:27f7 LongRightArrow:27f6
Longleftarrow:27f8 Longleftrightarrow:27fa Longrightarrow:27f9 Lopf:1d543 LowerLeftArrow:2199
LowerRightArrow:2198 Lscr:2112 Lsh:21b0 Lstrok:141 Lt:226a Map:2905 Mcy:41c MediumSpace:205f Mellintrf:2133
Mfr:1d510 MinusPlus:2213 Mopf:1d544 Mscr:2133 Mu:39c NJcy:40a Nacute:143 Ncaron:147 Ncedil:145 Ncy:41d
NegativeMediumSpace:200b NegativeThickSpace:200b NegativeThinSpace:200b NegativeVeryThinSpace:200b
NestedGreaterGreater:226b NestedLessLess:226a NewLine:a Nfr:1d511 NoBreak:2060 NonBreakingSpace:a0 Nopf:2115
Not:2aec NotCongruent:2262 NotCupCap:226d NotDoubleVerticalBar:2226 NotElement:2209 NotEqual:2260
NotEqualTilde:2242.338 NotExists:2204 NotGreater:226f NotGreaterEqual:2271 NotGreaterFullEqual:2267.338
NotGreaterGreater:226b.338 NotGreaterLess:2279 NotGreaterSlantEqual:2a7e.338 NotGreaterTilde:2275
NotHumpDownHump:224e.338 NotHumpEqual:224f.338 NotLeftTriangle:22ea NotLeftTriangleBar:29cf.338
NotLeftTriangleEqual:22ec NotLess:226e NotLessEqual:2270 NotLessGreater:2278 NotLessLess:226a.338
NotLessSlantEqual:2a7d.338 NotLessTilde:2274 NotNestedGreaterGreater:2aa2.338 NotNestedLessLess:2aa1.338
NotPrecedes:2280 NotPrecedesEqual:2aaf.338 NotPrecedesSlantEqual:22e0 NotReverseElement:220c
NotRightTriangle:22eb NotRightTriangleBar:29d0.338 NotRightTriangleEqual:22ed NotSquareSubset:228f.338
NotSquareSubsetEqual:22e2 NotSquareSuperset:2290.338 NotSquareSupersetEqual:22e3 NotSubset:2282.20d2
NotSubsetEqual:2288 NotSucceeds:2281 NotSucceedsEqual:2ab0.338 NotSucceedsSlantEqual:22e1
NotSucceedsTilde:227f.338 NotSuperset:2283.20d2 NotSupersetEqual:2289 NotTilde:2241 NotTildeEqual:2244
NotTildeFullEqual:2247 NotTildeTilde:2249 NotVerticalBar:2224 Nscr:1d4a9 Ntilde:d1 Nu:39d OElig:152 Oacute:d3
Ocirc:d4 Ocy:41e Odblac:150 Ofr:1d512 Ograve:d2 Omacr:14c Omega:3a9 Omicron:39f Oopf:1d546
OpenCurlyDoubleQuote:201c OpenCurlyQuote:2018 Or:2a54 Oscr:1d4aa Oslash:d8 Otilde:d5 Otimes:2a37 Ouml:d6
OverBar:203e OverBrace:23de OverBracket:23b4 OverParenthesis:23dc PartialD:2202 Pcy:41f Pfr:1d513 Phi:3a6
Pi:3a0 PlusMinus:b1 Poincareplane:210c Popf:2119 Pr:2abb Precedes:227a PrecedesEqual:2aaf
PrecedesSlantEqual:227c PrecedesTilde:227e Prime:2033 Product:220f Proportion:2237 Proportional:221d
Pscr:1d4ab Psi:3a8 QUOT:22 Qfr:1d514 Qopf:211a Qscr:1d4ac RBarr:2910 REG:ae Racute:154 Rang:27eb Rarr:21a0
Rarrtl:2916 Rcaron:158 Rcedil:156 Rcy:420 Re:211c ReverseElement:220b ReverseEquilibrium:21cb
ReverseUpEquilibrium:296f Rfr:211c Rho:3a1 RightAngleBracket:27e9 RightArrow:2192 RightArrowBar:21e5
RightArrowLeftArrow:21c4 RightCeiling:2309 RightDoubleBracket:27e7 RightDownTeeVector:295d
RightDownVector:21c2 RightDownVectorBar:2955 RightFloor:230b RightTee:22a2 RightTeeArrow:21a6
RightTeeVector:295b RightTriangle:22b3 RightTriangleBar:29d0 RightTriangleEqual:22b5 RightUpDownVector:294f
RightUpTeeVector:295c RightUpVector:21be RightUpVectorBar:2954 RightVector:21c0 RightVectorBar:2953
Rightarrow:21d2 Ropf:211d RoundImplies:2970 Rrightarrow:21db Rscr:211b Rsh:21b1 RuleDelayed:29f4 SHCHcy:429
SHcy:428 SOFTcy:42c Sacute:15a Sc:2abc Scaron:160 Scedil:15e Scirc:15c Scy:421 Sfr:1d516 ShortDownArrow:2193
ShortLeftArrow:2190 ShortRightArrow:2192 ShortUpArrow:2191 Sigma:3a3 SmallCircle:2218 Sopf:1d54a Sqrt:221a
Square:25a1 SquareIntersection:2293 SquareSubset:228f SquareSubsetEqual:2291 SquareSuperset:2290
SquareSupersetEqual:2292 SquareUnion:2294 Sscr:1d4ae Star:22c6 Sub:22d0 Subset:22d0 SubsetEqual:2286
Succeeds:227b SucceedsEqual:2ab0 SucceedsSlantEqual:227d SucceedsTilde:227f SuchThat:220b Sum:2211 Sup:22d1
Superset:2283 SupersetEqual:2287 Supset:22d1 THORN:de TRADE:2122 TSHcy:40b TScy:426 Tab:9 Tau:3a4 Tcaron:164
Tcedil:162 Tcy:422 Tfr:1d517 Therefore:2234 Theta:398 ThickSpace:205f.200a ThinSpace:2009 Tilde:223c
TildeEqual:2243 TildeFullEqual:2245 TildeTilde:2248 Topf:1d54b TripleDot:20db Tscr:1d4af Tstrok:166 Uacute:da
Uarr:219f Uarrocir:2949 Ubrcy:40e Ubreve:16c Ucirc:db Ucy:423 Udblac:170 Ufr:1d518 Ugrave:d9 Umacr:16a
UnderBar:5f UnderBrace:23df UnderBracket:23b5 UnderParenthesis:23dd Union:22c3 UnionPlus:228e Uogon:172
Uopf:1d54c UpArrow:2191 UpArrowBar:2912 UpArrowDownArrow:21c5 UpDownArrow:2195 UpEquilibrium:296e UpTee:22a5
UpTeeArrow:21a5 Uparrow:21d1 Updownarrow:21d5 UpperLeftArrow:2196 UpperRightArrow:2197 Upsi:3d2 Upsilon:3a5
Uring:16e Uscr:1d4b0 Utilde:168 Uuml:dc VDash:22ab Vbar:2aeb Vcy:412 Vdash:22a9 Vdashl:2ae6 Vee:22c1
Verbar:2016 Vert:2016 VerticalBar:2223 VerticalLine:7c VerticalSeparator:2758 VerticalTilde:2240
VeryThinSpace:200a Vfr:1d519 Vopf:1d54d Vscr:1d4b1 Vvdash:22aa Wcirc:174 Wedge:22c0 Wfr:1d51a Wopf:1d54e
Wscr:1d4b2 Xfr:1d51b Xi:39e Xopf:1d54f Xscr:1d4b3 YAcy:42f YIcy:407 YUcy:42e Yacute:dd Ycirc:176 Ycy:42b
Yfr:1d51c Yopf:1d550 Yscr:1d4b4 Yuml:178 ZHcy:416 Zacute:179 Zcaron:17d Zcy:417 Zdot:17b ZeroWidthSpace:200b
Zeta:396 Zfr:2128 Zopf:2124 Zscr:1d4b5 aacute:e1 abreve:103 ac:223e acE:223e.333 acd:223f acirc:e2 acute:b4
acy:430 aelig:e6 af:2061 afr:1d51e agrave:e0 alefsym:2135 aleph:2135 alpha:3b1 amacr:101 amalg:2a3f amp:26
and:2227 andand:2a55 andd:2a5c andslope:2a58 andv:2a5a ang:2220 ange:29a4 angle:2220 angmsd:2221 angmsdaa:29a8
angmsdab:29a9 angmsdac:29aa angmsdad:29ab angmsdae:29ac angmsdaf:29ad angmsdag:29ae angmsdah:29af angrt:221f
angrtvb:22be angrtvbd:299d angsph:2222 angst:c5 angzarr:237c aogon:105 aopf:1d552 ap:2248 apE:2a70 apacir:2a6f
ape:224a apid:224b apos:27 approx:2248 approxeq:224a aring:e5 ascr:1d4b6 ast:2a asymp:2248 asympeq:224d
atilde:e3 auml:e4 awconint:2233 awint:2a11 bNot:2aed backcong:224c backepsilon:3f6 backprime:2035 backsim:223d
backsimeq:22cd barvee:22bd barwed:2305 barwedge:2305 bbrk:23b5 bbrktbrk:23b6 bcong:224c bcy:431 bdquo:201e
becaus:2235 because:2235 bemptyv:29b0 bepsi:3f6 bernou:212c beta:3b2 beth:2136 between:226c bfr:1d51f
bigcap:22c2 bigcirc:25ef bigcup:22c3 bigodot:2a00 bigoplus:2a01 bigotimes:2a02 bigsqcup:2a06 bigstar:2605
bigtriangledown:25bd bigtriangleup:25b3 biguplus:2a04 bigvee:22c1 bigwedge:22c0 bkarow:290d blacklozenge:29eb
blacksquare:25aa blacktriangle:25b4 blacktriangledown:25be blacktriangleleft:25c2 blacktriangleright:25b8
blank:2423 blk12:2592 blk14:2591 blk34:2593 block:2588 bne:3d.20e5 bnequiv:2261.20e5 bnot:2310 bopf:1d553
bot:22a5 bottom:22a5 bowtie:22c8 boxDL:2557 boxDR:2554 boxDl:2556 boxDr:2553 boxH:2550 boxHD:2566 boxHU:2569
boxHd:2564 boxHu:2567 boxUL:255d boxUR:255a boxUl:255c boxUr:2559 boxV:2551 boxVH:256c boxVL:2563 boxVR:2560
boxVh:256b boxVl:2562 boxVr:255f boxbox:29c9 boxdL:2555 boxdR:2552 boxdl:2510 boxdr:250c boxh:2500 boxhD:2565
boxhU:2568 boxhd:252c boxhu:2534 boxminus:229f boxplus:229e boxtimes:22a0 boxuL:255b boxuR:2558 boxul:2518
boxur:2514 boxv:2502 boxvH:256a boxvL:2561 boxvR:255e boxvh:253c boxvl:2524 boxvr:251c bprime:2035 breve:2d8
brvbar:a6 bscr:1d4b7 bsemi:204f bsim:223d bsime:22cd bsol:5c bsolb:29c5 bsolhsub:27c8 bull:2022 bullet:2022
bump:224e bumpE:2aae bumpe:224f bumpeq:224f cacute:107 cap:2229 capand:2a44 capbrcup:2a49 capcap:2a4b
capcup:2a47 capdot:2a40 caps:2229.fe00 caret:2041 caron:2c7 ccaps:2a4d ccaron:10d ccedil:e7 ccirc:109
ccups:2a4c ccupssm:2a50 cdot:10b cedil:b8 cemptyv:29b2 cent:a2 centerdot:b7 cfr:1d520 chcy:447 check:2713
checkmark:2713 chi:3c7 cir:25cb cirE:29c3 circ:2c6 circeq:2257 circlearrowleft:21ba circlearrowright:21bb
circledR:ae circledS:24c8 circledast:229b circledcirc:229a circleddash:229d cire:2257 cirfnint:2a10
cirmid:2aef cirscir:29c2 clubs:2663 clubsuit:2663 colon:3a colone:2254 coloneq:2254 comma:2c commat:40
comp:2201 compfn:2218 complement:2201 complexes:2102 cong:2245 congdot:2a6d conint:222e copf:1d554 coprod:2210
copy:a9 copysr:2117 crarr:21b5 cross:2717 cscr:1d4b8 csub:2acf csube:2ad1 csup:2ad0 csupe:2ad2 ctdot:22ef
cudarrl:2938 cudarrr:2935 cuepr:22de cuesc:22df cularr:21b6 cularrp:293d cup:222a cupbrcap:2a48 cupcap:2a46
cupcup:2a4a cupdot:228d cupor:2a45 cups:222a.fe00 curarr:21b7 curarrm:293c curlyeqprec:22de curlyeqsucc:22df
curlyvee:22ce curlywedge:22cf curren:a4 curvearrowleft:21b6 curvearrowright:21b7 cuvee:22ce cuwed:22cf
cwconint:2232 cwint:2231 cylcty:232d dArr:21d3 dHar:2965 dagger:2020 daleth:2138 darr:2193 dash:2010
dashv:22a3 dbkarow:290f dblac:2dd dcaron:10f dcy:434 dd:2146 ddagger:2021 ddarr:21ca ddotseq:2a77 deg:b0
delta:3b4 demptyv:29b1 dfisht:297f dfr:1d521 dharl:21c3 dharr:21c2 diam:22c4 diamond:22c4 diamondsuit:2666
diams:2666 die:a8 digamma:3dd disin:22f2 div:f7 divide:f7 divideontimes:22c7 divonx:22c7 djcy:452 dlcorn:231e
dlcrop:230d dollar:24 dopf:1d555 dot:2d9 doteq:2250 doteqdot:2251 dotminus:2238 dotplus:2214 dotsquare:22a1
doublebarwedge:2306 downarrow:2193 downdownarrows:21ca downharpoonleft:21c3 downharpoonright:21c2
drbkarow:2910 drcorn:231f drcrop:230c dscr:1d4b9 dscy:455 dsol:29f6 dstrok:111 dtdot:22f1 dtri:25bf dtrif:25be
duarr:21f5 duhar:296f dwangle:29a6 dzcy:45f dzigrarr:27ff eDDot:2a77 eDot:2251 eacute:e9 easter:2a6e
ecaron:11b ecir:2256 ecirc:ea ecolon:2255 ecy:44d edot:117 ee:2147 efDot:2252 efr:1d522 eg:2a9a egrave:e8
egs:2a96 egsdot:2a98 el:2a99 elinters:23e7 ell:2113 els:2a95 elsdot:2a97 emacr:113 empty:2205 emptyset:2205
emptyv:2205 emsp13:2004 emsp14:2005 emsp:2003 eng:14b ensp:2002 eogon:119 eopf:1d556 epar:22d5 eparsl:29e3
eplus:2a71 epsi:3b5 epsilon:3b5 epsiv:3f5 eqcirc:2256 eqcolon:2255 eqsim:2242 eqslantgtr:2a96 eqslantless:2a95
equals:3d equest:225f equiv:2261 equivDD:2a78 eqvparsl:29e5 erDot:2253 erarr:2971 escr:212f esdot:2250
esim:2242 eta:3b7 eth:f0 euml:eb euro:20ac excl:21 exist:2203 expectation:2130 exponentiale:2147
fallingdotseq:2252 fcy:444 female:2640 ffilig:fb03 fflig:fb00 ffllig:fb04 ffr:1d523 filig:fb01 fjlig:66.6a
flat:266d fllig:fb02 fltns:25b1 fnof:192 fopf:1d557 forall:2200 fork:22d4 forkv:2ad9 fpartint:2a0d frac12:bd
frac13:2153 frac14:bc frac15:2155 frac16:2159 frac18:215b frac23:2154 frac25:2156 frac34:be frac35:2157
frac38:215c frac45:2158 frac56:215a frac58:215d frac78:215e frasl:2044 frown:2322 fscr:1d4bb gE:2267 gEl:2a8c
gacute:1f5 gamma:3b3 gammad:3dd gap:2a86 gbreve:11f gcirc:11d gcy:433 gdot:121 ge:2265 gel:22db geq:2265
geqq:2267 geqslant:2a7e ges:2a7e gescc:2aa9 gesdot:2a80 gesdoto:2a82 gesdotol:2a84 gesl:22db.fe00 gesles:2a94
gfr:1d524 gg:226b ggg:22d9 gimel:2137 gjcy:453 gl:2277 glE:2a92 gla:2aa5 glj:2aa4 gnE:2269 gnap:2a8a
gnapprox:2a8a gne:2a88 gneq:2a88 gneqq:2269 gnsim:22e7 gopf:1d558 grave:60 gscr:210a gsim:2273 gsime:2a8e
gsiml:2a90 gt:3e gtcc:2aa7 gtcir:2a7a gtdot:22d7 gtlPar:2995 gtquest:2a7c gtrapprox:2a86 gtrarr:2978
gtrdot:22d7 gtreqless:22db gtreqqless:2a8c gtrless:2277 gtrsim:2273 gvertneqq:2269.fe00 gvnE:2269.fe00
hArr:21d4 hairsp:200a half:bd hamilt:210b hardcy:44a harr:2194 harrcir:2948 harrw:21ad hbar:210f hcirc:125
hearts:2665 heartsuit:2665 hellip:2026 hercon:22b9 hfr:1d525 hksearow:2925 hkswarow:2926 hoarr:21ff
homtht:223b hookleftarrow:21a9 hookrightarrow:21aa hopf:1d559 horbar:2015 hscr:1d4bd hslash:210f hstrok:127
hybull:2043 hyphen:2010 iacute:ed ic:2063 icirc:ee icy:438 iecy:435 iexcl:a1 iff:21d4 ifr:1d526 igrave:ec
ii:2148 iiiint:2a0c iiint:222d iinfin:29dc iiota:2129 ijlig:133 imacr:12b image:2111 imagline:2110
imagpart:2111 imath:131 imof:22b7 imped:1b5 in:2208 incare:2105 infin:221e infintie:29dd inodot:131 int:222b
intcal:22ba integers:2124 intercal:22ba intlarhk:2a17 intprod:2a3c iocy:451 iogon:12f iopf:1d55a iota:3b9
iprod:2a3c iquest:bf iscr:1d4be isin:2208 isinE:22f9 isindot:22f5 isins:22f4 isinsv:22f3 isinv:2208 it:2062
itilde:129 iukcy:456 iuml:ef jcirc:135 jcy:439 jfr:1d527 jmath:237 jopf:1d55b jscr:1d4bf jsercy:458 jukcy:454
kappa:3ba kappav:3f0 kcedil:137 kcy:43a kfr:1d528 kgreen:138 khcy:445 kjcy:45c kopf:1d55c kscr:1d4c0
lAarr:21da lArr:21d0 lAtail:291b lBarr:290e lE:2266 lEg:2a8b lHar:2962 lacute:13a laemptyv:29b4 lagran:2112
lambda:3bb lang:27e8 langd:2991 langle:27e8 lap:2a85 laquo:ab larr:2190 larrb:21e4 larrbfs:291f larrfs:291d
larrhk:21a9 larrlp:21ab larrpl:2939 larrsim:2973 larrtl:21a2 lat:2aab latail:2919 late:2aad lates:2aad.fe00
lbarr:290c lbbrk:2772 lbrace:7b lbrack:5b lbrke:298b lbrksld:298f lbrkslu:298d lcaron:13e lcedil:13c
lceil:2308 lcub:7b lcy:43b ldca:2936 ldquo:201c ldquor:201e ldrdhar:2967 ldrushar:294b ldsh:21b2 le:2264
leftarrow:2190 leftarrowtail:21a2 leftharpoondown:21bd leftharpoonup:21bc leftleftarrows:21c7
leftrightarrow:2194 leftrightarrows:21c6 leftrightharpoons:21cb leftrightsquigarrow:21ad leftthreetimes:22cb
leg:22da leq:2264 leqq:2266 leqslant:2a7d les:2a7d lescc:2aa8 lesdot:2a7f lesdoto:2a81 lesdotor:2a83
lesg:22da.fe00 lesges:2a93 lessapprox:2a85 lessdot:22d6 lesseqgtr:22da lesseqqgtr:2a8b lessgtr:2276
lesssim:2272 lfisht:297c lfloor:230a lfr:1d529 lg:2276 lgE:2a91 lhard:21bd lharu:21bc lharul:296a lhblk:2584
ljcy:459 ll:226a llarr:21c7 llcorner:231e llhard:296b lltri:25fa lmidot:140 lmoust:23b0 lmoustache:23b0
lnE:2268 lnap:2a89 lnapprox:2a89 lne:2a87 lneq:2a87 lneqq:2268 lnsim:22e6 loang:27ec loarr:21fd lobrk:27e6
longleftarrow:27f5 longleftrightarrow:27f7 longmapsto:27fc longrightarrow:27f6 looparrowleft:21ab
looparrowright:21ac lopar:2985 lopf:1d55d loplus:2a2d lotimes:2a34 lowast:2217 lowbar:5f loz:25ca lozenge:25ca
lozf:29eb lpar:28 lparlt:2993 lrarr:21c6 lrcorner:231f lrhar:21cb lrhard:296d lrm:200e lrtri:22bf lsaquo:2039
lscr:1d4c1 lsh:21b0 lsim:2272 lsime:2a8d lsimg:2a8f lsqb:5b lsquo:2018 lsquor:201a lstrok:142 lt:3c ltcc:2aa6
ltcir:2a79 ltdot:22d6 lthree:22cb ltimes:22c9 ltlarr:2976 ltquest:2a7b ltrPar:2996 ltri:25c3 ltrie:22b4
ltrif:25c2 lurdshar:294a luruhar:2966 lvertneqq:2268.fe00 lvnE:2268.fe00 mDDot:223a macr:af male:2642
malt:2720 maltese:2720 map:21a6 mapsto:21a6 mapstodown:21a7 mapstoleft:21a4 mapstoup:21a5 marker:25ae
mcomma:2a29 mcy:43c mdash:2014 measuredangle:2221 mfr:1d52a mho:2127 micro:b5 mid:2223 midast:2a midcir:2af0
middot:b7 minus:2212 minusb:229f minusd:2238 minusdu:2a2a mlcp:2adb mldr:2026 mnplus:2213 models:22a7
mopf:1d55e mp:2213 mscr:1d4c2 mstpos:223e mu:3bc multimap:22b8 mumap:22b8 nGg:22d9.338 nGt:226b.20d2
nGtv:226b.338 nLeftarrow:21cd nLeftrightarrow:21ce nLl:22d8.338 nLt:226a.20d2 nLtv:226a.338 nRightarrow:21cf
nVDash:22af nVdash:22ae nabla:2207 nacute:144 nang:2220.20d2 nap:2249 napE:2a70.338 napid:224b.338 napos:149
napprox:2249 natur:266e natural:266e naturals:2115 nbsp:a0 nbump:224e.338 nbumpe:224f.338 ncap:2a43 ncaron:148
ncedil:146 ncong:2247 ncongdot:2a6d.338 ncup:2a42 ncy:43d ndash:2013 ne:2260 neArr:21d7 nearhk:2924 nearr:2197
nearrow:2197 nedot:2250.338 nequiv:2262 nesear:2928 nesim:2242.338 nexist:2204 nexists:2204 nfr:1d52b
ngE:2267.338 nge:2271 ngeq:2271 ngeqq:2267.338 ngeqslant:2a7e.338 nges:2a7e.338 ngsim:2275 ngt:226f ngtr:226f
nhArr:21ce nharr:21ae nhpar:2af2 ni:220b nis:22fc nisd:22fa niv:220b njcy:45a nlArr:21cd nlE:2266.338
nlarr:219a nldr:2025 nle:2270 nleftarrow:219a nleftrightarrow:21ae nleq:2270 nleqq:2266.338 nleqslant:2a7d.338
nles:2a7d.338 nless:226e nlsim:2274 nlt:226e nltri:22ea nltrie:22ec nmid:2224 nopf:1d55f not:ac notin:2209
notinE:22f9.338 notindot:22f5.338 notinva:2209 notinvb:22f7 notinvc:22f6 notni:220c notniva:220c notnivb:22fe
notnivc:22fd npar:2226 nparallel:2226 nparsl:2afd.20e5 npart:2202.338 npolint:2a14 npr:2280 nprcue:22e0
npre:2aaf.338 nprec:2280 npreceq:2aaf.338 nrArr:21cf nrarr:219b nrarrc:2933.338 nrarrw:219d.338
nrightarrow:219b nrtri:22eb nrtrie:22ed nsc:2281 nsccue:22e1 nsce:2ab0.338 nscr:1d4c3 nshortmid:2224
nshortparallel:2226 nsim:2241 nsime:2244 nsimeq:2244 nsmid:2224 nspar:2226 nsqsube:22e2 nsqsupe:22e3 nsub:2284
nsubE:2ac5.338 nsube:2288 nsubset:2282.20d2 nsubseteq:2288 nsubseteqq:2ac5.338 nsucc:2281 nsucceq:2ab0.338
nsup:2285 nsupE:2ac6.338 nsupe:2289 nsupset:2283.20d2 nsupseteq:2289 nsupseteqq:2ac6.338 ntgl:2279 ntilde:f1
ntlg:2278 ntriangleleft:22ea ntrianglelefteq:22ec ntriangleright:22eb ntrianglerighteq:22ed nu:3bd num:23
numero:2116 numsp:2007 nvDash:22ad nvHarr:2904 nvap:224d.20d2 nvdash:22ac nvge:2265.20d2 nvgt:3e.20d2
nvinfin:29de nvlArr:2902 nvle:2264.20d2 nvlt:3c.20d2 nvltrie:22b4.20d2 nvrArr:2903 nvrtrie:22b5.20d2
nvsim:223c.20d2 nwArr:21d6 nwarhk:2923 nwarr:2196 nwarrow:2196 nwnear:2927 oS:24c8 oacute:f3 oast:229b
ocir:229a ocirc:f4 ocy:43e odash:229d odblac:151 odiv:2a38 odot:2299 odsold:29bc oelig:153 ofcir:29bf
ofr:1d52c ogon:2db ograve:f2 ogt:29c1 ohbar:29b5 ohm:3a9 oint:222e olarr:21ba olcir:29be olcross:29bb
oline:203e olt:29c0 omacr:14d omega:3c9 omicron:3bf omid:29b6 ominus:2296 oopf:1d560 opar:29b7 operp:29b9
oplus:2295 or:2228 orarr:21bb ord:2a5d order:2134 orderof:2134 ordf:aa ordm:ba origof:22b6 oror:2a56
orslope:2a57 orv:2a5b oscr:2134 oslash:f8 osol:2298 otilde:f5 otimes:2297 otimesas:2a36 ouml:f6 ovbar:233d
par:2225 para:b6 parallel:2225 parsim:2af3 parsl:2afd part:2202 pcy:43f percnt:25 period:2e permil:2030
perp:22a5 pertenk:2031 pfr:1d52d phi:3c6 phiv:3d5 phmmat:2133 phone:260e pi:3c0 pitchfork:22d4 piv:3d6
planck:210f planckh:210e plankv:210f plus:2b plusacir:2a23 plusb:229e pluscir:2a22 plusdo:2214 plusdu:2a25
pluse:2a72 plusmn:b1 plussim:2a26 plustwo:2a27 pm:b1 pointint:2a15 popf:1d561 pound:a3 pr:227a prE:2ab3
prap:2ab7 prcue:227c pre:2aaf prec:227a precapprox:2ab7 preccurlyeq:227c preceq:2aaf precnapprox:2ab9
precneqq:2ab5 precnsim:22e8 precsim:227e prime:2032 primes:2119 prnE:2ab5 prnap:2ab9 prnsim:22e8 prod:220f
profalar:232e profline:2312 profsurf:2313 prop:221d propto:221d prsim:227e prurel:22b0 pscr:1d4c5 psi:3c8
puncsp:2008 qfr:1d52e qint:2a0c qopf:1d562 qprime:2057 qscr:1d4c6 quaternions:210d quatint:2a16 quest:3f
questeq:225f quot:22 rAarr:21db rArr:21d2 rAtail:291c rBarr:290f rHar:2964 race:223d.331 racute:155 radic:221a
raemptyv:29b3 rang:27e9 rangd:2992 range:29a5 rangle:27e9 raquo:bb rarr:2192 rarrap:2975 rarrb:21e5
rarrbfs:2920 rarrc:2933 rarrfs:291e rarrhk:21aa rarrlp:21ac rarrpl:2945 rarrsim:2974 rarrtl:21a3 rarrw:219d
ratail:291a ratio:2236 rationals:211a rbarr:290d rbbrk:2773 rbrace:7d rbrack:5d rbrke:298c rbrksld:298e
rbrkslu:2990 rcaron:159 rcedil:157 rceil:2309 rcub:7d rcy:440 rdca:2937 rdldhar:2969 rdquo:201d rdquor:201d
rdsh:21b3 real:211c realine:211b realpart:211c reals:211d rect:25ad reg:ae rfisht:297d rfloor:230b rfr:1d52f
rhard:21c1 rharu:21c0 rharul:296c rho:3c1 rhov:3f1 rightarrow:2192 rightarrowtail:21a3 rightharpoondown:21c1
rightharpoonup:21c0 rightleftarrows:21c4 rightleftharpoons:21cc rightrightarrows:21c9 rightsquigarrow:219d
rightthreetimes:22cc ring:2da risingdotseq:2253 rlarr:21c4 rlhar:21cc rlm:200f rmoust:23b1 rmoustache:23b1
rnmid:2aee roang:27ed roarr:21fe robrk:27e7 ropar:2986 ropf:1d563 roplus:2a2e rotimes:2a35 rpar:29 rpargt:2994
rppolint:2a12 rrarr:21c9 rsaquo:203a rscr:1d4c7 rsh:21b1 rsqb:5d rsquo:2019 rsquor:2019 rthree:22cc
rtimes:22ca rtri:25b9 rtrie:22b5 rtrif:25b8 rtriltri:29ce ruluhar:2968 rx:211e sacute:15b sbquo:201a sc:227b
scE:2ab4 scap:2ab8 scaron:161 sccue:227d sce:2ab0 scedil:15f scirc:15d scnE:2ab6 scnap:2aba scnsim:22e9
scpolint:2a13 scsim:227f scy:441 sdot:22c5 sdotb:22a1 sdote:2a66 seArr:21d8 searhk:2925 searr:2198
searrow:2198 sect:a7 semi:3b seswar:2929 setminus:2216 setmn:2216 sext:2736 sfr:1d530 sfrown:2322 sharp:266f
shchcy:449 shcy:448 shortmid:2223 shortparallel:2225 shy:ad sigma:3c3 sigmaf:3c2 sigmav:3c2 sim:223c
simdot:2a6a sime:2243 simeq:2243 simg:2a9e simgE:2aa0 siml:2a9d simlE:2a9f simne:2246 simplus:2a24
simrarr:2972 slarr:2190 smallsetminus:2216 smashp:2a33 smeparsl:29e4 smid:2223 smile:2323 smt:2aaa smte:2aac
smtes:2aac.fe00 softcy:44c sol:2f solb:29c4 solbar:233f sopf:1d564 spades:2660 spadesuit:2660 spar:2225
sqcap:2293 sqcaps:2293.fe00 sqcup:2294 sqcups:2294.fe00 sqsub:228f sqsube:2291 sqsubset:228f sqsubseteq:2291
sqsup:2290 sqsupe:2292 sqsupset:2290 sqsupseteq:2292 squ:25a1 square:25a1 squarf:25aa squf:25aa srarr:2192
sscr:1d4c8 ssetmn:2216 ssmile:2323 sstarf:22c6 star:2606 starf:2605 straightepsilon:3f5 straightphi:3d5
strns:af sub:2282 subE:2ac5 subdot:2abd sube:2286 subedot:2ac3 submult:2ac1 subnE:2acb subne:228a subplus:2abf
subrarr:2979 subset:2282 subseteq:2286 subseteqq:2ac5 subsetneq:228a subsetneqq:2acb subsim:2ac7 subsub:2ad5
subsup:2ad3 succ:227b succapprox:2ab8 succcurlyeq:227d succeq:2ab0 succnapprox:2aba succneqq:2ab6
succnsim:22e9 succsim:227f sum:2211 sung:266a sup1:b9 sup2:b2 sup3:b3 sup:2283 supE:2ac6 supdot:2abe
supdsub:2ad8 supe:2287 supedot:2ac4 suphsol:27c9 suphsub:2ad7 suplarr:297b supmult:2ac2 supnE:2acc supne:228b
supplus:2ac0 supset:2283 supseteq:2287 supseteqq:2ac6 supsetneq:228b supsetneqq:2acc supsim:2ac8 supsub:2ad4
supsup:2ad6 swArr:21d9 swarhk:2926 swarr:2199 swarrow:2199 swnwar:292a szlig:df target:2316 tau:3c4 tbrk:23b4
tcaron:165 tcedil:163 tcy:442 tdot:20db telrec:2315 tfr:1d531 there4:2234 therefore:2234 theta:3b8
thetasym:3d1 thetav:3d1 thickapprox:2248 thicksim:223c thinsp:2009 thkap:2248 thksim:223c thorn:fe tilde:2dc
times:d7 timesb:22a0 timesbar:2a31 timesd:2a30 tint:222d toea:2928 top:22a4 topbot:2336 topcir:2af1 topf:1d565
topfork:2ada tosa:2929 tprime:2034 trade:2122 triangle:25b5 triangledown:25bf triangleleft:25c3
trianglelefteq:22b4 triangleq:225c triangleright:25b9 trianglerighteq:22b5 tridot:25ec trie:225c triminus:2a3a
triplus:2a39 trisb:29cd tritime:2a3b trpezium:23e2 tscr:1d4c9 tscy:446 tshcy:45b tstrok:167 twixt:226c
twoheadleftarrow:219e twoheadrightarrow:21a0 uArr:21d1 uHar:2963 uacute:fa uarr:2191 ubrcy:45e ubreve:16d
ucirc:fb ucy:443 udarr:21c5 udblac:171 udhar:296e ufisht:297e ufr:1d532 ugrave:f9 uharl:21bf uharr:21be
uhblk:2580 ulcorn:231c ulcorner:231c ulcrop:230f ultri:25f8 umacr:16b uml:a8 uogon:173 uopf:1d566 uparrow:2191
updownarrow:2195 upharpoonleft:21bf upharpoonright:21be uplus:228e upsi:3c5 upsih:3d2 upsilon:3c5
upuparrows:21c8 urcorn:231d urcorner:231d urcrop:230e uring:16f urtri:25f9 uscr:1d4ca utdot:22f0 utilde:169
utri:25b5 utrif:25b4 uuarr:21c8 uuml:fc uwangle:29a7 vArr:21d5 vBar:2ae8 vBarv:2ae9 vDash:22a8 vangrt:299c
varepsilon:3f5 varkappa:3f0 varnothing:2205 varphi:3d5 varpi:3d6 varpropto:221d varr:2195 varrho:3f1
varsigma:3c2 varsubsetneq:228a.fe00 varsubsetneqq:2acb.fe00 varsupsetneq:228b.fe00 varsupsetneqq:2acc.fe00
vartheta:3d1 vartriangleleft:22b2 vartriangleright:22b3 vcy:432 vdash:22a2 vee:2228 veebar:22bb veeeq:225a
vellip:22ee verbar:7c vert:7c vfr:1d533 vltri:22b2 vnsub:2282.20d2 vnsup:2283.20d2 vopf:1d567 vprop:221d
vrtri:22b3 vscr:1d4cb vsubnE:2acb.fe00 vsubne:228a.fe00 vsupnE:2acc.fe00 vsupne:228b.fe00 vzigzag:299a
wcirc:175 wedbar:2a5f wedge:2227 wedgeq:2259 weierp:2118 wfr:1d534 wopf:1d568 wp:2118 wr:2240 wreath:2240
wscr:1d4cc xcap:22c2 xcirc:25ef xcup:22c3 xdtri:25bd xfr:1d535 xhArr:27fa xharr:27f7 xi:3be xlArr:27f8
xlarr:27f5 xmap:27fc xnis:22fb xodot:2a00 xopf:1d569 xoplus:2a01 xotime:2a02 xrArr:27f9 xrarr:27f6 xscr:1d4cd
xsqcup:2a06 xuplus:2a04 xutri:25b3 xvee:22c1 xwedge:22c0 yacute:fd yacy:44f ycirc:177 ycy:44b yen:a5 yfr:1d536
yicy:457 yopf:1d56a yscr:1d4ce yucy:44e yuml:ff zacute:17a zcaron:17e zcy:437 zdot:17c zeetrf:2128 zeta:3b6
zfr:1d537 zhcy:436 zigrarr:21dd zopf:1d56b zscr:1d4cf zwj:200d zwnj:200c
`;
