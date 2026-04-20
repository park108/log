// 단일 sanitize 모듈. markdownParser 산출 HTML 을 DOM 주입 직전 정제한다.
// 정책은 이 파일에서만 변경한다 (FR-06 / spec §1, §6).
// 관련: REQ-20260418-001, spec specs/30.spec/green/common/sanitizeHtml-spec.md §5, §6

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
	'p', 'br', 'hr', 'strong', 'em', 'del',
	'code', 'pre',
	'blockquote',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'ul', 'ol', 'li',
	'a', 'img',
	'span',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'];

// http/https/mailto/상대경로/프래그먼트만 통과. javascript:/data:/vbscript: 차단.
const ALLOWED_URI_REGEXP = /^(https?:|mailto:|\/|#)/i;

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
export default function sanitizeHtml(dirtyHtml) {
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
