export function markdownToHtml (input) {

	let indexes = [];
	let parsed = [];
	let str = input;

	// blockquote
	indexes = findBlockquote(str);
	parsed = parser("blockquote", str, indexes, true);
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

	// convert enter to br and return
	return str.replace(/(\n|\r\n)/g, "<br />");
}

export function markdownToHtml_old (input) {

	let output = [{type: "value", tag: "none", text: input}];
	let indexes = [];
	let parsed = [];

	// blockquote
	for(let i = 0; i < output.length; i++) {

		if("value" === output[i].type
			&& "none" === output[i].tag) {

			indexes = findBlockquote(output[i].text);
			parsed = parser("blockquote", output[i].text, indexes);
			output.splice(i, 1);

			let k = 0;
			for(let node of parsed) {
				output.splice(i + k++, 0, node);
			}
		}
	}
		
	// headers (h6 ~ h1)
	for(let i = 0; i < output.length; i++) {
		for(let size = 6; size > 0; size--) {
			if("value" === output[i].type &&
				("none" === output[i].tag || "blockquote" === output[i].tag)
				) {
				indexes = findHeader(output[i].text, size);
				parsed = parser("h" + size, output[i].text, indexes, output[i].tag);
				output.splice(i, 1);

				let k = 0;

				for(let node of parsed) {
					output.splice(i + k++, 0, node);
				}
			}
		}
	}

	// strong
	for(let i = 0; i < output.length; i++) {

		if("value" === output[i].type) {

			indexes = findStrong(output[i].text);
			parsed = parser("strong", output[i].text, indexes);
			output.splice(i, 1);

			let k = 0;
			for(let node of parsed) {
				output.splice(i + k++, 0, node);
			}
		}
	}

	// del
	for(let i = 0; i < output.length; i++) {

		if("value" === output[i].type) {

			indexes = findDel(output[i].text);
			parsed = parser("del", output[i].text, indexes);
			output.splice(i, 1);

			let k = 0;
			for(let node of parsed) {
				output.splice(i + k++, 0, node);
			}
		}
	}

	// em
	for(let i = 0; i < output.length; i++) {

		if("value" === output[i].type) {

			indexes = findItalic(output[i].text);
			parsed = parser("em", output[i].text, indexes);
			output.splice(i, 1);

			let k = 0;
			for(let node of parsed) {
				output.splice(i + k++, 0, node);
			}
		}
	}

	// Stringify
	let html = stringify(output);

	return html;
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

function trimSize(tag) {

	switch(tag) {
		case("h1"): return [2, 0]; // # h1
		case("h2"): return [3, 0]; // ## h2
		case("h3"): return [4, 0]; // ### h3
		case("h4"): return [5, 0]; // #### h4
		case("h5"): return [6, 0]; // ##### h5
		case("h6"): return [7, 0]; // ###### h6
		case("blockquote"): return [1, 0]; // >blockquote
		case("p"): return [0, 0];
		case("span"): return [0, 0];
		case("strong"): return [2, 2]; // **strong**
		case("del"): return [2, 2]; // ~~del~~
		case("em"): return [1, 1]; // *em*
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
		if(i === (input.length - 1)) {
			indexes.push(i + 1);
		}
	}

	return indexes;
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