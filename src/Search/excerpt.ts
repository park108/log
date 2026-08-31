// 검색 결과 미리보기 한 줄을 매치 둘레로 옮긴다.
//
// 이전에는 서버가 준 본문을 통째로 그렸다. `.div--loglist-contents` 는
// `white-space: nowrap; overflow: hidden` 이라 실제로 보이는 것은 앞 한 줄뿐인데,
// 매치는 대개 그 뒤에 있다. 실측 — 캡처된 실제 응답 한 건이 1019자이고
// `테스트` 의 위치가 1010 이다 (`__fixtures__/search.ts`). 결과는 나오는데
// **왜 걸렸는지가 화면에 없었다.**
//
// 마크다운을 걷는 일은 여기서 하지 않는다. 서버 요약이 이미 하고 있다 —
// 같은 실제 응답에서 헤딩·이미지·링크·줄바꿈이 모두 0건이다.

// 매치 앞에 남길 글자 수. 0 이면 매치가 줄 맨 앞에 붙어 문맥이 사라지고,
// 너무 크면 한 줄 안에서 매치가 다시 밀려난다.
const LEADING_CONTEXT = 12;

const ELLIPSIS = "…";

export const buildExcerpt = (text: string, queryString: string): string => {

	if("string" !== typeof text) return "";
	if("string" !== typeof queryString || 0 === queryString.length) return text;

	const at = text.toLowerCase().indexOf(queryString.toLowerCase());

	// 매치가 없으면 자를 근거가 없다. 앞에서부터 보여준다.
	if(at < 0) return text;

	// 이미 보이는 자리에 있으면 건드리지 않는다 — 굳이 앞을 잘라 `…` 를
	// 붙이면 없던 소음만 는다.
	if(at <= LEADING_CONTEXT) return text;

	let cut = at - LEADING_CONTEXT;

	// 단어 중간에서 자르지 않는다. 바로 뒤 공백까지 밀되, 그러다 매치를
	// 넘어가면(공백 없는 긴 토큰) 원래 자리를 쓴다.
	const space = text.indexOf(" ", cut);
	if(space >= 0 && space < at) cut = space + 1;

	// **글자를 반으로 쪼개지 않는다.**
	//
	// `cut` 은 UTF-16 코드 유닛 인덱스다. 매치 앞 12칸에 이모지가 걸려 있고 그
	// 사이에 공백이 없으면(공백까지 미는 위 규칙이 발동하지 않으면) 자를 자리가
	// 서로게이트 쌍 한가운데에 떨어진다. 남는 것은 짝 잃은 반쪽이고 화면에는
	// 대체 문자로 보인다. 실측:
	//
	//   "a🎉bbbbbbbbbbb테스트" 에서 "테스트" 검색  →  "…\udf89bbbbbbbbbbb테스트"
	//
	// 뒤쪽 반쪽 위에 떨어졌으면 한 칸 민다. 같은 결함의 반대 방향(앞에서부터
	// 세어 자르기)은 `common.truncateByGrapheme` 이 맡는다.
	//
	// ZWJ 시퀀스(가족 이모지)가 중간에서 갈리는 것은 여기서 막지 않는다 — 그쪽은
	// 구성 이모지로 온전히 그려지므로 깨진 글자가 아니다.
	const CUT_CODE = text.charCodeAt(cut);
	if(CUT_CODE >= 0xDC00 && CUT_CODE <= 0xDFFF) cut += 1;

	return ELLIPSIS + text.slice(cut);
};
