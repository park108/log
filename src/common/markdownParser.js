import { codeHighlighter } from './codeHighlighter';

export function markdownToHtml (input) {

	let parsed = [];
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
			
			language = node.text.trim().substr(3);
			
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
			&& node.text.length > 1
			&& ('*' === node.text.charAt(0) || '-' === node.text.charAt(0))
			&& ' ' === node.text.charAt(1)) {

			parsed.splice(index, 1
				, {type: "tag", text: "<li>", itemOf: "ul"}
				, {type: "value", text: node.text.substring(2), itemOf: "ul", closure: "li"}
				, {type: "tag", text: "</li>", itemOf: "ul"});
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
			&& node.text.length > 2
			&& isNumeric(node.text.charAt(0))) {

			for(let i = 1; i < node.text.length; i++) {

				if(!isDot && isNumeric(node.text.charAt(i))) {
					continue;
				}
				else if(!isDot && '.' === node.text.charAt(i)) {
					isDot = true;
					continue;
				}
				else if(!isDot && !isNumeric(node.text.charAt(i))) {
					break;
				}
				else if(isDot && ' ' === node.text.charAt(i)) {
				
					parsed.splice(index, 1, 
						{type: "tag", text: "<li>", itemOf: "ol"}
						, {type: "value", text: node.text.substring(i), itemOf: "ol", closure: "li"}
						, {type: "tag", text: "</li>", itemOf: "ol"});
					break;
				}
				else {
					break;
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
						"<img src='" + url + "' alt='" + alt + "' title='" + title + "' />");
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
						"<a href='" + url + "' title='" + title + "' target='_blank' rel='noreferrer'>" + text + "</a>");
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

const inlineParsing = (parsed, delimeter, tagName) => {

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

const bindListItem = (parsed, tagName) => {

	let isStarted = false;
	let output = [];

	for(let node of parsed) {

		if(!isStarted && node.itemOf === tagName) {
			output.push({type: "tag", text: "<" + tagName + ">", itemOf: tagName});
			output.push(node);
			isStarted = true;
		}
		else if(isStarted && node.itemOf !== tagName) {
			output.push({type: "tag", text: "</" + tagName + ">", itemOf: tagName});
			output.push(node);
			isStarted = false;
		}
		else {
			output.push(node);
		}
	}

	if(isStarted) {
		output.push({type: "tag", text: "</" + tagName + ">", itemOf: tagName});
	}

	return output;
}

const stringify = (arr) => {

	let str = "";

	for(let node of arr) {
		str += node.text;
	}

	return str;
}

const isNumeric = (str) => {
	return /^\d+$/.test(str);
}