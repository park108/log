import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
	state = { hasError: false, error: null };

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
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

ErrorBoundary.propTypes = {
	fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
	onError: PropTypes.func,
	children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
