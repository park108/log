import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryFallbackArgs {
	error: Error | null;
	reset: () => void;
}

interface ErrorBoundaryProps {
	fallback: ReactNode | ((args: ErrorBoundaryFallbackArgs) => ReactNode);
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		if (typeof this.props.onError === 'function') {
			this.props.onError(error, errorInfo);
		}
	}

	reset = () => this.setState({ hasError: false, error: null });

	render() {
		if (this.state.hasError) {
			const { fallback } = this.props;
			if (typeof fallback === 'function') {
				return fallback({ error: this.state.error, reset: this.reset });
			}
			return fallback ?? null;
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
