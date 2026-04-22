import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export interface QueryTestWrapperResult {
	Wrapper: React.FC<{ children: React.ReactNode }>;
	queryClient: QueryClient;
}

/**
 * Create an isolated QueryClient + Provider wrapper for React Query hook tests.
 *
 * Per-call instantiation guarantees no cache leakage between tests. Defaults
 * disable retries and caching so a single mocked failure does not bleed into
 * neighbouring assertions.
 */
export const createQueryTestWrapper = (): QueryTestWrapperResult => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: 0, gcTime: 0 },
			mutations: { retry: false },
		},
	});

	const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	return { Wrapper, queryClient };
};

export default createQueryTestWrapper;
