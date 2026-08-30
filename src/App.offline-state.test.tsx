import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// 관리자 경로에서만 글쓰기 화면이 열린다. 이 파일이 재는 것은 "네트워크가
// 깜빡였을 때 화면 아래의 상태가 살아있는가" 이므로, 상태를 가진 화면 중
// 가장 잃으면 아픈 것(작성 중 원고)으로 잰다.
vi.mock('./common/common', async () => {
	const actual = await vi.importActual<typeof import('./common/common')>('./common/common');
	return { ...actual, isAdmin: () => true };
});

const stubMode = (mode: string) => {
	vi.stubEnv('MODE', mode);
	vi.stubEnv('DEV', mode === 'development');
	vi.stubEnv('PROD', mode === 'production');
};

const setOnLine = (value: boolean) => {
	Object.defineProperty(navigator, 'onLine', { value, configurable: true });
};

const fireNetwork = async (online: boolean) => {
	setOnLine(online);
	await act(async () => {
		fireEvent(window, new Event(online ? 'online' : 'offline'));
	});
};

const settle = async (times = 40) => {
	for(let i = 0; i < times; i++) {
		await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
		if(document.getElementById('textarea--writer-article')) return;
	}
};

const textarea = () => document.getElementById('textarea--writer-article') as HTMLTextAreaElement | null;

beforeEach(() => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	stubMode('test');
	setOnLine(true);
	window.history.pushState({}, '', '/log/write');
});

afterEach(() => {
	vi.unstubAllEnvs();
	window.history.pushState({}, '', '/');
});

afterAll(() => {
	Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('오프라인 알림은 앱 트리를 교체하지 않는다', () => {

	// 구 구현은 삼항으로 라우터를 통째로 갈아끼웠다. 실측: 작성 중이던 원고가
	// offline 이벤트 한 번에 "" 가 됐고 online 으로 돌아와도 복구되지 않았다.
	it('네트워크가 깜빡여도 작성 중 원고가 남는다', async () => {

		render(<App />);
		await settle();

		const written = '오프라인 깜빡임을 견뎌야 하는 원고';
		await act(async () => {
			fireEvent.change(textarea() as HTMLTextAreaElement, { target: { value: written } });
		});
		expect(textarea()?.value).toBe(written);

		await fireNetwork(false);
		await fireNetwork(true);
		await settle();

		expect(textarea()?.value).toBe(written);
	});

	it('오프라인 중에는 알림이 보이고 앱은 감춰진다', async () => {

		render(<App />);
		await settle();

		await fireNetwork(false);

		expect(screen.getByText('You are offline now.')).toBeInTheDocument();

		const shell = document.querySelector('.div--app-shell');
		expect(shell).not.toBeNull();
		expect(shell).toHaveAttribute('hidden');

		await fireNetwork(true);
		expect(document.querySelector('.div--app-shell')).not.toHaveAttribute('hidden');
	});

	// 처음부터 오프라인이면 앱을 마운트하지 않는다 — 마운트하면 곧바로 실패할
	// 요청이 나가고 그 실패가 복귀 시점에 알림으로 쌓인다.
	it('찬 시작이 오프라인이면 앱을 마운트하지 않는다', async () => {

		setOnLine(false);
		render(<App />);
		await settle(5);

		expect(screen.getByText('You are offline now.')).toBeInTheDocument();
		expect(document.querySelector('.div--app-shell')).toBeNull();

		await fireNetwork(true);
		await settle();

		expect(document.querySelector('.div--app-shell')).not.toBeNull();
		expect(textarea()).not.toBeNull();
	});
});
