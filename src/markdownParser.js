export function markdownToHtml_new (input) {

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
	for(let node of parsed) {
		if("value" === node.type
			&& "" === node.closure
			&& 2 < node.text.trim().length
			&& "```" === node.text.trim().substr(0, 3)
			&& !isPreStarted) {

			parsed.splice(index, 1, {type: "tag", text: "<pre>", closure: "pre"});
			
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
				}
				else if(isDot && ' ' === node.text.charAt(i)) {
				
					parsed.splice(index, 1, 
						{type: "tag", text: "<li>", itemOf: "ol"}
						, {type: "value", text: node.text.substring(i), itemOf: "ol", closure: "li"}
						, {type: "tag", text: "</li>", itemOf: "ol"});
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
	for(let node of parsed) {
		if("value" === node.type && "" === node.closure) {

			if(node.text.length > 1 && "# " === node.text.substr(0, 2)) {

				parsed.splice(index, 1, 
					{type: "tag", text: "<h1>"}
					, {type: "value", text: node.text.substring(2), closure: "header"}
					, {type: "tag", text: "</h1>"});
			}
			else if(node.text.length > 2 && "## " === node.text.substr(0, 3)) {

				parsed.splice(index, 1, 
					{type: "tag", text: "<h2>"}
					, {type: "value", text: node.text.substring(3), closure: "header"}
					, {type: "tag", text: "</h2>"});
			}
			else if(node.text.length > 3 && "### " === node.text.substr(0, 4)) {

				parsed.splice(index, 1, 
					{type: "tag", text: "<h3>"}
					, {type: "value", text: node.text.substring(4), closure: "header"}
					, {type: "tag", text: "</h3>"});
			}
			else if(node.text.length > 4 && "#### " === node.text.substr(0, 5)) {

				parsed.splice(index, 1, 
					{type: "tag", text: "<h4>"}
					, {type: "value", text: node.text.substring(5), closure: "header"}
					, {type: "tag", text: "</h4>"});
			}
			else if(node.text.length > 5 && "##### " === node.text.substr(0, 6)) {

				parsed.splice(index, 1, 
					{type: "tag", text: "<h5>"}
					, {type: "value", text: node.text.substring(6), closure: "header"}
					, {type: "tag", text: "</h5>"});
			}
			else if(node.text.length > 6 && "###### " === node.text.substr(0, 7)) {

				parsed.splice(index, 1, 
					{type: "tag", text: "<h6>"}
					, {type: "value", text: node.text.substring(7), closure: "header"}
					, {type: "tag", text: "</h6>"});
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
					let title = node.text.substring(image3 + 2 + image4);
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
					let title = node.text.substring(a3 + 2 + a4);
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

	// bold
	parsed = inlineParsing(parsed, "**", "strong");
	// parsed = inlineParsing(parsed, "__", "strong");

	// stroke
	parsed = inlineParsing(parsed, "~~", "del");

	// italic
	parsed = inlineParsing(parsed, "*", "em");
	// parsed = inlineParsing(parsed, "_", "em");

	// code
	parsed = inlineParsing(parsed, "`", "code");

	// paragraph
	for(let node of parsed) {
		if("value" === node.type && "" === node.closure) {
			node.text = "<p>" + node.text + "</p>";
		}
	}
	
	str = stringify(parsed);

	return str;
}

function inlineParsing(parsed, delimeter, tag) {

	let searchFrom = 0;
	let start = -1;
	let end = -1;
	let currentText = "";
	let searchedText = "";
	let delimeterLength = delimeter.length;
	let openTag = "<" + tag + ">";
	let closeTag = "</" + tag + ">";

	for(let node of parsed) {

		if("value" === node.type
			&& "pre" !== node.closure) {

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

export function markdownToHtml (input) {

	let indexes = [];
	let parsed = [];
	let str = input;

	// blockquote
	indexes = findBlockquote(str);
	parsed = parser("blockquote", str, indexes, true);
	str = stringify(parsed);

	// unordered list
	indexes = findUnorderedList(str);
	parsed = parser("li", str, indexes, true);
	parsed = bindListItem(parsed, "ul");
	str = stringify(parsed);
		
	// headers (h6 ~ h1)
	for(let size = 6; 0 < size; size--) {

		indexes = findHeader(str, size);
		parsed = parser("h" + size, str, indexes, true);
		str = stringify(parsed);
	}

	// strong
	indexes = findStrong(str);
	parsed = parser("strong", str, indexes);
	str = stringify(parsed);

	// del
	indexes = findDel(str);
	parsed = parser("del", str, indexes);
	str = stringify(parsed);

	// em
	indexes = findItalic(str);
	parsed = parser("em", str, indexes);
	str = stringify(parsed);

	// pre
	indexes = findPre(str);
	parsed = parser("pre", str, indexes);
	str = stringify(parsed);

	// code
	indexes = findCode(str);
	parsed = parser("code", str, indexes);
	str = stringify(parsed);

	// img
	str = parseImg(str);

	// anchor
	str = parseAnchor(str);

	// convert enter to br and return
	return str.replace(/(\n|\r\n)/g, "<br />");
}

function stringify(arr) {

	let str = "";

	for(let node of arr) {
		str += node.text;
	}

	return str;
}

function parser(tag, str, indexes, isRemoveReturn) {

	let output = [];
	let current = -1;
	let before = -1;
	let text = "";
	let isParsed = false;
	let trim = trimSize(tag);

	if(0 === indexes.length) {
		if(0 === str.length) {
			output = [{type: "value", text: str}];
		}
		else {
			output = [{type: "value", text: str}];
		}
	}

	for(let i = 0; i < indexes.length; i++) {

		current = indexes[i];

		if(-1 === before && 0 < current) {
			text = str.substring(0, current);
			output.push({type: "value", text: text});
			isParsed = false;
		}
		else if(-1 === before && 0 === current) {

		}
		else if (0 === before) {
			text = str.substring(before, current);
			text = isRemoveReturn ? text.replace(/(\n|\r\n)/g, '') : text;
			text = text.substr(trim[0], text.length - trim[0] - trim[1]);
			output.push({type: "tag", text: "<" + tag + ">"});
			output.push({type: "value", text: text});
			output.push({type: "tag", text: "</" + tag + ">"});
			isParsed = true;
		}	
		else {
			if(isParsed) {
				text = str.substring(before, current);
				output.push({type: "value", text: text});
			}
			else {
				text = str.substring(before, current);
				text = isRemoveReturn ? text.replace(/(\n|\r\n)/g, '') : text;
				text = text.substr(trim[0], text.length - trim[0] - trim[1]);
				output.push({type: "tag", text: "<" + tag + ">"});
				output.push({type: "value", text: text});
				output.push({type: "tag", text: "</" + tag + ">"});
			}
			isParsed = !isParsed;
		}

		before = current;
	}

	return output;
}

function parseAnchor(input) {

	if(0 === input.length) return "";

	let text = "";
	let params = "";
	let paramDelimeter = 0;
	let address = "";
	let title = "";
	let output = [];

	let openText = -1;
	let closeText = -1;
	let openParams = -1;
	let closeParams = -1;

	let prevIndex = 0;

	for(let i = 0; i < input.length; i++) {

		if('[' === input.charAt(i)) {
			openText = i;
		}
		else if(-1 < openText
			&& -1 === closeText
			&& ']' === input.charAt(i)) {
			closeText = i;
		}
		else if(-1 < openText
			&& 0 < closeText
			&& -1 === openParams) {

			if('(' === input.charAt(i) && closeText === i - 1) {
				openParams = i;
			}
			else {
				openText = closeText = -1;
			}
		}
		else if(-1 < openText
			&& 0 < closeText
			&& 0 < openParams
			&& -1 === closeParams) {

			if(')' === input.charAt(i)) {
				closeParams = i;
			}
		}

		if(-1 < openText
			&& 0 < closeText
			&& 0 < openParams
			&& 0 < closeParams) {

			params = input.substring(openParams + 1, closeParams).trim();

			if(0 === params.length) {
				openText = closeText = openParams = closeParams = -1;
				continue;
			}

			params = params.replace(/ +/g, " ");
			paramDelimeter = params.indexOf(" ");

			if(-1 === paramDelimeter) {
				address = params;
			}
			else {
				address = params.substring(0, paramDelimeter);
				title = params.substring(paramDelimeter + 1, params.length);

				if('"' !== title.charAt(0) || '"' !== title.charAt(title.length - 1)) {
					openText = closeText = openParams = closeParams = -1;
					continue;
				}
				else {
					title = title.substr(1, title.length - 2);
				}
			}

			text = input.substring(openText + 1, closeText);

			if(output.length > 0) {
				output.splice(output.length - 1, 1);
			}

			output.push({text: input.substring(prevIndex, openText)});
			output.push({text: "<a href='" + address + "' title='" + title + "'>" + text + "</a>"});
			output.push({text: input.substring(closeParams + 1, input.length)});

			prevIndex = closeParams + 1;
			openText = closeText = openParams = closeParams = -1;
		}
	}

	if(output.length > 0) {
		return stringify(output);
	}
	else {
		return input;
	}
}

function parseImg(input) {

	if(0 === input.length) return "";

	let text = "";
	let params = "";
	let paramDelimeter = 0;
	let address = "";
	let title = "";
	let output = [];

	let startImg = -1;
	let openText = -1;
	let closeText = -1;
	let openParams = -1;
	let closeParams = -1;

	let prevIndex = 0;

	for(let i = 0; i < input.length; i++) {

		if('!' === input.charAt(i)) {
			startImg = i;
		}
		else if('[' === input.charAt(i)
			&& -1 === openText) {
			if(startImg === i - 1) {
				openText = i;
			}
			else {
				startImg = -1;
			}
		}
		else if(-1 < startImg
			&& 0 < openText
			&& -1 === closeText
			&& ']' === input.charAt(i)) {
			closeText = i;
		}
		else if(-1 < startImg
			&& 0 < openText
			&& 0 < closeText
			&& -1 === openParams) {

			if('(' === input.charAt(i) && closeText === i - 1) {
				openParams = i;
			}
			else {
				startImg = openText = closeText = -1;
			}
		}
		else if(-1 < startImg
			&& 0 < openText
			&& 0 < closeText
			&& 0 < openParams
			&& -1 === closeParams) {

			if(')' === input.charAt(i)) {
				closeParams = i;
			}
		}

		if(-1 < startImg
			&& 0 < openText
			&& 0 < closeText
			&& 0 < openParams
			&& 0 < closeParams) {

			params = input.substring(openParams + 1, closeParams).trim();

			if(0 === params.length) {
				startImg = openText = closeText = openParams = closeParams = -1;
				continue;
			}

			params = params.replace(/ +/g, " ");
			paramDelimeter = params.indexOf(" ");

			if(-1 === paramDelimeter) {
				address = params;
			}
			else {
				address = params.substring(0, paramDelimeter);
				title = params.substring(paramDelimeter + 1, params.length);

				if('"' !== title.charAt(0) || '"' !== title.charAt(title.length - 1)) {
					startImg = openText = closeText = openParams = closeParams = -1;
					continue;
				}
				else {
					title = title.substr(1, title.length - 2);
				}
			}

			text = input.substring(openText + 1, closeText);

			if(output.length > 0) {
				output.splice(output.length - 1, 1);
			}

			output.push({text: input.substring(prevIndex, startImg)});
			output.push({text: "<img src='" + address + "' alt='" + text + "' title='" + title + "' />"});
			output.push({text: input.substring(closeParams + 1, input.length)});

			prevIndex = closeParams + 1;
			openText = closeText = openParams = closeParams = -1;
		}
	}

	if(output.length > 0) {
		return stringify(output);
	}
	else {
		return input;
	}
}

function trimSize(tag) {

	switch(tag) {
		case("blockquote"): return [1, 0]; // >blockquote
		case("li"): return [2, 0]; // - listItem
		case("h1"): return [2, 0]; // # h1
		case("h2"): return [3, 0]; // ## h2
		case("h3"): return [4, 0]; // ### h3
		case("h4"): return [5, 0]; // #### h4
		case("h5"): return [6, 0]; // ##### h5
		case("h6"): return [7, 0]; // ###### h6
		case("p"): return [0, 0];
		case("span"): return [0, 0];
		case("strong"): return [2, 2]; // **strong**
		case("del"): return [2, 2]; // ~~del~~
		case("em"): return [1, 1]; // *em*
		case("pre"): return [3, 3]; // ```pre```
		case("code"): return [1, 1]; // `code`
		default: return [0, 0];
	}
}

function findBlockquote(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let isNewline = true;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {

		if(isNewline && '>' === input.charAt(i)) {
			indexes.push(i);
			isStarted = true;
			isNewline = false;
		}
		else if('\n' === input.charAt(i)) {
			
			if(isStarted) {
				indexes.push(i + 1);
				isStarted = false;
			}

			isNewline = true;
		}
		else if('\r' === input.charAt(i)) {

			if(isStarted) {
				indexes.push(i + 1);
				isStarted = false;
			}

			isNewline = true;
		}
		else {
			isNewline = false;
		}

		if(i === (input.length - 1)) {
			indexes.push(i + 1);
		}
	}

	return indexes;
}

function findUnorderedList(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let isNewline = true;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {

		if(isNewline && ('-' === input.charAt(i) || '*' === input.charAt(i))) {
			indexes.push(i);
			isStarted = true;
			isNewline = false;
		}
		else if('\n' === input.charAt(i)) {
			
			if(isStarted) {
				indexes.push(i + 1);
				isStarted = false;
			}

			isNewline = true;
		}
		else if('\r' === input.charAt(i)) {

			if(isStarted) {
				indexes.push(i + 1);
				isStarted = false;
			}

			isNewline = true;
		}
		else {
			isNewline = false;
		}

		if(i === (input.length - 1)) {
			indexes.push(i + 1);
		}
	}

	return indexes;
}

function bindListItem(parsed, listType) {

	let isStarted = false;
	let output = [];

	for(let node of parsed) {

		if(!isStarted && node.itemOf === listType) {
			output.push({type: "tag", text: "<" + listType + ">", itemOf: listType});
			output.push(node);
			isStarted = true;
		}
		else if(isStarted && node.itemOf !== listType) {
			output.push({type: "tag", text: "</" + listType + ">", itemOf: listType});
			output.push(node);
			isStarted = false;
		}
		else {
			output.push(node);
		}
	}

	if(isStarted) {
		output.push({type: "tag", text: "</" + listType + ">", itemOf: listType});
	}

	return output;
}

function findHeader(input, count) {

	if(0 === input.length) return [];

	let indexes = [];
	let started = false;

	let sharp = "";

	switch (count) {
		case 1: sharp = "#"; break;
		case 2: sharp = "##"; break;
		case 3: sharp = "###"; break;
		case 4: sharp = "####"; break;
		case 5: sharp = "#####"; break;
		case 6: sharp = "######"; break;
		default: sharp = "#";
	}

	for(let i = 0; i < input.length; i++) {

		if(!started
			&& sharp === input.substring(i, i + count)
			&& ' ' === input.charAt(i + count)) {

			indexes.push(i);
			started = true;
		}
		else if(started) {
			if('\n' === input.charAt(i)) {
				indexes.push(i + 1);
				started = false;
			}
			else if('\r' === input.charAt(i)) {
				indexes.push(i + 1);
				started = false;
			}
		}
		if(i === (input.length - 1)) {
			indexes.push(i + 1);
			started = false;
		}
	}

	return indexes;
}

function findStrong(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let astrk1 = -1;
	let astrk2 = -1;
	let astrk3 = -1;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {
		
		if('*' === input.charAt(i)) {

			if(-1 === astrk1) {
				astrk1 = i;
			}
			else if(astrk1 > -1 && i === astrk1 + 1) {
				astrk2 = i;
				indexes.push(i - 1);
				isStarted = true;
			}
			else if(astrk1 > -1 && astrk2 > -1 && -1 === astrk3) {
				astrk3 = i;
			}
			else if(astrk3 > -1 && i === astrk3 + 1) {
				indexes.push(i + 1);
				isStarted = false;
				astrk1 = -1;
				astrk2 = -1;
				astrk3 = -1;
			}
		}
		else {

			if(i === astrk1 + 1) {
				astrk1 = -1;
			}
			if(i === astrk3 + 1) {
				astrk3 = -1;
			}
		}
	}

	if(isStarted) {
		indexes.splice(indexes.length - 1, 1);
	}
	if(indexes.length > 0) {
		indexes.push(input.length);
	}

	return indexes;
}

function findDel(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let del1 = -1;
	let del2 = -1;
	let del3 = -1;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {
		
		if('~' === input.charAt(i)) {

			if(-1 === del1) {
				del1 = i;
			}
			else if(del1 > -1 && i === del1 + 1) {
				del2 = i;
				indexes.push(i - 1);
				isStarted = true;
			}
			else if(del1 > -1 && del2 > -1 && -1 === del3) {
				del3 = i;
			}
			else if(del3 > -1 && i === del3 + 1) {
				indexes.push(i + 1);
				isStarted = false;
				del1 = -1;
				del2 = -1;
				del3 = -1;
			}
		}
		else {

			if(i === del1 + 1) {
				del1 = -1;
			}
			if(i === del3 + 1) {
				del3 = -1;
			}
		}
	}

	if(isStarted) {
		indexes.splice(indexes.length - 1, 1);
	}
	if(indexes.length > 0) {
		indexes.push(input.length);
	}

	return indexes;
}

function findItalic(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let astrk1 = -1;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {
		
		if('*' === input.charAt(i)) {

			if(-1 === astrk1) {
				astrk1 = i;
				indexes.push(i);
				isStarted = true;
			}
			else if(-1 < astrk1) {
				indexes.push(i + 1);
				astrk1 = -1;
				isStarted = false;
			}
		}
	}

	if(isStarted) {
		indexes.splice(indexes.length - 1, 1);
	}
	if(indexes.length > 0) {
		indexes.push(input.length);
	}

	return indexes;
}

function findPre(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let grave1 = -1;
	let grave2 = -1;
	let grave3 = -1;
	let grave4 = -1;
	let grave5 = -1;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {
		
		if('`' === input.charAt(i)) {

			if(-1 === grave1) {
				grave1 = i;
			}
			else if(-1 < grave1
				&& i === grave1 + 1) {
				grave2 = i;
			}
			else if(-1 < grave1
				&& 0 < grave2 &&
				i === grave2 + 1) {
				grave3 = i;
				indexes.push(i - 2);
				isStarted = true;
			}
			else if(0 < grave3
				&& -1 === grave4) {
				grave4 = i;
			}
			else if(0 < grave4
				&& i === grave4 + 1) {
				grave5 = i;
			}
			else if(0 < grave4
				&& 0 < grave5
				&& i === grave5 + 1) {

				indexes.push(i + 1);
				grave1 = grave2 = grave3 = grave4 = grave5 = -1;
				isStarted = false;
			}
		}
		else {

			if(i === grave1 + 1) {
				grave1 = -1;
			}
			if(i === grave2 + 1) {
				grave1 = grave2 = -1;
			}
			if(i === grave4 + 1) {
				grave4 = -1;
			}
			if(i === grave5 + 1) {
				grave4 = grave5 = -1;
			}
		}
	}

	if(isStarted) {
		indexes.splice(indexes.length - 1, 1);
	}
	if(indexes.length > 0) {
		indexes.push(input.length);
	}

	return indexes;
}

function findCode(input) {

	if(0 === input.length) return [];

	let indexes = [];
	let grave1 = -1;
	let isStarted = false;

	for(let i = 0; i < input.length; i++) {
		
		if('`' === input.charAt(i)) {

			if(-1 === grave1) {
				grave1 = i;
				indexes.push(i);
				isStarted = true;
			}
			else if(-1 < grave1) {
				indexes.push(i + 1);
				grave1 = -1;
				isStarted = false;
			}
		}
	}

	if(isStarted) {
		indexes.splice(indexes.length - 1, 1);
	}
	if(indexes.length > 0) {
		indexes.push(input.length);
	}

	return indexes;
}

function isNumeric(str) {
	return /^\d+$/.test(str);
}