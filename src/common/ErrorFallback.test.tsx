import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import ErrorFallback from './ErrorFallback';

describe('ErrorFallback', () => {
	// 청크 로드 실패 — 배포 직후 CDN 이 옛 index.html 을 주는 동안 실제로 발생한다
	// (2026-08-29 댓글 열람 파열). reset() 은 이 부류를 복구하지 못한다: 죽은 청크
	// URL 이 이미 로드된 진입 번들에 박혀 있어 다시 렌더해도 같은 URL 을 부른다.
	describe('청크 로드 실패', () => {

		// 세 엔진의 문면이 서로 다르다 — 하나만 잡으면 나머지 브라우저에서 샌다.
		const MESSAGES = [
			['Chrome', 'Failed to fetch dynamically imported module: https://x/assets/A-1.js'],
			['Firefox', 'error loading dynamically imported module'],
			['Safari', 'Importing a module script failed.'],
		] as const;

		it.each(MESSAGES)('%s 문면을 청크 실패로 판정한다', (_engine, message) => {

			render(<ErrorFallback error={new Error(message)} reset={() => {}} />);

			expect(screen.getByText(/새 버전이 배포되었습니다/)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
		});

		it('reset 이 없어도 복구 버튼을 낸다 — 복구 수단이 reset 이 아니다', () => {

			render(<ErrorFallback error={new Error('Failed to fetch dynamically imported module: /a.js')} />);

			expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
		});

		// 복원은 afterEach **등록**으로 한다. it 본문 끝의 직렬 호출은 케이스가
		// 던지면 실행되지 않아 교체된 location 이 뒤 케이스로 누출된다.
		const originalLocation = window.location;
		afterEach(() => {
			Object.defineProperty(window, 'location', {
				configurable: true,
				value: originalLocation,
			});
		});

		it('버튼이 reset 이 아니라 새로고침을 호출한다', () => {

			const reset = vi.fn();
			const reload = vi.fn();
			// jsdom 의 location.reload 는 기본적으로 호출 불가라 교체한다.
			Object.defineProperty(window, 'location', {
				configurable: true,
				value: { ...originalLocation, reload },
			});

			render(<ErrorFallback error={new Error('Importing a module script failed.')} reset={reset} />);
			fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

			expect(reload).toHaveBeenCalledTimes(1);
			expect(reset, 'reset 은 이 부류를 복구하지 못하므로 호출되면 안 된다').not.toHaveBeenCalled();
		});

		it('일반 네트워크 오류는 여전히 다시 시도다 (음성 대조)', () => {

			const error = new Error('failed to fetch');

			render(<ErrorFallback error={error} reset={() => {}} />);

			expect(screen.getByText(/연결을 확인하고 다시 시도하세요/)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
		});
	});

	it('shows the network message when the error has name "NetworkError"', () => {
		const error = new Error('dns failure');
		error.name = 'NetworkError';

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/연결을 확인하고 다시 시도하세요/)).toBeInTheDocument();
		expect(screen.queryByText(/예기치 않은/)).not.toBeInTheDocument();
	});

	it('shows the network message when the error message matches /failed to fetch/i', () => {
		const error = new Error('Failed to fetch data');

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/연결을 확인하고 다시 시도하세요/)).toBeInTheDocument();
	});

	it('shows the generic render-error message for other errors', () => {
		const error = new Error('boom');

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/예기치 않은 오류가 발생했습니다/)).toBeInTheDocument();
		expect(screen.queryByText(/연결을 확인하고/)).not.toBeInTheDocument();
	});

	it('renders a retry button that calls reset() when clicked', () => {
		const reset = vi.fn();

		render(<ErrorFallback error={new Error('boom')} reset={reset} />);

		const button = screen.getByRole('button', { name: '다시 시도' });
		fireEvent.click(button);

		expect(reset).toHaveBeenCalledTimes(1);
	});

	it('does not render the retry button when reset is not provided', () => {
		render(<ErrorFallback error={new Error('boom')} />);

		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
	});

	it('uses role="alert" for assistive tech', () => {
		render(<ErrorFallback error={new Error('boom')} />);

		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('shows the generic message when error is undefined', () => {
		render(<ErrorFallback />);

		expect(screen.getByText(/예기치 않은 오류가 발생했습니다/)).toBeInTheDocument();
	});

	it('treats an error without a message as a generic (non-network) error', () => {
		// isNetworkError 의 `error.message ?? ''` 우측 분기 — 직렬화 복원 등으로
		// message 가 없는 오류 객체도 정규식 검사에서 안전하게 일반 메시지로 귀결한다.
		const error = { name: 'RestoredError' } as Error;

		render(<ErrorFallback error={error} />);

		expect(screen.getByText(/예기치 않은 오류가 발생했습니다/)).toBeInTheDocument();
		expect(screen.queryByText(/연결을 확인하고/)).not.toBeInTheDocument();
	});
});
