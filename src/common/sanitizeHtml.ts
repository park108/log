// 단일 sanitize 모듈. markdownParser 산출 HTML 을 DOM 주입 직전 정제한다.
// 정책은 이 파일에서만 변경한다 (FR-06).
// 관련: REQ-20260418-001

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
	'p', 'br', 'hr', 'strong', 'em', 'del',
	'code', 'pre',
	'blockquote',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'ul', 'ol', 'li',
	'a', 'img',
	'span',
	'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'];

// http/https/mailto/상대경로/프래그먼트만 통과. javascript:/data:/vbscript: 차단.
//
// 세 번째 갈래가 상대경로다. 이전 패턴(`^(https?:|mailto:|\/|#)`)은 주석이 말하는
// 상대경로 중 **`/` 로 시작하는 것만** 통과시켰다. `[상대 경로](./other)` 는 href 가
// 통째로 지워져 `<a>텍스트</a>` 가 됐다 — 링크처럼 보이는데 눌러도 아무 일도
// 일어나지 않는 글자다 (실측 2026-08-31). CommonMark 는 상대경로를 허용한다.
//
// 갈래 해설 (DOMPurify 기본 패턴의 구조를 그대로 따른다):
//   `(?:https?|mailto):`        — 허용 스킴
//   `[^a-z]`                    — 글자로 시작하지 않음 → 스킴일 수 없다 (`/a` `#a` `2024/a`)
//   `[a-z+.-]+(?:[^a-z+.:-]|$)` — 글자로 시작하되 **`:` 가 뒤따르지 않음** (`about` `a/b`)
// `javascript:` · `data:` · `vbscript:` 는 세 번째 갈래에서 `:` 때문에 탈락한다.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;

// target="_blank" anchor 에 rel=noopener noreferrer 보정 (FR-06, spec §5.1).
// 훅은 모듈 로드 시 1회 등록 (멱등). removeHook 호출하지 않는다.
let hookRegistered = false;
function ensureHook() {
	if (hookRegistered) return;
	if (!DOMPurify || typeof DOMPurify.addHook !== 'function') return;
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node && node.tagName === 'A' && node.getAttribute && node.getAttribute('target') === '_blank') {
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});
	hookRegistered = true;
}

// DOMPurify 가 window 없는 환경에서 로드되면 sanitize 가 없을 수 있다 (spec §5.3).
export default function sanitizeHtml(dirtyHtml: string | null | undefined): string {
	if (dirtyHtml === null || dirtyHtml === undefined || dirtyHtml === '') return '';
	if (typeof window === 'undefined') return '';
	if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') return '';

	ensureHook();

	return DOMPurify.sanitize(dirtyHtml, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOWED_URI_REGEXP,
		ADD_ATTR: ['target', 'rel'],
		// target/rel 은 URL 이 아니므로 URI_SAFE 목록에 넣어 ALLOWED_URI_REGEXP 검사를 우회.
		ADD_URI_SAFE_ATTR: ['target', 'rel'],
		KEEP_CONTENT: true,
		RETURN_TRUSTED_TYPE: false,
	});
}
