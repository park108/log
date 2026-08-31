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

// 목록 항목의 마커 판정. 검출 패스(`ul` · `ol`)가 쓰는 규칙과 **같은 규칙**이어야
// 한다 — 여기서 마커로 보지 않는 줄을 검출 패스가 마커로 보면 그 줄이 이어짐으로
// 흡수돼 항목이 사라진다. 마커면 그 줄의 깊이를, 아니면 null 을 돌려준다.
const listMarkerDepth = (text: string): number | null => {

	const { depth, prefixLength } = computeDepth(text);
	const stripped = text.substring(prefixLength);

	// `- ` · `* ` (ul 검출 `:215` 와 같은 조건)
	if(stripped.length > 1
		&& ('*' === stripped.charAt(0) || '-' === stripped.charAt(0))
		&& ' ' === stripped.charAt(1)) {
		return depth;
	}

	// `1. ` (ol 검출 `:242` 와 같은 조건 — 숫자 뒤 점, 그 뒤에 공백 한 칸.
	// 점 뒤에 공백이 없는 `1.5 초` 는 마커가 아니다.)
	if(stripped.length > 2 && /^[0-9]+\. /.test(stripped)) {
		return depth;
	}

	return null;
}

// 수평선. `-`·`*`·`_` 중 하나를 **3개 이상** 반복한 줄이다.
//
// 함수 안에 있던 것을 모듈 스코프로 올려 내보낸다 — 변경 이력 강조(`Log/diffContents`)
// 가 "이 줄에 강조할 내용이 있는가" 를 물어야 하는데, 규칙을 그쪽에 다시 적으면
// 사본 둘이 갈라진다. 오늘 같은 부류를 두 번 봤다 (업로드 절차 사본, 게이트에
// 박힌 예시 값). 판정은 규칙을 아는 쪽이 한다.
export const THEMATIC_BREAK_PATTERN = /^(-{3,}|\*{3,}|_{3,})$/;

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

interface ParsedNode {
	type: string;
	text: string;
	closure?: string;
	itemOf?: string;
	depth?: number;
}

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

			// 코드 블록도 사용자 글자다. escape 하지 않으면 `List<String>` 이
			// sanitize 단계에서 미지의 태그로 삭제돼 `List` 만 남았다 (실측).
			// 강조기가 <span> 을 넣으므로 **넘기기 전에** escape 한다.
			node.text = codeHighlighter(language, escapeHtmlText(node.text));

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

	index = 0;
	while(index < parsed.length) {

		if(!isQuoteLine(parsed[index])) {
			index++;
			continue;
		}

		let end = index;
		while(isQuoteLine(parsed[end + 1])) end++;

		const replacement: ParsedNode[] = [{type: "tag", text: "<blockquote>"}];

		for(let i = index; i <= end; i++) {
			let text = (parsed[i] as ParsedNode).text.substring(1);
			if(' ' === text.charAt(0)) text = text.substring(1);
			if(i > index) replacement.push({type: "tag", text: "<br />"});
			replacement.push({type: "value", text, closure: "blockquote"});
		}

		replacement.push({type: "tag", text: "</blockquote>"});

		parsed.splice(index, end - index + 1, ...replacement);
		index += replacement.length;
	}

	// 목록 항목에 이어지는 들여쓴 줄은 **그 항목의 내용**이다 (CommonMark 0.31.2
	// §5.2 continuation line).
	//
	// 넓히는 것은 검출 패스의 **입력**이다. 이어짐을 검출 뒤에 처리하면 이미
	// `bindListItem` 의 `flushAll()` 이 목록을 닫은 뒤라 늦다 — 마커 없는 줄은
	// 비-list 노드로 도착하고, 그것이 열린 목록을 전부 닫는 것이 이 결함의 원인이다.
	// 그래서 검출 전에 앞선 마커 줄로 흡수한다. 흡수되면 그 줄은 배열에서 사라지므로
	// 목록이 끊길 이유 자체가 없어진다 — 번호 목록의 `<ol>` 이 다시 열리지 않는 것도
	// 같은 이유다 (그렇지 않으면 독자가 `1.` 을 두 번 본다).
	//
	// 들여쓰기는 표기이지 내용이 아니므로 걷어낸다. 판정 기준은 `computeDepth` 로,
	// 공백으로 쓰든 탭으로 쓰든 같은 결과가 나온다.
	//
	// **열린 항목이 있을 때만** 성립한다. 앞선 마커 줄이 없는 들여쓴 줄은 그대로
	// 문단이다 (`markdownToHtml("  hello")` → `<p>  hello</p>`). 들여쓰기만 보고
	// 항목으로 삼으면 그 대조가 깨진다.
	{
		const merged: ParsedNode[] = [];
		let openItem: ParsedNode | null = null;
		let openItemDepth = 0;
		let isQuoteOpen = false;

		// 인용은 블록이라 열면 닫아야 한다. 이어짐이 끝나는 자리는 네 곳이다 —
		// 인용 아닌 이어짐 · 다음 마커 줄 · 이어짐이 아닌 줄 · 입력의 끝.
		const closeQuote = (): void => {
			if(isQuoteOpen && null !== openItem) {
				openItem.text += ITEM_QUOTE_CLOSE;
			}
			isQuoteOpen = false;
		};

		for(const node of parsed) {

			// 이미 다른 패스가 가져간 줄(코드 블록 · 수평선 · 줄 머리 인용)은
			// 이어짐의 대상도 시작점도 아니다.
			if("value" !== node.type || "" !== node.closure) {
				closeQuote();
				openItem = null;
				merged.push(node);
				continue;
			}

			const markerDepth = listMarkerDepth(node.text);

			if(null !== markerDepth) {
				closeQuote();
				openItem = node;
				openItemDepth = markerDepth;
				merged.push(node);
				continue;
			}

			const { depth, prefixLength } = computeDepth(node.text);
			const stripped = node.text.substring(prefixLength);
			const item = openItem;
			const isContinuation = null !== item
				&& depth > openItemDepth
				&& stripped.trim().length > 0;

			if(!isContinuation) {
				closeQuote();
				openItem = null;
				merged.push(node);
				continue;
			}

			if('>' === stripped.charAt(0)) {

				// `>` 뒤 공백 한 칸은 표기다 — 줄 머리 인용 패스와 같은 규칙.
				let quoted = stripped.substring(1);
				if(' ' === quoted.charAt(0)) quoted = quoted.substring(1);

				// 연달아 붙은 인용 줄은 한 덩어리다 (줄 머리 인용과 같다).
				item.text += isQuoteOpen ? ITEM_BREAK + quoted : ITEM_QUOTE_OPEN + quoted;
				isQuoteOpen = true;
			}
			else {
				closeQuote();
				item.text += ITEM_BREAK + stripped;
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
						, {type: "value", text: stripHeadingClosingSequence(node.text.substring(i + 1)), closure: "header"}
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
	const ESCAPABLE = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
	const escapedChars: string[] = [];

	for(const node of parsed) {
		if("value" === node.type && "pre" !== node.closure) {
			node.text = node.text.replace(
				/\\([\s\S])|`([^`]+)`/g,
				(whole: string, escaped: string | undefined, code: string | undefined): string => {

					if(undefined !== escaped) {
						// 구두점이 아니면 백슬래시는 그냥 글자다 (`C:\Users`, `\d+`).
						if(!ESCAPABLE.includes(escaped)) return whole;
						escapedChars.push(escaped);
						return "\uE000e" + (escapedChars.length - 1) + "\uE001";
					}

					codeSpans.push(code ?? "");
					return "\uE000c" + (codeSpans.length - 1) + "\uE001";
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

	parsed = inlineParsing(parsed, "**", "strong"); // bold
	parsed = inlineParsing(parsed, "~~", "del"); // stroke
	// 홑 `*` 만 공백 규칙을 켠다. `2 * 3 * 4 = 24` 가 `2 <em> 3 </em> 4 = 24` 로
	// 렌더되던 것을 막는다 — 기술 글에서 곱셈 표기가 통째로 기울어졌다.
	// `**` · `~~` 는 공백을 끼워 써도 의도가 분명하므로 그대로 둔다 (`** 굵게 **`).
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
			node.text = node.text.replace(/\uE000t(\d+)\uE001/g, (_m, i: string) =>
				tagChunks[Number(i)] ?? ""
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