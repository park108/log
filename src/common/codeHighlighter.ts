export const codeHighlighter = (lang: string, code: string): string => {

	const language = lang.toLowerCase().trim();

	if("kt" === language || "kotlin" === language) {
		return highlighterKotlin(code);
	}

	if("yml" === language || "yaml" === language) {
		return highlighterYaml(code);
	}

	// 아는 언어가 아니면 손대지 않는다.
	//
	// 이전에는 else 가 전부 YAML 로 떨어졌다 — 주석은 "yml or yaml" 이라 적혀
	// 있었지만 실제로는 폴백이었다. 그래서 다른 언어와 **언어를 안 적은 블록**까지
	// YAML 규칙을 맞았다 (실측):
	//   ```ts     `const m: Map<string, number>` → "const m" 이 YAML 키로 강조
	//   ```python `def f(x):`                    → 키로 강조
	//   ```(없음) `plain text: with colon`       → "plain text" 가 키로 강조
	// 콜론이 든 줄이면 무엇이든 키처럼 칠해졌다. 모르는 언어는 칠하지 않는 것이
	// 틀리게 칠하는 것보다 낫다.
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

// 한 줄을 한 번만 훑는다.
//
// 이전에는 `String.replace(문자열)` 을 키워드마다 돌렸다. 그 방식은 세 가지가
// 어긋난다 (전부 실측):
//   1. 단어 경계를 모른다 — `fun evaluate()` 에서 `e·val·uate` 의 `val` 이 강조됐다.
//   2. 첫 하나만 바꾼다 — `val a = 1; val b = 2` 에서 뒤쪽 `val` 은 색이 없었다.
//   3. 앞뒤 공백을 조건으로 흉내 내다 보니 줄 머리의 `if` 는 영영 강조되지 않았다.
// 게다가 문자열 리터럴 안의 `return` 같은 단어까지 키워드로 칠했다.
//
// 훑기로 바꾸면 생성한 마크업을 다시 스캔하지 않는다 — 이전 방식은
// `class='span …'` 의 `class` 를 키워드로 삼킬 위험을 rearSpace 로 겨우 피하고
// 있었다.
//
// 이 함수에 들어오는 `code` 는 이미 escape 됐다 (`markdownParser` 가 강조기에
// 넘기기 전에 처리한다). 따옴표는 그대로다.

const RESERVED = new Set(SYNTAX_KOTLIN.reservedWords.map((w) => w.keyword));
const ANNOTATIONS = new Set(SYNTAX_KOTLIN.annotations);

const IDENTIFIER = /^[A-Za-z_$][\w$]*/;
const ANNOTATION = /^@[A-Za-z_$][\w$]*/;

const wrap = (kind: string, text: string): string =>
	"<span class='span span--kotlin-" + kind + "'>" + text + "</span>";

const highlighterKotlin = (code: string): string => {

	let out = "";
	let i = 0;

	while(i < code.length) {

		const rest = code.slice(i);

		// 문자열 리터럴. 닫는 따옴표가 없으면 리터럴이 아니다 (기존 계약).
		if('"' === code.charAt(i)) {
			const end = code.indexOf('"', i + 1);
			if(end > i) {
				out += wrap("literal", code.slice(i, end + 1));
				i = end + 1;
				continue;
			}
		}

		// 애너테이션.
		const annotation = ANNOTATION.exec(rest);
		if(annotation && ANNOTATIONS.has(annotation[0])) {
			out += wrap("annotation", annotation[0]);
			i += annotation[0].length;
			continue;
		}

		// 식별자. 통째로 집어 예약어인지 본다 — 그래야 단어 안쪽이 걸리지 않는다.
		const identifier = IDENTIFIER.exec(rest);
		if(identifier) {
			const word = identifier[0];
			out += RESERVED.has(word) ? wrap("reserved", word)
				: ANNOTATIONS.has(word) ? wrap("annotation", word)
				: word;
			i += word.length;
			continue;
		}

		out += code.charAt(i);
		i += 1;
	}

	return out;
}

const highlighterYaml = (code: string): string => {

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