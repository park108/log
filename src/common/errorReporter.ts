/*
 * reportError — centralized error reporting hook.
 *
 * Current impl delegates to console.error. Future Sentry/etc wiring lives
 * in a separate spec (REQ-20260418-005 §13).
 */
export function reportError(error: unknown, errorInfo?: unknown): void {
	// eslint-disable-next-line no-console
	console.error('[reportError]', error, errorInfo);
}
