import { codeHighlighter } from './codeHighlighter';

// Escape the five characters that would let a user-controlled value break
// out of a single-quoted HTML attribute context (or an attribute name).
// Used by the <img> and <a> emitters below as a defense-in-depth layer
// on top of sanitizeHtml at render time (REQ-20260418-001 FR-07).
const escapeHtmlAttr = (s: unknown): string => {
	if(s === undefined || s === null) return '';
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

// 표시 텍스트용 이스케이프. 속성용(escapeHtmlAttr)은 따옴표까지 바꾸는데,
// 그것을 본문 텍스트에 쓰면 URL 의 작은따옴표가 `&#39;` 로 보인다.
// 텍스트 문맥에서 위험한 것은 `&` · `<` · `>` 뿐이다.
const escapeHtmlText = (s: unknown): string => {
	if(s === undefined || s === null) return '';
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
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

interface ParsedNode {
	type: string;
	text: string;
	closure?: string;
	itemOf?: string;
	depth?: number;
}

export const markdownToHtml = (rawInput: string): string => {

	// inline code 보호에 쓰는 자리표시자와 같은 문자가 입력에 있으면 복원 단계가
	// 사용자 글자를 코드 스팬으로 오치환한다 (실측: `\uE000c9\uE001` → `<code></code>`).
	// private-use 영역은 아이콘 폰트가 쓰므로 붙여넣기로 유입될 수 있다. 입력에서
	// 먼저 걷어 충돌 가능성 자체를 없앤다 — 이 두 코드포인트는 본문에서 의미가 없다.
	const input = rawInput.replace(/[\uE000\uE001]/g, "");

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

	// pre
	let index = 0;
	let isPreStarted = false;
	let language = "";
	for(let node of parsed) {

		if("value" === node.type
			&& "" === node.closure
			&& 2 < node.text.trim().length
			&& "```" === node.text.trim().substr(0, 3)
			&& !isPreStarted) {

			parsed.splice(index, 1, {type: "tag", text: "<pre>", closure: "pre"});
			
			language = node.text.trim().substr(3).trim();
			
			isPreStarted = true;
		}
		else if("value" === node.type
			&& "" === node.closure
			&& 3 === node.text.trim().length
			&& "```" === node.text.trim().substr(0, 3)
			&& isPreStarted) {

			parsed.splice(index, 1, {type: "tag", text: "</pre>", closure: "pre"});
			
			isPreStarted = false;
		}
		else if(isPreStarted) {

			node.text = codeHighlighter(language, node.text);

			parsed.splice(index, 1
				, {type: "value", text: node.text + "<br />", closure: "pre"});
		}
		
		index++;
	}
	if(isPreStarted) {
		parsed.push({type: "tag", text: "</pre>", closure: "pre"});

		isPreStarted = false;
	}
	// hr
	//
	// 이전에는 정확히 3자인 `---` 만 인식했다. CommonMark 는 `-` · `*` · `_` 세 문자
	// 모두를 **3개 이상** 반복하면 수평선으로 규정한다. 그래서 `***` 는 수평선이
	// 되지 못한 채 emphasis 파서에 걸려 `<em></em>*` 라는 깨진 출력을 냈다
	// (실측 2026-08-30). `___` 도 같은 부류였다.
	const THEMATIC_BREAK_PATTERN = /^(-{3,}|\*{3,}|_{3,})$/;

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

	// blockquote
	index = 0;
	for(let node of parsed) {

		if("value" === node.type
			&& "" === node.closure
			&& node.text.length > 0
			&& '>' === node.text.charAt(0)) {

			parsed.splice(index, 1
				, {type: "tag", text: "<blockquote>"}
				, {type: "value", text: node.text.substring(1), closure: "blockquote"}
				, {type: "tag", text: "</blockquote>"});
		}
		index++;
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

	parsed = bindListItem(parsed, "ul");

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

						parsed.splice(index, 1,
							{type: "tag", text: "<li>", itemOf: "ol", depth: depth}
							, {type: "value", text: stripped.substring(i), itemOf: "ol", closure: "li", depth: depth}
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

	parsed = bindListItem(parsed, "ol");
		
	// headers
	index = 0;
	let sharps = "";

	for(let node of parsed) {

		if("value" === node.type && "" === node.closure) {

			sharps = "";

			for(let i = 1; i < 7; i++) {

				sharps += "#";

				if(node.text.length > i && (sharps + " ") === node.text.substr(0, i + 1)) {
	
					parsed.splice(index, 1, 
						{type: "tag", text: "<h" + i + ">"}
						, {type: "value", text: node.text.substring(i + 1), closure: "header"}
						, {type: "tag", text: "</h" + i + ">"});

					break;
				}
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

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(/`([^`]+)`/g, (_m, code: string) => {
				codeSpans.push(code);
				return "\uE000c" + (codeSpans.length - 1) + "\uE001";
			});
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
				"<img src='" + escapeHtmlAttr(url) + "' alt='" + escapeHtmlAttr(alt) + "'"
				+ (undefined === title ? "" : " title='" + escapeHtmlAttr(title) + "'")
				+ " />"
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
	const AUTOLINK_PATTERN = /<((?:https?:\/\/|mailto:)[^\s<>]+)>/g;

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(AUTOLINK_PATTERN, (_m, url) =>
				"<a href='" + escapeHtmlAttr(url) + "' target='_blank' rel='noreferrer'>"
				+ escapeHtmlText(url) + "</a>"
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
				"<a href='" + escapeHtmlAttr(url) + "'"
				+ (undefined === title ? "" : " title='" + escapeHtmlAttr(title) + "'")
				+ " target='_blank' rel='noreferrer'>" + text + "</a>"
			);
		}
	}

	parsed = inlineParsing(parsed, "**", "strong"); // bold
	parsed = inlineParsing(parsed, "~~", "del"); // stroke
	// 홑 `*` 만 공백 규칙을 켠다. `2 * 3 * 4 = 24` 가 `2 <em> 3 </em> 4 = 24` 로
	// 렌더되던 것을 막는다 — 기술 글에서 곱셈 표기가 통째로 기울어졌다.
	// `**` · `~~` 는 공백을 끼워 써도 의도가 분명하므로 그대로 둔다 (`** 굵게 **`).
	parsed = inlineParsing(parsed, "*", "em", true); // emphasis

	// 코드 스팬 복원. 내용은 이스케이프한다 — 코드는 보이는 그대로여야 하고,
	// 이스케이프하지 않으면 `<String>` 같은 표기가 sanitize 에서 삭제돼 글자가
	// 사라진다.
	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(/\uE000c(\d+)\uE001/g, (_m, i: string) =>
				"<code>" + escapeHtmlText(codeSpans[Number(i)]) + "</code>"
			);
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

const inlineParsing = (parsed: ParsedNode[], delimeter: string, tagName: string, strictFlanking = false): ParsedNode[] => {

	let searchFrom = 0;
	let start = -1;
	let end = -1;
	let currentText = "";
	let searchedText = "";
	let delimeterLength = delimeter.length;
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
					const after = node.text.charAt(searchFrom + delimeterLength);
					if(strictFlanking && ("" === after || /\s/.test(after))) {
						searchFrom += delimeterLength;
						continue;
					}
					start = searchFrom;
					searchFrom += delimeterLength;
				}
				else {
					// 닫는 구분자 앞에 공백이 오면 닫는 것이 아니다 (right-flanking).
					const before = node.text.charAt(searchFrom - 1);
					if(strictFlanking && ("" === before || /\s/.test(before))) {
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

	// Close every currently open list. Used on non-list nodes and at EOF.
	const flushAll = () => {
		flushPendingCloseLi();
		while(depthStack.length > 0) {
			output.push({type: "tag", text: closeTag, itemOf: tagName});
			depthStack.pop();
			if(depthStack.length > 0) {
				// The enclosing <li> that held the just-closed inner list
				// is still open; close it before moving further out.
				output.push({type: "tag", text: "</li>", itemOf: tagName});
			}
		}
	};

	for(const node of parsed) {

		const isListNode = node.itemOf === tagName;
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
				output.push({type: "tag", text: openTag, itemOf: tagName});
				depthStack.push(d);
			}
			else if(d > top()) {
				// Nest deeper: keep the previous item's </li> suppressed so
				// the new <tagName> lives inside that still-open <li>.
				pendingCloseLi = null;
				output.push({type: "tag", text: openTag, itemOf: tagName});
				depthStack.push(d);
			}
			else if(d === top()) {
				// Sibling at the same depth — flush the previous </li>.
				flushPendingCloseLi();
			}
			else {
				// d < top(): close inner lists until depths line up.
				flushPendingCloseLi();
				while(depthStack.length > 0 && d < top()) {
					output.push({type: "tag", text: closeTag, itemOf: tagName});
					depthStack.pop();
					if(depthStack.length > 0) {
						output.push({type: "tag", text: "</li>", itemOf: tagName});
					}
				}
				if(depthStack.length === 0) {
					// Fell below the outermost: begin a new top-level list.
					output.push({type: "tag", text: openTag, itemOf: tagName});
					depthStack.push(d);
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
		else {
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