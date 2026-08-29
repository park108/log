// 목록에 보이는 파일명을 사람이 읽을 수 있게 되돌린다.
//
// 한글 이름으로 올린 파일이 목록에 이렇게 나온다 (2026-08-30 실측):
//
//   230608_AA%25E1%2584%2580%25E1%2585%25A2%25E1%2584%2587...pdf
//
// `%25` 는 `%` 가 다시 인코딩된 것이다 — 즉 **이중 인코딩**이다. 두 번
// 디코드하면 `230608_AA개발.pdf` 가 된다.
//
// **표시만 되돌린다.** 저장된 S3 키는 그대로이므로 삭제·복사는 원본 키를
// 계속 쓴다. 업로드 경로에서 왜 두 번 인코딩되는지는 서버 쪽 동작이 얽혀
// 있어 별건이다 — 클라이언트는 name 을 인코딩하지 않고 type 만 하는
// 비대칭이 있다 (File/api.ts:19).

const MAX_PASSES = 3;

/**
 * 퍼센트 인코딩을 더 이상 바뀌지 않을 때까지 되돌린다.
 * 잘못된 시퀀스를 만나면 **그 직전 값**을 돌려준다 — 읽기 좋게 만들려다
 * 이름을 잃지 않는 것이 우선이다.
 */
export const decodeFileName = (name: string): string => {

	if (!name) return name;

	let current = name;

	for (let pass = 0; pass < MAX_PASSES; pass++) {
		let decoded: string;
		try {
			decoded = decodeURIComponent(current);
		} catch {
			// `%` 가 인코딩이 아니라 이름의 일부인 경우 — 원문을 지킨다.
			return current;
		}
		if (decoded === current) break;
		current = decoded;
	}

	// macOS 는 파일명을 자모 분리(NFD)로 준다. 합쳐야 다른 곳과 같은 글자로 보인다.
	return current.normalize('NFC');
};

export default decodeFileName;
