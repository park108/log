export const codeHighlighter = (lang, code) => {

	const language = lang.toLowerCase();

	switch(language) {
		case "kotlin":
			code = highlighterKotlin(code);
			break;
		case "yml":
		case "yaml":
			code = highlighterYaml(code);
			break;
	}

	return code;
}

const highlighterKotlin = (code) => {

	code = code.replace("<", "&lt");
	code = replaceLiteral(code);
	
	code = replaceReservedWord("", "package", " ", code);
	code = replaceReservedWord("", "import", " ", code);
	code = replaceReservedWord("", "class", " ", code);
	code = replaceReservedWord("", "private", " ", code);
	code = replaceReservedWord("", "val", " ", code);
	code = replaceReservedWord("", "var", " ", code);
	code = replaceReservedWord("", "fun", " ", code);
	code = replaceReservedWord(" ", "try", "", code);
	code = replaceReservedWord(" ", "catch", "", code);
	code = replaceReservedWord(" ", "when", "", code);
	code = replaceReservedWord(" ", "if", "", code);
	code = replaceReservedWord(" ", "else", "", code);
	code = replaceReservedWord("", "null", "", code);
	code = replaceReservedWord("", "true", "", code);
	code = replaceReservedWord("", "false", "", code);
	code = replaceReservedWord("", "return", "", code)

	code = replaceAnnotation("@GetMapping", code);
	code = replaceAnnotation("@PostMapping", code);
	code = replaceAnnotation("@PutMapping", code);
	code = replaceAnnotation("@DeleteMapping", code);
	code = replaceAnnotation("@PathVariable", code);
	code = replaceAnnotation("@RestController", code);
	code = replaceAnnotation("@RequestMapping", code);
	code = replaceAnnotation("@RequestBody", code);

	return code;
}

const highlighterYaml = (code) => {

	let lastChar = '';
	let sharp = -1;
	let start = -1;
	let dash = -1;
	let colon = -1;

	sharp = code.indexOf("#");
	dash = code.indexOf("- ");
	colon = code.indexOf(": ");
	lastChar = code.substr(code.length - 1, 1);

	for(let i = 0; i < code.length; i++) {
		if(' ' !== code.charAt(i)) {
			start = i;
			break;
		}
	}

	if(":" === lastChar) colon = code.length - 1;
	if(start === dash && dash < colon) start = dash + 1;

	// Comment
	if(start === sharp) {
		code = "<span class='span--yml-comment'>" + code + "</span>";
	}
	else if(-1 < colon) {
		code = code.substring(0, start)
			+ "<span class='span--yml-key'>"
			+ code.substring(start, colon)
			+ "</span>"
			+ code.substring(colon);
	}

	return code;
}

const replaceLiteral = (line) => {
	const start = line.indexOf("\"");
	if(start > -1) {
		const next = line.indexOf("\"", start + 1);

		if(next > start) {
			const front = line.substring(0, start);
			const literal = line.substring(start, next + 1);
			const rear = line.substring(next + 1);
			line = front + "<span class='span span--kotlin-literal'>" + literal + "</span>" + rear;
		}
	}
	return line;
}

const replaceReservedWord = (frontSpace, word, rearSpace, line) => {
	return line.replace(frontSpace + word + rearSpace, frontSpace + "<span class='span span--kotlin-reserved'>" + word + "</span>" + rearSpace);
}

const replaceAnnotation = (word, line) => {
	return line.replace(word, "<span class='span span--kotlin-annotation'>" + word + "</span>");
}