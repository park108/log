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

export const markdownToHtml = (input: string): string => {

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
	index = 0;
	for(let node of parsed) {

		if("value" === node.type
			&& "" === node.closure
			&& 3 === node.text.trim().length
			&& "---" === node.text.trim().substr(0, 3)) {

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

	// image
	for(let node of parsed) {

		let searchIndex = 0;
		let image1 = 0;
		let image2 = 0;
		let image3 = 0;
		let image4 = 0;

		if("value" === node.type && "pre" !== node.closure) {

			while(image1 > -1) {

				image1 = node.text.indexOf("![", searchIndex);
				image2 = node.text.indexOf("](", searchIndex);
				image3 = node.text.indexOf(" \"", searchIndex);
				image4 = node.text.indexOf("\")", searchIndex);

				if(-1 < image1 && image1 < image2 && image2 < image3 && image3 < image4) {

					let searchedText = node.text.substring(image1, image4 + 2);
					let alt = node.text.substring(image1 + 2, image2);
					let url = node.text.substring(image2 + 2, image3);
					let title = node.text.substring(image3 + 2, image4);

					node.text = node.text.replace(searchedText,
						"<img src='" + escapeHtmlAttr(url) + "' alt='" + escapeHtmlAttr(alt) +
						"' title='" + escapeHtmlAttr(title) + "' />");
					searchIndex = image4 + 20;
				}
				else {
					image1 = image2 = image3 = image4 = -1;
					searchIndex = 0;
				}
			}
		}
	}

	// anchor
	for(let node of parsed) {

		let searchIndex = 0;
		let a1 = 0;
		let a2 = 0;
		let a3 = 0;
		let a4 = 0;

		if("value" === node.type && "pre" !== node.closure) {

			while(a1 > -1) {

				a1 = node.text.indexOf("[", searchIndex);
				a2 = node.text.indexOf("](", searchIndex);
				a3 = node.text.indexOf(" \"", searchIndex);
				a4 = node.text.indexOf("\")", searchIndex);

				if(-1 < a1 && a1 < a2 && a2 < a3 && a3 < a4) {

					let searchedText = node.text.substring(a1, a4 + 2);
					let text = node.text.substring(a1 + 1, a2);
					let url = node.text.substring(a2 + 2, a3);
					let title = node.text.substring(a3 + 2, a4);

					node.text = node.text.replace(searchedText,
						"<a href='" + escapeHtmlAttr(url) + "' title='" + escapeHtmlAttr(title) +
						"' target='_blank' rel='noreferrer'>" + text + "</a>");
					searchIndex = a4 + 48;
				}
				else {
					a1 = a2 = a3 = a4 = -1;
					searchIndex = 0;
				}
			}
		}
	}

	parsed = inlineParsing(parsed, "**", "strong"); // bold
	parsed = inlineParsing(parsed, "~~", "del"); // stroke
	parsed = inlineParsing(parsed, "*", "em"); // emphasis
	parsed = inlineParsing(parsed, "`", "code"); // code

	for(let node of parsed) {
		if("value" === node.type && "" === node.closure) {
			node.text = "<p>" + node.text + "</p>";
		}
	}
	
	str = stringify(parsed);

	return str;
}

const inlineParsing = (parsed: ParsedNode[], delimeter: string, tagName: string): ParsedNode[] => {

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
					start = searchFrom;
					searchFrom += delimeterLength;
				}
				else {
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