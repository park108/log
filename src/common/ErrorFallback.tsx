import './ErrorFallback.css';

/*
 * ErrorFallback — default fallback UI for <ErrorBoundary>.
 *
 * Props (TypeScript 인터페이스로 선언 — PropTypes 미사용):
 *   - error?: Error         — error object thrown in the wrapped tree
 *   - reset?: () => void    — optional retry callback; when present a button is rendered
 *
 * Branch logic:
 *   - Chunk load error → "새 버전이 배포되었습니다" + 새로고침 버튼
 *     lazy 청크를 못 받는 상태. reset() 은 이 부류를 복구하지 못한다 — 죽은
 *     청크 URL 이 이미 로드된 진입 번들 안에 박혀 있어 다시 렌더해도 같은
 *     URL 을 부른다. 새 index.html 을 받아야 하므로 새로고침이 필요하다.
 *     (배포 직후 CDN 이 옛 index.html 을 주는 동안 실제로 발생 — 2026-08-29)
 *   - Network error  → "연결을 확인하고 다시 시도하세요"
 *     matched when error.name === 'NetworkError' OR error.message matches /failed to fetch|network/i
 *   - Render error   → "예기치 않은 오류가 발생했습니다"
 */

interface ErrorFallbackProps {
	error?: Error | null;
	reset?: () => void;
}

// 브라우저별 동적 import 실패 메시지. 세 엔진 문면이 서로 다르다.
//   Chrome  "Failed to fetch dynamically imported module: <url>"
//   Firefox "error loading dynamically imported module"
//   Safari  "Importing a module script failed."
const CHUNK_LOAD_PATTERN =
	/dynamically imported module|importing a module script failed|failed to fetch dynamically/i;

function isChunkLoadError(error: Error | null | undefined): boolean {
	if (!error) return false;
	return CHUNK_LOAD_PATTERN.test(error.message ?? '');
}

function isNetworkError(error: Error | null | undefined): boolean {
	if (!error) return false;
	if (error.name === 'NetworkError') return true;
	const message = error.message ?? '';
	return /failed to fetch|network/i.test(message);
}

export default function ErrorFallback({ error, reset }: ErrorFallbackProps) {
	const chunkError = isChunkLoadError(error);

	const message = chunkError
		? '새 버전이 배포되었습니다. 새로고침 후 다시 시도해 주세요'
		: isNetworkError(error)
			? '연결을 확인하고 다시 시도하세요'
			: '예기치 않은 오류가 발생했습니다';

	// 청크 로드 실패는 새로고침으로만 복구된다 (§상단 주석). reset 이
	// 주어지지 않아도 이 경우에는 버튼을 낸다 — 복구 수단이 reset 이 아니다.
	const showButton = chunkError || typeof reset === 'function';

	return (
		<div className="error-fallback" role="alert">
			<p className="error-fallback__title">오류</p>
			<p className="error-fallback__message">{message}</p>
			{showButton && (
				<button
					type="button"
					className="error-fallback__reset"
					onClick={chunkError ? () => window.location.reload() : reset}
				>
					{chunkError ? '새로고침' : '다시 시도'}
				</button>
			)}
		</div>
	);
}
