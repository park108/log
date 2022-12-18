export const codeHighlighter = (lang, code) => {

	const language = lang.toLowerCase().trim();

	if("kt" === language || "kotlin" === language) {
		code = highlighterKotlin(code);
	}
	else { // yml or yaml
		code = highlighterYaml(code);
	}

	return code;
}

const SYNTAX_KOTLIN = {
	reservedWords: [
		{ frontSpace: "", keyword: "package", rearSpace: " " },
		{ frontSpace: "", keyword: "import", rearSpace: " " },
		{ frontSpace: "", keyword: "class", rearSpace: " " },
		{ frontSpace: "", keyword: "private", rearSpace: " " },
		{ frontSpace: "", keyword: "val", rearSpace: "" },
		{ frontSpace: "", keyword: "var", rearSpace: "" },
		{ frontSpace: "", keyword: "fun", rearSpace: "" },
		{ frontSpace: " ", keyword: "try", rearSpace: "" },
		{ frontSpace: " ", keyword: "catch", rearSpace: "" },
		{ frontSpace: " ", keyword: "when", rearSpace: "" },
		{ frontSpace: " ", keyword: "if", rearSpace: "" },
		{ frontSpace: " ", keyword: "else", rearSpace: "" },
		{ frontSpace: "", keyword: "null", rearSpace: "" },
		{ frontSpace: "", keyword: "true", rearSpace: "" },
		{ frontSpace: "", keyword: "false", rearSpace: "" },
		{ frontSpace: "", keyword: "return", rearSpace: "" },
	],
	annotations: [
		"@GetMapping", "@PostMapping", "@PutMapping", "@DeleteMapping", "@PathVariable",
		"@RestController", "@RequestMapping", "@RequestBody", "@JvmName", "@JvmStatic", "@JvmField",
		"@Throws", "@JvmOverloads", "@Override", "@Deprecated", "SuppressWarnings", "@Component",
		"@Bean", "@Configuration", "@Service", "@Repository", "@Autowired", "@Qualifier", "@PostConstruct", "@PreConstruct",
		"@PreDestroy", "@Scheduled", "@SchedulerLock"
	]
};

const highlighterKotlin = (code) => {

	code = code.replace("<", "&lt");
	code = replaceLiteral(code);

	for(const keyword of SYNTAX_KOTLIN.reservedWords) {
		code = replaceReservedWord(keyword.frontSpace, keyword.keyword, keyword.rearSpace, code);
	}

	for(const annotation of SYNTAX_KOTLIN.annotations) {
		code = replaceAnnotation(annotation, code);
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

const replaceReservedWord = (frontSpace, keyword, rearSpace, line) => {
	return line.replace(frontSpace + keyword + rearSpace, frontSpace + "<span class='span span--kotlin-reserved'>" + keyword + "</span>" + rearSpace);
}

const replaceAnnotation = (keyword, line) => {
	return line.replace(keyword, "<span class='span span--kotlin-annotation'>" + keyword + "</span>");
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