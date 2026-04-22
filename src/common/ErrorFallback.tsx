import './ErrorFallback.css';

/*
 * ErrorFallback — default fallback UI for <ErrorBoundary>.
 *
 * Props (prop-types intentionally omitted, TS migration pending):
 *   - error?: Error         — error object thrown in the wrapped tree
 *   - reset?: () => void    — optional retry callback; when present a button is rendered
 *
 * Spec: `specs/30.spec/green/common/error-boundary-spec.md` §3.3
 *
 * Branch logic:
 *   - Network error  → "연결을 확인하고 다시 시도하세요"
 *     matched when error.name === 'NetworkError' OR error.message matches /failed to fetch|network/i
 *   - Render error   → "예기치 않은 오류가 발생했습니다"
 */

interface ErrorFallbackProps {
	error?: Error | null;
	reset?: () => void;
}

function isNetworkError(error: Error | null | undefined): boolean {
	if (!error) return false;
	if (error.name === 'NetworkError') return true;
	const message = error.message ?? '';
	return /failed to fetch|network/i.test(message);
}

export default function ErrorFallback({ error, reset }: ErrorFallbackProps) {
	const networkError = isNetworkError(error);
	const message = networkError
		? '연결을 확인하고 다시 시도하세요'
		: '예기치 않은 오류가 발생했습니다';

	return (
		<div className="error-fallback" role="alert">
			<p className="error-fallback__title">오류</p>
			<p className="error-fallback__message">{message}</p>
			{typeof reset === 'function' && (
				<button
					type="button"
					className="error-fallback__reset"
					onClick={reset}
				>
					다시 시도
				</button>
			)}
		</div>
	);
}
